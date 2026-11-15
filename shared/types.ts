export type ComponentCategory =
  | 'power'
  | 'passive'
  | 'semiconductor'
  | 'instrument'
  | 'digital';

export type ComponentType =
  // Power & Ground
  | 'DC_SOURCE'
  | 'AC_SOURCE'
  | 'CURRENT_SOURCE'
  | 'GROUND'
  // Passive & Switches
  | 'RESISTOR'
  | 'POTENTIOMETER'
  | 'CAPACITOR'
  | 'INDUCTOR'
  | 'SWITCH_SPST'
  | 'SWITCH_SPDT'
  // Semiconductors & Op-Amp
  | 'DIODE'
  | 'LED'
  | 'BJT_NPN'
  | 'OPAMP'
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
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'D_FF';

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
