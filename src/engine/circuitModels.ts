import type { CircuitComponent, ComponentTelemetry } from '../../shared/types';

export interface AcHistorySlice {
  dt: number;
  v: Record<string, number>;
  i: Record<string, number>;
  w: Record<string, number>;
}

export interface WaveformEdgeStats {
  initialized: boolean;
  prevVal: number;
  isHigh: boolean;
  lastRisingTime: number | null;
  lastFallingTime: number | null;
  periodSec: number | null;
  frequencyHz: number | null;
  dutyCycle: number | null;
  cycleCount: number;
}

export function parseRamInitHex(raw: unknown): number[] {
  const cleaned = String(raw ?? '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .slice(0, 16)
    .padEnd(16, '0');
  const mem: number[] = [];
  for (let idx = 0; idx < 16; idx++) {
    mem.push(parseInt(cleaned[idx], 16) & 0x0f);
  }
  return mem;
}

export function encodeRamHex(mem: number[]): string {
  const out: string[] = [];
  for (let idx = 0; idx < 16; idx++) {
    out.push(((mem[idx] ?? 0) & 0x0f).toString(16).toUpperCase());
  }
  return out.join('');
}

export function evaluateAlu4Bit(
  a: number,
  b: number,
  op: number
): { result: number; cout: 0 | 1; zero: 0 | 1; opName: string } {
  const va = a & 0x0f;
  const vb = b & 0x0f;
  let result = 0;
  let cout: 0 | 1 = 0;
  let opName = 'ADD';
  switch (op & 0x03) {
    case 0: {
      const raw = va + vb;
      result = raw & 0x0f;
      cout = raw > 15 ? 1 : 0;
      opName = 'ADD';
      break;
    }
    case 1: {
      const raw = va - vb;
      result = raw & 0x0f;
      cout = va >= vb ? 1 : 0;
      opName = 'SUB';
      break;
    }
    case 2:
      result = (va & vb) & 0x0f;
      cout = 0;
      opName = 'AND';
      break;
    case 3:
    default:
      result = (va ^ vb) & 0x0f;
      cout = 0;
      opName = 'XOR';
      break;
  }
  const zero: 0 | 1 = result === 0 ? 1 : 0;
  return { result, cout, zero, opName };
}

export type ZeroDtSolveMode = 'dcOperatingPoint' | 'holdState';

export interface SolveStepOptions {
  overrideLogicInputs?: Record<string, number>;
  zeroDtMode?: ZeroDtSolveMode;
}

export const CAP_HOLD_G = 1e5; // Stiff Norton hold ensuring u_C(0_+) = u_C(0_-) without singular V-loop
export const IND_HOLD_G = 1e-5; // Tiny parallel leak ensuring i_L(0_+) = i_L(0_-) without open float
export const IND_COIL_R = 0.02;
export const TRANSFORMER_SEC_R = 0.01;

export function formatComponentOverloadWarning(
  comp: CircuitComponent,
  tel: Pick<
    ComponentTelemetry,
    'voltageDrop' | 'current' | 'power' | 'vRms' | 'iRms' | 'avgPower'
  >,
  maxPower: number,
  useAcRms: boolean
): { loadRatio: number; overloaded: boolean; warning?: string } {
  if (
    comp.type === 'INF_SOURCE' ||
    comp.type === 'INF_RESISTOR' ||
    comp.type === 'GROUND' ||
    comp.type === 'VOLTMETER' ||
    comp.type === 'AMMETER'
  ) {
    return { loadRatio: 0, overloaded: false };
  }

  if (comp.type === 'DC_SOURCE' || comp.type === 'AC_SOURCE') {
    const iCheck = useAcRms ? (tel.iRms ?? Math.abs(tel.current)) : Math.abs(tel.current);
    const overloaded = iCheck > 8;
    const pCheck = useAcRms ? (tel.avgPower ?? tel.power) : tel.power;
    const loadRatio =
      Number.isFinite(maxPower) && maxPower > 0 ? pCheck / maxPower : overloaded ? 1.5 : 0;
    return {
      loadRatio,
      overloaded,
      warning: overloaded
        ? `${comp.label} 输出过流 (${iCheck.toFixed(2)}A / 上限 8A)`
        : undefined,
    };
  }

  if (comp.type === 'CAPACITOR') {
    const vMax = Math.max(1, Number(comp.props.maxVoltage ?? 450));
    const vPeak = useAcRms
      ? Math.max(Math.abs(tel.voltageDrop), (tel.vRms ?? 0) * Math.SQRT2)
      : Math.abs(tel.voltageDrop);
    const loadRatio = vPeak / vMax;
    const overloaded = loadRatio > 1.0;
    return {
      loadRatio,
      overloaded,
      warning: overloaded
        ? `${comp.label} 耐压过载 (峰值 ${vPeak.toFixed(1)}V / 耐压 ${vMax}V)`
        : undefined,
    };
  }

  if (comp.type === 'INDUCTOR') {
    const iMax = Math.max(0.1, Number(comp.props.maxCurrent ?? 8));
    const iCheck = useAcRms ? (tel.iRms ?? Math.abs(tel.current)) : Math.abs(tel.current);
    const copperPower = iCheck * iCheck * IND_COIL_R;
    const pLimit = comp.props.maxPower !== undefined ? Number(comp.props.maxPower) : maxPower;
    const iRatio = iCheck / iMax;
    const pRatio = Number.isFinite(pLimit) && pLimit > 0 ? copperPower / pLimit : 0;
    const loadRatio = Math.max(iRatio, pRatio);
    const overloaded = loadRatio > 1.0;
    return {
      loadRatio,
      overloaded,
      warning: overloaded
        ? iRatio >= pRatio
          ? `${comp.label} 过流告警 (${iCheck.toFixed(2)}A / 额定 ${iMax}A)`
          : `${comp.label} 铜耗过载 (${copperPower.toFixed(2)}W / 额定 ${pLimit}W)`
        : undefined,
    };
  }

  if (comp.type === 'TRANSFORMER') {
    const iMax = Math.max(0.1, Number(comp.props.maxCurrent ?? 15));
    const iCheck = useAcRms ? (tel.iRms ?? Math.abs(tel.current)) : Math.abs(tel.current);
    const copperPower = iCheck * iCheck * TRANSFORMER_SEC_R;
    const pLimit = comp.props.maxPower !== undefined ? Number(comp.props.maxPower) : maxPower;
    const iRatio = iCheck / iMax;
    const pRatio = Number.isFinite(pLimit) && pLimit > 0 ? copperPower / pLimit : 0;
    const loadRatio = Math.max(iRatio, pRatio);
    const overloaded = loadRatio > 1.0;
    return {
      loadRatio,
      overloaded,
      warning: overloaded
        ? `${comp.label} 副边过流告警 (${iCheck.toFixed(2)}A / 额定 ${iMax}A)`
        : undefined,
    };
  }

  if (comp.type === 'LAMP') {
    const pRated = Math.max(0.05, Number(comp.props.ratedPower ?? 1.5));
    const pLimit =
      comp.props.maxPower !== undefined
        ? Number(comp.props.maxPower)
        : useAcRms
        ? pRated * 1.35
        : pRated * 2.5;
    const pCheck = useAcRms ? (tel.avgPower ?? tel.power) : tel.power;
    const loadRatio = Number.isFinite(pLimit) && pLimit > 0 ? pCheck / pLimit : 0;
    const overloaded = Number.isFinite(pLimit) && loadRatio > 1.0;
    return {
      loadRatio,
      overloaded,
      warning: overloaded
        ? `${comp.label} 过载 (${pCheck.toFixed(2)}W / 额定 ${pLimit.toFixed(2)}W)`
        : undefined,
    };
  }

  const pCheck = useAcRms ? (tel.avgPower ?? tel.power) : tel.power;
  const loadRatio = Number.isFinite(maxPower) && maxPower > 0 ? pCheck / maxPower : 0;
  const overloaded = Number.isFinite(maxPower) && loadRatio > 1.0;
  return {
    loadRatio,
    overloaded,
    warning: overloaded
      ? `${comp.label} 过载/过流 (${pCheck.toFixed(2)}W / 额定 ${maxPower}W)`
      : undefined,
  };
}

export interface SimulationRuntimeState {
  time: number;
  capVoltages: Record<string, number>;
  indCurrents: Record<string, number>;
  flipFlopStates: Record<string, number>; // 0 | 1
  timer555States: Record<string, number>; // 0 | 1 (NE555 RS latch Q output)
  counterValues: Record<string, number>; // 0..15 for COUNTER_4BIT
  registerValues: Record<string, number>; // 0..15 for REGISTER_4BIT
  ramMemory: Record<string, number[]>; // 16 nibbles (0..15) per RAM_16X4
  blownFuses: Record<string, boolean>;
  prevClockHigh: Record<string, boolean>;
  lastNodeVoltages: Record<string, number>;
  acHistory: AcHistorySlice[];
  waveformStats: Record<string, WaveformEdgeStats>;
}

export function createInitialRuntimeState(): SimulationRuntimeState {
  return {
    time: 0,
    capVoltages: {},
    indCurrents: {},
    flipFlopStates: {},
    timer555States: {},
    counterValues: {},
    registerValues: {},
    ramMemory: {},
    blownFuses: {},
    prevClockHigh: {},
    lastNodeVoltages: {},
    acHistory: [],
    waveformStats: {},
  };
}

export function pinKey(componentId: string, pinId: string): string {
  return `${componentId}:${pinId}`;
}

export function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let r = col + 1; r < n; r++) {
      const val = Math.abs(M[r][col]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = r;
      }
    }
    if (maxVal < 1e-18 || !Number.isFinite(maxVal)) {
      return null;
    }
    if (pivotRow !== col) {
      const tmp = M[col];
      M[col] = M[pivotRow];
      M[pivotRow] = tmp;
    }

    const pivot = M[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = M[r][col] / pivot;
      if (factor === 0) continue;
      M[r][col] = 0;
      for (let c = col + 1; c <= n; c++) {
        M[r][c] -= factor * M[col][c];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = M[r][n];
    for (let c = r + 1; c < n; c++) {
      sum -= M[r][c] * x[c];
    }
    x[r] = sum / M[r][r];
    if (!Number.isFinite(x[r])) return null;
  }
  return x;
}

