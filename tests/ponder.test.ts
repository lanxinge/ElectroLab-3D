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

describe('Create-Mod Style Ponder System (All 45 Circuit Modules)', () => {
  it('defines complete storyboard specs for every single ComponentType in catalog', () => {
    expect(ALL_CATALOG_TYPES.length).toBe(45);
    expect(ALL_PONDER_TYPES.length).toBe(45);

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

  it('registers 45 distinct 3D diorama builder functions (one unique showcase per module)', () => {
    const builders = ALL_CATALOG_TYPES.map((t) => PONDER_SCENE_BUILDERS[t]);
    expect(builders.every((fn) => typeof fn === 'function')).toBe(true);
    const uniqueFnSet = new Set(builders);
    expect(uniqueFnSet.size).toBe(45);
  });

  it('instantiates, animates, reads telemetry metrics, and disposes all 45 3D dioramas cleanly', () => {
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
});
