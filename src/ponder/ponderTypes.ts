import type * as THREE from 'three';
import type { ComponentType } from '../../shared/types';

export type PonderSource = '3d' | '2d' | 'palette' | 'inspector';

export interface PonderTarget {
  type: ComponentType;
  label: string;
  componentId?: string;
  source: PonderSource;
  anchorX: number;
  anchorY: number;
}

export interface PonderCalloutAnchor {
  id: string;
  title: string;
  detail?: string;
  worldPos: [number, number, number];
  color?: string;
  /** Optional list of step indices where this callout is visible. If omitted, always visible. */
  stepIndices?: number[];
}

export interface PonderProjectedCallout {
  id: string;
  title: string;
  detail?: string;
  color: string;
  screenX: number;
  screenY: number;
  boxX: number;
  boxY: number;
  side: 'left' | 'right';
  visible: boolean;
}

export interface PonderCameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
}

export interface PonderInteractiveControl {
  key: string;
  label: string;
  kind: 'toggle' | 'slider';
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  trueLabel?: string;
  falseLabel?: string;
}

export interface PonderStep {
  id: string;
  title: string;
  narration: string;
  durationSec?: number;
  camera: PonderCameraKeyframe;
}

export interface PonderFormula {
  expr: string;
  note: string;
}

export interface PonderLiveMetric {
  label: string;
  value: string;
  accent?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface PonderModuleSpec {
  type: ComponentType;
  title: string;
  englishTitle: string;
  badge: string;
  summary: string;
  formulas: PonderFormula[];
  keyTakeaways: string[];
  controls: PonderInteractiveControl[];
  callouts: PonderCalloutAnchor[];
  steps: PonderStep[];
}

export interface PonderDioramaHandle {
  root: THREE.Group;
  update: (
    elapsed: number,
    stepIndex: number,
    stepProgress: number,
    params: Record<string, number>
  ) => void;
  getLiveReadout?: (
    elapsed: number,
    stepIndex: number,
    params: Record<string, number>
  ) => PonderLiveMetric[];
}

export type PonderDioramaBuilder = () => PonderDioramaHandle;
