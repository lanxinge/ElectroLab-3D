import { create } from 'zustand';
import type {
  CircuitComponent,
  CircuitData,
  ComponentTelemetry,
  ComponentType,
  PinRef,
  Wire,
  WireTelemetry,
} from '../../shared/types';
import {
  COMPONENT_CATALOG,
  world2dTo3d,
  world3dTo2d,
} from '../engine/componentCatalog';
import {
  createInitialRuntimeState,
  solveCircuitStep,
  type SimulationRuntimeState,
} from '../engine/mnaSolver';
import { CIRCUIT_PRESETS } from '../presets/circuitPresets';

export type ActiveTool = 'select' | 'wire' | 'delete';
export type SidebarMode = 'split' | '3d-only' | '2d-only';
export type SchematicTheme = 'dark' | 'blueprint';

export interface SelectedEntity {
  kind: 'component' | 'wire';
  id: string;
}

export interface OscilloscopeSample {
  t: number;
  values: Record<string, number>; // componentId -> primary voltage
}

interface HistorySnapshot {
  components: CircuitComponent[];
  wires: Wire[];
}

interface CircuitStoreState {
  projectTitle: string;
  activePresetId: string | null;
  components: CircuitComponent[];
  wires: Wire[];
  selected: SelectedEntity | null;
  activeTool: ActiveTool;
  wireColor: string;
  isRunning: boolean;
  simTime: number;
  simRuntime: SimulationRuntimeState;
  telemetryById: Record<string, ComponentTelemetry>;
  wireTelemetryById: Record<string, WireTelemetry>;
  implicitGroundUsed: boolean;
  warnings: string[];
  oscilloscopeChannels: string[]; // componentIds (up to 4)
  oscilloscopeSamples: OscilloscopeSample[];
  show3DLabels: boolean;
  sidebarMode: SidebarMode;
  schematicTheme: SchematicTheme;
  historyPast: HistorySnapshot[];
  wiringDraftFrom: PinRef | null;

  // Actions
  setActiveTool: (tool: ActiveTool) => void;
  setWireColor: (color: string) => void;
  setSelected: (sel: SelectedEntity | null) => void;
  setWiringDraftFrom: (pin: PinRef | null) => void;
  setShow3DLabels: (show: boolean) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setSchematicTheme: (theme: SchematicTheme) => void;
  toggleRunning: () => void;
  resetSimulationTime: () => void;
  stepSimulation: (dt: number) => void;
  recomputeInstant: () => void;

  addComponent: (
    type: ComponentType,
    pos3d?: [number, number, number],
    pos2d?: { x: number; y: number }
  ) => CircuitComponent;
  moveComponent3D: (id: string, pos3d: [number, number, number], commitHistory?: boolean) => void;
  moveComponent2D: (id: string, pos2d: { x: number; y: number }, commitHistory?: boolean) => void;
  pushUndoSnapshot: () => void;
  undo: () => void;
  rotateComponent: (id: string) => void;
  updateComponentLabel: (id: string, label: string) => void;
  updateComponentProp: (id: string, key: string, value: number | string | boolean) => void;
  toggleInteractiveComponent: (id: string) => void;

  addWire: (from: PinRef, to: PinRef, color?: string) => void;
  removeEntity: (kind: 'component' | 'wire', id: string) => void;
  autoLayout2D: () => void;
  clearWorkbench: () => void;
  loadCircuit: (circuit: CircuitData, title?: string, presetId?: string | null) => void;
  toggleOscilloscopeChannel: (componentId: string) => void;
  clearOscilloscope: () => void;
}

function cloneCircuit(components: CircuitComponent[], wires: Wire[]): HistorySnapshot {
  return {
    components: components.map((c) => ({
      ...c,
      pos3d: [...c.pos3d] as [number, number, number],
      pos2d: { ...c.pos2d },
      props: { ...c.props },
    })),
    wires: wires.map((w) => ({
      ...w,
      from: { ...w.from },
      to: { ...w.to },
    })),
  };
}

function pickDefaultScopeChannels(components: CircuitComponent[]): string[] {
  const preferred = components.filter((c) =>
    ['VOLTMETER', 'CAPACITOR', 'OPAMP', 'AC_SOURCE', 'LED', 'RESISTOR'].includes(c.type)
  );
  return preferred.slice(0, 3).map((c) => c.id);
}

