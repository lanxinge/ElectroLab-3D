import { describe, expect, it } from 'vitest';
import type { CircuitComponent, CircuitData, Wire } from '../shared/types';
import {
  analyzeDigitalCircuit,
  buildKarnaughMapAndSimplify,
  synthesizeCircuitFromMinterms,
} from '../src/engine/digitalLogicAnalysis';
import { getComponentPins } from '../src/engine/componentCatalog';
import {
  getDefaultTruthChipConfig,
  packageCircuitAsIc,
  validateBooleanExpression,
} from '../src/engine/customIcEngine';
import { createInitialRuntimeState, solveCircuitStep } from '../src/engine/mnaSolver';
import { CIRCUIT_PRESETS } from '../src/presets/circuitPresets';
import { parseProjectFile, serializeProjectFile } from '../src/utils/projectFileIO';
import { useUIStore } from '../src/store/useUIStore';

function makeComp(
  id: string,
  type: CircuitComponent['type'],
  props: Record<string, number | string | boolean> = {}
): CircuitComponent {
  return {
    id,
    type,
    label: id.toUpperCase(),
    pos3d: [0, 0, 0],
    rotationY: 0,
    pos2d: { x: 100, y: 100 },
    rot2d: 0,
    props,
  };
}

function makeWire(id: string, fc: string, fp: string, tc: string, tp: string): Wire {
  return {
    id,
    from: { componentId: fc, pinId: fp },
    to: { componentId: tc, pinId: tp },
    color: '#38bdf8',
  };
}

describe('Mixed-Signal MNA Circuit Engine', () => {
  it('solves DC voltage divider accurately (10V, 1k + 1k => 5V, 5mA, 25mW)', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000, maxPower: 0.5 }),
        makeComp('r2', 'RESISTOR', { resistance: 1000, maxPower: 0.5 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'r2', 'a'),
        makeWire('w3', 'r2', 'b', 'v1', 'neg'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.converged).toBe(true);
    expect(res.implicitGroundUsed).toBe(false);
    expect(res.telemetryById.r1.voltageDrop).toBeCloseTo(5, 2);
    expect(res.telemetryById.r2.voltageDrop).toBeCloseTo(5, 2);
    expect(res.telemetryById.r1.current).toBeCloseTo(0.005, 4);
    expect(res.telemetryById.r1.power).toBeCloseTo(0.025, 4);
    expect(res.telemetryById.r1.overloaded).toBe(false);
  });

  it('verifies parallel KCL and detects component power overload', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('r1', 'RESISTOR', { resistance: 100, maxPower: 0.5 }), // P = 10^2 / 100 = 1W > 0.5W!
        makeComp('r2', 'RESISTOR', { resistance: 200, maxPower: 1.0 }), // P = 10^2 / 200 = 0.5W <= 1.0W
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'v1', 'pos', 'r2', 'a'),
        makeWire('w3', 'r1', 'b', 'gnd', 'gnd'),
        makeWire('w4', 'r2', 'b', 'gnd', 'gnd'),
        makeWire('w5', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.telemetryById.v1.current).toBeCloseTo(0.15, 3);
    expect(res.telemetryById.r1.overloaded).toBe(true);
    expect(res.telemetryById.r1.loadRatio).toBeGreaterThan(1.5);
    expect(res.telemetryById.r2.overloaded).toBe(false);
  });

  it('handles direct short-circuit safely without NaN and triggers overload alert', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 5 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'v1', 'neg'),
        makeWire('w2', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(Number.isFinite(res.telemetryById.v1.current)).toBe(true);
    expect(res.telemetryById.v1.current).toBeGreaterThan(100);
    expect(res.telemetryById.v1.overloaded).toBe(true);
  });

  it('models silicon diode forward drop (~0.6-0.75V) and reverse blocking (~0A)', () => {
    // Forward bias: 5V -> R=1k -> Diode -> GND
    const fwdCircuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 5 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000 }),
        makeComp('d1', 'DIODE'),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'd1', 'anode'),
        makeWire('w3', 'd1', 'cathode', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const fwdRes = solveCircuitStep(fwdCircuit, createInitialRuntimeState(), 0);
    expect(fwdRes.telemetryById.d1.voltageDrop).toBeGreaterThan(0.55);
    expect(fwdRes.telemetryById.d1.voltageDrop).toBeLessThan(0.8);
    expect(fwdRes.telemetryById.d1.current).toBeGreaterThan(0.004);

    // Reverse bias: swap diode polarity
    const revCircuit: CircuitData = {
      ...fwdCircuit,
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'd1', 'cathode'),
        makeWire('w3', 'd1', 'anode', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const revRes = solveCircuitStep(revCircuit, createInitialRuntimeState(), 0);
    expect(Math.abs(revRes.telemetryById.r1.current)).toBeLessThan(1e-5);
  });

  it('simulates RC transient charging over 5*tau accurately', () => {
    // R = 1000 Ohm, C = 100 uF => tau = 0.1s; 5*tau = 0.5s
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 6 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000 }),
        makeComp('c1', 'CAPACITOR', { capacitance: 100 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'c1', 'pos'),
        makeWire('w3', 'c1', 'neg', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const runtime = createInitialRuntimeState();
    let res = solveCircuitStep(circuit, runtime, 0.005);
    for (let i = 1; i < 100; i++) {
      res = solveCircuitStep(circuit, runtime, 0.005);
    }
    // After 0.5s = 5*tau, Vc should be ~ 6 * (1 - e^-5) = 5.959V
    expect(res.telemetryById.c1.voltageDrop).toBeGreaterThan(5.9);
    expect(res.telemetryById.c1.voltageDrop).toBeLessThanOrEqual(6.0);
  });

  it('solves Op-Amp inverting amplifier accurately (Vin=1V, Rin=1k, Rf=3k => Vout=-3.0V)', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 1 }),
        makeComp('rin', 'RESISTOR', { resistance: 1000 }),
        makeComp('rf', 'RESISTOR', { resistance: 3000 }),
        makeComp('u1', 'OPAMP', { railPos: 12, railNeg: -12, gain: 50000 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'rin', 'a'),
        makeWire('w2', 'rin', 'b', 'u1', 'inm'),
        makeWire('w3', 'u1', 'inm', 'rf', 'a'),
        makeWire('w4', 'rf', 'b', 'u1', 'out'),
        makeWire('w5', 'u1', 'inp', 'gnd', 'gnd'),
        makeWire('w6', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.telemetryById.u1.voltageDrop).toBeCloseTo(-3.0, 2);
  });
});