export const DIGITAL_TYPES = new Set([
  'LOGIC_IN',
  'CLOCK',
  'LOGIC_OUT',
  'HEX_DISPLAY',
  'NIXIE_TUBE',
  'AND',
  'OR',
  'NOT',
  'NAND',
  'NOR',
  'XOR',
  'XNOR',
  'MUX_2_1',
  'HALF_ADDER',
  'FULL_ADDER',
  'D_FF',
  'JK_FF',
  'COUNTER_4BIT',
  'ENCODER_4_2',
  'DECODER_2_4',
  'MUX_4BIT',
  'REGISTER_4BIT',
  'ALU_4BIT',
  'RAM_16X4',
  'CUSTOM_TRUTH_8',
  'CUSTOM_TRUTH_16',
  'IC_PORT_IN',
  'IC_PORT_OUT',
]);

export const IMPLICIT_REF_TYPES = new Set([...DIGITAL_TYPES, 'OPAMP']);

export function spicePnjLim(vNew: number, vOld: number, vt: number, vCrit: number): number {
  if (vNew > vCrit && Math.abs(vNew - vOld) > 2 * vt) {
    if (vOld > 0) {
      const arg = 1 + (vNew - vOld) / vt;
      if (arg > 0) {
        return vOld + vt * Math.log(arg);
      }
      return vCrit;
    }
    return vt * Math.log(Math.max(1e-12, vNew / vt));
  }
  return vNew;
}

