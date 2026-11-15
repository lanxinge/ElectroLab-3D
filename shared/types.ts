export type ComponentCategory =
  | 'power'
  | 'passive'
  | 'semiconductor'
  | 'instrument'
  | 'digital'
  | 'custom';

export type ComponentType =
  // Power & Ground
  | 'DC_SOURCE'
  | 'AC_SOURCE'
  | 'CURRENT_SOURCE'
  | 'GROUND'
  | 'INF_SOURCE'
  // Passive & Switches
  | 'RESISTOR'
  | 'INF_RESISTOR'
  | 'POTENTIOMETER'
  | 'CAPACITOR'
  | 'INDUCTOR'
  | 'TRANSFORMER'
  | 'SWITCH_SPST'
  | 'SWITCH_SPDT'
  | 'FUSE'
  | 'LAMP'
  // Semiconductors & Op-Amp
  | 'DIODE'
  | 'ZENER_DIODE'
  | 'LED'
  | 'BJT_NPN'
  | 'NMOS'
  | 'OPAMP'
  | 'TIMER_555'
  // Instruments
  | 'VOLTMETER'
  | 'AMMETER'
  // Digital Logic
  | 'LOGIC_IN'
  | 'CLOCK'
  | 'LOGIC_OUT'
  | 'HEX_DISPLAY'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'MUX_2_1'
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'D_FF'
  | 'JK_FF'
  | 'COUNTER_4BIT'
  // Custom Programmable & Cloud Packaged ICs
  | 'CUSTOM_TRUTH_8'
  | 'CUSTOM_TRUTH_16'
  | 'IC_PORT_IN'
  | 'IC_PORT_OUT'
  | 'CUSTOM_IC';

export type PinRole = 'passive' | 'pos' | 'neg' | 'logic_in' | 'logic_out';

export interface PinDefinition {
  id: string;
  label: string;
  role: PinRole;
  offset3d: [number, number, number];
  offset2d: { x: number; y: number };
}

export interface PinRef {
  componentId: string;
  pinId: string;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  pos3d: [number, number, number];
  rotationY: number;
  pos2d: { x: number; y: number };
  rot2d: number; // 0 | 90 | 180 | 270
  props: Record<string, number | string | boolean>;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
  color: string;
}

export interface CircuitData {
  components: CircuitComponent[];
  wires: Wire[];
}

export interface ComponentTelemetry {
  componentId: string;
  pinVoltages: Record<string, number>;
  voltageDrop: number;
  current: number;
  power: number;
  maxPower: number;
  loadRatio: number;
  overloaded: boolean;
  logicState?: number;
  extraInfo?: string;
  /** Periodic AC steady-state RMS voltage (V) */
  vRms?: number;
  /** Periodic AC steady-state RMS current (A) */
  iRms?: number;
  /** Periodic average active power |1/T ∫ u·i dt| (W) */
  avgPower?: number;
  /** Apparent power S = Urms * Irms (VA) */
  apparentPower?: number;
  /** Power factor cosφ = P / S in [0, 1] */
  powerFactor?: number;
}

export interface WireTelemetry {
  wireId: string;
  voltage: number;
  current: number; // signed current from -> to
}

export interface SimulationStepResult {
  time: number;
  nodeVoltagesByPinKey: Record<string, number>;
  telemetryById: Record<string, ComponentTelemetry>;
  wireTelemetryById: Record<string, WireTelemetry>;
  implicitGroundUsed: boolean;
  converged: boolean;
  warnings: string[];
}

export type ForumCategory =
  | '模电基础'
  | '数电逻辑'
  | '暂态与滤波'
  | '运算放大'
  | '综合设计'
  | '问答求助';

export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  university: string;
  major: string;
  bio: string;
  createdAt: string;
}

export interface SavedProject {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  circuitData: CircuitData;
  createdAt: string;
  updatedAt: string;
}

export interface ForumComment {
  id: number;
  postId: number;
  userId: number;
  authorName: string;
  authorUniversity: string;
  authorMajor: string;
  content: string;
  createdAt: string;
}

export interface ForumPost {
  id: number;
  userId: number;
  authorName: string;
  authorUniversity: string;
  authorMajor: string;
  title: string;
  summary: string;
  content: string;
  category: ForumCategory;
  tags: string[];
  circuitData: CircuitData;
  likesCount: number;
  commentsCount: number;
  forksCount: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface ForumPostDetail extends ForumPost {
  comments: ForumComment[];
}

export type TruthSlotRole = 'IN' | 'OUT' | 'NC';

export interface TruthSlotDef {
  pinId: string;
  name: string;
  role: TruthSlotRole;
}

export interface TruthChipConfig {
  chipName: string;
  mode: 'table' | 'expr';
  slots: TruthSlotDef[];
  /** Key: binary input vector e.g. '101', Value: binary output vector matching OUT slots e.g. '1001' */
  rows: Record<string, string>;
  /** Key: OUT pinId e.g. 's5', Value: boolean expression referencing IN slot names or pinIds */
  expressions: Record<string, string>;
}

export interface CustomIcPinSpec {
  pinId: string;
  name: string;
  direction: 'in' | 'out';
  anchorCompId: string;
}

export interface CustomIcPayload {
  version: 1;
  name: string;
  codeName: string;
  description: string;
  color: string;
  pins: CustomIcPinSpec[];
  internalCircuit: CircuitData;
}

export interface SavedCustomIc {
  id: number;
  userId: number;
  name: string;
  codeName: string;
  description: string;
  color: string;
  icPayload: CustomIcPayload;
  createdAt: string;
  updatedAt: string;
}

export interface LocalProjectFile {
  format: 'electrolab-3d-project';
  version: string;
  projectTitle: string;
  description?: string;
  category?: string;
  savedAt: string;
  circuit: CircuitData;
}
