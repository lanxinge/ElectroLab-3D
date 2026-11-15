import { create } from 'zustand';
import { getLessonById, TUTORIAL_LESSONS } from '../tutorial/curriculumIndex';
import type { TutorialCircuitStage, TutorialEvalContext } from '../tutorial/tutorialTypes';
import { useCircuitStore, type SidebarMode } from './useCircuitStore';
import { useUIStore } from './useUIStore';
import { captureWorkbench, restoreWorkbench, type WorkbenchSnapshot } from './workbenchSnapshot';

const COMPLETED_STORAGE_KEY = 'electrolab_tutorial_completed_v1';
const LOCATION_STORAGE_KEY = 'electrolab_tutorial_location_v1';

const memoryStorage: Record<string, string> = {};

function safeReadStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore storage restriction
  }
  return memoryStorage[key] ?? null;
}

function safeWriteStorage(key: string, value: string): void {
  memoryStorage[key] = value;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage restriction
  }
}

function loadInitialCompleted(): string[] {
  const raw = safeReadStorage(COMPLETED_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const validIds = new Set(TUTORIAL_LESSONS.flatMap(l => l.stages.map(s => s.id)));
    return Array.isArray(parsed) ? [...new Set(parsed.filter((x): x is string => typeof x === 'string' && validIds.has(x)))] : [];
  } catch {
    return [];
  }
}

function cloneItems<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function readLocation(): { lessonId: string; stageIndex: number } {
  try {
    const saved = JSON.parse(safeReadStorage(LOCATION_STORAGE_KEY) ?? 'null');
    const lesson = TUTORIAL_LESSONS.find(l => l.id === saved?.lessonId);
    if (lesson && Number.isInteger(saved.stageIndex) && lesson.stages[saved.stageIndex]) return saved;
  } catch { /* 损坏的进度记录回到第一课，不影响学习。 */ }
  return { lessonId: TUTORIAL_LESSONS[0].id, stageIndex: 0 };
}

function saveLocation(lessonId: string, stageIndex: number): void {
  safeWriteStorage(LOCATION_STORAGE_KEY, JSON.stringify({ lessonId, stageIndex }));
}

const initialLocation = readLocation();

interface TutorialStoreState {
  isActive: boolean;
  currentLessonId: string;
  currentStageIndex: number;
  completedStageIds: string[];
  catalogOpen: boolean;
  inspectorOpen: boolean;
  preferredVolume: 'all' | 'vol1' | 'vol2';
  freePlaySnapshot: WorkbenchSnapshot | null;
  viewPreference: 'auto' | SidebarMode;
  setViewPreference: (view: 'auto' | SidebarMode) => void;

  enterTutorial: (lessonId?: string, stageIndex?: number, volume?: 'all' | 'vol1' | 'vol2') => void;
  setPreferredVolume: (volume: 'all' | 'vol1' | 'vol2') => void;
  exitTutorial: (keepCurrentCircuit?: boolean) => void;
  selectLesson: (lessonId: string, stageIndex?: number) => void;
  selectStage: (stageIndex: number) => void;
  nextStage: () => void;
  prevStage: () => void;
  resetCurrentStage: () => void;
  setCatalogOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  markStageCompleted: (stageId: string) => void;
  runCheckpointAutoDemo: () => boolean;
}

function loadStageIntoWorkbench(stage: TutorialCircuitStage): void {
  const circuitClone = cloneItems(stage.circuit);
  useCircuitStore.getState().loadCircuit(
    circuitClone,
    stage.title,
    `tutorial-${stage.id}`,
    {
      timeScale: stage.defaultTimeScale ?? 1,
      scopeChannels: stage.scopeChannels ?? [],
      prewarmSeconds: stage.prewarmSeconds ?? 0,
      isRunning: true,
      highlightedIds: stage.highlights,
      newlyAddedIds: stage.newlyAddedIds,
      preferredAnalysisTab: stage.preferredAnalysisTab ?? 'telemetry',
    }
  );
}

export function buildTutorialEvalContext(stage: TutorialCircuitStage): TutorialEvalContext {
  const snap = useCircuitStore.getState();
  return {
    circuit: stage.circuit,
    components: snap.components,
    wires: snap.wires,
    telemetryById: snap.telemetryById,
    simTime: snap.simTime,
    elapsedSinceSwitch: Math.max(0, snap.simTime - snap.transientAnchor.t0),
    hasSwitched: snap.transientAnchor.hasSwitched,
    initialCapVoltages: snap.transientAnchor.initialCapVoltages,
    initialIndCurrents: snap.transientAnchor.initialIndCurrents,
    waveformStatsById: snap.simRuntime?.waveformStats ?? {},
  };
}

function advanceCircuitBySeconds(seconds: number): void {
  const sec = Math.max(0, seconds);
  if (sec <= 0) return;
  const steps = Math.max(1, Math.round(sec / 0.02));
  const stepDt = (sec / steps) / Math.max(0.005, useCircuitStore.getState().timeScale);
  for (let i = 0; i < steps; i++) {
    useCircuitStore.getState().stepOnce(stepDt);
  }
}

