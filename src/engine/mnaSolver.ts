import type { CircuitComponent, CircuitData, SimulationStepResult, WireTelemetry } from '../../shared/types';
import { getComponentPins } from './componentCatalog';
import { evaluateTruthChipOutputs, expandCircuitHierarchy, parseCustomIcPayload } from './customIcEngine';

import {
  CAP_HOLD_G, DIGITAL_TYPES, evalDiode, evalNmos, evaluateAlu4Bit, evalZener,
  formatComponentOverloadWarning, getLedParams, IMPLICIT_REF_TYPES, IND_COIL_R, IND_HOLD_G,
  parseRamInitHex, pinKey, SimulationRuntimeState, solveLinearSystem, SolveStepOptions, spicePnjLim,
  TransformerBranch, VoltageBranch, WaveformEdgeStats, ZeroDtSolveMode,
} from './circuitModels';
import { computeComponentTelemetry } from './componentTelemetry';

export function solveCircuitStep(
  circuit: CircuitData,
  simState: SimulationRuntimeState,
  dt: number,
  options?: SolveStepOptions
): SimulationStepResult {
  const zeroDtMode: ZeroDtSolveMode = options?.zeroDtMode ?? 'dcOperatingPoint';
  const expanded = expandCircuitHierarchy(circuit);
  const components = expanded.flatCircuit.components;
  const wires = expanded.flatCircuit.wires;
  const compMap = new Map<string, CircuitComponent>();
  for (const c of components) compMap.set(c.id, c);

  // 1. Union-Find over wires to group connected pins into electrical nets
  const parent = new Map<string, string>();
  const ensurePin = (k: string) => {
    if (!parent.has(k)) parent.set(k, k);
  };
  const find = (k: string): string => {
    ensurePin(k);
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root)!;
    let cur = k;
    while (cur !== root) {
      const nxt = parent.get(cur)!;
      parent.set(cur, root);
      cur = nxt;
    }
    return root;
  };
  const unite = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };

  for (const c of components) {
    const pins = getComponentPins(c);
    for (const p of pins) {
      ensurePin(pinKey(c.id, p.id));
    }
  }
  for (const w of wires) {
    if (compMap.has(w.from.componentId) && compMap.has(w.to.componentId)) {
      unite(pinKey(w.from.componentId, w.from.pinId), pinKey(w.to.componentId, w.to.pinId));
    }
  }

  // 2. Group nets into component-connected islands to ensure each analog island has a Node 0 reference
  const allNetRoots = new Set<string>();
  for (const k of parent.keys()) allNetRoots.add(find(k));

  const islandParent = new Map<string, string>();
  const findIsland = (net: string): string => {
    if (!islandParent.has(net)) islandParent.set(net, net);
    let r = net;
    while (islandParent.get(r) !== r) r = islandParent.get(r)!;
    let cur = net;
    while (cur !== r) {
      const nxt = islandParent.get(cur)!;
      islandParent.set(cur, r);
      cur = nxt;
    }
    return r;
  };
  const uniteIsland = (a: string, b: string) => {
    const ra = findIsland(a);
    const rb = findIsland(b);
    if (ra !== rb) islandParent.set(rb, ra);
  };

  for (const r of allNetRoots) findIsland(r);
  for (const c of components) {
    const pins = getComponentPins(c);
    if (pins.length < 2) continue;
    const firstNet = find(pinKey(c.id, pins[0].id));
    for (let i = 1; i < pins.length; i++) {
      uniteIsland(firstNet, find(pinKey(c.id, pins[i].id)));
    }
  }

  const groundNetRoots = new Set<string>();
  const islandsWithGround = new Set<string>();
  const islandsWithImplicitRef = new Set<string>();

  for (const c of components) {
    const pins = getComponentPins(c);
    if (c.type === 'GROUND') {
      const net = find(pinKey(c.id, 'gnd'));
      groundNetRoots.add(net);
      islandsWithGround.add(findIsland(net));
    } else if (IMPLICIT_REF_TYPES.has(c.type) && pins.length > 0) {
      const net = find(pinKey(c.id, pins[0].id));
      islandsWithImplicitRef.add(findIsland(net));
    }
  }

  let implicitGroundUsed = false;
  const islandsNeedingFallback = new Set<string>();
  for (const net of allNetRoots) {
    const isl = findIsland(net);
    if (!islandsWithGround.has(isl) && !islandsWithImplicitRef.has(isl)) {
      islandsNeedingFallback.add(isl);
    }
  }

  if (islandsNeedingFallback.size > 0) {
    const handledIslands = new Set<string>();
    // Prefer negative pin of DC_SOURCE / AC_SOURCE / INF_SOURCE / CURRENT_SOURCE
    for (const c of components) {
      if (
        c.type === 'DC_SOURCE' ||
        c.type === 'AC_SOURCE' ||
        c.type === 'INF_SOURCE' ||
        c.type === 'CURRENT_SOURCE'
      ) {
        const net = find(pinKey(c.id, 'neg'));
        const isl = findIsland(net);
        if (islandsNeedingFallback.has(isl) && !handledIslands.has(isl)) {
          groundNetRoots.add(net);
          handledIslands.add(isl);
          implicitGroundUsed = true;
        }
      }
    }
    for (const isl of islandsNeedingFallback) {
      if (!handledIslands.has(isl)) {
        for (const net of allNetRoots) {
          if (findIsland(net) === isl) {
            groundNetRoots.add(net);
            handledIslands.add(isl);
            implicitGroundUsed = true;
            break;
          }
        }
      }
    }
  }

  const netToNode = new Map<string, number>();
  let numNodes = 0;
  for (const net of allNetRoots) {
    if (groundNetRoots.has(net)) {
      netToNode.set(net, 0);
    } else {
      numNodes++;
      netToNode.set(net, numNodes);
    }
  }

  const getNode = (componentId: string, pinId: string): number => {
    const r = find(pinKey(componentId, pinId));
    return netToNode.get(r) ?? 0;
  };

  // 3. Evaluate Digital Logic State & Digital Bridge
  // Compute source voltage/logic values first
  const timeNext = simState.time + dt;
  const logicDriveOut = new Map<string, number>(); // key: pinKey -> 0 or 5V

  // Identify pins connected to wires so floating digital inputs read 0 safely
  const connectedPins = new Set<string>();
  for (const w of wires) {
    connectedPins.add(pinKey(w.from.componentId, w.from.pinId));
    connectedPins.add(pinKey(w.to.componentId, w.to.pinId));
  }

  // Update LOGIC_IN, top-level IC_PORT_IN & CLOCK first
  const clockStates = new Map<string, boolean>();
  for (const c of components) {
    if (c.type === 'LOGIC_IN') {
      const override = options?.overrideLogicInputs?.[c.id];
      const val = override !== undefined ? (override ? 1 : 0) : Number(c.props.state) ? 1 : 0;
      logicDriveOut.set(pinKey(c.id, 'out'), val ? 5 : 0);
    } else if (c.type === 'IC_PORT_IN' && !c.props.__packagedPort) {
      const override = options?.overrideLogicInputs?.[c.id];
      const val = override !== undefined ? (override ? 1 : 0) : Number(c.props.state) ? 1 : 0;
      logicDriveOut.set(pinKey(c.id, 'io'), val ? 5 : 0);
    } else if (c.type === 'CLOCK') {
      const freq = Math.max(0.1, Number(c.props.frequency ?? 1));
      const phase = (timeNext * freq) % 1;
      const high = phase < 0.5;
      clockStates.set(c.id, high);
      logicDriveOut.set(pinKey(c.id, 'out'), high ? 5 : 0);
    }
  }

  // Helper to read logic state on a pin (either from directly driven net in digital propagation or analog node voltage)
  const netLogicCache = new Map<number, number>();
  const digitalDrivenNets = new Set<number>();
  let hasDigitalOrTimer555 = logicDriveOut.size > 0;
  for (const c of components) {
    if (c.type === 'TIMER_555') {
      hasDigitalOrTimer555 = true;
      continue;
    }
    if (DIGITAL_TYPES.has(c.type)) {
      hasDigitalOrTimer555 = true;
    }
    for (const p of getComponentPins(c)) {
      if (p.role === 'logic_out') {
        const n = getNode(c.id, p.id);
        if (n !== 0) digitalDrivenNets.add(n);
      }
    }
  }

  const evalTimer555Q = (
    c: CircuitComponent,
    readV: (cid: string, pid: string) => number,
    prevQ: 0 | 1
  ): 0 | 1 => {
    const vVcc = readV(c.id, 'vcc');
    const vGnd = readV(c.id, 'gnd');
    const vSup = vVcc - vGnd;
    if (vSup < 1.5) return 0;
    const vHi = vGnd + (2 / 3) * vSup;
    const vLo = vGnd + (1 / 3) * vSup;
    const trigConn = connectedPins.has(pinKey(c.id, 'trig'));
    const thresConn = connectedPins.has(pinKey(c.id, 'thres'));
    const vTrig = readV(c.id, 'trig');
    const vThres = readV(c.id, 'thres');
    if (trigConn && vTrig < vLo - 1e-4) return 1;
    if (thresConn && vThres > vHi + 1e-4) return 0;
    return prevQ;
  };

  const seedNetLogicFromVoltages = (analogVoltages: Record<string, number>) => {
    netLogicCache.clear();
    for (const c of components) {
      if (c.type === 'DC_SOURCE' || c.type === 'INF_SOURCE') {
        const v = Number(c.props.voltage ?? 5);
        if (v >= 2.5) {
          const nPos = getNode(c.id, 'pos');
          if (nPos !== 0 && !digitalDrivenNets.has(nPos)) {
            netLogicCache.set(nPos, 1);
          }
        }
      }
      for (const p of getComponentPins(c)) {
        const n = getNode(c.id, p.id);
        if (n === 0 || digitalDrivenNets.has(n)) continue;
        const vAnalog = analogVoltages[pinKey(c.id, p.id)] ?? 0;
        if (vAnalog >= 2.5) netLogicCache.set(n, 1);
      }
    }
    for (const [pk, volt] of logicDriveOut.entries()) {
      const [cid, pid] = pk.split(':');
      const n = getNode(cid, pid);
      if (n !== 0 && volt >= 2.5) netLogicCache.set(n, 1);
    }
  };

  const readLogicPin = (cid: string, pid: string): 0 | 1 => {
    const pk = pinKey(cid, pid);
    if (!connectedPins.has(pk)) return 0;
    const n = getNode(cid, pid);
    if (n === 0) return 0;
    return netLogicCache.get(n) === 1 ? 1 : 0;
  };

  const runCombinationalPropagation = (analogVoltages: Record<string, number>): boolean => {
    let anyChange = false;
    seedNetLogicFromVoltages(analogVoltages);
    // Combinational propagation (up to 24 passes for multi-stage / nested IC logic)
    for (let pass = 0; pass < 24; pass++) {
      let changed = false;

      const updateOutputPin = (cid: string, pid: string, bit: 0 | 1) => {
        const pk = pinKey(cid, pid);
        const targetV = bit ? 5 : 0;
        if (logicDriveOut.get(pk) !== targetV) {
          logicDriveOut.set(pk, targetV);
          changed = true;
          anyChange = true;
        }
      };

      // Recompute netLogicCache from active logic outputs + preserved analog high nodes
      seedNetLogicFromVoltages(analogVoltages);

      for (const c of components) {
        if (c.type === 'AND') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a && b ? 1 : 0);
        } else if (c.type === 'OR') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a || b ? 1 : 0);
        } else if (c.type === 'NOT') {
          const a = readLogicPin(c.id, 'a');
          updateOutputPin(c.id, 'y', a ? 0 : 1);
        } else if (c.type === 'NAND') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a && b ? 0 : 1);
        } else if (c.type === 'NOR') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a || b ? 0 : 1);
        } else if (c.type === 'XOR') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a ^ b ? 1 : 0);
        } else if (c.type === 'XNOR') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 'y', a ^ b ? 0 : 1);
        } else if (c.type === 'MUX_2_1') {
          const d0 = readLogicPin(c.id, 'd0');
          const d1 = readLogicPin(c.id, 'd1');
          const sel = readLogicPin(c.id, 'sel');
          updateOutputPin(c.id, 'y', sel ? d1 : d0);
        } else if (c.type === 'HALF_ADDER') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          updateOutputPin(c.id, 's', (a ^ b) as 0 | 1);
          updateOutputPin(c.id, 'c', (a & b) as 0 | 1);
        } else if (c.type === 'FULL_ADDER') {
          const a = readLogicPin(c.id, 'a');
          const b = readLogicPin(c.id, 'b');
          const cin = readLogicPin(c.id, 'cin');
          const sum = a + b + cin;
          updateOutputPin(c.id, 's', (sum & 1) as 0 | 1);
          updateOutputPin(c.id, 'cout', sum >= 2 ? 1 : 0);
        } else if (c.type === 'D_FF' || c.type === 'JK_FF') {
          const q = simState.flipFlopStates[c.id] ? 1 : 0;
          updateOutputPin(c.id, 'q', q);
          updateOutputPin(c.id, 'qn', q ? 0 : 1);
        } else if (c.type === 'COUNTER_4BIT') {
          const rst = readLogicPin(c.id, 'rst');
          if (rst && (simState.counterValues[c.id] ?? 0) !== 0) {
            simState.counterValues[c.id] = 0;
          }
          const val = rst ? 0 : (simState.counterValues[c.id] ?? 0) & 0x0f;
          updateOutputPin(c.id, 'q3', (val >> 3) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q2', (val >> 2) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q1', (val >> 1) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q0', val & 1 ? 1 : 0);
        } else if (c.type === 'ENCODER_4_2') {
          const i3 = readLogicPin(c.id, 'i3');
          const i2 = readLogicPin(c.id, 'i2');
          const i1 = readLogicPin(c.id, 'i1');
          const i0 = readLogicPin(c.id, 'i0');
          const gs: 0 | 1 = i3 || i2 || i1 || i0 ? 1 : 0;
          const y1: 0 | 1 = i3 || i2 ? 1 : 0;
          const y0: 0 | 1 = i3 || (!i2 && i1) ? 1 : 0;
          updateOutputPin(c.id, 'y1', y1);
          updateOutputPin(c.id, 'y0', y0);
          updateOutputPin(c.id, 'gs', gs);
        } else if (c.type === 'DECODER_2_4') {
          const inh = readLogicPin(c.id, 'inh');
          const addr = (readLogicPin(c.id, 'a1') << 1) | readLogicPin(c.id, 'a0');
          updateOutputPin(c.id, 'y3', !inh && addr === 3 ? 1 : 0);
          updateOutputPin(c.id, 'y2', !inh && addr === 2 ? 1 : 0);
          updateOutputPin(c.id, 'y1', !inh && addr === 1 ? 1 : 0);
          updateOutputPin(c.id, 'y0', !inh && addr === 0 ? 1 : 0);
        } else if (c.type === 'MUX_4BIT') {
          const sel = readLogicPin(c.id, 'sel');
          for (const bit of ['3', '2', '1', '0']) {
            updateOutputPin(
              c.id,
              `y${bit}`,
              sel ? readLogicPin(c.id, `b${bit}`) : readLogicPin(c.id, `a${bit}`)
            );
          }
        } else if (c.type === 'REGISTER_4BIT') {
          const rst = readLogicPin(c.id, 'rst');
          if (rst && (simState.registerValues[c.id] ?? 0) !== 0) {
            simState.registerValues[c.id] = 0;
          }
          const val = rst ? 0 : (simState.registerValues[c.id] ?? 0) & 0x0f;
          updateOutputPin(c.id, 'q3', (val >> 3) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q2', (val >> 2) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q1', (val >> 1) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q0', val & 1 ? 1 : 0);
        } else if (c.type === 'ALU_4BIT') {
          const a =
            (readLogicPin(c.id, 'a3') << 3) |
            (readLogicPin(c.id, 'a2') << 2) |
            (readLogicPin(c.id, 'a1') << 1) |
            readLogicPin(c.id, 'a0');
          const b =
            (readLogicPin(c.id, 'b3') << 3) |
            (readLogicPin(c.id, 'b2') << 2) |
            (readLogicPin(c.id, 'b1') << 1) |
            readLogicPin(c.id, 'b0');
          const op = (readLogicPin(c.id, 'op1') << 1) | readLogicPin(c.id, 'op0');
          const { result, cout, zero } = evaluateAlu4Bit(a, b, op);
          updateOutputPin(c.id, 'f3', (result >> 3) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'f2', (result >> 2) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'f1', (result >> 1) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'f0', result & 1 ? 1 : 0);
          updateOutputPin(c.id, 'cout', cout);
          updateOutputPin(c.id, 'zero', zero);
        } else if (c.type === 'RAM_16X4') {
          if (!simState.ramMemory[c.id]) {
            simState.ramMemory[c.id] = parseRamInitHex(c.props.initHex);
          }
          const addr =
            (readLogicPin(c.id, 'a3') << 3) |
            (readLogicPin(c.id, 'a2') << 2) |
            (readLogicPin(c.id, 'a1') << 1) |
            readLogicPin(c.id, 'a0');
          const val = (simState.ramMemory[c.id][addr] ?? 0) & 0x0f;
          updateOutputPin(c.id, 'q3', (val >> 3) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q2', (val >> 2) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q1', (val >> 1) & 1 ? 1 : 0);
          updateOutputPin(c.id, 'q0', val & 1 ? 1 : 0);
        } else if (c.type === 'CUSTOM_TRUTH_8' || c.type === 'CUSTOM_TRUTH_16') {
          const outputs = evaluateTruthChipOutputs(c, (pid) => readLogicPin(c.id, pid));
          for (const [outPinId, bit] of Object.entries(outputs)) {
            updateOutputPin(c.id, outPinId, bit);
          }
        }
      }

      if (!changed) break;
    }
    return anyChange;
  };

  const stepSequentialElements = (analogVoltages: Record<string, number>): boolean => {
    if (dt <= 0) return false;
    seedNetLogicFromVoltages(analogVoltages);
    let seqChanged = false;
    for (const c of components) {
      if (c.type === 'D_FF') {
        const clkHigh = readLogicPin(c.id, 'clk') === 1;
        const wasHigh = Boolean(simState.prevClockHigh[c.id]);
        if (!wasHigh && clkHigh) {
          const dVal = readLogicPin(c.id, 'd');
          simState.flipFlopStates[c.id] = dVal;
          logicDriveOut.set(pinKey(c.id, 'q'), dVal ? 5 : 0);
          logicDriveOut.set(pinKey(c.id, 'qn'), dVal ? 0 : 5);
          seqChanged = true;
        }
        simState.prevClockHigh[c.id] = clkHigh;
      } else if (c.type === 'JK_FF') {
        const clkHigh = readLogicPin(c.id, 'clk') === 1;
        const wasHigh = Boolean(simState.prevClockHigh[c.id]);
        if (!wasHigh && clkHigh) {
          const j = readLogicPin(c.id, 'j');
          const k = readLogicPin(c.id, 'k');
          const prevQ = simState.flipFlopStates[c.id] ? 1 : 0;
          let nextQ = prevQ;
          if (j === 1 && k === 1) nextQ = prevQ ? 0 : 1;
          else if (j === 1 && k === 0) nextQ = 1;
          else if (j === 0 && k === 1) nextQ = 0;
          simState.flipFlopStates[c.id] = nextQ;
          logicDriveOut.set(pinKey(c.id, 'q'), nextQ ? 5 : 0);
          logicDriveOut.set(pinKey(c.id, 'qn'), nextQ ? 0 : 5);
          seqChanged = true;
        }
        simState.prevClockHigh[c.id] = clkHigh;
      } else if (c.type === 'COUNTER_4BIT') {
        const rst = readLogicPin(c.id, 'rst') === 1;
        const clkHigh = readLogicPin(c.id, 'clk') === 1;
        const wasHigh = Boolean(simState.prevClockHigh[c.id]);
        const prevVal = (simState.counterValues[c.id] ?? 0) & 0x0f;
        let val = prevVal;
        if (rst) {
          val = 0;
        } else if (!wasHigh && clkHigh) {
          val = (val + 1) & 0x0f;
        }
        if (val !== prevVal) seqChanged = true;
        simState.counterValues[c.id] = val;
        simState.prevClockHigh[c.id] = clkHigh;
        logicDriveOut.set(pinKey(c.id, 'q3'), (val >> 3) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q2'), (val >> 2) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q1'), (val >> 1) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q0'), val & 1 ? 5 : 0);
      } else if (c.type === 'REGISTER_4BIT') {
        const rst = readLogicPin(c.id, 'rst') === 1;
        const we = readLogicPin(c.id, 'we') === 1;
        const clkHigh = readLogicPin(c.id, 'clk') === 1;
        const wasHigh = Boolean(simState.prevClockHigh[c.id]);
        const prevVal = (simState.registerValues[c.id] ?? 0) & 0x0f;
        let val = prevVal;
        if (rst) {
          val = 0;
        } else if (!wasHigh && clkHigh && we) {
          val =
            (readLogicPin(c.id, 'd3') << 3) |
            (readLogicPin(c.id, 'd2') << 2) |
            (readLogicPin(c.id, 'd1') << 1) |
            readLogicPin(c.id, 'd0');
        }
        if (val !== prevVal) seqChanged = true;
        simState.registerValues[c.id] = val;
        simState.prevClockHigh[c.id] = clkHigh;
        logicDriveOut.set(pinKey(c.id, 'q3'), (val >> 3) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q2'), (val >> 2) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q1'), (val >> 1) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q0'), val & 1 ? 5 : 0);
      } else if (c.type === 'RAM_16X4') {
        if (!simState.ramMemory[c.id]) {
          simState.ramMemory[c.id] = parseRamInitHex(c.props.initHex);
        }
        const mem = simState.ramMemory[c.id];
        const addr =
          (readLogicPin(c.id, 'a3') << 3) |
          (readLogicPin(c.id, 'a2') << 2) |
          (readLogicPin(c.id, 'a1') << 1) |
          readLogicPin(c.id, 'a0');
        const we = readLogicPin(c.id, 'we') === 1;
        const clkHigh = readLogicPin(c.id, 'clk') === 1;
        const wasHigh = Boolean(simState.prevClockHigh[c.id]);
        const prevVal = (mem[addr] ?? 0) & 0x0f;
        let val = prevVal;
        if (!wasHigh && clkHigh && we) {
          val =
            (readLogicPin(c.id, 'd3') << 3) |
            (readLogicPin(c.id, 'd2') << 2) |
            (readLogicPin(c.id, 'd1') << 1) |
            readLogicPin(c.id, 'd0');
          mem[addr] = val;
          if (val !== prevVal) seqChanged = true;
        }
        simState.prevClockHigh[c.id] = clkHigh;
        logicDriveOut.set(pinKey(c.id, 'q3'), (val >> 3) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q2'), (val >> 2) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q1'), (val >> 1) & 1 ? 5 : 0);
        logicDriveOut.set(pinKey(c.id, 'q0'), val & 1 ? 5 : 0);
      }
    }
    return seqChanged;
  };

  // Pre-MNA logic evaluation + sequential clock update (followed by combinational feedback pass for async RST)
  runCombinationalPropagation(simState.lastNodeVoltages);
  if (stepSequentialElements(simState.lastNodeVoltages)) {
    runCombinationalPropagation(simState.lastNodeVoltages);
  }

  // 4. Identify Voltage Sources, Transformers (MNA branch currents) & Nonlinear Components
  const voltageBranches: VoltageBranch[] = [];
  const transformerBranches: TransformerBranch[] = [];
  let hasNonlinear = false;

  for (const c of components) {
    if (c.type === 'DC_SOURCE') {
      voltageBranches.push({
        componentId: c.id,
        nPos: getNode(c.id, 'pos'),
        nNeg: getNode(c.id, 'neg'),
        voltage: Number(c.props.voltage ?? 5),
        rInt: 0.01,
        branchIdx: voltageBranches.length,
      });
    } else if (c.type === 'AC_SOURCE' || c.type === 'INF_SOURCE') {
      const wf = String(c.props.waveform ?? (c.type === 'INF_SOURCE' ? 'dc' : 'sine'));
      let vOut = 0;
      if (c.type === 'INF_SOURCE' && wf === 'dc') {
        vOut = Number(c.props.voltage ?? 12);
      } else {
        const amp =
          c.type === 'INF_SOURCE'
            ? Number(c.props.voltage ?? 12)
            : Number(c.props.amplitude ?? 5);
        const freq = Number(c.props.frequency ?? 2);
        const phaseRad = (Number(c.props.phase ?? 0) * Math.PI) / 180;
        const dcOff = c.type === 'INF_SOURCE' ? 0 : Number(c.props.dcOffset ?? 0);
        const angle = 2 * Math.PI * freq * timeNext + phaseRad;
        const ac =
          wf === 'square'
            ? Math.sin(angle) >= 0
              ? amp
              : -amp
            : amp * Math.sin(angle);
        vOut = dcOff + ac;
      }
      voltageBranches.push({
        componentId: c.id,
        nPos: getNode(c.id, 'pos'),
        nNeg: getNode(c.id, 'neg'),
        voltage: vOut,
        rInt: c.type === 'INF_SOURCE' ? 1e-5 : 0.01,
        branchIdx: voltageBranches.length,
      });
    } else if (c.type === 'TRANSFORMER') {
      const ratio = Math.max(0.05, Number(c.props.ratio ?? 2.0));
      transformerBranches.push({
        componentId: c.id,
        nP1: getNode(c.id, 'p1'),
        nP2: getNode(c.id, 'p2'),
        nS1: getNode(c.id, 's1'),
        nS2: getNode(c.id, 's2'),
        ratio,
        branchIdx: transformerBranches.length,
      });
    } else if (
      c.type === 'DIODE' ||
      c.type === 'ZENER_DIODE' ||
      c.type === 'LED' ||
      c.type === 'BJT_NPN' ||
      c.type === 'NMOS' ||
      c.type === 'OPAMP'
    ) {
      hasNonlinear = true;
    }
  }

  const dim = numNodes + voltageBranches.length + transformerBranches.length;
  const maxNrIters = hasNonlinear ? 80 : 1;

  // Initial voltage guess for NR
  const prevGuess = new Array<number>(dim).fill(0);
  for (const c of components) {
    for (const p of getComponentPins(c)) {
      const n = getNode(c.id, p.id);
      if (n > 0) {
        prevGuess[n - 1] = simState.lastNodeVoltages[pinKey(c.id, p.id)] ?? 0;
      }
    }
  }

  // Track nonlinear state across NR iterations for pnjlim
  const diodePrevVd = new Map<string, number>();
  const zenerPrevVd = new Map<string, number>();
  const bjtPrevVbe = new Map<string, number>();
  const bjtPrevVbc = new Map<string, number>();
  const nmosPrevVgs = new Map<string, number>();
  const nmosPrevVds = new Map<string, number>();
  const opampPrevVd = new Map<string, number>();
  const opampZeroCrossCount = new Map<string, number>();

  for (const c of components) {
    if (c.type === 'DIODE' || c.type === 'LED') {
      const nA = getNode(c.id, 'anode');
      const nK = getNode(c.id, 'cathode');
      const vA = nA > 0 ? prevGuess[nA - 1] : 0;
      const vK = nK > 0 ? prevGuess[nK - 1] : 0;
      diodePrevVd.set(c.id, Math.min(2.5, Math.max(-5, vA - vK)));
    } else if (c.type === 'ZENER_DIODE') {
      const nA = getNode(c.id, 'a');
      const nK = getNode(c.id, 'k');
      const vA = nA > 0 ? prevGuess[nA - 1] : 0;
      const vK = nK > 0 ? prevGuess[nK - 1] : 0;
      const vz = Math.max(1.2, Number(c.props.vz ?? 5.1));
      zenerPrevVd.set(c.id, Math.min(2.5, Math.max(-vz - 1, vA - vK)));
    } else if (c.type === 'BJT_NPN') {
      const nB = getNode(c.id, 'b');
      const nC = getNode(c.id, 'c');
      const nE = getNode(c.id, 'e');
      const vB = nB > 0 ? prevGuess[nB - 1] : 0;
      const vC = nC > 0 ? prevGuess[nC - 1] : 0;
      const vE = nE > 0 ? prevGuess[nE - 1] : 0;
      bjtPrevVbe.set(c.id, Math.min(1.0, Math.max(-5, vB - vE)));
      bjtPrevVbc.set(c.id, Math.min(1.0, Math.max(-15, vB - vC)));
    } else if (c.type === 'NMOS') {
      const nG = getNode(c.id, 'g');
      const nD = getNode(c.id, 'd');
      const nS = getNode(c.id, 's');
      const vG = nG > 0 ? prevGuess[nG - 1] : 0;
      const vD = nD > 0 ? prevGuess[nD - 1] : 0;
      const vS = nS > 0 ? prevGuess[nS - 1] : 0;
      nmosPrevVgs.set(c.id, Math.min(15, Math.max(-10, vG - vS)));
      nmosPrevVds.set(c.id, Math.min(30, Math.max(-10, vD - vS)));
    } else if (c.type === 'OPAMP') {
      const nP = getNode(c.id, 'inp');
      const nM = getNode(c.id, 'inm');
      const vP = nP > 0 ? prevGuess[nP - 1] : 0;
      const vM = nM > 0 ? prevGuess[nM - 1] : 0;
      opampPrevVd.set(c.id, vP - vM);
    }
  }

  const uninitialized555Ids = new Set<string>();
  for (const c of components) {
    if (c.type === 'TIMER_555' && simState.timer555States[c.id] === undefined) {
      simState.timer555States[c.id] = 0;
      uninitialized555Ids.add(c.id);
    }
  }

  let solution = new Array<number>(dim).fill(0);
  let converged = true;
  const maxMxPasses = hasDigitalOrTimer555 ? 4 : 1;

  for (let mxPass = 0; mxPass < maxMxPasses; mxPass++) {
    const preMnaDriveSnapshot = hasDigitalOrTimer555 ? new Map(logicDriveOut) : null;
    if (mxPass > 0) {
      for (let i = 0; i < dim; i++) {
        prevGuess[i] = solution[i] ?? 0;
      }
    }

    for (let nrIter = 0; nrIter < maxNrIters; nrIter++) {
    const A: number[][] = Array.from({ length: dim }, () => new Array<number>(dim).fill(0));
    const b: number[] = new Array<number>(dim).fill(0);

    const stampG = (n1: number, n2: number, g: number) => {
      if (n1 > 0) A[n1 - 1][n1 - 1] += g;
      if (n2 > 0) A[n2 - 1][n2 - 1] += g;
      if (n1 > 0 && n2 > 0) {
        A[n1 - 1][n2 - 1] -= g;
        A[n2 - 1][n1 - 1] -= g;
      }
    };

    const stampI = (nFrom: number, nTo: number, iVal: number) => {
      // Current iVal flows from nFrom -> nTo
      if (nFrom > 0) b[nFrom - 1] -= iVal;
      if (nTo > 0) b[nTo - 1] += iVal;
    };

    // Anti-singularity GMIN on every node
    const GMIN = 1e-12;
    for (let i = 0; i < numNodes; i++) {
      A[i][i] += GMIN;
    }

    // Stamp MNA Voltage Sources
    for (const vs of voltageBranches) {
      const row = numNodes + vs.branchIdx;
      if (vs.nPos > 0) {
        A[vs.nPos - 1][row] += 1;
        A[row][vs.nPos - 1] += 1;
      }
      if (vs.nNeg > 0) {
        A[vs.nNeg - 1][row] -= 1;
        A[row][vs.nNeg - 1] -= 1;
      }
      A[row][row] -= vs.rInt;
      b[row] += vs.voltage;
    }

    // Stamp MNA Ideal Coupled Transformers: (Vs1 - Vs2) - ratio * (Vp1 - Vp2) - rSec * x = 0
    for (const tb of transformerBranches) {
      const row = numNodes + voltageBranches.length + tb.branchIdx;
      if (tb.nS1 > 0) {
        A[tb.nS1 - 1][row] += 1;
        A[row][tb.nS1 - 1] += 1;
      }
      if (tb.nS2 > 0) {
        A[tb.nS2 - 1][row] -= 1;
        A[row][tb.nS2 - 1] -= 1;
      }
      if (tb.nP1 > 0) {
        A[tb.nP1 - 1][row] -= tb.ratio;
        A[row][tb.nP1 - 1] -= tb.ratio;
      }
      if (tb.nP2 > 0) {
        A[tb.nP2 - 1][row] += tb.ratio;
        A[row][tb.nP2 - 1] += tb.ratio;
      }
      A[row][row] -= 0.01; // Tiny secondary coil resistance
      // Safety galvanic isolation bleed to prevent singular common-mode float
      stampG(tb.nP2, 0, 1e-9);
      stampG(tb.nS2, 0, 1e-9);
    }

    // Stamp components
    for (const c of components) {
      switch (c.type) {
        case 'RESISTOR': {
          const r = Math.max(0.01, Number(c.props.resistance ?? 220));
          stampG(getNode(c.id, 'a'), getNode(c.id, 'b'), 1 / r);
          break;
        }
        case 'INF_RESISTOR': {
          if (c.props.idealInfinite === false) {
            const r = Math.max(1e-6, Number(c.props.resistance ?? 1e12));
            stampG(getNode(c.id, 'p1'), getNode(c.id, 'p2'), 1 / r);
          }
          break;
        }
        case 'LAMP': {
          const vRated = Math.max(0.5, Number(c.props.ratedVoltage ?? 5));
          const pRated = Math.max(0.05, Number(c.props.ratedPower ?? 1.5));
          const rLamp = Math.max(0.5, (vRated * vRated) / pRated);
          stampG(getNode(c.id, 'p1'), getNode(c.id, 'p2'), 1 / rLamp);
          break;
        }
        case 'FUSE': {
          const blown = Boolean(c.props.blown) || Boolean(simState.blownFuses[c.id]);
          const gFuse = blown ? 1e-9 : 1 / 0.02;
          stampG(getNode(c.id, 'p1'), getNode(c.id, 'p2'), gFuse);
          break;
        }
        case 'POTENTIOMETER': {
          const rTotal = Math.max(1, Number(c.props.resistance ?? 1000));
          const ratio = Math.min(0.995, Math.max(0.005, Number(c.props.ratio ?? 0.5)));
          const r1 = rTotal * ratio;
          const r2 = rTotal * (1 - ratio);
          const nA = getNode(c.id, 'a');
          const nW = getNode(c.id, 'wiper');
          const nB = getNode(c.id, 'b');
          stampG(nA, nW, 1 / r1);
          stampG(nW, nB, 1 / r2);
          break;
        }
        case 'SWITCH_SPST': {
          const closed = Boolean(c.props.closed ?? true);
          const g = closed ? 1 / 0.005 : 1e-9;
          stampG(getNode(c.id, 'a'), getNode(c.id, 'b'), g);
          break;
        }
        case 'SWITCH_SPDT': {
          const pos = Number(c.props.position ?? 0);
          const nCom = getNode(c.id, 'com');
          const nNc = getNode(c.id, 'nc');
          const nNo = getNode(c.id, 'no');
          stampG(nCom, nNc, pos === 0 ? 1 / 0.005 : 1e-9);
          stampG(nCom, nNo, pos === 1 ? 1 / 0.005 : 1e-9);
          break;
        }
        case 'VOLTMETER': {
          stampG(getNode(c.id, 'pos'), getNode(c.id, 'neg'), 1 / 1e7);
          break;
        }
        case 'AMMETER': {
          stampG(getNode(c.id, 'pos'), getNode(c.id, 'neg'), 1 / 0.005);
          break;
        }
        case 'CURRENT_SOURCE': {
          const iVal = Number(c.props.current ?? 0.02);
          const nNeg = getNode(c.id, 'neg');
          const nPos = getNode(c.id, 'pos');
          // Delivers iVal from neg -> pos internally (leaves pos externally)
          stampI(nNeg, nPos, iVal);
          stampG(nPos, nNeg, 1e-9);
          break;
        }
        case 'CAPACITOR': {
          const cFarads = Math.max(1e-12, Number(c.props.capacitance ?? 100) * 1e-6);
          const nP = getNode(c.id, 'pos');
          const nN = getNode(c.id, 'neg');
          const vPrev = simState.capVoltages[c.id] ?? 0;
          if (dt > 0) {
            const gC = cFarads / dt;
            const iHist = gC * vPrev;
            stampG(nP, nN, gC);
            // Companion model: I_C = gC * (Vp - Vn) - gC * vPrev
            // Equivalent Norton current source pushing from nN -> nP of value iHist
            stampI(nN, nP, iHist);
          } else if (zeroDtMode === 'holdState') {
            // Instantaneous t = 0_+ recompute preserving u_C(0_+) = u_C(0_-)
            stampG(nP, nN, CAP_HOLD_G);
            stampI(nN, nP, CAP_HOLD_G * vPrev);
          } else {
            // DC Steady State (dt === 0): capacitor is open circuit with high bleed resistor
            stampG(nP, nN, 1e-9);
          }
          break;
        }
        case 'INDUCTOR': {
          const lHenries = Math.max(1e-9, Number(c.props.inductance ?? 100) * 1e-3);
          const nA = getNode(c.id, 'a');
          const nB = getNode(c.id, 'b');
          const iPrev = simState.indCurrents[c.id] ?? 0;
          if (dt > 0) {
            // Backward Euler: V_L = (L/dt + R_coil) * I_L - (L/dt) * iPrev
            const rEff = lHenries / dt + IND_COIL_R;
            const gL = 1 / rEff;
            const vHist = (lHenries / dt) * iPrev;
            stampG(nA, nB, gL);
            // I_L = gL * (Va - Vb) + gL * vHist
            // Norton current flowing from nA -> nB of value gL * vHist
            stampI(nA, nB, gL * vHist);
          } else if (zeroDtMode === 'holdState') {
            // Instantaneous t = 0_+ recompute preserving i_L(0_+) = i_L(0_-)
            stampG(nA, nB, IND_HOLD_G);
            stampI(nA, nB, iPrev);
          } else {
            // DC Steady State: inductor behaves like small coil resistance 0.02 Ohm
            stampG(nA, nB, 1 / IND_COIL_R);
          }
          break;
        }
        case 'DIODE':
        case 'LED': {
          const nA = getNode(c.id, 'anode');
          const nK = getNode(c.id, 'cathode');
          const vd = diodePrevVd.get(c.id) ?? 0;
          const params =
            c.type === 'LED'
              ? getLedParams(String(c.props.color ?? 'red'))
              : { isVal: 1e-12, nFactor: 1.2 };
          const { i, g } = evalDiode(vd, params.isVal, params.nFactor);
          const iEq = i - g * vd;
          stampG(nA, nK, g);
          stampI(nA, nK, iEq);
          break;
        }
        case 'ZENER_DIODE': {
          const nA = getNode(c.id, 'a');
          const nK = getNode(c.id, 'k');
          const vz = Math.max(1.2, Number(c.props.vz ?? 5.1));
          const vd = zenerPrevVd.get(c.id) ?? 0;
          const { i, g } = evalZener(vd, vz);
          const iEq = i - g * vd;
          stampG(nA, nK, g + 1e-12);
          stampI(nA, nK, iEq);
          break;
        }
        case 'NMOS': {
          const nG = getNode(c.id, 'g');
          const nD = getNode(c.id, 'd');
          const nS = getNode(c.id, 's');
          const vth = Number(c.props.vth ?? 2.0);
          const kp = Math.max(1e-4, Number(c.props.kp ?? 0.08));
          const vgs0 = nmosPrevVgs.get(c.id) ?? 0;
          const vds0 = nmosPrevVds.get(c.id) ?? 0;
          const { id, gm, gds } = evalNmos(vgs0, vds0, vth, kp);
          const iEq = id - gm * vgs0 - gds * vds0;

          stampG(nG, nS, 1e-9);
          stampG(nG, 0, 1e-9);
          stampG(nD, nS, gds);
          if (nD > 0) {
            if (nG > 0) A[nD - 1][nG - 1] += gm;
            if (nS > 0) A[nD - 1][nS - 1] -= gm;
          }
          if (nS > 0) {
            if (nG > 0) A[nS - 1][nG - 1] -= gm;
            if (nS > 0) A[nS - 1][nS - 1] += gm;
          }
          stampI(nD, nS, iEq);
          break;
        }
        case 'BJT_NPN': {
          const nB = getNode(c.id, 'b');
          const nC = getNode(c.id, 'c');
          const nE = getNode(c.id, 'e');
          const betaF = Math.max(10, Number(c.props.beta ?? 100));
          const betaR = 2;
          const alphaF = betaF / (1 + betaF);
          const alphaR = betaR / (1 + betaR);
          const isSat = 1e-12;
          const iES = isSat / alphaF;
          const iCS = isSat / alphaR;

          const vbe = bjtPrevVbe.get(c.id) ?? 0;
          const vbc = bjtPrevVbc.get(c.id) ?? 0;

          const evBE = evalDiode(vbe, iES, 1.0);
          const evBC = evalDiode(vbc, iCS, 1.0);

          const iBE0 = evBE.i - evBE.g * vbe;
          const iBC0 = evBC.i - evBC.g * vbc;

          // Base-Emitter diode
          stampG(nB, nE, (1 - alphaF) * evBE.g + 1e-9);
          stampI(nB, nE, (1 - alphaF) * iBE0);

          // Base-Collector diode
          stampG(nB, nC, (1 - alphaR) * evBC.g + 1e-9);
          stampI(nB, nC, (1 - alphaR) * iBC0);

          // Collector-Emitter controlled transport current: I_trans = alphaF * I_BE - alphaR * I_BC (from C to E)
          // Linearized: g_m_f * Vbe - g_m_r * Vbc + I_trans0
          const gmf = alphaF * evBE.g;
          const gmr = alphaR * evBC.g;
          const iTrans0 = alphaF * iBE0 - alphaR * iBC0;

          // Stamp VCCS gmf * (Vb - Ve) flowing from C -> E
          if (nC > 0) {
            if (nB > 0) A[nC - 1][nB - 1] += gmf;
            if (nE > 0) A[nC - 1][nE - 1] -= gmf;
          }
          if (nE > 0) {
            if (nB > 0) A[nE - 1][nB - 1] -= gmf;
            if (nE > 0) A[nE - 1][nE - 1] += gmf;
          }

          // Stamp VCCS -gmr * (Vb - Vc) flowing from C -> E  (= gmr*(Vc - Vb) from C->E)
          if (nC > 0) {
            if (nC > 0) A[nC - 1][nC - 1] += gmr;
            if (nB > 0) A[nC - 1][nB - 1] -= gmr;
          }
          if (nE > 0) {
            if (nC > 0) A[nE - 1][nC - 1] -= gmr;
            if (nB > 0) A[nE - 1][nB - 1] += gmr;
          }

          stampI(nC, nE, iTrans0);
          stampG(nC, nE, 1e-8);
          break;
        }
        case 'OPAMP': {
          const nP = getNode(c.id, 'inp');
          const nM = getNode(c.id, 'inm');
          const nOut = getNode(c.id, 'out');
          const railPos = Number(c.props.railPos ?? 12);
          const railNeg = Number(c.props.railNeg ?? -12);
          const gain = Math.max(100, Number(c.props.gain ?? 50000));
          const vMid = (railPos + railNeg) / 2;
          const vHalf = Math.max(0.1, (railPos - railNeg) / 2);

          // Differential input resistance 10 MOhm + common-mode bleed to GND
          stampG(nP, nM, 1e-7);
          stampG(nP, 0, 1e-9);
          stampG(nM, 0, 1e-9);

          const vd0 = opampPrevVd.get(c.id) ?? 0;
          const arg = (gain * vd0) / vHalf;
          const clampedArg = Math.max(-20, Math.min(20, arg));
          const th = Math.tanh(clampedArg);
          const vTarget0 = vMid + vHalf * th;
          const gmSlope = gain * (1 - th * th);

          const rOut = 1.0;
          const gOut = 1 / rOut;
          // Out equation: gOut * Vout - gOut * (vTarget0 + gmSlope * (Vp - Vm - vd0)) = 0
          if (nOut > 0) {
            A[nOut - 1][nOut - 1] += gOut;
            if (nP > 0) A[nOut - 1][nP - 1] -= gOut * gmSlope;
            if (nM > 0) A[nOut - 1][nM - 1] += gOut * gmSlope;
            b[nOut - 1] += gOut * (vTarget0 - gmSlope * vd0);
          }
          break;
        }
        case 'LOGIC_IN':
        case 'CLOCK': {
          const vDrive = logicDriveOut.get(pinKey(c.id, 'out')) ?? 0;
          const nOut = getNode(c.id, 'out');
          const gOut = 1 / 10; // 10 Ohm output impedance
          stampG(nOut, 0, gOut);
          stampI(0, nOut, gOut * vDrive);
          break;
        }
        case 'LOGIC_OUT': {
          stampG(getNode(c.id, 'in'), 0, 1e-6); // 1 MOhm probe impedance
          break;
        }
        case 'HEX_DISPLAY':
        case 'NIXIE_TUBE': {
          for (const pid of ['d3', 'd2', 'd1', 'd0']) {
            stampG(getNode(c.id, pid), 0, 1e-5);
          }
          break;
        }
        case 'AND':
        case 'OR':
        case 'NAND':
        case 'NOR':
        case 'XOR':
        case 'XNOR': {
          stampG(getNode(c.id, 'a'), 0, 1e-5);
          stampG(getNode(c.id, 'b'), 0, 1e-5);
          const vY = logicDriveOut.get(pinKey(c.id, 'y')) ?? 0;
          const nY = getNode(c.id, 'y');
          const gOut = 1 / 25;
          stampG(nY, 0, gOut);
          stampI(0, nY, gOut * vY);
          break;
        }
        case 'NOT': {
          stampG(getNode(c.id, 'a'), 0, 1e-5);
          const vY = logicDriveOut.get(pinKey(c.id, 'y')) ?? 0;
          const nY = getNode(c.id, 'y');
          const gOut = 1 / 25;
          stampG(nY, 0, gOut);
          stampI(0, nY, gOut * vY);
          break;
        }
        case 'HALF_ADDER': {
          stampG(getNode(c.id, 'a'), 0, 1e-5);
          stampG(getNode(c.id, 'b'), 0, 1e-5);
          for (const pid of ['s', 'c']) {
            const vOut = logicDriveOut.get(pinKey(c.id, pid)) ?? 0;
            const nOut = getNode(c.id, pid);
            const gOut = 1 / 25;
            stampG(nOut, 0, gOut);
            stampI(0, nOut, gOut * vOut);
          }
          break;
        }
        case 'FULL_ADDER': {
          stampG(getNode(c.id, 'a'), 0, 1e-5);
          stampG(getNode(c.id, 'b'), 0, 1e-5);
          stampG(getNode(c.id, 'cin'), 0, 1e-5);
          for (const pid of ['s', 'cout']) {
            const vOut = logicDriveOut.get(pinKey(c.id, pid)) ?? 0;
            const nOut = getNode(c.id, pid);
            const gOut = 1 / 25;
            stampG(nOut, 0, gOut);
            stampI(0, nOut, gOut * vOut);
          }
          break;
        }
        case 'D_FF':
        case 'JK_FF': {
          const inPins = c.type === 'JK_FF' ? ['j', 'clk', 'k'] : ['d', 'clk'];
          for (const pid of inPins) stampG(getNode(c.id, pid), 0, 1e-5);
          for (const pid of ['q', 'qn']) {
            const vOut = logicDriveOut.get(pinKey(c.id, pid)) ?? 0;
            const nOut = getNode(c.id, pid);
            const gOut = 1 / 25;
            stampG(nOut, 0, gOut);
            stampI(0, nOut, gOut * vOut);
          }
          break;
        }
        case 'MUX_2_1': {
          for (const pid of ['d0', 'd1', 'sel']) stampG(getNode(c.id, pid), 0, 1e-5);
          const vY = logicDriveOut.get(pinKey(c.id, 'y')) ?? 0;
          const nY = getNode(c.id, 'y');
          const gOut = 1 / 25;
          stampG(nY, 0, gOut);
          stampI(0, nY, gOut * vY);
          break;
        }
        case 'COUNTER_4BIT': {
          for (const pid of ['clk', 'rst']) stampG(getNode(c.id, pid), 0, 1e-5);
          for (const pid of ['q3', 'q2', 'q1', 'q0']) {
            const vOut = logicDriveOut.get(pinKey(c.id, pid)) ?? 0;
            const nOut = getNode(c.id, pid);
            const gOut = 1 / 25;
            stampG(nOut, 0, gOut);
            stampI(0, nOut, gOut * vOut);
          }
          break;
        }
        case 'ENCODER_4_2':
        case 'DECODER_2_4':
        case 'MUX_4BIT':
        case 'REGISTER_4BIT':
        case 'ALU_4BIT':
        case 'RAM_16X4':
        case 'CUSTOM_TRUTH_8':
        case 'CUSTOM_TRUTH_16': {
          const pins = getComponentPins(c);
          for (const p of pins) {
            if (p.role === 'logic_out') {
              const vOut = logicDriveOut.get(pinKey(c.id, p.id)) ?? 0;
              const nOut = getNode(c.id, p.id);
              const gOut = 1 / 25;
              stampG(nOut, 0, gOut);
              stampI(0, nOut, gOut * vOut);
            } else {
              stampG(getNode(c.id, p.id), 0, 1e-5);
            }
          }
          break;
        }
        case 'IC_PORT_IN': {
          if (c.props.__packagedPort) {
            stampG(getNode(c.id, 'io'), 0, 1e-9);
          } else {
            const vDrive = logicDriveOut.get(pinKey(c.id, 'io')) ?? 0;
            const nOut = getNode(c.id, 'io');
            const gOut = 1 / 10;
            stampG(nOut, 0, gOut);
            stampI(0, nOut, gOut * vDrive);
          }
          break;
        }
        case 'IC_PORT_OUT': {
          stampG(getNode(c.id, 'io'), 0, c.props.__packagedPort ? 1e-9 : 1e-6);
          break;
        }
        case 'TIMER_555': {
          const nVcc = getNode(c.id, 'vcc');
          const nGnd = getNode(c.id, 'gnd');
          const nTrig = getNode(c.id, 'trig');
          const nThres = getNode(c.id, 'thres');
          const nDis = getNode(c.id, 'dis');
          const nOut = getNode(c.id, 'out');
          const q = (simState.timer555States[c.id] ?? 0) ? 1 : 0;

          // Internal 3x5kOhm reference ladder + comparator input loads
          stampG(nVcc, nGnd, 1 / 15000);
          stampG(nTrig, nGnd, 1e-6);
          stampG(nThres, nGnd, 1e-6);

          // Push-pull output stage referencing VCC & GND rails
          if (q === 1) {
            stampG(nOut, nVcc, 1 / 20);
            stampG(nOut, nGnd, 1e-7);
          } else {
            stampG(nOut, nGnd, 1 / 20);
            stampG(nOut, nVcc, 1e-7);
          }

          // Open-collector discharge NPN to GND (ON when Q=0)
          stampG(nDis, nGnd, q === 0 ? 1 / 12 : 1e-8);
          break;
        }
      }
    }

    const solved = solveLinearSystem(A, b);
    if (!solved) {
      converged = false;
      break;
    }
    solution = solved;

    if (!hasNonlinear) break;

    // Update nonlinear states with pnjlim & check convergence
    let maxDelta = 0;
    const nodeV = (n: number) => (n > 0 ? solution[n - 1] : 0);

    for (const c of components) {
      if (c.type === 'DIODE' || c.type === 'LED') {
        const vNewRaw = nodeV(getNode(c.id, 'anode')) - nodeV(getNode(c.id, 'cathode'));
        const vOld = diodePrevVd.get(c.id) ?? 0;
        const vt = c.type === 'LED' ? 0.02585 * 2.2 : 0.02585 * 1.2;
        const vCrit = vt * Math.log(vt / (1e-12 * Math.SQRT2));
        const vLim = spicePnjLim(vNewRaw, vOld, vt, vCrit);
        maxDelta = Math.max(maxDelta, Math.abs(vNewRaw - vOld));
        diodePrevVd.set(c.id, vLim);
      } else if (c.type === 'ZENER_DIODE') {
        const vNewRaw = nodeV(getNode(c.id, 'a')) - nodeV(getNode(c.id, 'k'));
        const vOld = zenerPrevVd.get(c.id) ?? 0;
        const vz = Math.max(1.2, Number(c.props.vz ?? 5.1));
        const vShift = Math.max(0.5, vz - 0.595);
        const vt = 0.02585 * 1.1;
        const vCrit = vt * Math.log(vt / (1e-12 * Math.SQRT2));
        let vLim = vNewRaw;
        if (vNewRaw > 0.3) {
          vLim = spicePnjLim(vNewRaw, vOld, vt, vCrit);
        } else if (vNewRaw < -vShift + 0.3) {
          const uLim = spicePnjLim(-vNewRaw - vShift, -vOld - vShift, vt, vCrit);
          vLim = -(uLim + vShift);
        }
        maxDelta = Math.max(maxDelta, Math.abs(vNewRaw - vOld));
        zenerPrevVd.set(c.id, vLim);
      } else if (c.type === 'BJT_NPN') {
        const vB = nodeV(getNode(c.id, 'b'));
        const vC = nodeV(getNode(c.id, 'c'));
        const vE = nodeV(getNode(c.id, 'e'));
        const vbeRaw = vB - vE;
        const vbcRaw = vB - vC;
        const vbeOld = bjtPrevVbe.get(c.id) ?? 0;
        const vbcOld = bjtPrevVbc.get(c.id) ?? 0;
        const vt = 0.02585;
        const vCrit = vt * Math.log(vt / (1e-12 * Math.SQRT2));
        const vbeLim = spicePnjLim(vbeRaw, vbeOld, vt, vCrit);
        const vbcLim = spicePnjLim(vbcRaw, vbcOld, vt, vCrit);
        maxDelta = Math.max(
          maxDelta,
          Math.abs(vbeRaw - vbeOld),
          Math.abs(vbcRaw - vbcOld)
        );
        bjtPrevVbe.set(c.id, vbeLim);
        bjtPrevVbc.set(c.id, vbcLim);
      } else if (c.type === 'NMOS') {
        const vG = nodeV(getNode(c.id, 'g'));
        const vD = nodeV(getNode(c.id, 'd'));
        const vS = nodeV(getNode(c.id, 's'));
        const vgsRaw = vG - vS;
        const vdsRaw = vD - vS;
        const vgsOld = nmosPrevVgs.get(c.id) ?? 0;
        const vdsOld = nmosPrevVds.get(c.id) ?? 0;
        const clampStep = (raw: number, old: number) =>
          Math.abs(raw - old) > 1.5 ? old + 1.5 * Math.sign(raw - old) : raw;
        const vgsLim = clampStep(vgsRaw, vgsOld);
        const vdsLim = clampStep(vdsRaw, vdsOld);
        maxDelta = Math.max(
          maxDelta,
          Math.abs(vgsRaw - vgsOld),
          Math.abs(vdsRaw - vdsOld)
        );
        nmosPrevVgs.set(c.id, vgsLim);
        nmosPrevVds.set(c.id, vdsLim);
      } else if (c.type === 'OPAMP') {
        const railPos = Number(c.props.railPos ?? 12);
        const railNeg = Number(c.props.railNeg ?? -12);
        const gain = Math.max(100, Number(c.props.gain ?? 50000));
        const vHalf = Math.max(0.1, (railPos - railNeg) / 2);
        const vLin = vHalf / gain;
        const vdRaw = nodeV(getNode(c.id, 'inp')) - nodeV(getNode(c.id, 'inm'));
        const vdOld = opampPrevVd.get(c.id) ?? 0;
        const diff = vdRaw - vdOld;
        let damped: number;
        if (vdOld * vdRaw < 0 && (Math.abs(vdOld) > 2 * vLin || Math.abs(vdRaw) > 2 * vLin)) {
          const zc = (opampZeroCrossCount.get(c.id) ?? 0) + 1;
          opampZeroCrossCount.set(c.id, zc);
          damped = zc <= 2 ? 0 : Math.abs(diff) > 0.2 ? vdOld + 0.5 * diff : vdRaw;
        } else {
          damped = Math.abs(diff) > 0.2 ? vdOld + 0.5 * diff : vdRaw;
        }
        maxDelta = Math.max(maxDelta, Math.abs(diff));
        opampPrevVd.set(c.id, damped);
      }
    }

      if (maxDelta < 1e-5) {
        break;
      }
    }

    if (!hasDigitalOrTimer555 || mxPass + 1 >= maxMxPasses) {
      break;
    }

    const solvedReadV = (cid: string, pid: string): number => {
      const n = getNode(cid, pid);
      return n > 0 && n <= numNodes ? solution[n - 1] : 0;
    };
    const solvedVoltagesByPin: Record<string, number> = {};
    for (const c of components) {
      for (const p of getComponentPins(c)) {
        solvedVoltagesByPin[pinKey(c.id, p.id)] = solvedReadV(c.id, p.id);
      }
    }

    let needMxResolve = false;
    for (const c of components) {
      if (c.type !== 'TIMER_555') continue;
      if (dt === 0 || uninitialized555Ids.has(c.id)) {
        const prevQ = (simState.timer555States[c.id] ?? 0) ? 1 : 0;
        const nextQ = evalTimer555Q(c, solvedReadV, prevQ);
        uninitialized555Ids.delete(c.id);
        if (nextQ !== prevQ) {
          simState.timer555States[c.id] = nextQ;
          needMxResolve = true;
        }
      }
    }

    runCombinationalPropagation(solvedVoltagesByPin);
    if (stepSequentialElements(solvedVoltagesByPin)) {
      runCombinationalPropagation(solvedVoltagesByPin);
    }

    if (preMnaDriveSnapshot) {
      if (logicDriveOut.size !== preMnaDriveSnapshot.size) {
        needMxResolve = true;
      } else {
        for (const [k, v] of logicDriveOut.entries()) {
          if (preMnaDriveSnapshot.get(k) !== v) {
            needMxResolve = true;
            break;
          }
        }
      }
    }

    if (!needMxResolve) {
      break;
    }
  }

  // 5. Extract node voltages & update transient state
  const getV = (componentId: string, pinId: string): number => {
    const n = getNode(componentId, pinId);
    return n > 0 && n <= numNodes ? solution[n - 1] : 0;
  };

  const nodeVoltagesByPinKey: Record<string, number> = {};
  for (const c of components) {
    for (const p of getComponentPins(c)) {
      const pk = pinKey(c.id, p.id);
      const v = getV(c.id, p.id);
      nodeVoltagesByPinKey[pk] = v;
      simState.lastNodeVoltages[pk] = v;
    }
  }

  const preCapVoltages: Record<string, number> = {};
  for (const c of components) {
    if (c.type === 'CAPACITOR') {
      preCapVoltages[c.id] = simState.capVoltages[c.id] ?? 0;
    }
  }

  if (dt > 0) {
    simState.time = timeNext;
    for (const c of components) {
      if (c.type === 'CAPACITOR') {
        simState.capVoltages[c.id] = getV(c.id, 'pos') - getV(c.id, 'neg');
      } else if (c.type === 'INDUCTOR') {
        const lHenries = Math.max(1e-9, Number(c.props.inductance ?? 100) * 1e-3);
        const vL = getV(c.id, 'a') - getV(c.id, 'b');
        const iPrev = simState.indCurrents[c.id] ?? 0;
        const rEff = lHenries / dt + 0.02;
        simState.indCurrents[c.id] = (vL + (lHenries / dt) * iPrev) / rEff;
      }
    }
  }

  const { telemetryById, warnings, pinCurrentIn } = computeComponentTelemetry({
    components, simState, getV, solution, numNodes, voltageBranches, transformerBranches, dt, zeroDtMode, preCapVoltages, logicDriveOut
  });

  if (dt > 0) {
    for (const c of components) {
      if (c.type === 'TIMER_555') {
        const prevQ = (simState.timer555States[c.id] ?? 0) ? 1 : 0;
        simState.timer555States[c.id] = evalTimer555Q(c, getV, prevQ);
      }
    }
  }

  // Synthesize top-level CUSTOM_IC telemetry from flattened child telemetry & port anchors
  if (expanded.hasExpanded) {
    for (const topIc of circuit.components) {
      if (topIc.type !== 'CUSTOM_IC') continue;
      const payload = parseCustomIcPayload(topIc);
      const pins = getComponentPins(topIc);
      const pinVoltages: Record<string, number> = {};
      let firstOutState = 0;
      let sawOut = false;
      for (const p of pins) {
        const anchor = expanded.portAnchorMap.get(pinKey(topIc.id, p.id));
        const v = anchor
          ? (nodeVoltagesByPinKey[pinKey(anchor.anchorCompId, anchor.pinId)] ?? 0)
          : 0;
        pinVoltages[p.id] = v;
        nodeVoltagesByPinKey[pinKey(topIc.id, p.id)] = v;
        if (p.role === 'logic_out' && !sawOut) {
          firstOutState = v >= 2.5 ? 1 : 0;
          sawOut = true;
        }
      }
      const childIds = expanded.childrenByIcId.get(topIc.id) ?? [];
      let totalPower = 0;
      let anyOverload = false;
      for (const cid of childIds) {
        const childTel = telemetryById[cid];
        if (childTel) {
          totalPower += childTel.power;
          if (childTel.overloaded) anyOverload = true;
        }
      }
      const maxPower = Number(topIc.props.maxPower ?? 10.0);
      telemetryById[topIc.id] = {
        componentId: topIc.id,
        pinVoltages,
        voltageDrop: Object.values(pinVoltages)[0] ?? 0,
        current: 0,
        power: totalPower,
        maxPower,
        loadRatio: maxPower > 0 ? totalPower / maxPower : 0,
        overloaded: anyOverload,
        logicState: firstOutState,
        extraInfo: `封装芯片「${payload.name}」(${pins.length}脚)`,
      };
    }
  }

  // 7. Compute KCL-consistent Wire Currents per net using tiny resistive wire Laplacian
  const wireTelemetryById: Record<string, WireTelemetry> = {};
  const wiresByNet = new Map<string, typeof wires>();
  for (const w of wires) {
    if (!compMap.has(w.from.componentId) || !compMap.has(w.to.componentId)) continue;
    const net = find(pinKey(w.from.componentId, w.from.pinId));
    if (!wiresByNet.has(net)) wiresByNet.set(net, []);
    wiresByNet.get(net)!.push(w);
  }

  for (const netWires of wiresByNet.values()) {
    const pinList: string[] = [];
    const pinIdxMap = new Map<string, number>();
    const addPinNode = (pk: string) => {
      if (!pinIdxMap.has(pk)) {
        pinIdxMap.set(pk, pinList.length);
        pinList.push(pk);
      }
    };
    for (const w of netWires) {
      addPinNode(pinKey(w.from.componentId, w.from.pinId));
      addPinNode(pinKey(w.to.componentId, w.to.pinId));
    }

    const m = pinList.length;
    if (m <= 1) {
      for (const w of netWires) {
        const pk = pinKey(w.from.componentId, w.from.pinId);
        wireTelemetryById[w.id] = {
          wireId: w.id,
          voltage: nodeVoltagesByPinKey[pk] ?? 0,
          current: 0,
        };
      }
      continue;
    }

    // Fast path for a single wire connecting 2 pins (most common)
    if (m === 2 && netWires.length === 1) {
      const w = netWires[0];
      const pkFrom = pinKey(w.from.componentId, w.from.pinId);
      const pkTo = pinKey(w.to.componentId, w.to.pinId);
      const iOutFrom = -(pinCurrentIn.get(pkFrom) ?? 0);
      const iIntoTo = pinCurrentIn.get(pkTo) ?? 0;
      const avgI = (iOutFrom + iIntoTo) * 0.5;
      wireTelemetryById[w.id] = {
        wireId: w.id,
        voltage: nodeVoltagesByPinKey[pkFrom] ?? 0,
        current: Math.abs(avgI) < 1e-7 ? 0 : avgI,
      };
      continue;
    }

    // Solve (m-1) x (m-1) wire graph Laplacian (pin 0 as reference)
    const size = m - 1;
    const L: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
    const rhs = new Array<number>(size).fill(0);

    for (const w of netWires) {
      const u = pinIdxMap.get(pinKey(w.from.componentId, w.from.pinId))!;
      const v = pinIdxMap.get(pinKey(w.to.componentId, w.to.pinId))!;
      if (u === v) continue;
      if (u > 0) L[u - 1][u - 1] += 1;
      if (v > 0) L[v - 1][v - 1] += 1;
      if (u > 0 && v > 0) {
        L[u - 1][v - 1] -= 1;
        L[v - 1][u - 1] -= 1;
      }
    }
    for (let i = 1; i < m; i++) {
      L[i - 1][i - 1] += 1e-9;
      // Current injected into wire graph from component pin = -pinCurrentIn
      rhs[i - 1] = -(pinCurrentIn.get(pinList[i]) ?? 0);
    }

    const pot = solveLinearSystem(L, rhs);
    for (const w of netWires) {
      const pkFrom = pinKey(w.from.componentId, w.from.pinId);
      const u = pinIdxMap.get(pkFrom)!;
      const v = pinIdxMap.get(pinKey(w.to.componentId, w.to.pinId))!;
      const pu = pot && u > 0 ? pot[u - 1] : 0;
      const pv = pot && v > 0 ? pot[v - 1] : 0;
      const cur = pu - pv;
      wireTelemetryById[w.id] = {
        wireId: w.id,
        voltage: nodeVoltagesByPinKey[pkFrom] ?? 0,
        current: Math.abs(cur) < 1e-7 ? 0 : cur,
      };
    }
  }

  return {
    time: simState.time,
    nodeVoltagesByPinKey,
    telemetryById,
    wireTelemetryById,
    implicitGroundUsed,
    converged,
    warnings,
  };
}