export interface DiodeEval {
  i: number;
  g: number;
}

export function evalDiode(vd: number, isVal: number, nFactor: number): DiodeEval {
  const vt = 0.02585 * nFactor;
  const maxExpArg = 34;
  const expArg = vd / vt;
  const gLeak = 1e-9;

  if (expArg <= maxExpArg) {
    const e = Math.exp(Math.max(-40, expArg));
    return {
      i: isVal * (e - 1) + gLeak * vd,
      g: (isVal / vt) * e + gLeak,
    };
  }
  const eMax = Math.exp(maxExpArg);
  const vMax = maxExpArg * vt;
  const gMax = (isVal / vt) * eMax + gLeak;
  const iMax = isVal * (eMax - 1) + gLeak * vMax;
  return {
    i: iMax + gMax * (vd - vMax),
    g: gMax,
  };
}

export function getLedParams(color: string): { isVal: number; nFactor: number } {
  switch (color) {
    case 'blue':
    case 'white':
      return { isVal: 1e-18, nFactor: 2.9 };
    case 'green':
      return { isVal: 2e-16, nFactor: 2.35 };
    case 'yellow':
    case 'amber':
      return { isVal: 5e-16, nFactor: 2.2 };
    case 'red':
    default:
      return { isVal: 1e-15, nFactor: 2.1 };
  }
}