describe('Digital Logic Truth Table, Gray-Code K-Map & Synthesis', () => {
  it('analyzes 3-variable Majority Voter preset -> ∑m(3,5,6,7) and minimal SOP AB+BC+AC', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'preset-majority-voter')!;
    const analysis = analyzeDigitalCircuit(preset.circuit);
    expect(analysis.inputs.map((i) => i.varName)).toEqual(['A', 'B', 'C']);
    expect(analysis.minterms).toEqual([3, 5, 6, 7]);
    expect(analysis.kmap).not.toBeNull();
    expect(analysis.kmap!.colCodes).toEqual(['00', '01', '11', '10']);
    expect(analysis.kmap!.loops.length).toBe(3);
    const terms = analysis.kmap!.loops.map((l) => l.termText).sort();
    expect(terms).toEqual(['AB', 'AC', 'BC']);
  });

  it('analyzes 1-bit Full Adder preset accurately across all 8 input combinations', () => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === 'preset-full-adder-hex')!;
    const analysis = analyzeDigitalCircuit(preset.circuit);
    expect(analysis.rows.length).toBe(8);
    const sOut = analysis.outputs.find((o) => o.label === 'S')!;
    const cOut = analysis.outputs.find((o) => o.label === 'Cout')!;
    for (const row of analysis.rows) {
      const [a, b, cin] = row.inputs;
      expect(row.outputs[sOut.key]).toBe((a ^ b ^ cin) as 0 | 1);
      expect(row.outputs[cOut.key]).toBe(a + b + cin >= 2 ? 1 : 0);
    }
  });

  it('simplifies 4-variable 4-corner wrap-around K-Map ∑m(0,2,8,10) => B\'D\'', () => {
    const kmap = buildKarnaughMapAndSimplify(['A', 'B', 'C', 'D'], [0, 2, 8, 10]);
    expect(kmap).not.toBeNull();
    expect(kmap!.rowCodes).toEqual(['00', '01', '11', '10']);
    expect(kmap!.colCodes).toEqual(['00', '01', '11', '10']);
    expect(kmap!.loops.length).toBe(1);
    expect(kmap!.loops[0].rowSpan.kind).toBe('wrap');
    expect(kmap!.loops[0].colSpan.kind).toBe('wrap');
    expect(kmap!.simplifiedExpr).toBe("B'D'");
  });

  it('synthesizes a working gate circuit from minterms whose truth table matches 100%', () => {
    const targetMinterms = [1, 2, 4, 7]; // 3-var odd parity (XOR)
    const synthesized = synthesizeCircuitFromMinterms(['A', 'B', 'C'], targetMinterms);
    const verified = analyzeDigitalCircuit(synthesized);
    expect(verified.minterms).toEqual(targetMinterms);
  });
});

