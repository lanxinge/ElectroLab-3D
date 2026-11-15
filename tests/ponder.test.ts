import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { ComponentType } from '../shared/types';
import { COMPONENT_CATALOG } from '../src/engine/componentCatalog';
import { ALL_PONDER_TYPES, PONDER_DATA } from '../src/ponder/ponderData';
import {
  deriveInstancePonderContext,
  resolveStepNarration,
} from '../src/ponder/ponderInstanceBridge';
import { buildCreatePedestal } from '../src/ponder/ponderPrimitives';
import { PONDER_SCENE_BUILDERS } from '../src/ponder/ponderSceneRegistry';
import { disposeObject3D } from '../src/sim3d/meshes';
import { usePonderStore } from '../src/store/usePonderStore';

const ALL_CATALOG_TYPES = Object.keys(COMPONENT_CATALOG) as ComponentType[];

describe('Create-Mod Style Ponder System (All 53 Circuit Modules)', () => {
  it('defines complete storyboard specs for every single ComponentType in catalog', () => {
    expect(ALL_CATALOG_TYPES.length).toBe(53);
    expect(ALL_PONDER_TYPES.length).toBe(53);

    for (const type of ALL_CATALOG_TYPES) {
      const spec = PONDER_DATA[type];
      expect(spec, `Missing PONDER_DATA for ${type}`).toBeDefined();
      expect(spec.type).toBe(type);
      expect(spec.title.length).toBeGreaterThan(1);
      expect(spec.englishTitle.length).toBeGreaterThan(2);
      expect(spec.formulas.length).toBeGreaterThanOrEqual(1);
      expect(spec.keyTakeaways.length).toBeGreaterThanOrEqual(1);
      expect(spec.callouts.length).toBeGreaterThanOrEqual(2);
      expect(spec.steps.length).toBeGreaterThanOrEqual(3);
      for (const st of spec.steps) {
        expect(st.camera.position.length).toBe(3);
        expect(st.camera.target.length).toBe(3);
        expect(st.narration.length).toBeGreaterThan(10);
      }
    }
  });

  it('registers 53 distinct 3D diorama builder functions (one unique showcase per module)', () => {
    const builders = ALL_CATALOG_TYPES.map((t) => PONDER_SCENE_BUILDERS[t]);
    expect(builders.every((fn) => typeof fn === 'function')).toBe(true);
    const uniqueFnSet = new Set(builders);
    expect(uniqueFnSet.size).toBe(53);
  });

  it('instantiates, animates, reads telemetry metrics, and disposes all 46 3D dioramas cleanly', () => {
    const pedestal = buildCreatePedestal();
    expect(pedestal).toBeInstanceOf(THREE.Group);
    expect(pedestal.children.length).toBeGreaterThanOrEqual(25);
    disposeObject3D(pedestal);

    for (const type of ALL_CATALOG_TYPES) {
      const spec = PONDER_DATA[type];
      const handle = PONDER_SCENE_BUILDERS[type]();
      expect(handle.root).toBeInstanceOf(THREE.Group);
      let meshCount = 0;
      handle.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) meshCount++;
      });
      expect(meshCount, `${type} diorama too sparse (${meshCount} meshes)`).toBeGreaterThanOrEqual(4);

      const defaultParams: Record<string, number> = {};
      for (const c of spec.controls) {
        defaultParams[c.key] = c.defaultValue;
      }

      // Tick animation across each step & flipped controls
      for (let s = 0; s < spec.steps.length; s++) {
        handle.update(s * 1.3 + 0.2, s, 0.5, defaultParams);
      }
      const toggledParams = { ...defaultParams };
      for (const c of spec.controls) {
        toggledParams[c.key] =
          c.kind === 'toggle' ? (c.defaultValue >= 0.5 ? 0 : 1) : (c.max ?? c.defaultValue);
      }
      handle.update(4.2, 0, 0.75, toggledParams);

      if (handle.getLiveReadout) {
        const metrics = handle.getLiveReadout(4.2, 0, toggledParams);
        expect(metrics.length).toBeGreaterThanOrEqual(1);
        expect(metrics[0].value.length).toBeGreaterThan(0);
      }

      disposeObject3D(handle.root);
    }
  });

  it('implements true rising-edge latch semantics inside D_FF 3D diorama', () => {
    const dff = PONDER_SCENE_BUILDERS.D_FF();
    // Initially latchedQ=1, clk=0. Change d=0 while clk stays 0 -> Q must stay 1
    dff.update(0.1, 0, 0, { d: 0, clk: 0 });
    expect(dff.getLiveReadout?.(0.1, 0, { d: 0, clk: 0 })[0].value).toContain('Q = 1');

    // Still clk=0 -> changing d still does not leak to Q
    dff.update(0.2, 0, 0, { d: 0, clk: 0 });
    expect(dff.getLiveReadout?.(0.2, 0, { d: 0, clk: 0 })[0].value).toContain('Q = 1');

    // Trigger rising edge clk 0 -> 1 while d=0 -> Q latches 0!
    dff.update(0.3, 0, 0, { d: 0, clk: 1 });
    expect(dff.getLiveReadout?.(0.3, 0, { d: 0, clk: 1 })[0].value).toContain('Q = 0');

    // Change d=1 while clk stays high (1 -> 1, not a rising edge!) -> Q stays 0!
    dff.update(0.4, 0, 0, { d: 1, clk: 1 });
    expect(dff.getLiveReadout?.(0.4, 0, { d: 1, clk: 1 })[0].value).toContain('Q = 0');

    disposeObject3D(dff.root);
  });

  it('manages dwell anchor locking and modal transitions in usePonderStore', () => {
    const store = usePonderStore.getState();
    store.closePonder();
    store.setHoveredTarget(null);

    store.setHoveredTarget({
      type: 'RESISTOR',
      label: '电阻器',
      source: 'palette',
      anchorX: 200,
      anchorY: 150,
    });
    expect(usePonderStore.getState().hoveredTarget?.type).toBe('RESISTOR');
    expect(usePonderStore.getState().hoveredTarget?.anchorX).toBe(200);

    // Same target re-emitted at slight mouse drift keeps original anchor locked
    store.setHoveredTarget({
      type: 'RESISTOR',
      label: '电阻器',
      source: 'palette',
      anchorX: 215,
      anchorY: 158,
    });
    expect(usePonderStore.getState().hoveredTarget?.anchorX).toBe(200);

    // Clearing only matching source works cleanly
    store.clearHoverIfSource('3d');
    expect(usePonderStore.getState().hoveredTarget).not.toBeNull();
    store.clearHoverIfSource('palette');
    expect(usePonderStore.getState().hoveredTarget).toBeNull();

    // Opening modal clears hover state and sets activeType
    store.openPonder('FULL_ADDER');
    expect(usePonderStore.getState().modalOpen).toBe(true);
    expect(usePonderStore.getState().activeType).toBe('FULL_ADDER');
    store.closePonder();
    expect(usePonderStore.getState().modalOpen).toBe(false);
  });

  it('derives circuit-connected instance Ponder context and synchronizes dynamic narration', () => {
    const rComp = {
      id: 'r1',
      type: 'RESISTOR' as const,
      label: 'R1',
      pos3d: [0, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 200, y: 200 },
      rot2d: 0,
      props: { resistance: 1000, maxPower: 0.25 },
    };
    const rTel = {
      componentId: 'r1',
      voltageDrop: 5,
      current: 0.005,
      power: 0.025,
      maxPower: 0.25,
      loadRatio: 0.1,
      overloaded: false,
      pinVoltages: { p1: 5, p2: 0 },
    };
    const dummyWire = {
      id: 'w1',
      from: { componentId: 'v1', pinId: 'pos' },
      to: { componentId: 'r1', pinId: 'p1' },
      color: '#38bdf8',
    };
    const ctx = deriveInstancePonderContext(rComp, rTel, [rComp], [dummyWire]);
    expect(ctx.initialParams.ohms).toBe(1000);
    expect(ctx.initialParams.voltage).toBe(5);
    expect(ctx.causalExplanation).toContain('1.00 kΩ');
    expect(ctx.causalExplanation).toContain('5.00 mA');

    // Dynamic XOR narration syncs with A=1, B=1 and exposes explicit analogy metadata
    const xorNarration = resolveStepNarration(PONDER_DATA.XOR, 1, { a: 1, b: 1 });
    expect(xorNarration).toContain('A=1');
    expect(xorNarration).toContain('B=1');
    expect(xorNarration).toContain('Y=0');
    expect(xorNarration).not.toContain('当前 A=1, B=0');
    expect(PONDER_DATA.XOR.analogyNote).toContain('原理类比');
    expect(PONDER_DATA.XOR.callouts.some((c) => c.isAnalogy)).toBe(true);
  });

  it('keeps RC discharge signed/magnitude math consistent and avoids positive/positive = negative', () => {
    const rComp = {
      id: 'r1',
      type: 'RESISTOR' as const,
      label: 'R1',
      pos3d: [0, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 320, y: 160 },
      rot2d: 0,
      props: { resistance: 1000, maxPower: 1.0 },
    };
    const cComp = {
      id: 'c1',
      type: 'CAPACITOR' as const,
      label: 'C1',
      pos3d: [1, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 490, y: 260 },
      rot2d: 90,
      props: { capacitance: 220 },
    };
    const rDischargeTel = {
      componentId: 'r1',
      voltageDrop: -3.2,
      current: -0.0032,
      power: 0.01024,
      maxPower: 1.0,
      loadRatio: 0.01024,
      overloaded: false,
      pinVoltages: { a: 0, b: 3.2 },
    };
    const cDischargeTel = {
      componentId: 'c1',
      voltageDrop: 3.2,
      current: -0.0032,
      power: 0.01024,
      maxPower: 5.0,
      loadRatio: 0.002,
      overloaded: false,
      pinVoltages: { pos: 3.2, neg: 0 },
    };
    const wire = {
      id: 'w2',
      from: { componentId: 'r1', pinId: 'b' },
      to: { componentId: 'c1', pinId: 'pos' },
      color: '#38bdf8',
    };

    const rCtx = deriveInstancePonderContext(rComp, rDischargeTel, [rComp, cComp], [wire]);
    expect(rCtx.isOverridden).toBe(false);
    expect(rCtx.causalExplanation).toContain('-3.20 V / 1.00 kΩ = -3.20 mA');
    expect(rCtx.causalExplanation).toContain('3.20 V / 1.00 kΩ = 3.20 mA');
    expect(rCtx.causalExplanation).not.toContain('= 3.20 V / 1.00 kΩ = -3.20 mA');

    const cCtx = deriveInstancePonderContext(cComp, cDischargeTel, [rComp, cComp], [wire]);
    expect(cCtx.causalExplanation).toContain('放电');
    expect(cCtx.liveMetrics.some((m) => m.label.includes('放电') && m.value === '-3.20 mA')).toBe(
      true
    );
  });

  it('synchronizes liveMetrics, causalExplanation, and pinSummary when toggling inputs in instance mode', () => {
    const xorComp = {
      id: 'xor1',
      type: 'XOR' as const,
      label: 'U1_XOR',
      pos3d: [0, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 270, y: 170 },
      rot2d: 0,
      props: {},
    };
    const xorTel = {
      componentId: 'xor1',
      voltageDrop: 0,
      current: 0,
      power: 0,
      maxPower: 1,
      loadRatio: 0,
      overloaded: false,
      pinVoltages: { a: 0, b: 0, y: 0 },
    };

    const syncedXor = deriveInstancePonderContext(xorComp, xorTel, [xorComp], []);
    expect(syncedXor.isOverridden).toBe(false);
    expect(syncedXor.liveMetrics[0].label).toContain('实测');
    expect(syncedXor.liveMetrics[0].value).toBe('A=0, B=0');
    expect(syncedXor.liveMetrics[1].value).toContain('Y=0');

    const trialXor = deriveInstancePonderContext(xorComp, xorTel, [xorComp], [], { a: 1, b: 0 });
    expect(trialXor.isOverridden).toBe(true);
    expect(trialXor.liveMetrics[0].label).toContain('试算');
    expect(trialXor.liveMetrics[0].value).toBe('A=1, B=0');
    expect(trialXor.liveMetrics[1].label).toContain('试算');
    expect(trialXor.liveMetrics[1].value).toBe('Y=1 (5.0V)');
    expect(trialXor.liveMetrics.every((m) => !m.label.includes('实测'))).toBe(true);
    expect(trialXor.causalExplanation).toContain('交互试算');
    expect(trialXor.causalExplanation).toContain('Y = 1 ⊕ 0 = 1');
    expect(trialXor.pinSummary).toContain('A: 5.00V(1)');
    expect(trialXor.pinSummary).toContain('Y: 5.00V(1)');

    const inComp = {
      id: 'in1',
      type: 'LOGIC_IN' as const,
      label: 'B',
      pos3d: [-1, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 100, y: 260 },
      rot2d: 0,
      props: { state: 0, varName: 'B' },
    };
    const inTel = {
      componentId: 'in1',
      voltageDrop: 0,
      current: 0,
      power: 0,
      maxPower: 1,
      loadRatio: 0,
      overloaded: false,
      logicState: 0,
      pinVoltages: { out: 0 },
    };

    const trialIn = deriveInstancePonderContext(inComp, inTel, [inComp], [], { state: 1 });
    expect(trialIn.isOverridden).toBe(true);
    expect(trialIn.liveMetrics[0].label).toContain('试算');
    expect(trialIn.liveMetrics[0].value).toBe('1 (HIGH +5.0V)');
    expect(trialIn.pinSummary).toContain('5.00V(1)');
    expect(trialIn.applyPropsPatch).toEqual({ state: 1 });

    // v0.6 new modules instance bridge (NIXIE_TUBE & ALU_4BIT)
    const nixComp = {
      id: 'nix1',
      type: 'NIXIE_TUBE' as const,
      label: 'NIX1',
      pos3d: [0, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 200, y: 200 },
      rot2d: 0,
      props: { bcdBlank: true },
    };
    const nixTel = {
      componentId: 'nix1',
      voltageDrop: 0,
      current: 0,
      power: 0.14,
      maxPower: 2,
      loadRatio: 0.07,
      overloaded: false,
      logicState: 5,
      pinVoltages: { d0: 5, d1: 0, d2: 5, d3: 0 },
    };
    const nixCtx = deriveInstancePonderContext(nixComp, nixTel, [nixComp], []);
    expect(nixCtx.liveMetrics.some((m) => m.value.includes('5'))).toBe(true);
    const nixTrial = deriveInstancePonderContext(nixComp, nixTel, [nixComp], [], {
      digit: 11,
      bcdBlank: 0,
    });
    expect(nixTrial.isOverridden).toBe(true);
    expect(nixTrial.pinSummary).toContain('D3(8): 5.00V(1)');

    const aluComp = {
      id: 'alu1',
      type: 'ALU_4BIT' as const,
      label: 'ALU1',
      pos3d: [0, 0, 0] as [number, number, number],
      rotationY: 0,
      pos2d: { x: 300, y: 200 },
      rot2d: 0,
      props: {},
    };
    const aluTel = {
      componentId: 'alu1',
      voltageDrop: 0,
      current: 0,
      power: 0,
      maxPower: 1,
      loadRatio: 0,
      overloaded: false,
      logicState: 7,
      pinVoltages: {
        a0: 5, a1: 0, a2: 5, a3: 0,
        b0: 0, b1: 5, b2: 0, b3: 0,
        op0: 0, op1: 0,
        f0: 5, f1: 5, f2: 5, f3: 0,
        cout: 0, zero: 0,
      },
    };
    const aluCtx = deriveInstancePonderContext(aluComp, aluTel, [aluComp], []);
    expect(aluCtx.causalExplanation).toContain('ALU');
  });
});