function updateWaveformEdgeStats(
  simState: SimulationRuntimeState,
  components: CircuitComponent[],
  res: SimulationStepResult,
  stepDt: number
): void {
  if (!simState.waveformStats) {
    simState.waveformStats = {};
  }
  const LOW_TH = 2.0;
  const HIGH_TH = 3.0;
  const MID_TH = 2.5;
  const prevStepTime = res.time - stepDt;

  for (const comp of components) {
    const currVal = res.telemetryById[comp.id]?.voltageDrop ?? 0;
    const prev = simState.waveformStats[comp.id];
    if (!prev || !prev.initialized) {
      simState.waveformStats[comp.id] = {
        initialized: true,
        prevVal: currVal,
        isHigh: currVal >= MID_TH,
        lastRisingTime: null,
        lastFallingTime: null,
        periodSec: null,
        frequencyHz: null,
        dutyCycle: null,
        cycleCount: 0,
      };
      continue;
    }

    const st: WaveformEdgeStats = { ...prev };
    const dv = currVal - st.prevVal;
    const frac =
      Math.abs(dv) > 1e-9 ? Math.min(1, Math.max(0, (MID_TH - st.prevVal) / dv)) : 1;
    const crossTime = prevStepTime + frac * stepDt;

    if (!st.isHigh && currVal >= HIGH_TH) {
      st.isHigh = true;
      if (st.lastRisingTime !== null) {
        const period = crossTime - st.lastRisingTime;
        if (period > 1e-5) {
          st.periodSec = period;
          st.frequencyHz = 1 / period;
          st.cycleCount += 1;
          if (st.lastFallingTime !== null && st.lastFallingTime > st.lastRisingTime) {
            const highDur = st.lastFallingTime - st.lastRisingTime;
            st.dutyCycle = Math.min(1, Math.max(0, highDur / period));
          }
        }
      }
      st.lastRisingTime = crossTime;
    } else if (st.isHigh && currVal <= LOW_TH) {
      st.isHigh = false;
      st.lastFallingTime = crossTime;
    }

    // Clear stale period measurement if oscillation stops for longer than 3.5 periods (min 2.5s)
    if (
      st.periodSec !== null &&
      st.lastRisingTime !== null &&
      res.time - st.lastRisingTime > Math.max(2.5, st.periodSec * 3.5)
    ) {
      st.periodSec = null;
      st.frequencyHz = null;
      st.dutyCycle = null;
      st.cycleCount = 0;
      st.lastRisingTime = null;
      st.lastFallingTime = null;
    }

    st.prevVal = currVal;
    simState.waveformStats[comp.id] = st;
  }
}

