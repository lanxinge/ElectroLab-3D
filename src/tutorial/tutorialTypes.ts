import type {
  CircuitComponent,
  CircuitData,
  ComponentTelemetry,
  ComponentType,
  Wire,
} from '../../shared/types';
import type { WaveformEdgeStats } from '../engine/mnaSolver';
import type { AnalysisTab } from '../store/useCircuitStore';

export type TutorialDifficulty = '入门' | '基础' | '进阶' | '综合';

export type TutorialAnalysisTab = AnalysisTab;

export interface TutorialEvalContext {
  circuit: CircuitData;
  components: CircuitComponent[];
  wires: Wire[];
  telemetryById: Record<string, ComponentTelemetry>;
  simTime: number;
  elapsedSinceSwitch?: number;
  hasSwitched?: boolean;
  initialCapVoltages?: Record<string, number>;
  initialIndCurrents?: Record<string, number>;
  waveformStatsById?: Record<string, WaveformEdgeStats>;
}

export interface TutorialLiveFormula {
  id: string;
  title: string;
  formula: string;
  evaluate: (
    ctx: TutorialEvalContext
  ) => {
    expression: string;
    result: string;
    status?: 'normal' | 'good' | 'warn';
  };
}

export interface TutorialPonderLink {
  label: string;
  type: ComponentType;
  componentId?: string;
  stepIndex?: number;
}

export interface TutorialQuickControl {
  id: string;
  label: string;
  targetId: string;
  propKey: string;
  kind: 'toggle-switch' | 'slider' | 'select-option' | 'reset-fuse' | 'spdt-toggle';
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { label: string; value: number | string | boolean }[];
}

export type TutorialAutoDemoAction =
  | {
      kind: 'setProp';
      componentId: string;
      key: string;
      value: number | string | boolean;
    }
  | {
      kind: 'setTimeScale';
      scale: number;
    }
  | {
      kind: 'selectComponent';
      componentId: string;
    }
  | {
      kind: 'wait';
      seconds: number;
    };

export interface TutorialCheckpoint {
  title: string;
  instruction: string;
  hint?: string;
  check: (ctx: TutorialEvalContext) => { passed: boolean; message: string };
  autoDemo?: {
    buttonLabel: string;
    description: string;
    actions: TutorialAutoDemoAction[];
    settleSeconds?: number;
  };
}

export interface TutorialCircuitStage {
  id: string;
  stageNumber: number;
  title: string;
  badge?: string;
  conceptGoal: string;
  explanation: string;
  analogy: string;
  highlights: string[];
  newlyAddedIds: string[];
  circuit: CircuitData;
  defaultTimeScale?: number;
  prewarmSeconds?: number;
  preferredAnalysisTab?: TutorialAnalysisTab;
  scopeChannels?: string[];
  liveFormulas: TutorialLiveFormula[];
  quickControls?: TutorialQuickControl[];
  ponderLinks: TutorialPonderLink[];
  checkpoint?: TutorialCheckpoint;
}

export interface TutorialLesson {
  id: string;
  chapterId: string;
  lessonNumber: number;
  title: string;
  subtitle: string;
  textbookRef: string;
  difficulty: TutorialDifficulty;
  durationMin: number;
  prerequisites: string[];
  learningObjectives: string[];
  stages: TutorialCircuitStage[];
}

export interface TutorialChapter {
  id: string;
  volume: 'vol1' | 'vol2';
  chapterNumber: number;
  title: string;
  subtitle: string;
  accent: 'amber' | 'sky' | 'emerald' | 'violet' | 'rose' | 'cyan' | 'indigo';
  lessonIds: string[];
}