function nextComponentLabel(type: ComponentType, existing: CircuitComponent[]): string {
  const spec = COMPONENT_CATALOG[type];
  if (type === 'LOGIC_IN') {
    const used = new Set(
      existing
        .filter((c) => c.type === 'LOGIC_IN')
        .map((c) => String(c.props.varName || c.label))
    );
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of alphabet) {
      if (!used.has(ch)) return ch;
    }
  }
  const existingLabels = new Set(existing.map((c) => c.label));
  let idx = 1;
  while (existingLabels.has(`${spec.labelPrefix}${idx}`)) idx++;
  return `${spec.labelPrefix}${idx}`;
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const initialPreset = CIRCUIT_PRESETS[0];
const initialRuntime = createInitialRuntimeState();
const initialSolved = solveCircuitStep(initialPreset.circuit, initialRuntime, 0);

export const useCircuitStore = create<CircuitStoreState>((set, get) => ({
  projectTitle: initialPreset.title,
  activePresetId: initialPreset.id,
  components: cloneCircuit(initialPreset.circuit.components, initialPreset.circuit.wires).components,
  wires: cloneCircuit(initialPreset.circuit.components, initialPreset.circuit.wires).wires,
  selected: null,
  activeTool: 'select',
  wireColor: '#38bdf8',
  isRunning: true,
  simTime: 0,
  simRuntime: initialRuntime,
  telemetryById: initialSolved.telemetryById,
  wireTelemetryById: initialSolved.wireTelemetryById,
  implicitGroundUsed: initialSolved.implicitGroundUsed,
  warnings: initialSolved.warnings,
  oscilloscopeChannels: pickDefaultScopeChannels(initialPreset.circuit.components),
  oscilloscopeSamples: [],
  show3DLabels: true,
  sidebarMode: 'split',
  schematicTheme: 'dark',
  historyPast: [],
  wiringDraftFrom: null,

  setActiveTool: (tool) => set({ activeTool: tool, wiringDraftFrom: null }),
  setWireColor: (color) => set({ wireColor: color }),
  setSelected: (sel) => set({ selected: sel }),
  setWiringDraftFrom: (pin) => set({ wiringDraftFrom: pin }),
  setShow3DLabels: (show) => set({ show3DLabels: show }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  setSchematicTheme: (theme) => set({ schematicTheme: theme }),

  toggleRunning: () => set((s) => ({ isRunning: !s.isRunning })),

  resetSimulationTime: () => {
    const { components, wires } = get();
    const freshRuntime = createInitialRuntimeState();
    const res = solveCircuitStep({ components, wires }, freshRuntime, 0);
    set({
      simTime: 0,
      simRuntime: freshRuntime,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeSamples: [],
    });
  },

  stepSimulation: (dt) => {
    const state = get();
    if (!state.isRunning) return;
    const res = solveCircuitStep({ components: state.components, wires: state.wires }, state.simRuntime, dt);
    const values: Record<string, number> = {};
    for (const cid of state.oscilloscopeChannels) {
      const tel = res.telemetryById[cid];
      if (tel) values[cid] = tel.voltageDrop;
    }
    const nextSamples =
      state.oscilloscopeChannels.length > 0
        ? [...state.oscilloscopeSamples.slice(-239), { t: res.time, values }]
        : state.oscilloscopeSamples;

    set({
      simTime: res.time,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeSamples: nextSamples,
    });
  },

  recomputeInstant: () => {
    const state = get();
    const res = solveCircuitStep({ components: state.components, wires: state.wires }, state.simRuntime, 0);
    set({
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
  },

  pushUndoSnapshot: () => {
    const { components, wires, historyPast } = get();
    const snap = cloneCircuit(components, wires);
    set({ historyPast: [...historyPast.slice(-24), snap] });
  },

  undo: () => {
    const { historyPast, simRuntime } = get();
    if (historyPast.length === 0) return;
    const prev = historyPast[historyPast.length - 1];
    const res = solveCircuitStep({ components: prev.components, wires: prev.wires }, simRuntime, 0);
    set({
      components: prev.components,
      wires: prev.wires,
      historyPast: historyPast.slice(0, -1),
      selected: null,
      wiringDraftFrom: null,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
  },

  addComponent: (type, pos3dArg, pos2dArg) => {
    const state = get();
    state.pushUndoSnapshot();
    const spec = COMPONENT_CATALOG[type];
    const label = nextComponentLabel(type, state.components);

    let pos3d: [number, number, number];
    let pos2d: { x: number; y: number };
    if (pos3dArg) {
      pos3d = pos3dArg;
      pos2d = pos2dArg ?? world3dTo2d(pos3dArg);
    } else if (pos2dArg) {
      pos2d = pos2dArg;
      pos3d = world2dTo3d(pos2dArg);
    } else {
      // Stagger nicely near center
      const n = state.components.length;
      const offsetX = ((n % 5) - 2) * 1.4;
      const offsetZ = (Math.floor(n / 5) % 4 - 1.5) * 1.4;
      pos3d = [Number(offsetX.toFixed(2)), 0, Number(offsetZ.toFixed(2))];
      pos2d = world3dTo2d(pos3d);
    }

    const props: Record<string, number | string | boolean> = { ...spec.defaultProps };
    if (type === 'LOGIC_IN') {
      props.varName = label;
    } else if (type === 'LOGIC_OUT') {
      props.outName = label;
    }

    const comp: CircuitComponent = {
      id: genId(type.toLowerCase()),
      type,
      label,
      pos3d,
      rotationY: 0,
      pos2d,
      rot2d: 0,
      props,
    };

    const nextComponents = [...state.components, comp];
    const res = solveCircuitStep({ components: nextComponents, wires: state.wires }, state.simRuntime, 0);
    set({
      components: nextComponents,
      selected: { kind: 'component', id: comp.id },
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
    return comp;
  },

  moveComponent3D: (id, pos3d, commitHistory = false) => {
    const state = get();
    if (commitHistory) state.pushUndoSnapshot();
    const pos2d = world3dTo2d(pos3d);
    set({
      components: state.components.map((c) =>
        c.id === id ? { ...c, pos3d: [pos3d[0], 0, pos3d[2]], pos2d } : c
      ),
    });
  },

  moveComponent2D: (id, pos2d, commitHistory = false) => {
    const state = get();
    if (commitHistory) state.pushUndoSnapshot();
    const snapped = {
      x: Math.round(pos2d.x / 10) * 10,
      y: Math.round(pos2d.y / 10) * 10,
    };
    const pos3d = world2dTo3d(snapped);
    set({
      components: state.components.map((c) =>
        c.id === id ? { ...c, pos2d: snapped, pos3d } : c
      ),
    });
  },

  rotateComponent: (id) => {
    const state = get();
    state.pushUndoSnapshot();
    set({
      components: state.components.map((c) => {
        if (c.id !== id) return c;
        const nextRot2d = (c.rot2d + 90) % 360;
        const nextRotY = (-nextRot2d * Math.PI) / 180;
        return { ...c, rot2d: nextRot2d, rotationY: nextRotY };
      }),
    });
  },

  updateComponentLabel: (id, label) => {
    set((s) => ({
      components: s.components.map((c) => (c.id === id ? { ...c, label } : c)),
    }));
  },

  updateComponentProp: (id, key, value) => {
    const state = get();
    const nextComponents = state.components.map((c) =>
      c.id === id ? { ...c, props: { ...c.props, [key]: value } } : c
    );
    const res = solveCircuitStep({ components: nextComponents, wires: state.wires }, state.simRuntime, 0);
    set({
      components: nextComponents,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
  },

  toggleInteractiveComponent: (id) => {
    const state = get();
    const comp = state.components.find((c) => c.id === id);
    if (!comp) return;
    if (comp.type === 'SWITCH_SPST') {
      state.updateComponentProp(id, 'closed', !Boolean(comp.props.closed ?? true));
    } else if (comp.type === 'SWITCH_SPDT') {
      state.updateComponentProp(id, 'position', Number(comp.props.position ?? 0) === 0 ? 1 : 0);
    } else if (comp.type === 'LOGIC_IN') {
      state.updateComponentProp(id, 'state', Number(comp.props.state ?? 0) ? 0 : 1);
    }
  },

  addWire: (from, to, colorArg) => {
    const state = get();
    if (from.componentId === to.componentId && from.pinId === to.pinId) return;
    const dup = state.wires.some(
      (w) =>
        (w.from.componentId === from.componentId &&
          w.from.pinId === from.pinId &&
          w.to.componentId === to.componentId &&
          w.to.pinId === to.pinId) ||
        (w.from.componentId === to.componentId &&
          w.from.pinId === to.pinId &&
          w.to.componentId === from.componentId &&
          w.to.pinId === from.pinId)
    );
    if (dup) return;

    state.pushUndoSnapshot();
    const wire: Wire = {
      id: genId('w'),
      from,
      to,
      color: colorArg || state.wireColor,
    };
    const nextWires = [...state.wires, wire];
    const res = solveCircuitStep({ components: state.components, wires: nextWires }, state.simRuntime, 0);
    set({
      wires: nextWires,
      wiringDraftFrom: null,
      selected: { kind: 'wire', id: wire.id },
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
  },

  removeEntity: (kind, id) => {
    const state = get();
    state.pushUndoSnapshot();
    let nextComponents = state.components;
    let nextWires = state.wires;
    if (kind === 'component') {
      nextComponents = state.components.filter((c) => c.id !== id);
      nextWires = state.wires.filter(
        (w) => w.from.componentId !== id && w.to.componentId !== id
      );
    } else {
      nextWires = state.wires.filter((w) => w.id !== id);
    }
    const res = solveCircuitStep({ components: nextComponents, wires: nextWires }, state.simRuntime, 0);
    set({
      components: nextComponents,
      wires: nextWires,
      selected:
        state.selected?.id === id ? null : state.selected,
      oscilloscopeChannels: state.oscilloscopeChannels.filter((cid) => cid !== id),
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
    });
  },

  autoLayout2D: () => {
    const state = get();
    state.pushUndoSnapshot();
    const colOrder: Record<string, number> = {
      power: 0,
      instrument: 3,
      passive: 1,
      semiconductor: 2,
      digital: 2,
    };
    const buckets: CircuitComponent[][] = [[], [], [], []];
    for (const c of state.components) {
      if (c.type === 'LOGIC_IN' || c.type === 'CLOCK') {
        buckets[0].push(c);
      } else if (c.type === 'LOGIC_OUT' || c.type === 'HEX_DISPLAY') {
        buckets[3].push(c);
      } else {
        const cat = COMPONENT_CATALOG[c.type].category;
        buckets[colOrder[cat] ?? 1].push(c);
      }
    }
    const updatedMap = new Map<string, { x: number; y: number }>();
    buckets.forEach((col, cIdx) => {
      col.forEach((comp, rIdx) => {
        updatedMap.set(comp.id, {
          x: 120 + cIdx * 190,
          y: 120 + rIdx * 110,
        });
      });
    });
    set({
      components: state.components.map((c) => ({
        ...c,
        pos2d: updatedMap.get(c.id) ?? c.pos2d,
      })),
    });
  },

  clearWorkbench: () => {
    const state = get();
    state.pushUndoSnapshot();
    const freshRuntime = createInitialRuntimeState();
    set({
      projectTitle: '新建空白实验电路',
      activePresetId: null,
      components: [],
      wires: [],
      selected: null,
      wiringDraftFrom: null,
      simTime: 0,
      simRuntime: freshRuntime,
      telemetryById: {},
      wireTelemetryById: {},
      implicitGroundUsed: false,
      warnings: [],
      oscilloscopeChannels: [],
      oscilloscopeSamples: [],
    });
  },

  loadCircuit: (circuit, title, presetId = null) => {
    const cloned = cloneCircuit(circuit.components, circuit.wires);
    // Ensure every loaded component has both valid 3D & 2D coordinates
    const normalizedComponents = cloned.components.map((c) => ({
      ...c,
      pos2d: c.pos2d ?? world3dTo2d(c.pos3d ?? [0, 0, 0]),
      pos3d: c.pos3d ?? world2dTo3d(c.pos2d ?? { x: 380, y: 260 }),
      rot2d: c.rot2d ?? 0,
      rotationY: c.rotationY ?? 0,
    }));
    const freshRuntime = createInitialRuntimeState();
    const res = solveCircuitStep(
      { components: normalizedComponents, wires: cloned.wires },
      freshRuntime,
      0
    );
    set({
      projectTitle: title || '加载的实验电路',
      activePresetId: presetId,
      components: normalizedComponents,
      wires: cloned.wires,
      selected: null,
      wiringDraftFrom: null,
      simTime: 0,
      simRuntime: freshRuntime,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeChannels: pickDefaultScopeChannels(normalizedComponents),
      oscilloscopeSamples: [],
      historyPast: [],
    });
  },

  toggleOscilloscopeChannel: (componentId) => {
    set((s) => {
      const exists = s.oscilloscopeChannels.includes(componentId);
      if (exists) {
        return {
          oscilloscopeChannels: s.oscilloscopeChannels.filter((id) => id !== componentId),
        };
      }
      if (s.oscilloscopeChannels.length >= 4) {
        return {
          oscilloscopeChannels: [...s.oscilloscopeChannels.slice(1), componentId],
        };
      }
      return {
        oscilloscopeChannels: [...s.oscilloscopeChannels, componentId],
      };
    });
  },

  clearOscilloscope: () => set({ oscilloscopeSamples: [] }),
}));
