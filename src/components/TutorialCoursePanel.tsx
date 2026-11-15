import React, { useEffect, useMemo } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';
import { buildTutorialEvalContext, useTutorialStore } from '../store/useTutorialStore';
import {
  getChapterById,
  getLessonById,
  TOTAL_TUTORIAL_STAGES,
  TUTORIAL_CHAPTERS,
  TUTORIAL_LESSONS,
} from '../tutorial/curriculumIndex';

export const TutorialCoursePanel: React.FC = () => {
  const currentLessonId = useTutorialStore((s) => s.currentLessonId);
  const currentStageIndex = useTutorialStore((s) => s.currentStageIndex);
  const completedStageIds = useTutorialStore((s) => s.completedStageIds);
  const catalogOpen = useTutorialStore((s) => s.catalogOpen);

  const selectLesson = useTutorialStore((s) => s.selectLesson);
  const selectStage = useTutorialStore((s) => s.selectStage);
  const nextStage = useTutorialStore((s) => s.nextStage);
  const prevStage = useTutorialStore((s) => s.prevStage);
  const resetCurrentStage = useTutorialStore((s) => s.resetCurrentStage);
  const setCatalogOpen = useTutorialStore((s) => s.setCatalogOpen);
  const markStageCompleted = useTutorialStore((s) => s.markStageCompleted);
  const runCheckpointAutoDemo = useTutorialStore((s) => s.runCheckpointAutoDemo);

  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const simTime = useCircuitStore((s) => s.simTime);
  const transientAnchor = useCircuitStore((s) => s.transientAnchor);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const updateComponentProp = useCircuitStore((s) => s.updateComponentProp);
  const resetFuse = useCircuitStore((s) => s.resetFuse);

  const openPonder = usePonderStore((s) => s.openPonder);

  const lesson = getLessonById(currentLessonId);
  const chapter = getChapterById(lesson.chapterId);
  const stage = lesson.stages[currentStageIndex] ?? lesson.stages[0];

  const evalCtx = useMemo(
    () => ({
      circuit: stage.circuit,
      components,
      wires,
      telemetryById,
      simTime,
      elapsedSinceSwitch: Math.max(0, simTime - transientAnchor.t0),
      hasSwitched: transientAnchor.hasSwitched,
      initialCapVoltages: transientAnchor.initialCapVoltages,
      initialIndCurrents: transientAnchor.initialIndCurrents,
    }),
    [stage.circuit, components, wires, telemetryById, simTime, transientAnchor]
  );

  const formulaRows = useMemo(
    () =>
      stage.liveFormulas.map((lf) => ({
        ...lf,
        evalRes: lf.evaluate(evalCtx),
      })),
    [stage.liveFormulas, evalCtx]
  );

  const checkpointRes = useMemo(() => {
    if (!stage.checkpoint) return null;
    return stage.checkpoint.check(evalCtx);
  }, [stage.checkpoint, evalCtx]);

  useEffect(() => {
    if (checkpointRes?.passed && !completedStageIds.includes(stage.id)) {
      markStageCompleted(stage.id);
    }
  }, [checkpointRes?.passed, stage.id, completedStageIds, markStageCompleted]);

  const lessonIdx = TUTORIAL_LESSONS.findIndex((l) => l.id === lesson.id);
  const isFirstGlobal = lessonIdx <= 0 && currentStageIndex <= 0;
  const isLastGlobal =
    lessonIdx >= TUTORIAL_LESSONS.length - 1 &&
    currentStageIndex >= lesson.stages.length - 1;
  const isLastStageInLesson = currentStageIndex >= lesson.stages.length - 1;

  const compLabelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of components) {
      m.set(c.id, c.label);
    }
    return m;
  }, [components]);

  return (
    <aside
      data-testid="tutorial-course-panel"
      className="w-[348px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col min-h-0 relative select-none"
    >
      {/* Inline Catalog Drawer Overlay */}
      {catalogOpen && (
        <div
          data-testid="tutorial-catalog-drawer"
          className="absolute inset-0 z-30 bg-slate-950/98 backdrop-blur flex flex-col"
        >
          <div className="h-11 px-3 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <BookOpen className="w-4 h-4" />
              本科电工学上册 · 零基础交互目录
            </div>
            <button
              type="button"
              data-testid="tutorial-catalog-close-btn"
              onClick={() => setCatalogOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {TUTORIAL_CHAPTERS.map((chap) => {
              const chapLessons = TUTORIAL_LESSONS.filter((l) => l.chapterId === chap.id);
              return (
                <div key={chap.id} className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-300 tracking-wide">
                    {chap.title}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug mb-1">
                    {chap.subtitle}
                  </div>
                  <div className="space-y-1.5">
                    {chapLessons.map((les) => {
                      const doneInLes = les.stages.filter((s) =>
                        completedStageIds.includes(s.id)
                      ).length;
                      const isCurrent = les.id === lesson.id;
                      return (
                        <button
                          key={les.id}
                          type="button"
                          data-testid={`tutorial-lesson-item-${les.id}`}
                          onClick={() => selectLesson(les.id, 0)}
                          className={`w-full text-left p-2 rounded-lg border transition ${
                            isCurrent
                              ? 'bg-sky-500/15 border-sky-400/60 text-slate-100'
                              : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold truncate">
                              {les.lessonNumber}. {les.title}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-mono ${
                                doneInLes === les.stages.length
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {doneInLes}/{les.stages.length}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span className="px-1 rounded bg-slate-800 text-amber-300">
                              {les.difficulty}
                            </span>
                            <span className="truncate">{les.textbookRef}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header + Lesson Metadata */}
      <div className="p-3 border-b border-slate-800 space-y-2 shrink-0 bg-slate-900/95">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-semibold shrink-0">
              {chapter?.title.split(' ')[0] ?? '课程'} · 第{lesson.lessonNumber}课
            </span>
            <span className="text-[10px] font-mono text-emerald-400 shrink-0">
              已完成 {completedStageIds.length}/{TOTAL_TUTORIAL_STAGES}
            </span>
          </div>
          <button
            type="button"
            data-testid="tutorial-catalog-btn"
            onClick={() => setCatalogOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-medium border border-slate-700 shrink-0"
          >
            <BookOpen className="w-3 h-3" />
            课程目录
          </button>
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-100 leading-snug">{lesson.title}</h2>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{lesson.textbookRef}</div>
        </div>

        {/* Stage Stepper Pills */}
        <div className="flex items-center gap-1 flex-wrap pt-0.5">
          {lesson.stages.map((st, idx) => {
            const active = idx === currentStageIndex;
            const passed = completedStageIds.includes(st.id);
            return (
              <button
                key={st.id}
                type="button"
                data-testid={`tutorial-stage-tab-${idx}`}
                onClick={() => selectStage(idx)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border transition ${
                  active
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                    : passed
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {passed ? (
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                ) : (
                  <Circle className="w-2.5 h-2.5 shrink-0" />
                )}
                <span>Step {st.stageNumber}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Instructional Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Stage Title + Goal */}
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-100 leading-snug">{stage.title}</span>
            {stage.badge && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
                {stage.badge}
              </span>
            )}
          </div>
          <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/25 rounded px-2 py-1 leading-relaxed">
            核心目标：{stage.conceptGoal}
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">{stage.explanation}</p>
          <div className="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded px-2 py-1 leading-relaxed">
            直观类比：{stage.analogy}
          </div>
        </div>

        {/* Highlight / Newly Added Components */}
        {(stage.newlyAddedIds.length > 0 || stage.highlights.length > 0) && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              点击定位本步关键器件
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from(new Set([...stage.newlyAddedIds, ...stage.highlights])).map((cid) => {
                const isNew = stage.newlyAddedIds.includes(cid);
                const lbl = compLabelMap.get(cid) ?? cid;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => setSelected({ kind: 'component', id: cid })}
                    className={`px-2 py-0.5 rounded text-[10px] border transition ${
                      isNew
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                        : 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25'
                    }`}
                  >
                    {isNew ? '+新增 ' : ''}
                    {lbl}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Controls */}
        {stage.quickControls && stage.quickControls.length > 0 && (
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
              <Wrench className="w-3.5 h-3.5" />
              实验快捷交互控制
            </div>
            {stage.quickControls.map((qc) => {
              const comp = components.find((c) => c.id === qc.targetId);
              const rawVal = comp?.props?.[qc.propKey];

              if (qc.kind === 'toggle-switch') {
                const closed = Boolean(rawVal);
                return (
                  <div
                    key={qc.id}
                    className="flex items-center justify-between gap-2 bg-slate-900 px-2 py-1.5 rounded border border-slate-800"
                  >
                    <span className="text-[11px] text-slate-200">{qc.label}</span>
                    <button
                      type="button"
                      data-testid={`tutorial-qc-${qc.id}`}
                      onClick={() => updateComponentProp(qc.targetId, qc.propKey, !closed)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                        closed
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      {closed ? '已闭合 (ON)' : '已断开 (OFF)'}
                    </button>
                  </div>
                );
              }

              if (qc.kind === 'reset-fuse') {
                const blown = Boolean(comp?.props?.blown);
                return (
                  <div
                    key={qc.id}
                    className="flex items-center justify-between gap-2 bg-slate-900 px-2 py-1.5 rounded border border-slate-800"
                  >
                    <span className="text-[11px] text-slate-200">{qc.label}</span>
                    <button
                      type="button"
                      data-testid={`tutorial-qc-${qc.id}`}
                      onClick={() => resetFuse(qc.targetId)}
                      disabled={!blown}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40"
                    >
                      {blown ? '点击复位熔丝' : '熔丝正常'}
                    </button>
                  </div>
                );
              }

              if (qc.kind === 'spdt-toggle' || qc.kind === 'select-option') {
                const cur = rawVal;
                return (
                  <div
                    key={qc.id}
                    className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 space-y-1"
                  >
                    <div className="text-[11px] text-slate-300">{qc.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {(qc.options ?? []).map((opt) => {
                        const active = Number(cur) === Number(opt.value);
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() =>
                              updateComponentProp(qc.targetId, qc.propKey, opt.value)
                            }
                            className={`px-2 py-1 rounded text-[10px] border transition ${
                              active
                                ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                                : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // slider
              const numVal = Number(rawVal ?? qc.min ?? 0);
              return (
                <div
                  key={qc.id}
                  className="bg-slate-900 px-2 py-1.5 rounded border border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">{qc.label}</span>
                    <span className="font-mono text-sky-300 font-semibold">
                      {numVal} {qc.unit ?? ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={qc.min ?? 0}
                    max={qc.max ?? 100}
                    step={qc.step ?? 1}
                    value={numVal}
                    onChange={(e) =>
                      updateComponentProp(qc.targetId, qc.propKey, Number(e.target.value))
                    }
                    className="w-full accent-sky-400"
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Live Formulas */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            实时公式代入与验算
          </div>
          {formulaRows.map((row) => {
            const badgeStyle =
              row.evalRes.status === 'good'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : row.evalRes.status === 'warn'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-slate-800 bg-slate-950 text-sky-300';
            return (
              <div
                key={row.id}
                className={`rounded-lg border p-2 space-y-0.5 ${badgeStyle}`}
              >
                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                  <span>{row.title}</span>
                  <span className="font-mono text-slate-300">{row.formula}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300 truncate">{row.evalRes.expression}</span>
                  <span className="font-mono font-bold shrink-0">{row.evalRes.result}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ponder 3D Principle Demo Links */}
        {stage.ponderLinks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
              <Sparkles className="w-3 h-3" />
              模块 3D 机理思索演示
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stage.ponderLinks.map((pl, idx) => (
                <button
                  key={`${pl.type}-${idx}`}
                  type="button"
                  data-testid={`tutorial-ponder-btn-${idx}`}
                  onClick={() => openPonder(pl.type, pl.componentId ?? null, pl.stepIndex ?? 0)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-medium transition"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {pl.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Checkpoint Card */}
        {stage.checkpoint && checkpointRes && (
          <div
            data-testid="tutorial-checkpoint-card"
            className={`rounded-lg border p-2.5 space-y-2 ${
              checkpointRes.passed
                ? 'bg-emerald-500/10 border-emerald-500/50'
                : 'bg-amber-500/10 border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                <Zap
                  className={`w-3.5 h-3.5 ${
                    checkpointRes.passed ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                />
                {stage.checkpoint.title}
              </div>
              <span
                data-testid="tutorial-checkpoint-status"
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                  checkpointRes.passed
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-amber-500/25 text-amber-200'
                }`}
              >
                {checkpointRes.passed ? '已通关 ✓' : '待完成'}
              </span>
            </div>

            <p className="text-[11px] text-slate-200 leading-relaxed">
              {stage.checkpoint.instruction}
            </p>

            <div
              className={`text-[11px] font-mono px-2 py-1 rounded bg-slate-950/70 border ${
                checkpointRes.passed
                  ? 'border-emerald-500/30 text-emerald-300'
                  : 'border-slate-800 text-amber-200'
              }`}
            >
              {checkpointRes.message}
            </div>

            {stage.checkpoint.hint && !checkpointRes.passed && (
              <div className="text-[10px] text-slate-400">提示：{stage.checkpoint.hint}</div>
            )}

            {stage.checkpoint.autoDemo && (
              <button
                type="button"
                data-testid="tutorial-autodemo-btn"
                onClick={() => runCheckpointAutoDemo()}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold transition"
              >
                <Play className="w-3 h-3" />
                {stage.checkpoint.autoDemo.buttonLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pinned Footer Navigation */}
      <div className="h-11 px-3 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-900">
        <button
          type="button"
          data-testid="tutorial-prev-btn"
          onClick={prevStage}
          disabled={isFirstGlobal}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          上一步
        </button>

        <button
          type="button"
          data-testid="tutorial-reset-btn"
          onClick={resetCurrentStage}
          title="重新载入当前步骤电路"
          className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置
        </button>

        <button
          type="button"
          data-testid="tutorial-next-btn"
          onClick={nextStage}
          disabled={isLastGlobal}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-40"
        >
          {isLastStageInLesson ? '下一课' : '下一步'}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
};
