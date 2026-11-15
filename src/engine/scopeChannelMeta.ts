import type { CircuitComponent, ComponentTelemetry } from '../../shared/types';

export type ScopeDimension = 'voltage' | 'current';
export type ScopeQuantity = 'vInst' | 'vRms' | 'iInst' | 'iRms';

export interface ScopeChannelMeta {
  dimension: ScopeDimension;
  quantity: ScopeQuantity;
  quantityLabel: string;
  shortUnit: string;
  isRms: boolean;
}

export function getScopeChannelMeta(
  comp?: Pick<CircuitComponent, 'type' | 'props'> | null
): ScopeChannelMeta {
  if (comp?.type === 'AMMETER') {
    const isRms = comp.props?.mode === 'rms';
    return isRms
      ? {
          dimension: 'current',
          quantity: 'iRms',
          quantityLabel: '有效值电流',
          shortUnit: 'A~',
          isRms: true,
        }
      : {
          dimension: 'current',
          quantity: 'iInst',
          quantityLabel: '瞬时电流',
          shortUnit: 'A',
          isRms: false,
        };
  }

  if (comp?.type === 'VOLTMETER') {
    const isRms = comp.props?.mode === 'rms';
    return isRms
      ? {
          dimension: 'voltage',
          quantity: 'vRms',
          quantityLabel: '有效值电压',
          shortUnit: 'V~',
          isRms: true,
        }
      : {
          dimension: 'voltage',
          quantity: 'vInst',
          quantityLabel: '瞬时电压',
          shortUnit: 'V',
          isRms: false,
        };
  }

  return {
    dimension: 'voltage',
    quantity: 'vInst',
    quantityLabel: '端电压',
    shortUnit: 'V',
    isRms: false,
  };
}

export function extractScopeSampleValue(
  comp: Pick<CircuitComponent, 'type' | 'props'> | undefined,
  tel: ComponentTelemetry
): number {
  const meta = getScopeChannelMeta(comp);
  switch (meta.quantity) {
    case 'vRms':
      return tel.vRms ?? Math.abs(tel.voltageDrop);
    case 'vInst':
      return tel.voltageDrop;
    case 'iRms':
      return tel.iRms ?? Math.abs(tel.current);
    case 'iInst':
      return tel.current;
  }
}

const NICE_MANTISSAS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function computeNiceScaleBound(maxAbs: number, minFloor: number): number {
  const raw = Math.max(minFloor, Math.abs(maxAbs) * 1.15);
  if (!Number.isFinite(raw) || raw <= 0) return minFloor;
  const exp = Math.floor(Math.log10(raw));
  const pow10 = Math.pow(10, exp);
  const norm = raw / pow10;
  const mantissa = NICE_MANTISSAS.find((m) => m >= norm - 1e-9) ?? 10;
  return Number((mantissa * pow10).toPrecision(6));
}

function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (Math.abs(abs - Math.round(abs)) < 1e-6) {
    return String(Math.round(abs));
  }
  if (abs >= 1) {
    return Number(abs.toFixed(2)).toString();
  }
  return Number(abs.toFixed(3)).toString();
}

export function formatScopeChannelValue(val: number, meta: ScopeChannelMeta): string {
  if (meta.dimension === 'current') {
    if (Math.abs(val) < 1) {
      return `${(val * 1000).toFixed(2)} ${meta.isRms ? 'mA~' : 'mA'}`;
    }
    return `${val.toFixed(2)} ${meta.shortUnit}`;
  }
  return `${val.toFixed(2)} ${meta.shortUnit}`;
}

export function formatScopeAxisTick(
  val: number,
  dimension: ScopeDimension,
  absMax: number
): string {
  const sign = val > 0 ? '+' : val < 0 ? '-' : '';
  if (dimension === 'current') {
    if (absMax < 1) {
      const ma = Math.abs(val) * 1000;
      return val === 0 ? '0mA' : `${sign}${formatCompactNumber(ma)}mA`;
    }
    return val === 0 ? '0A' : `${sign}${formatCompactNumber(Math.abs(val))}A`;
  }
  return val === 0 ? '0V' : `${sign}${formatCompactNumber(Math.abs(val))}V`;
}