export function evalZener(vd: number, vz: number): DiodeEval {
  const fwd = evalDiode(vd, 1e-12, 1.2);
  const vShift = Math.max(0.5, vz - 0.595);
  const rev = evalDiode(-vd - vShift, 1e-12, 1.0);
  return {
    i: fwd.i - rev.i,
    g: fwd.g + rev.g,
  };
}

export function evalNmos(
  vgs: number,
  vds: number,
  vth: number,
  kp: number
): { id: number; gm: number; gds: number } {
  const lam = 0.02;
  if (vds >= 0) {
    const vov = vgs - vth;
    if (vov <= 0) {
      return { id: 1e-9 * vds, gm: 0, gds: 1e-9 };
    }
    if (vds < vov) {
      const mod = 1 + lam * vds;
      const base = vov * vds - 0.5 * vds * vds;
      return {
        id: kp * base * mod + 1e-9 * vds,
        gm: kp * vds * mod,
        gds: kp * ((vov - vds) * mod + base * lam) + 1e-9,
      };
    }
    const mod = 1 + lam * vds;
    return {
      id: 0.5 * kp * vov * vov * mod + 1e-9 * vds,
      gm: kp * vov * mod,
      gds: 0.5 * kp * vov * vov * lam + 1e-9,
    };
  }
  // Symmetric inverted mode when Vds < 0
  const vgd = vgs - vds;
  const vdsRev = -vds;
  const vov = vgd - vth;
  if (vov <= 0) {
    return { id: 1e-9 * vds, gm: 0, gds: 1e-9 };
  }
  if (vdsRev < vov) {
    const mod = 1 + lam * vdsRev;
    const base = vov * vdsRev - 0.5 * vdsRev * vdsRev;
    return {
      id: -(kp * base * mod) + 1e-9 * vds,
      gm: 0,
      gds: kp * ((vov - vdsRev) * mod + base * lam) + 1e-9,
    };
  }
  const mod = 1 + lam * vdsRev;
  return {
    id: -(0.5 * kp * vov * vov * mod) + 1e-9 * vds,
    gm: 0,
    gds: 0.5 * kp * vov * vov * lam + 1e-9,
  };
}

export interface VoltageBranch {
  componentId: string;
  nPos: number;
  nNeg: number;
  voltage: number;
  rInt: number;
  branchIdx: number; // 0-based index in extra MNA rows
}

export interface TransformerBranch {
  componentId: string;
  nP1: number;
  nP2: number;
  nS1: number;
  nS2: number;
  ratio: number;
  branchIdx: number;
}

