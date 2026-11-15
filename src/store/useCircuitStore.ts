import { create } from 'zustand';
import type {
  CircuitComponent,
  CircuitData,
  ComponentTelemetry,
  ComponentType,
  CustomIcPayload,
  PinRef,
  Wire,
  WireTelemetry,
} from '../../shared/types';
import {
  COMPONENT_CATALOG,
  world2dTo3d,
  world3dTo2d,
} from '../engine/componentCatalog';
import { getDefaultTruthChipConfig } from '../engine/customIcEngine';
import {
  advanceCircuitSimulation,
  createInitialRuntimeState,
  solveCircuitStep,
  type SimulationRuntimeState,
} from '../engine/mnaSolver';
import { extractScopeSampleValue } from '../engine/scopeChannelMeta';
import { CIRCUIT_PRESETS } from '../presets/circuitPresets';

export type ActiveTool = 'select' | 'wire' | 'delete';
export type SidebarMode = 'split' | '3d-only' | '2d-only';
export type SchematicTheme = 'dark' | 'blueprint';
export type AnalysisTab = 'telemetry' | 'ac' | 'digital';

export interface LoadCircuitOptions {
  timeScale?: number;
  scopeChannels?: string[];
  prewarmSeconds?: number;
  isRunning?: boolean;
  highlightedIds?: string[];
  newlyAddedIds?: string[];
  preferredAnalysisTab?: AnalysisTab | null;
}

export interface SelectedEntity {
  kind: 'component' | 'wire';
  id: string;
}

export interface OscilloscopeSample {
  t: number;
  values: Record<string, number>; // componentId -> channel measured quantity (V / V~ / A / A~)
}

export interface TransientEventSnapshot {
  t0: number;
  hasSwitched: boolean;
  initialCapVoltages: Record<string, number>;
  initialIndCurrents: Record<string, number>;
}