export const useTutorialStore = create<TutorialStoreState>((set, get) => ({
  isActive: false,
  currentLessonId: initialLocation.lessonId,
  currentStageIndex: initialLocation.stageIndex,
  completedStageIds: loadInitialCompleted(),
  catalogOpen: false,
  inspectorOpen: false,
  preferredVolume: 'all',
  freePlaySnapshot: null,
  viewPreference: 'auto',
  setViewPreference: (viewPreference) => set({ viewPreference }),

  setPreferredVolume: (preferredVolume) => set({ preferredVolume }),

  enterTutorial: (lessonIdArg, stageIndexArg, volumeArg) => {
    const curState = get();
    const snapshot = curState.isActive ? curState.freePlaySnapshot : captureWorkbench();

    const fallbackLessonId =
      volumeArg === 'vol1'
        ? 'ch0-loop-and-meters'
        : volumeArg === 'vol2'
        ? 'ch7-diodes-and-rectifiers'
        : curState.currentLessonId;
    const targetLesson = getLessonById(lessonIdArg ?? fallbackLessonId);
    const maxStageIdx = Math.max(0, targetLesson.stages.length - 1);
    const rawIdx = stageIndexArg ?? (lessonIdArg || (volumeArg && volumeArg !== 'all') ? 0 : curState.currentStageIndex);
    const clampedIdx = Math.max(0, Math.min(maxStageIdx, rawIdx));
    const stage = targetLesson.stages[clampedIdx];
    saveLocation(targetLesson.id, clampedIdx);

    set({
      isActive: true,
      currentLessonId: targetLesson.id,
      currentStageIndex: clampedIdx,
      preferredVolume: volumeArg ?? curState.preferredVolume,
      freePlaySnapshot: snapshot,
      catalogOpen: false,
    });

    if (stage) {
      loadStageIntoWorkbench(stage);
    }
  },

  exitTutorial: (keepCurrentCircuit = false) => {
    const snap = get().freePlaySnapshot;
    const circuitStore = useCircuitStore.getState();

    set({
      isActive: false,
      freePlaySnapshot: null,
      catalogOpen: false,
    });

    circuitStore.setTutorialHighlights([], [], null);

    if (!keepCurrentCircuit && snap) {
      restoreWorkbench(snap);
    } else {
      if (circuitStore.oscilloscopeChannels.length > 0) {
        useUIStore.getState().setAnalysisOpen(true);
      }
    }
  },

  selectLesson: (lessonId, stageIndex = 0) => {
    const lesson = getLessonById(lessonId);
    const clamped = Math.max(0, Math.min(lesson.stages.length - 1, stageIndex));
    const stage = lesson.stages[clamped];
    saveLocation(lesson.id, clamped);
    set({
      isActive: true,
      currentLessonId: lesson.id,
      currentStageIndex: clamped,
      catalogOpen: false,
    });
    if (stage) {
      loadStageIntoWorkbench(stage);
    }
  },

  selectStage: (stageIndex) => {
    const lesson = getLessonById(get().currentLessonId);
    const clamped = Math.max(0, Math.min(lesson.stages.length - 1, stageIndex));
    const stage = lesson.stages[clamped];
    saveLocation(lesson.id, clamped);
    set({ currentStageIndex: clamped });
    if (stage) {
      loadStageIntoWorkbench(stage);
    }
  },

  nextStage: () => {
    const { currentLessonId, currentStageIndex, selectLesson, selectStage } = get();
    const lesson = getLessonById(currentLessonId);
    if (currentStageIndex + 1 < lesson.stages.length) {
      selectStage(currentStageIndex + 1);
      return;
    }
    const lessonIdx = TUTORIAL_LESSONS.findIndex((l) => l.id === lesson.id);
    if (lessonIdx >= 0 && lessonIdx + 1 < TUTORIAL_LESSONS.length) {
      selectLesson(TUTORIAL_LESSONS[lessonIdx + 1].id, 0);
    }
  },

  prevStage: () => {
    const { currentLessonId, currentStageIndex, selectLesson, selectStage } = get();
    const lesson = getLessonById(currentLessonId);
    if (currentStageIndex > 0) {
      selectStage(currentStageIndex - 1);
      return;
    }
    const lessonIdx = TUTORIAL_LESSONS.findIndex((l) => l.id === lesson.id);
    if (lessonIdx > 0) {
      const prevLesson = TUTORIAL_LESSONS[lessonIdx - 1];
      selectLesson(prevLesson.id, Math.max(0, prevLesson.stages.length - 1));
    }
  },

  resetCurrentStage: () => {
    const lesson = getLessonById(get().currentLessonId);
    const stage = lesson.stages[get().currentStageIndex];
    if (stage) {
      loadStageIntoWorkbench(stage);
    }
  },

  setCatalogOpen: (open) => set({ catalogOpen: open }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  markStageCompleted: (stageId) => {
    const prev = get().completedStageIds;
    if (prev.includes(stageId)) return;
    const next = [...prev, stageId];
    safeWriteStorage(COMPLETED_STORAGE_KEY, JSON.stringify(next));
    set({ completedStageIds: next });
  },

  runCheckpointAutoDemo: () => {
    const lesson = getLessonById(get().currentLessonId);
    const stage = lesson.stages[get().currentStageIndex];
    if (!stage?.checkpoint?.autoDemo) return false;

    const cs = useCircuitStore.getState();
    for (const act of stage.checkpoint.autoDemo.actions) {
      if (act.kind === 'setProp') {
        if (act.key === 'blown' && act.value === false) {
          cs.resetFuse(act.componentId);
        } else {
          cs.updateComponentProp(act.componentId, act.key, act.value);
        }
      } else if (act.kind === 'setTimeScale') {
        cs.setTimeScale(act.scale);
      } else if (act.kind === 'selectComponent') {
        cs.setSelected({ kind: 'component', id: act.componentId });
      } else if (act.kind === 'wait') {
        advanceCircuitBySeconds(act.seconds);
      }
    }

    // Advance simulated time cleanly so transients settle, fuses trip, and AC RMS / waveform edges converge
    advanceCircuitBySeconds(stage.checkpoint.autoDemo.settleSeconds ?? 0.8);

    const result = stage.checkpoint.check(buildTutorialEvalContext(stage));
    if (result.passed) {
      get().markStageCompleted(stage.id);
    }
    return result.passed;
  },
}));
