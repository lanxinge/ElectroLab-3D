import type {
  CircuitComponent,
  CircuitData,
  ComponentTelemetry,
  ComponentType,
  Wire,
} from '../../shared/types';
import { world2dTo3d } from '../engine/componentCatalog';
import type { TutorialEvalContext } from './tutorialTypes';

const WIRE_PALETTE = [
  '#38bdf8',
  '#34d399',
  '#f59e0b',
  '#f472b6',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
];

export function mkComp(
  id: string,
  type: ComponentType,
  label: string,
  x2d: number,
  y2d: number,
  rot2d = 0,
  props: Record<string, number | string | boolean> = {}
): CircuitComponent {
  return {
    id,
    type,
    label,
    pos2d: { x: x2d, y: y2d },
    rot2d,
    pos3d: world2dTo3d({ x: x2d, y: y2d }),
    rotationY: (-rot2d * Math.PI) / 180,
    props,
  };
}

export function mkWire(
  id: string,
  fromComponentId: string,
  fromPinId: string,
  toComponentId: string,
  toPinId: string,
  color?: string,
  idx = 0
): Wire {
  return {
    id,
    from: { componentId: fromComponentId, pinId: fromPinId },
    to: { componentId: toComponentId, pinId: toPinId },
    color: color ?? WIRE_PALETTE[idx % WIRE_PALETTE.length],
  };
}

export function mkCircuit(
  components: CircuitComponent[],
  wires: Array<[string, string, string, string, string?]>,
  prefix = 'tw'
): CircuitData {
  return {
    components,
    wires: wires.map(([fc, fp, tc, tp, color], idx) =>
      mkWire(`${prefix}_${idx + 1}`, fc, fp, tc, tp, color, idx)
    ),
  };
}

export function getComp(ctx: TutorialEvalContext, id: string): CircuitComponent | undefined {
  return ctx.components.find((c) => c.id === id);
}

export function getTel(ctx: TutorialEvalContext, id: string): ComponentTelemetry | undefined {
  return ctx.telemetryById[id];
}

export function numProp(
  ctx: TutorialEvalContext,
  id: string,
  key: string,
  fallback = 0
): number {
  const c = getComp(ctx, id);
  const raw = c?.props?.[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function boolProp(
  ctx: TutorialEvalContext,
  id: string,
  key: string,
  fallback = false
): boolean {
  const c = getComp(ctx, id);
  if (!c || c.props[key] === undefined) return fallback;
  return Boolean(c.props[key]);
}

export function pinV(ctx: TutorialEvalContext, compId: string, pinId: string): number {
  return ctx.telemetryById[compId]?.pinVoltages?.[pinId] ?? 0;
}

export function fmtI(amps: number): string {
  const abs = Math.abs(amps);
  if (abs >= 1) return `${amps.toFixed(2)} A`;
  if (abs >= 1e-3) return `${(amps * 1000).toFixed(1)} mA`;
  if (abs >= 1e-6) return `${(amps * 1e6).toFixed(1)} µA`;
  return `0.0 mA`;
}

export function fmtV(volts: number, decimals = 2): string {
  return `${volts.toFixed(decimals)} V`;
}

export function fmtP(watts: number): string {
  const abs = Math.abs(watts);
  if (abs >= 1) return `${watts.toFixed(2)} W`;
  return `${(watts * 1000).toFixed(1)} mW`;
}