function createEmptyTransientAnchor(t0 = 0): TransientEventSnapshot {
  return {
    t0,
    hasSwitched: false,
    initialCapVoltages: {},
    initialIndCurrents: {},
  };
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
  transientAnchor: TransientEventSnapshot;
  timeScale: number;
  simRuntime: SimulationRuntimeState;
  telemetryById: Record<string, ComponentTelemetry>;
  wireTelemetryById: Record<string, WireTelemetry>;
  implicitGroundUsed: boolean;
  warnings: string[];
  circuitLoadVersion: number;
  oscilloscopeChannels: string[]; // componentIds (up to 4)
  oscilloscopeSamples: OscilloscopeSample[];
  highlightedIds: string[];
  newlyAddedIds: string[];
  preferredAnalysisTab: AnalysisTab | null;
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
  setTimeScale: (scale: number) => void;
  setTutorialHighlights: (
    highlightedIds: string[],
    newlyAddedIds?: string[],
    preferredAnalysisTab?: AnalysisTab | null
  ) => void;
  toggleRunning: () => void;
  resetSimulationTime: () => void;
  stepSimulation: (dt: number) => void;
  stepOnce: (baseDt?: number) => void;
  recomputeInstant: () => void;

  addComponent: (
    type: ComponentType,
    pos3d?: [number, number, number],
    pos2d?: { x: number; y: number }
  ) => CircuitComponent;
  spawnCustomIc: (
    icPayload: CustomIcPayload,
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
  resetFuse: (id: string) => void;
  toggleInteractiveComponent: (id: string) => void;

  addWire: (from: PinRef, to: PinRef, color?: string) => void;
  removeEntity: (kind: 'component' | 'wire', id: string) => void;
  autoLayout2D: () => void;
  clearWorkbench: () => void;
  loadCircuit: (
    circuit: CircuitData,
    title?: string,
    presetId?: string | null,
    options?: LoadCircuitOptions
  ) => void;
  toggleOscilloscopeChannel: (componentId: string) => void;
  clearOscilloscope: () => void;
}

function sampleScopeChannels(
  channels: string[],
  components: CircuitComponent[],
  telemetryById: Record<string, ComponentTelemetry>
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const cid of channels) {
    const tel = telemetryById[cid];
    if (!tel) continue;
    const comp = components.find((c) => c.id === cid);
    values[cid] = extractScopeSampleValue(comp, tel);
  }
  return values;
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
  transientAnchor: createEmptyTransientAnchor(0),
  timeScale: 1,
  simRuntime: initialRuntime,
  telemetryById: initialSolved.telemetryById,
  wireTelemetryById: initialSolved.wireTelemetryById,
  implicitGroundUsed: initialSolved.implicitGroundUsed,
  warnings: initialSolved.warnings,
  oscilloscopeChannels: pickDefaultScopeChannels(initialPreset.circuit.components),
  oscilloscopeSamples: [],
  highlightedIds: [],
  newlyAddedIds: [],
  preferredAnalysisTab: null,
  show3DLabels: true,
  sidebarMode: 'split',
  schematicTheme: 'dark',
  historyPast: [],
  circuitLoadVersion: 0,
  wiringDraftFrom: null,

  setActiveTool: (tool) => set({ activeTool: tool, wiringDraftFrom: null }),
  setWireColor: (color) => set({ wireColor: color }),
  setSelected: (sel) => set({ selected: sel }),
  setWiringDraftFrom: (pin) => set({ wiringDraftFrom: pin }),
  setShow3DLabels: (show) => set({ show3DLabels: show }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  setSchematicTheme: (theme) => set({ schematicTheme: theme }),
  setTimeScale: (scale) =>
    set({ timeScale: Math.min(4, Math.max(0.01, Number.isFinite(scale) ? scale : 1)) }),
  setTutorialHighlights: (highlightedIds, newlyAddedIds = [], preferredAnalysisTab = null) =>
    set({ highlightedIds, newlyAddedIds, preferredAnalysisTab }),

  toggleRunning: () => set((s) => ({ isRunning: !s.isRunning })),

  resetSimulationTime: () => {
    const { components, wires } = get();
    const freshRuntime = createInitialRuntimeState();
    const res = advanceCircuitSimulation({ components, wires }, freshRuntime, 0, {
      zeroDtMode: 'holdState',
    });
    set({
      simTime: 0,
      transientAnchor: createEmptyTransientAnchor(0),
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
    const scaledDt = Math.max(0.0001, dt * state.timeScale);
    const res = advanceCircuitSimulation(
      { components: state.components, wires: state.wires },
      state.simRuntime,
      scaledDt
    );
    const values = sampleScopeChannels(
      state.oscilloscopeChannels,
      state.components,
      res.telemetryById
    );
    const nextSamples =
      state.oscilloscopeChannels.length > 0
        ? [...state.oscilloscopeSamples.slice(-239), { t: res.time, values }]
        : state.oscilloscopeSamples;

    const fuseSyncNeeded = state.components.some(
      (c) => c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
    );
    const nextComponents = fuseSyncNeeded
      ? state.components.map((c) =>
          c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
            ? { ...c, props: { ...c.props, blown: true } }
            : c
        )
      : state.components;

    set({
      ...(fuseSyncNeeded ? { components: nextComponents } : {}),
      simTime: res.time,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeSamples: nextSamples,
    });
  },

  stepOnce: (baseDt = 0.02) => {
    const state = get();
    const scaledDt = Math.max(0.0001, baseDt * state.timeScale);
    const res = advanceCircuitSimulation(
      { components: state.components, wires: state.wires },
      state.simRuntime,
      scaledDt
    );
    const values = sampleScopeChannels(
      state.oscilloscopeChannels,
      state.components,
      res.telemetryById
    );
    const nextSamples =
      state.oscilloscopeChannels.length > 0
        ? [...state.oscilloscopeSamples.slice(-239), { t: res.time, values }]
        : state.oscilloscopeSamples;

    const fuseSyncNeeded = state.components.some(
      (c) => c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
    );
    const nextComponents = fuseSyncNeeded
      ? state.components.map((c) =>
          c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
            ? { ...c, props: { ...c.props, blown: true } }
            : c
        )
      : state.components;

    set({
      ...(fuseSyncNeeded ? { components: nextComponents } : {}),
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
    const res = advanceCircuitSimulation(
      { components: state.components, wires: state.wires },
      state.simRuntime,
      0,
      { zeroDtMode: 'holdState' }
    );
    const fuseSyncNeeded = state.components.some(
      (c) => c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
    );
    const nextComponents = fuseSyncNeeded
      ? state.components.map((c) =>
          c.type === 'FUSE' && state.simRuntime.blownFuses[c.id] && !Boolean(c.props.blown)
            ? { ...c, props: { ...c.props, blown: true } }
            : c
        )
      : state.components;
    set({
      ...(fuseSyncNeeded ? { components: nextComponents } : {}),
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
    const res = solveCircuitStep({ components: prev.components, wires: prev.wires }, simRuntime, 0, {
      zeroDtMode: 'holdState',
    });
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
    } else if (type === 'IC_PORT_IN' || type === 'IC_PORT_OUT') {
      props.portName = label;
    } else if (type === 'CUSTOM_TRUTH_8') {
      const cfg = getDefaultTruthChipConfig(8);
      props.chipName = cfg.chipName;
      props.truthConfigJson = JSON.stringify(cfg);
    } else if (type === 'CUSTOM_TRUTH_16') {
      const cfg = getDefaultTruthChipConfig(16);
      props.chipName = cfg.chipName;
      props.truthConfigJson = JSON.stringify(cfg);
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
    const res = solveCircuitStep({ components: nextComponents, wires: state.wires }, state.simRuntime, 0, {
      zeroDtMode: 'holdState',
    });
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

  spawnCustomIc: (icPayload, pos3dArg, pos2dArg) => {
    const state = get();
    state.pushUndoSnapshot();
    const label = nextComponentLabel('CUSTOM_IC', state.components);

    let pos3d: [number, number, number];
    let pos2d: { x: number; y: number };
    if (pos3dArg) {
      pos3d = pos3dArg;
      pos2d = pos2dArg ?? world3dTo2d(pos3dArg);
    } else if (pos2dArg) {
      pos2d = pos2dArg;
      pos3d = world2dTo3d(pos2dArg);
    } else {
      const n = state.components.length;
      const offsetX = ((n % 5) - 2) * 1.4;
      const offsetZ = (Math.floor(n / 5) % 4 - 1.5) * 1.4;
      pos3d = [Number(offsetX.toFixed(2)), 0, Number(offsetZ.toFixed(2))];
      pos2d = world3dTo2d(pos3d);
    }

    const comp: CircuitComponent = {
      id: genId('custom_ic'),
      type: 'CUSTOM_IC',
      label,
      pos3d,
      rotationY: 0,
      pos2d,
      rot2d: 0,
      props: {
        icName: icPayload.name,
        codeName: icPayload.codeName,
        color: icPayload.color || '#0284c7',
        icJson: JSON.stringify(icPayload),
      },
    };

    const nextComponents = [...state.components, comp];
    const res = solveCircuitStep({ components: nextComponents, wires: state.wires }, state.simRuntime, 0, {
      zeroDtMode: 'holdState',
    });
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
    const target = state.components.find((c) => c.id === id);
    const propChanged = target ? target.props[key] !== value : false;
    const isAcParamChange =
      target?.type === 'AC_SOURCE' ||
      (target?.type === 'INF_SOURCE' && String(target.props.waveform ?? 'dc') !== 'dc');
    if (isAcParamChange) {
      state.simRuntime.acHistory = [];
    }
    if (propChanged) {
      state.simRuntime.waveformStats = {};
    }
    if (target?.type === 'RAM_16X4' && key === 'initHex') {
      delete state.simRuntime.ramMemory[id];
    }

    const isTransientSwitch =
      (target?.type === 'SWITCH_SPST' && key === 'closed') ||
      (target?.type === 'SWITCH_SPDT' && key === 'position') ||
      (target?.type === 'DC_SOURCE' && key === 'voltage') ||
      (target?.type === 'INF_SOURCE' && key === 'voltage') ||
      (target?.type === 'LOGIC_IN' && key === 'state');

    let nextTransientAnchor = state.transientAnchor;
    if (isTransientSwitch && propChanged) {
      const initialCapVoltages: Record<string, number> = {};
      const initialIndCurrents: Record<string, number> = {};
      for (const c of nextComponents) {
        if (c.type === 'CAPACITOR') {
          initialCapVoltages[c.id] = state.simRuntime.capVoltages[c.id] ?? 0;
        } else if (c.type === 'INDUCTOR') {
          initialIndCurrents[c.id] = state.simRuntime.indCurrents[c.id] ?? 0;
        }
      }
      nextTransientAnchor = {
        t0: state.simTime,
        hasSwitched: true,
        initialCapVoltages,
        initialIndCurrents,
      };
    }

    const res = advanceCircuitSimulation(
      { components: nextComponents, wires: state.wires },
      state.simRuntime,
      0,
      { zeroDtMode: 'holdState' }
    );

    const isMeterModeChange =
      (target?.type === 'VOLTMETER' || target?.type === 'AMMETER') &&
      key === 'mode' &&
      propChanged &&
      state.oscilloscopeChannels.includes(id);

    let nextSamples = state.oscilloscopeSamples;
    if (isMeterModeChange) {
      nextSamples = [];
    } else if (isTransientSwitch && propChanged && state.oscilloscopeChannels.length > 0) {
      const values = sampleScopeChannels(
        state.oscilloscopeChannels,
        nextComponents,
        res.telemetryById
      );
      nextSamples = [...state.oscilloscopeSamples.slice(-239), { t: res.time, values }];
    }

    set({
      components: nextComponents,
      transientAnchor: nextTransientAnchor,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeSamples: nextSamples,
    });
  },

  resetFuse: (id) => {
    const state = get();
    state.simRuntime.blownFuses[id] = false;
    state.updateComponentProp(id, 'blown', false);
  },

  toggleInteractiveComponent: (id) => {
    const state = get();
    const comp = state.components.find((c) => c.id === id);
    if (!comp) return;
    if (comp.type === 'SWITCH_SPST') {
      state.updateComponentProp(id, 'closed', !Boolean(comp.props.closed ?? true));
    } else if (comp.type === 'SWITCH_SPDT') {
      state.updateComponentProp(id, 'position', Number(comp.props.position ?? 0) === 0 ? 1 : 0);
    } else if (comp.type === 'LOGIC_IN' || comp.type === 'IC_PORT_IN') {
      state.updateComponentProp(id, 'state', Number(comp.props.state ?? 0) ? 0 : 1);
    } else if (comp.type === 'FUSE') {
      state.resetFuse(id);
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
    state.simRuntime.waveformStats = {};
    const res = solveCircuitStep({ components: state.components, wires: nextWires }, state.simRuntime, 0, {
      zeroDtMode: 'holdState',
    });
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
    state.simRuntime.waveformStats = {};
    const res = solveCircuitStep({ components: nextComponents, wires: nextWires }, state.simRuntime, 0, {
      zeroDtMode: 'holdState',
    });
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
      custom: 2,
    };
    const buckets: CircuitComponent[][] = [[], [], [], []];
    for (const c of state.components) {
      if (c.type === 'LOGIC_IN' || c.type === 'CLOCK' || c.type === 'IC_PORT_IN') {
        buckets[0].push(c);
      } else if (
        c.type === 'LOGIC_OUT' ||
        c.type === 'HEX_DISPLAY' ||
        c.type === 'NIXIE_TUBE' ||
        c.type === 'IC_PORT_OUT'
      ) {
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
    set((s) => ({
      components: state.components.map((c) => ({
        ...c,
        pos2d: updatedMap.get(c.id) ?? c.pos2d,
      })),
      circuitLoadVersion: s.circuitLoadVersion + 1,
    }));
  },

  clearWorkbench: () => {
    const state = get();
    state.pushUndoSnapshot();
    const freshRuntime = createInitialRuntimeState();
    set((s) => ({
      projectTitle: '新建空白实验电路',
      activePresetId: null,
      components: [],
      wires: [],
      selected: null,
      wiringDraftFrom: null,
      simTime: 0,
      transientAnchor: createEmptyTransientAnchor(0),
      timeScale: 1,
      simRuntime: freshRuntime,
      telemetryById: {},
      wireTelemetryById: {},
      implicitGroundUsed: false,
      warnings: [],
      oscilloscopeChannels: [],
      oscilloscopeSamples: [],
      highlightedIds: [],
      newlyAddedIds: [],
      preferredAnalysisTab: null,
      circuitLoadVersion: s.circuitLoadVersion + 1,
    }));
  },

  loadCircuit: (circuit, title, presetId = null, options) => {
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
    const scopeChannels =
      options?.scopeChannels !== undefined
        ? options.scopeChannels.slice(0, 4)
        : pickDefaultScopeChannels(normalizedComponents);

    let res = advanceCircuitSimulation(
      { components: normalizedComponents, wires: cloned.wires },
      freshRuntime,
      0,
      { zeroDtMode: 'holdState' }
    );
    const samples: OscilloscopeSample[] = [];
    const prewarmSeconds = Math.max(0, Number(options?.prewarmSeconds ?? 0));
    if (prewarmSeconds > 0) {
      const steps = 150;
      const stepDt = prewarmSeconds / steps;
      for (let i = 0; i < steps; i++) {
        res = advanceCircuitSimulation(
          { components: normalizedComponents, wires: cloned.wires },
          freshRuntime,
          stepDt
        );
        if (scopeChannels.length > 0) {
          samples.push({
            t: res.time,
            values: sampleScopeChannels(scopeChannels, normalizedComponents, res.telemetryById),
          });
        }
      }
    }

    const initialCapVoltages: Record<string, number> = {};
    const initialIndCurrents: Record<string, number> = {};
    for (const c of normalizedComponents) {
      if (c.type === 'CAPACITOR') {
        initialCapVoltages[c.id] = freshRuntime.capVoltages[c.id] ?? 0;
      } else if (c.type === 'INDUCTOR') {
        initialIndCurrents[c.id] = freshRuntime.indCurrents[c.id] ?? 0;
      }
    }

    set((s) => ({
      projectTitle: title || '加载的实验电路',
      activePresetId: presetId,
      components: normalizedComponents,
      wires: cloned.wires,
      selected: null,
      wiringDraftFrom: null,
      isRunning: options?.isRunning ?? s.isRunning,
      timeScale: options?.timeScale ?? 1,
      simTime: res.time,
      transientAnchor: {
        t0: res.time,
        hasSwitched: false,
        initialCapVoltages,
        initialIndCurrents,
      },
      simRuntime: freshRuntime,
      telemetryById: res.telemetryById,
      wireTelemetryById: res.wireTelemetryById,
      implicitGroundUsed: res.implicitGroundUsed,
      warnings: res.warnings,
      oscilloscopeChannels: scopeChannels,
      oscilloscopeSamples: samples.slice(-240),
      highlightedIds: options?.highlightedIds ?? [],
      newlyAddedIds: options?.newlyAddedIds ?? [],
      preferredAnalysisTab: options?.preferredAnalysisTab ?? null,
      historyPast: [],
      circuitLoadVersion: s.circuitLoadVersion + 1,
    }));
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