/**
 * Adaptive sub-stepped simulation driver with exact full-cycle RMS / power-factor integration.
 * Eliminates aliasing & ripple at 50Hz AC while remaining 100% compatible with DC/transient/digital steps.
 */
export function advanceCircuitSimulation(
  circuit: CircuitData,
  simState: SimulationRuntimeState,
  totalDt: number,
  options?: SolveStepOptions
): SimulationStepResult {
  if (!simState.acHistory) {
    simState.acHistory = [];
  }
  if (!simState.waveformStats) {
    simState.waveformStats = {};
  }

  let maxFreq = 0;
  let acFreq = 0;
  for (const c of circuit.components) {
    if (c.type === 'AC_SOURCE') {
      const f = Math.max(0.05, Number(c.props.frequency ?? 2));
      if (f > maxFreq) maxFreq = f;
      if (acFreq === 0) acFreq = f;
    } else if (c.type === 'INF_SOURCE' && String(c.props.waveform ?? 'dc') !== 'dc') {
      const f = Math.max(0.05, Number(c.props.frequency ?? 2));
      if (f > maxFreq) maxFreq = f;
      if (acFreq === 0) acFreq = f;
    } else if (c.type === 'CLOCK') {
      const f = Math.max(0.1, Number(c.props.frequency ?? 1));
      if (f > maxFreq) maxFreq = f;
    }
  }

  let result: SimulationStepResult;
  if (totalDt <= 0) {
    result = solveCircuitStep(circuit, simState, 0, options);
  } else {
    const targetSubDt = maxFreq > 0 ? Math.min(0.002, 1 / (240 * maxFreq)) : 0.002;
    const subSteps = Math.min(320, Math.max(1, Math.ceil(totalDt / targetSubDt)));
    const h = totalDt / subSteps;

    result = solveCircuitStep(circuit, simState, h, options);
    const pushSlice = (res: SimulationStepResult) => {
      const v: Record<string, number> = {};
      const i: Record<string, number> = {};
      const wMap: Record<string, number> = {};
      for (const comp of circuit.components) {
        const tel = res.telemetryById[comp.id];
        if (tel) {
          v[comp.id] = tel.voltageDrop;
          i[comp.id] = tel.current;
        }
      }
      for (const [wid, wt] of Object.entries(res.wireTelemetryById)) {
        wMap[wid] = wt.current;
      }
      simState.acHistory.push({ dt: h, v, i, w: wMap });
      updateWaveformEdgeStats(simState, circuit.components, res, h);
    };
    pushSlice(result);

    for (let step = 1; step < subSteps; step++) {
      result = solveCircuitStep(circuit, simState, h, options);
      pushSlice(result);
    }
  }

  // Exact integer-cycle weighted RMS & average power windowing (1 full cycle at acFreq)
  const windowT = acFreq > 0 ? 1 / acFreq : 0.5;
  const sumV2: Record<string, number> = {};
  const sumI2: Record<string, number> = {};
  const sumVI: Record<string, number> = {};
  const sumW: Record<string, number> = {};
  const sumW2: Record<string, number> = {};
  const maxW: Record<string, number> = {};
  const minW: Record<string, number> = {};
  let accDt = 0;
  let trimBefore = 0;

  for (let idx = simState.acHistory.length - 1; idx >= 0; idx--) {
    const slice = simState.acHistory[idx];
    const remaining = windowT - accDt;
    if (remaining <= 1e-12) {
      trimBefore = idx + 1;
      break;
    }
    const w = Math.min(slice.dt, remaining);
    accDt += w;
    for (const cid of Object.keys(slice.v)) {
      const vv = slice.v[cid] ?? 0;
      const ii = slice.i[cid] ?? 0;
      sumV2[cid] = (sumV2[cid] ?? 0) + vv * vv * w;
      sumI2[cid] = (sumI2[cid] ?? 0) + ii * ii * w;
      sumVI[cid] = (sumVI[cid] ?? 0) + vv * ii * w;
    }
    if (slice.w) {
      for (const wid of Object.keys(slice.w)) {
        const iw = slice.w[wid] ?? 0;
        sumW[wid] = (sumW[wid] ?? 0) + iw * w;
        sumW2[wid] = (sumW2[wid] ?? 0) + iw * iw * w;
        maxW[wid] = maxW[wid] === undefined ? iw : Math.max(maxW[wid], iw);
        minW[wid] = minW[wid] === undefined ? iw : Math.min(minW[wid], iw);
      }
    }
    if (slice.dt >= remaining - 1e-12) {
      trimBefore = idx;
      break;
    }
  }

  if (trimBefore > 0) {
    simState.acHistory.splice(0, trimBefore);
  }

  const hasFullAcCycle = acFreq > 0 && accDt >= 0.9 * (1 / acFreq);
  const hasAcWireWindow = acFreq > 0 && accDt >= 0.8 * (1 / acFreq);
  const compMap = new Map(circuit.components.map((c) => [c.id, c]));
  const acWarnings: string[] = [];

  for (const [cid, tel] of Object.entries(result.telemetryById)) {
    const comp = compMap.get(cid);
    if (accDt > 1e-9 && sumV2[cid] !== undefined) {
      const vRms = Math.sqrt(Math.max(0, sumV2[cid] / accDt));
      const iRms = Math.sqrt(Math.max(0, (sumI2[cid] ?? 0) / accDt));
      const apparentPower = vRms * iRms;
      let avgPower = Math.abs((sumVI[cid] ?? 0) / accDt);
      if (comp?.type === 'CAPACITOR') {
        avgPower = 0;
      } else if (comp?.type === 'INDUCTOR') {
        avgPower = iRms * iRms * IND_COIL_R;
      }
      const powerFactor =
        comp?.type === 'CAPACITOR'
          ? 0
          : apparentPower > 1e-7
          ? Math.min(1, avgPower / apparentPower)
          : comp?.type === 'INDUCTOR'
          ? 0
          : 1;
      tel.vRms = vRms;
      tel.iRms = iRms;
      tel.avgPower = avgPower;
      tel.apparentPower = apparentPower;
      tel.powerFactor = powerFactor;

      if (comp?.type === 'LAMP' && hasFullAcCycle) {
        const pRated = Math.max(0.05, Number(comp.props.ratedPower ?? 1.5));
        const pct = Math.min(150, (avgPower / pRated) * 100);
        tel.extraInfo = pct > 2 ? `亮度 ${pct.toFixed(0)}%` : '熄灭';
      }

      if (comp && hasFullAcCycle) {
        const evalRes = formatComponentOverloadWarning(comp, tel, tel.maxPower, true);
        tel.loadRatio = evalRes.loadRatio;
        tel.overloaded = evalRes.overloaded;
        if (evalRes.warning) {
          acWarnings.push(evalRes.warning);
        }
      }
    } else {
      tel.vRms = Math.abs(tel.voltageDrop);
      tel.iRms = Math.abs(tel.current);
      tel.avgPower = tel.power;
      tel.apparentPower = Math.abs(tel.voltageDrop * tel.current);
      tel.powerFactor = comp?.type === 'CAPACITOR' ? 0 : 1;
    }
  }

  for (const [wid, wt] of Object.entries(result.wireTelemetryById)) {
    if (accDt > 1e-9 && sumW2[wid] !== undefined) {
      const iRms = Math.sqrt(Math.max(0, sumW2[wid] / accDt));
      const dcMean = (sumW[wid] ?? 0) / accDt;
      const hi = maxW[wid] ?? 0;
      const lo = minW[wid] ?? 0;
      const peakMax = Math.max(hi, -lo);
      const reversesSign = hi > 1e-4 && lo < -1e-4 && Math.min(hi, -lo) >= 0.15 * peakMax;
      wt.iRms = iRms;
      wt.dcMean = dcMean;
      wt.acFrequency = acFreq > 0 ? acFreq : undefined;
      wt.isAc = hasAcWireWindow && iRms > 1e-4 && reversesSign && Math.abs(dcMean) < 0.65 * iRms;
    } else {
      wt.iRms = Math.abs(wt.current);
      wt.dcMean = wt.current;
      wt.acFrequency = acFreq > 0 ? acFreq : undefined;
      wt.isAc = false;
    }
  }

  if (hasFullAcCycle) {
    result.warnings = acWarnings;
  }

  return result;
}
