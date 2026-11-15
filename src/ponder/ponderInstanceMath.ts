import type { ComponentTelemetry, ComponentType } from '../../shared/types';
import { formatEngineeringValue } from '../engine/componentCatalog';
import type { PonderModuleSpec } from './ponderTypes';

export function buildDefaultParamsForType(spec: PonderModuleSpec): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of spec.controls) {
    out[c.key] = c.defaultValue;
  }
  return out;
}

export function fmtCurrent(amps: number): string {
  const safe = Object.is(amps, -0) || Math.abs(amps) < 1e-12 ? 0 : amps;
  const abs = Math.abs(safe);
  if (abs === 0) return '0.00 mA';
  if (abs >= 1) return `${safe.toFixed(3)} A`;
  if (abs >= 1e-3) return `${(safe * 1e3).toFixed(2)} mA`;
  return `${(safe * 1e6).toFixed(1)} µA`;
}

export function readNibbleFromTel(
  tel: ComponentTelemetry | undefined,
  p3: string,
  p2: string,
  p1: string,
  p0: string
): number {
  return (
    (fmtBoolBit(pinV(tel, p3)) << 3) |
    (fmtBoolBit(pinV(tel, p2)) << 2) |
    (fmtBoolBit(pinV(tel, p1)) << 1) |
    fmtBoolBit(pinV(tel, p0))
  );
}

export function writeNibbleOverrides(
  overrides: Record<string, number>,
  prefix: string,
  val: number
): void {
  const v = val & 0x0f;
  overrides[`${prefix}3`] = (v >> 3) & 1 ? 5 : 0;
  overrides[`${prefix}2`] = (v >> 2) & 1 ? 5 : 0;
  overrides[`${prefix}1`] = (v >> 1) & 1 ? 5 : 0;
  overrides[`${prefix}0`] = v & 1 ? 5 : 0;
}

export function fmtBoolBit(v: number | undefined): 0 | 1 {
  return (v ?? 0) >= 2.5 ? 1 : 0;
}

export function pinV(tel: ComponentTelemetry | undefined, pinId: string): number {
  return tel?.pinVoltages?.[pinId] ?? 0;
}

export function paramBit(
  params: Record<string, number> | undefined,
  key: string,
  fallback: 0 | 1
): 0 | 1 {
  if (params && params[key] !== undefined) {
    return params[key] >= 0.5 ? 1 : 0;
  }
  return fallback;
}

export function paramNum(
  params: Record<string, number> | undefined,
  key: string,
  fallback: number
): number {
  if (params && typeof params[key] === 'number' && !Number.isNaN(params[key])) {
    return params[key];
  }
  return fallback;
}

export function getElectricalControlKeys(type: ComponentType, spec: PonderModuleSpec): string[] {
  if (type === 'CUSTOM_IC') return [];
  if (type === 'JK_FF') return ['j', 'k'];
  if (type === 'COUNTER_4BIT') return ['clr'];
  if (type === 'D_FF') return ['d', 'clk', '_q'];
  return spec.controls.map((c) => c.key);
}

export function hasElectricalOverride(
  type: ComponentType,
  spec: PonderModuleSpec,
  initialParams: Record<string, number>,
  activeParams?: Record<string, number>
): boolean {
  if (!activeParams) return false;
  const keys = getElectricalControlKeys(type, spec);
  return keys.some((k) => {
    const val = activeParams[k];
    if (typeof val !== 'number' || Number.isNaN(val)) return false;
    return Math.abs(val - (initialParams[k] ?? 0)) > 1e-4;
  });
}

export function formatOhmFormulaDerivation(
  label: string,
  r: number,
  vSigned: number,
  iSigned: number,
  power: number,
  loadPct: number | null,
  prefixLabel: string,
  p1Name = '1',
  p2Name = '2'
): string {
  const rStr = formatEngineeringValue(r, 'Ω');
  const vAbs = Math.abs(vSigned);
  const iAbs = Math.abs(iSigned);
  const stdI = (vAbs / 220) * 1000;
  const ratio = r / 220;
  const loadText = loadPct !== null ? `（负载率 ${loadPct}%）` : '';
  const compareText =
    Math.abs(r - 220) > 1e-6
      ? `；相比标准 220Ω 示例，阻值变为 ${ratio.toFixed(2)} 倍，因此同幅值压降下电流大小（对比 220Ω 时约 ${stdI.toFixed(
          1
        )} mA）被限流至 ${fmtCurrent(iAbs)}`
      : '';

  if (vSigned < -0.01) {
    return `${prefixLabel}电阻 ${label} 阻值设为 ${rStr}，两端压降 ΔV = V(${p1Name}) - V(${p2Name}) = ${vSigned.toFixed(
      2
    )} V（${p2Name} 端电位高于 ${p1Name} 端，压降幅值 |ΔV| = ${vAbs.toFixed(
      2
    )} V，电流由 ${p2Name} 端反向流向 ${p1Name} 端，常见于电容放电或反向激励）。依据关联参考方向欧姆定律 I = ΔV / R = ${vSigned.toFixed(
      2
    )} V / ${rStr} = ${fmtCurrent(iSigned)}（电流大小 |I| = ${vAbs.toFixed(
      2
    )} V / ${rStr} = ${fmtCurrent(iAbs)}），热功率 P = |ΔV · I| = ${formatEngineeringValue(
      power,
      'W'
    )}${loadText}${compareText}。`;
  }

  return `${prefixLabel}电阻 ${label} 阻值设为 ${rStr}，施加在它两端的正向压降 V = ${vAbs.toFixed(
    2
  )} V。依据欧姆定律 I = V / R = ${vAbs.toFixed(2)} V / ${rStr} = ${fmtCurrent(
    iAbs
  )}，电功率 P = V·I = ${formatEngineeringValue(power, 'W')}${loadText}${compareText}。`;
}