describe('V3 Expanded Modules, Custom Truth Chips, Hierarchical ICs & Project IO', () => {
  it('simulates INF_SOURCE and INF_RESISTOR without artificial power overload warnings', () => {
    const circuit: CircuitData = {
      components: [
        makeComp('vinf', 'INF_SOURCE', { voltage: 10000, waveform: 'dc' }),
        makeComp('r1', 'RESISTOR', { resistance: 100, maxPower: 2000000 }),
        makeComp('rinf', 'INF_RESISTOR', { idealInfinite: true, resistance: 1e12 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'vinf', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'gnd', 'gnd'),
        makeWire('w3', 'vinf', 'pos', 'rinf', 'p1'),
        makeWire('w4', 'rinf', 'p2', 'gnd', 'gnd'),
        makeWire('w5', 'vinf', 'neg', 'gnd', 'gnd'),
      ],
    };
    const res = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(res.telemetryById.r1.current).toBeCloseTo(100, 1);
    expect(res.telemetryById.vinf.overloaded).toBe(false);
    expect(res.telemetryById.rinf.current).toBe(0);
    expect(res.telemetryById.rinf.overloaded).toBe(false);
  });

  it('models ZENER_DIODE clamp (~5.1V), NMOS Vgs threshold, TRANSFORMER ratio, LAMP and FUSE trip', () => {
    // 1. Zener reverse clamp: 10V -> 1k -> reverse Zener (k on +side, a on GND)
    const zCircuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('r1', 'RESISTOR', { resistance: 1000 }),
        makeComp('dz', 'ZENER_DIODE', { vz: 5.1 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'r1', 'a'),
        makeWire('w2', 'r1', 'b', 'dz', 'k'),
        makeWire('w3', 'dz', 'a', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const zRes = solveCircuitStep(zCircuit, createInitialRuntimeState(), 0);
    // dz voltageDrop = Va - Vk ~ -5.1V
    expect(-zRes.telemetryById.dz.voltageDrop).toBeGreaterThan(4.8);
    expect(-zRes.telemetryById.dz.voltageDrop).toBeLessThan(5.45);

    // 2. NMOS gate switch
    const nmosCircuit = (vgs: number): CircuitData => ({
      components: [
        makeComp('vdd', 'DC_SOURCE', { voltage: 5 }),
        makeComp('vg', 'DC_SOURCE', { voltage: vgs }),
        makeComp('rd', 'RESISTOR', { resistance: 100 }),
        makeComp('m1', 'NMOS', { vth: 2.0, kp: 0.2 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'vdd', 'pos', 'rd', 'a'),
        makeWire('w2', 'rd', 'b', 'm1', 'd'),
        makeWire('w3', 'm1', 's', 'gnd', 'gnd'),
        makeWire('w4', 'vg', 'pos', 'm1', 'g'),
        makeWire('w5', 'vg', 'neg', 'gnd', 'gnd'),
        makeWire('w6', 'vdd', 'neg', 'gnd', 'gnd'),
      ],
    });
    const nmosOff = solveCircuitStep(nmosCircuit(0), createInitialRuntimeState(), 0);
    const nmosOn = solveCircuitStep(nmosCircuit(5), createInitialRuntimeState(), 0);
    expect(nmosOff.telemetryById.m1.current).toBeLessThan(1e-4);
    expect(nmosOn.telemetryById.m1.current).toBeGreaterThan(0.02);

    // 3. Transformer step-up ratio 2.5 at AC quadrature time (sin=1)
    const txCircuit: CircuitData = {
      components: [
        makeComp('vac', 'AC_SOURCE', { waveform: 'sine', amplitude: 4, frequency: 1, dcOffset: 0 }),
        makeComp('t1', 'TRANSFORMER', { ratio: 2.5 }),
        makeComp('rl', 'RESISTOR', { resistance: 1000 }),
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'vac', 'pos', 't1', 'p1'),
        makeWire('w2', 'vac', 'neg', 't1', 'p2'),
        makeWire('w3', 't1', 'p2', 'gnd', 'gnd'),
        makeWire('w4', 't1', 's1', 'rl', 'a'),
        makeWire('w5', 't1', 's2', 'rl', 'b'),
      ],
    };
    const txRes = solveCircuitStep(txCircuit, createInitialRuntimeState(), 0.25);
    expect(txRes.telemetryById.rl.voltageDrop).toBeCloseTo(10, 1);

    // 4. Lamp + Fuse trip
    const fuseCircuit: CircuitData = {
      components: [
        makeComp('v1', 'DC_SOURCE', { voltage: 10 }),
        makeComp('f1', 'FUSE', { tripCurrent: 0.4, blown: false }),
        makeComp('lp1', 'LAMP', { ratedVoltage: 10, ratedPower: 10 }), // R=10 => 1A > 0.4A!
        makeComp('gnd', 'GROUND'),
      ],
      wires: [
        makeWire('w1', 'v1', 'pos', 'f1', 'p1'),
        makeWire('w2', 'f1', 'p2', 'lp1', 'p1'),
        makeWire('w3', 'lp1', 'p2', 'gnd', 'gnd'),
        makeWire('w4', 'v1', 'neg', 'gnd', 'gnd'),
      ],
    };
    const rt = createInitialRuntimeState();
    solveCircuitStep(fuseCircuit, rt, 0.02);
    expect(rt.blownFuses.f1).toBe(true);
    const afterBlown = solveCircuitStep(fuseCircuit, rt, 0.02);
    expect(afterBlown.telemetryById.lp1.current).toBeLessThan(1e-4);
  });

  it('simulates MUX_2_1, JK_FF toggle, COUNTER_4BIT increment/reset, and CUSTOM_TRUTH_8', () => {
    const muxCircuit = (sel: number): CircuitData => ({
      components: [
        makeComp('d0', 'LOGIC_IN', { state: 0, varName: 'D0' }),
        makeComp('d1', 'LOGIC_IN', { state: 1, varName: 'D1' }),
        makeComp('s', 'LOGIC_IN', { state: sel, varName: 'SEL' }),
        makeComp('m', 'MUX_2_1'),
        makeComp('y', 'LOGIC_OUT', { outName: 'Y' }),
      ],
      wires: [
        makeWire('w1', 'd0', 'out', 'm', 'd0'),
        makeWire('w2', 'd1', 'out', 'm', 'd1'),
        makeWire('w3', 's', 'out', 'm', 'sel'),
        makeWire('w4', 'm', 'y', 'y', 'in'),
      ],
    });
    expect(solveCircuitStep(muxCircuit(0), createInitialRuntimeState(), 0).telemetryById.y.logicState).toBe(0);
    expect(solveCircuitStep(muxCircuit(1), createInitialRuntimeState(), 0).telemetryById.y.logicState).toBe(1);

    // COUNTER_4BIT driven by switch clock pulse
    const cntComp = (clkState: number, rstState: number): CircuitData => ({
      components: [
        makeComp('clk', 'LOGIC_IN', { state: clkState }),
        makeComp('rst', 'LOGIC_IN', { state: rstState }),
        makeComp('cnt', 'COUNTER_4BIT'),
        makeComp('q0', 'LOGIC_OUT', { outName: 'Q0' }),
      ],
      wires: [
        makeWire('w1', 'clk', 'out', 'cnt', 'clk'),
        makeWire('w2', 'rst', 'out', 'cnt', 'rst'),
        makeWire('w3', 'cnt', 'q0', 'q0', 'in'),
      ],
    });
    const rt = createInitialRuntimeState();
    solveCircuitStep(cntComp(0, 0), rt, 0.01);
    solveCircuitStep(cntComp(1, 0), rt, 0.01); // count -> 1
    expect(rt.counterValues.cnt).toBe(1);
    solveCircuitStep(cntComp(0, 0), rt, 0.01);
    solveCircuitStep(cntComp(1, 0), rt, 0.01); // count -> 2
    expect(rt.counterValues.cnt).toBe(2);
    solveCircuitStep(cntComp(0, 1), rt, 0.01); // rst=1 -> 0
    expect(rt.counterValues.cnt).toBe(0);

    // CUSTOM_TRUTH_8 with custom IN/OUT/NC roles in expression mode
    const cfg = getDefaultTruthChipConfig(8);
    cfg.mode = 'expr';
    // slot s1=A(IN), s2=B(IN), s3=C(IN), s8=Y0(OUT)
    cfg.expressions.s8 = '(A ^ B) + !C';
    const lutCircuit: CircuitData = {
      components: [
        makeComp('a', 'LOGIC_IN', { state: 0, varName: 'A' }),
        makeComp('b', 'LOGIC_IN', { state: 0, varName: 'B' }),
        makeComp('c', 'LOGIC_IN', { state: 1, varName: 'C' }),
        makeComp('lut', 'CUSTOM_TRUTH_8', { chipName: 'EXPR8', truthConfigJson: JSON.stringify(cfg) }),
        makeComp('out', 'LOGIC_OUT', { outName: 'Y' }),
      ],
      wires: [
        makeWire('w1', 'a', 'out', 'lut', 's1'),
        makeWire('w2', 'b', 'out', 'lut', 's2'),
        makeWire('w3', 'c', 'out', 'lut', 's3'),
        makeWire('w4', 'lut', 's8', 'out', 'in'),
      ],
    };
    const lutRes = solveCircuitStep(lutCircuit, createInitialRuntimeState(), 0);
    // (0 ^ 0) + !1 = 0
    expect(lutRes.telemetryById.out.logicState).toBe(0);
    const analysis = analyzeDigitalCircuit(lutCircuit);
    expect(analysis.inputs.length).toBe(3);
    expect(analysis.minterms).toEqual([0, 2, 3, 4, 5, 6]); // 1 whenever C=0 or A!=B
  });

  it('packages a subcircuit into CUSTOM_IC and solves hierarchical MNA + digital truth tables', () => {
    const subCircuit: CircuitData = {
      components: [
        makeComp('pa', 'IC_PORT_IN', { portName: 'A', state: 0 }),
        makeComp('pb', 'IC_PORT_IN', { portName: 'B', state: 0 }),
        makeComp('g', 'XOR'),
        makeComp('py', 'IC_PORT_OUT', { portName: 'Y' }),
      ],
      wires: [
        makeWire('sw1', 'pa', 'io', 'g', 'a'),
        makeWire('sw2', 'pb', 'io', 'g', 'b'),
        makeWire('sw3', 'g', 'y', 'py', 'io'),
      ],
    };
    const icPayload = packageCircuitAsIc(subCircuit, {
      name: '封装异或芯片',
      codeName: 'U_XOR',
      description: 'Test XOR IC',
      color: '#0284c7',
    });
    expect(icPayload.pins.length).toBe(3);
    const pinA = icPayload.pins.find((p) => p.name === 'A')!.pinId;
    const pinB = icPayload.pins.find((p) => p.name === 'B')!.pinId;
    const pinY = icPayload.pins.find((p) => p.name === 'Y')!.pinId;

    const parentCircuit: CircuitData = {
      components: [
        makeComp('in1', 'LOGIC_IN', { state: 1, varName: 'X1' }),
        makeComp('in2', 'LOGIC_IN', { state: 0, varName: 'X2' }),
        makeComp('ic1', 'CUSTOM_IC', { icName: icPayload.name, icJson: JSON.stringify(icPayload) }),
        makeComp('out1', 'LOGIC_OUT', { outName: 'OUT' }),
      ],
      wires: [
        makeWire('pw1', 'in1', 'out', 'ic1', pinA),
        makeWire('pw2', 'in2', 'out', 'ic1', pinB),
        makeWire('pw3', 'ic1', pinY, 'out1', 'in'),
      ],
    };

    const solved = solveCircuitStep(parentCircuit, createInitialRuntimeState(), 0);
    expect(solved.telemetryById.out1.logicState).toBe(1);

    const digital = analyzeDigitalCircuit(parentCircuit);
    expect(digital.minterms).toEqual([1, 2]); // XOR of X1, X2!
  });

  it('round-trips local .elab.json project files and defaults useUIStore to collapsed floating mode', () => {
    const ui = useUIStore.getState();
    expect(ui.layoutMode).toBe('floating');
    expect(ui.paletteOpen).toBe(false);
    expect(ui.inspectorOpen).toBe(false);
    expect(ui.schematicOpen).toBe(false);
    expect(ui.analysisOpen).toBe(false);

    const sample = CIRCUIT_PRESETS[0];
    const serialized = serializeProjectFile('本地测试电路', sample.circuit, '描述');
    const parsed = parseProjectFile(JSON.stringify(serialized));
    expect(parsed.title).toBe('本地测试电路');
    expect(parsed.circuit.components.length).toBe(sample.circuit.components.length);
    expect(parsed.circuit.wires.length).toBe(sample.circuit.wires.length);
  });

  it('strictly validates boolean expressions for custom truth chips and rejects incomplete formulas', () => {
    const allowed = ['A', 'B', 'C'];
    expect(validateBooleanExpression('(A ^ B) + !C', allowed)).toEqual({ valid: true });
    expect(validateBooleanExpression('0', allowed)).toEqual({ valid: true });
    expect(validateBooleanExpression('1', allowed)).toEqual({ valid: true });

    expect(validateBooleanExpression('A &', allowed).valid).toBe(false);
    expect(validateBooleanExpression('& B', allowed).valid).toBe(false);
    expect(validateBooleanExpression('!', allowed).valid).toBe(false);
    expect(validateBooleanExpression('', allowed).valid).toBe(false);
    expect(validateBooleanExpression('A * Z', ['A', 'B']).valid).toBe(false);
    expect(validateBooleanExpression('(A & B', allowed).valid).toBe(false);
    expect(validateBooleanExpression('A & B)', allowed).valid).toBe(false);
    expect(validateBooleanExpression('()', allowed).valid).toBe(false);
    expect(validateBooleanExpression('A B', allowed).valid).toBe(false);
  });

  it('preserves all 5 pin labels and left/right sides on a packaged Full Adder CUSTOM_IC', () => {
    const subCircuit: CircuitData = {
      components: [
        makeComp('pa', 'IC_PORT_IN', { portName: 'A', state: 0 }),
        makeComp('pb', 'IC_PORT_IN', { portName: 'B', state: 0 }),
        makeComp('pc', 'IC_PORT_IN', { portName: 'Cin', state: 0 }),
        makeComp('fa', 'FULL_ADDER'),
        makeComp('ps', 'IC_PORT_OUT', { portName: 'S' }),
        makeComp('pco', 'IC_PORT_OUT', { portName: 'Cout' }),
      ],
      wires: [
        makeWire('fa1', 'pa', 'io', 'fa', 'a'),
        makeWire('fa2', 'pb', 'io', 'fa', 'b'),
        makeWire('fa3', 'pc', 'io', 'fa', 'cin'),
        makeWire('fa4', 'fa', 's', 'ps', 'io'),
        makeWire('fa5', 'fa', 'cout', 'pco', 'io'),
      ],
    };
    const icPayload = packageCircuitAsIc(subCircuit, {
      name: '全加器模块',
      codeName: 'U_FA',
      description: '5-pin Full Adder IC',
      color: '#0284c7',
    });
    const icComp = makeComp('ic5', 'CUSTOM_IC', {
      icName: icPayload.name,
      icJson: JSON.stringify(icPayload),
    });
    const pins = getComponentPins(icComp);
    expect(pins.length).toBe(5);
    expect(pins.map((p) => p.label)).toEqual(['A', 'B', 'Cin', 'S', 'Cout']);
    expect(pins.filter((p) => p.label === 'A' || p.label === 'B' || p.label === 'Cin').every((p) => p.offset2d.x < 0)).toBe(true);
    expect(pins.filter((p) => p.label === 'S' || p.label === 'Cout').every((p) => p.offset2d.x > 0)).toBe(true);
  });

  it('propagates analog node voltages (OPAMP comparator) into digital logic gates on the same step', () => {
    const gnd = makeComp('g', 'GROUND');
    const vRef = makeComp('vref', 'DC_SOURCE', { voltage: 2.5 });
    const vIn = makeComp('vin', 'DC_SOURCE', { voltage: 1.0 });
    const op = makeComp('u1', 'OPAMP', { railPos: 5, railNeg: 0, gain: 100000 });
    const en = makeComp('in_en', 'LOGIC_IN', { state: 1 });
    const gate = makeComp('and1', 'AND');
    const out = makeComp('out1', 'LOGIC_OUT');
    const circuit: CircuitData = {
      components: [gnd, vRef, vIn, op, en, gate, out],
      wires: [
        makeWire('w1', 'vref', 'neg', 'g', 'gnd'),
        makeWire('w2', 'vin', 'neg', 'g', 'gnd'),
        makeWire('w3', 'vin', 'pos', 'u1', 'inp'),
        makeWire('w4', 'vref', 'pos', 'u1', 'inm'),
        makeWire('w5', 'u1', 'out', 'and1', 'a'),
        makeWire('w6', 'in_en', 'out', 'and1', 'b'),
        makeWire('w7', 'and1', 'y', 'out1', 'in'),
      ],
    };

    const sLow = createInitialRuntimeState();
    const resLow = solveCircuitStep(circuit, sLow, 0);
    expect(resLow.telemetryById.u1.pinVoltages.out).toBeLessThan(0.5);
    expect(resLow.telemetryById.out1.logicState).toBe(0);

    // Raise Vin above Vref=2.5V and solve once at dt=0 -> AND gate and LOGIC_OUT must respond immediately
    vIn.props.voltage = 3.8;
    const resHigh = solveCircuitStep(circuit, createInitialRuntimeState(), 0);
    expect(resHigh.telemetryById.u1.pinVoltages.out).toBeGreaterThan(4.5);
    expect(resHigh.telemetryById.out1.logicState).toBe(1);
  });

  it('clears COUNTER_4BIT asynchronously for Mod-10 BCD feedback (Q3 & Q1 -> RST)', () => {
    const clk = makeComp('clk', 'CLOCK', { frequency: 5 });
    const cnt = makeComp('cnt', 'COUNTER_4BIT');
    const rstAnd = makeComp('rst_and', 'AND');
    const disp = makeComp('hex', 'HEX_DISPLAY');
    const circuit: CircuitData = {
      components: [clk, cnt, rstAnd, disp],
      wires: [
        makeWire('c1', 'clk', 'out', 'cnt', 'clk'),
        makeWire('c2', 'cnt', 'q3', 'rst_and', 'a'),
        makeWire('c3', 'cnt', 'q1', 'rst_and', 'b'),
        makeWire('c4', 'rst_and', 'y', 'cnt', 'rst'),
        makeWire('c5', 'cnt', 'q3', 'hex', 'd3'),
        makeWire('c6', 'cnt', 'q2', 'hex', 'd2'),
        makeWire('c7', 'cnt', 'q1', 'hex', 'd1'),
        makeWire('c8', 'cnt', 'q0', 'hex', 'd0'),
      ],
    };

    const st = createInitialRuntimeState();
    const initialR = solveCircuitStep(circuit, st, 0);
    const seen = new Set<number>([initialR.telemetryById.hex.logicState ?? 0]);
    const seq: number[] = [initialR.telemetryById.hex.logicState ?? 0];
    let prev = seq[0];
    // Step 2.2s at 5Hz clock (~11 rising edges -> must cycle 0..9 and wrap back to 0 without hitting 10..15)
    for (let i = 0; i < 220; i++) {
      const r = solveCircuitStep(circuit, st, 0.01);
      const val = r.telemetryById.hex.logicState ?? -1;
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(9);
      seen.add(val);
      if (val !== prev) {
        seq.push(val);
        prev = val;
      }
    }
    expect(seen.size).toBe(10);
    expect(seq.slice(0, 11)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  });

  it('simulates TIMER_555 window comparators and self-oscillating astable multivibrator', () => {
    const gnd = makeComp('g', 'GROUND');
    const vcc = makeComp('vcc', 'DC_SOURCE', { voltage: 5 });
    const vin = makeComp('vin', 'DC_SOURCE', { voltage: 0.8 });
    const u555 = makeComp('u555', 'TIMER_555');
    const schmittCircuit: CircuitData = {
      components: [gnd, vcc, vin, u555],
      wires: [
        makeWire('s1', 'vcc', 'neg', 'g', 'gnd'),
        makeWire('s2', 'vin', 'neg', 'g', 'gnd'),
        makeWire('s3', 'vcc', 'pos', 'u555', 'vcc'),
        makeWire('s4', 'g', 'gnd', 'u555', 'gnd'),
        makeWire('s5', 'vin', 'pos', 'u555', 'trig'),
        makeWire('s6', 'vin', 'pos', 'u555', 'thres'),
      ],
    };

    const stSchmitt = createInitialRuntimeState();
    const rLow = solveCircuitStep(schmittCircuit, stSchmitt, 0);
    expect(rLow.telemetryById.u555.logicState).toBe(1);
    // Enter hysteresis window [1.67V, 3.33V] -> must retain 1
    vin.props.voltage = 2.5;
    const rHoldHigh = solveCircuitStep(schmittCircuit, stSchmitt, 0);
    expect(rHoldHigh.telemetryById.u555.logicState).toBe(1);
    // Exceed 2/3 VCC -> flip to 0
    vin.props.voltage = 4.0;
    const rHigh = solveCircuitStep(schmittCircuit, stSchmitt, 0);
    expect(rHigh.telemetryById.u555.logicState).toBe(0);
    // Return into hysteresis window -> must retain 0
    vin.props.voltage = 2.5;
    const rHoldLow = solveCircuitStep(schmittCircuit, stSchmitt, 0);
    expect(rHoldLow.telemetryById.u555.logicState).toBe(0);

    // Classic Astable: R1=10k, R2=10k, C=10uF, VCC=5V -> T ~ 0.208s
    const astGnd = makeComp('g', 'GROUND');
    const astVcc = makeComp('vcc', 'DC_SOURCE', { voltage: 5 });
    const r1 = makeComp('r1', 'RESISTOR', { resistance: 10000 });
    const r2 = makeComp('r2', 'RESISTOR', { resistance: 10000 });
    const cap = makeComp('c1', 'CAPACITOR', { capacitance: 10 });
    const ast555 = makeComp('u555', 'TIMER_555');
    const astCircuit: CircuitData = {
      components: [astGnd, astVcc, r1, r2, cap, ast555],
      wires: [
        makeWire('a1', 'vcc', 'neg', 'g', 'gnd'),
        makeWire('a2', 'vcc', 'pos', 'u555', 'vcc'),
        makeWire('a3', 'g', 'gnd', 'u555', 'gnd'),
        makeWire('a4', 'vcc', 'pos', 'r1', 'a'),
        makeWire('a5', 'r1', 'b', 'u555', 'dis'),
        makeWire('a6', 'r1', 'b', 'r2', 'a'),
        makeWire('a7', 'r2', 'b', 'u555', 'thres'),
        makeWire('a8', 'r2', 'b', 'u555', 'trig'),
        makeWire('a9', 'r2', 'b', 'c1', 'pos'),
        makeWire('a10', 'c1', 'neg', 'g', 'gnd'),
      ],
    };

    const stAst = createInitialRuntimeState();
    let transitions = 0;
    let lastOut = -1;
    let maxVcPostStart = 0;
    for (let i = 0; i < 300; i++) {
      const r = solveCircuitStep(astCircuit, stAst, 0.002);
      const outBit = r.telemetryById.u555.logicState ?? 0;
      if (lastOut !== -1 && outBit !== lastOut) transitions++;
      lastOut = outBit;
      if (i > 20) {
        maxVcPostStart = Math.max(maxVcPostStart, r.telemetryById.c1.voltageDrop);
      }
    }
    expect(transitions).toBeGreaterThanOrEqual(4);
    expect(maxVcPostStart).toBeGreaterThan(3.1);
    expect(maxVcPostStart).toBeLessThan(3.6);
  });
});
