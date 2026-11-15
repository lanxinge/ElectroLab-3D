import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { ComponentCategory, ComponentType } from '../../shared/types';
import { CATEGORY_LABELS, COMPONENT_CATALOG } from '../engine/componentCatalog';
import { ALL_PONDER_TYPES, PONDER_DATA } from '../ponder/ponderData';
import { Ponder3DStage } from '../ponder/Ponder3DStage';
import {
  deriveInstancePonderContext,
  resolveStepNarration,
} from '../ponder/ponderInstanceBridge';
import type { PonderLiveMetric, PonderProjectedCallout } from '../ponder/ponderTypes';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';

const DEFAULT_STEP_SEC = 5.5;

function buildDefaultParams(type: ComponentType): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ctrl of PONDER_DATA[type].controls) {
    out[ctrl.key] = ctrl.defaultValue;
  }
  if (type === 'D_FF') {
    out._q = 1;
  }
  return out;
}

export const PonderModal: React.FC = () => {
  const modalOpen = usePonderStore((s) => s.modalOpen);
  const activeType = usePonderStore((s) => s.activeType);
  const activeComponentId = usePonderStore((s) => s.activeComponentId);
  const ponderMode = usePonderStore((s) => s.ponderMode);
  const openPonder = usePonderStore((s) => s.openPonder);
  const setPonderMode = usePonderStore((s) => s.setPonderMode);
  const closePonder = usePonderStore((s) => s.closePonder);

  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const selected = useCircuitStore((s) => s.selected);
  const addComponent = useCircuitStore((s) => s.addComponent);
  const updateComponentProp = useCircuitStore((s) => s.updateComponentProp);

  const stageHostRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Ponder3DStage | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [stdParams, setStdParams] = useState<Record<string, number>>({});
  const [instanceOverrideParams, setInstanceOverrideParams] = useState<Record<string, number> | null>(null);
  const [callouts, setCallouts] = useState<PonderProjectedCallout[]>([]);
  const [metrics, setMetrics] = useState<PonderLiveMetric[]>([]);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState<ComponentCategory | 'all'>('all');

  const spec = activeType ? PONDER_DATA[activeType] : null;

  const linkedComp = useMemo(() => {
    if (!activeType) return null;
    if (activeComponentId) {
      const exact = components.find((c) => c.id === activeComponentId);
      if (exact && exact.type === activeType) return exact;
    }
    if (selected?.kind === 'component') {
      const sel = components.find((c) => c.id === selected.id);
      if (sel && sel.type === activeType) return sel;
    }
    return components.find((c) => c.type === activeType) ?? null;
  }, [activeType, activeComponentId, selected, components]);

  const effectiveMode =
    ponderMode === 'instance' && linkedComp ? 'instance' : 'standard';

  const baseInstanceCtx = useMemo(() => {
    if (!linkedComp) return null;
    return deriveInstancePonderContext(
      linkedComp,
      telemetryById[linkedComp.id],
      components,
      wires
    );
  }, [linkedComp, telemetryById, components, wires]);

  const activeParams = useMemo(() => {
    if (effectiveMode === 'instance' && baseInstanceCtx) {
      return instanceOverrideParams ?? baseInstanceCtx.initialParams;
    }
    return stdParams;
  }, [effectiveMode, baseInstanceCtx, instanceOverrideParams, stdParams]);

  const displayInstanceCtx = useMemo(() => {
    if (!linkedComp || !baseInstanceCtx) return null;
    if (!instanceOverrideParams) return baseInstanceCtx;
    return deriveInstancePonderContext(
      linkedComp,
      telemetryById[linkedComp.id],
      components,
      wires,
      instanceOverrideParams
    );
  }, [linkedComp, baseInstanceCtx, instanceOverrideParams, telemetryById, components, wires]);

  // Mount Three.js Ponder3DStage when modal opens
  useEffect(() => {
    if (!modalOpen || !stageHostRef.current) return;
    setWebglError(null);
    const stage = new Ponder3DStage(stageHostRef.current, {
      onCalloutsProjected: (projected) => setCallouts(projected),
      onLiveMetrics: (m) => setMetrics(m),
      onWebglError: (err) => setWebglError(err),
    });
    stageRef.current = stage;

    return () => {
      stage.dispose();
      stageRef.current = null;
    };
  }, [modalOpen]);

  // Switch active module or mode inside stage cleanly (do NOT depend on live telemetry ticks!)
  useEffect(() => {
    if (!modalOpen || !activeType) return;
    const defParams = buildDefaultParams(activeType);
    setStdParams(defParams);
    setInstanceOverrideParams(null);

    let initialForStage = defParams;
    if (effectiveMode === 'instance' && linkedComp) {
      const snap = useCircuitStore.getState();
      const freshCtx = deriveInstancePonderContext(
        linkedComp,
        snap.telemetryById[linkedComp.id],
        snap.components,
        snap.wires
      );
      initialForStage = { ...freshCtx.initialParams };
    }

    setStepIndex(0);
    setStepProgress(0);
    setIsPlaying(true);
    setCallouts([]);
    setMetrics([]);
    stageRef.current?.loadModule(activeType, initialForStage);
  }, [modalOpen, activeType, effectiveMode, linkedComp?.id]);

  // Push params & playback progress into 3D stage
  useEffect(() => {
    if (!modalOpen || !stageRef.current) return;
    stageRef.current.updatePlayback(stepIndex, stepProgress, activeParams);
  }, [modalOpen, stepIndex, stepProgress, activeParams]);

  // Chapter auto-advance timeline loop
  useEffect(() => {
    if (!modalOpen || !spec || !isPlaying) return;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const curDuration = spec.steps[stepIndex]?.durationSec ?? DEFAULT_STEP_SEC;

      setStepProgress((prev) => {
        const next = prev + dt / curDuration;
        if (next >= 1) {
          const nextIdx = (stepIndex + 1) % spec.steps.length;
          setStepIndex(nextIdx);
          stageRef.current?.setStep(nextIdx);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [modalOpen, spec, isPlaying, stepIndex]);

  // Escape key closes modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePonder();
      } else if (e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag !== 'input' && tag !== 'button') {
          e.preventDefault();
          setIsPlaying((p) => !p);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, closePonder]);

  const filteredModules = useMemo(() => {
    if (catFilter === 'all') return ALL_PONDER_TYPES;
    return ALL_PONDER_TYPES.filter((t) => COMPONENT_CATALOG[t].category === catFilter);
  }, [catFilter]);

  if (!modalOpen || !activeType || !spec) {
    return null;
  }

  const currentStep = spec.steps[stepIndex] ?? spec.steps[0];

  const selectStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(spec.steps.length - 1, idx));
    setStepIndex(clamped);
    setStepProgress(0);
    stageRef.current?.setStep(clamped);
  };

  const handleAddToWorkbench = () => {
    addComponent(activeType);
    closePonder();
  };

  const handleControlChange = (key: string, nextVal: number) => {
    const next: Record<string, number> = { ...activeParams, [key]: nextVal };
    if (activeType === 'D_FF' && key === 'clk') {
      const prevClk = (activeParams.clk ?? 0) >= 0.5 ? 1 : 0;
      const nextClk = nextVal >= 0.5 ? 1 : 0;
      if (prevClk === 0 && nextClk === 1) {
        next._q = (activeParams.d ?? 1) >= 0.5 ? 1 : 0;
      }
    }

    if (effectiveMode === 'instance' && baseInstanceCtx) {
      const checkKeys = new Set([
        ...Object.keys(baseInstanceCtx.initialParams),
        ...(activeType === 'D_FF' ? ['_q'] : []),
      ]);
      const matchesBaseline = Array.from(checkKeys).every(
        (k) => Math.abs((next[k] ?? 0) - (baseInstanceCtx.initialParams[k] ?? 0)) <= 1e-4
      );
      setInstanceOverrideParams(matchesBaseline ? null : next);
    } else {
      setStdParams(next);
    }
  };

  const handleApplyPropsToWorkbench = () => {
    if (!linkedComp || !displayInstanceCtx?.applyPropsPatch) return;
    for (const [k, v] of Object.entries(displayInstanceCtx.applyPropsPatch)) {
      updateComponentProp(linkedComp.id, k, v);
    }
    setInstanceOverrideParams(null);
  };

  const accentBadgeClass = (accent?: PonderLiveMetric['accent']) => {
    switch (accent) {
      case 'emerald':
        return 'border-emerald-500/40 bg-emerald-950/75 text-emerald-300';
      case 'amber':
        return 'border-amber-500/40 bg-amber-950/75 text-amber-300';
      case 'rose':
        return 'border-rose-500/40 bg-rose-950/75 text-rose-300';
      case 'violet':
        return 'border-violet-500/40 bg-violet-950/75 text-violet-300';
      default:
        return 'border-sky-500/40 bg-sky-950/75 text-sky-300';
    }
  };

  return (
    <div
      data-testid="ponder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 lg:p-6 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="w-full max-w-6xl h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-amber-500/35 shadow-2xl overflow-hidden">
        {/* Top Create-Mod Header */}
        <header className="h-13 px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-100 truncate">
                  思索 · {spec.title}
                </h2>
                <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                  {spec.englishTitle}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 border border-amber-500/35 text-amber-300 whitespace-nowrap">
                  {spec.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{spec.summary}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {linkedComp && (
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[11px]">
                <button
                  type="button"
                  data-testid="ponder-mode-instance"
                  onClick={() => setPonderMode('instance')}
                  className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                    effectiveMode === 'instance'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  解释当前元件 · {linkedComp.label}
                </button>
                <button
                  type="button"
                  data-testid="ponder-mode-standard"
                  onClick={() => setPonderMode('standard')}
                  className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
                    effectiveMode === 'standard'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  标准原理演示
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleAddToWorkbench}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              加入当前工作台
            </button>
            <button
              type="button"
              data-testid="ponder-close-btn"
              onClick={closePonder}
              title="关闭思索界面 (Esc)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Split Body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left 3D Ponder Theater Canvas */}
          <div className="relative flex-1 min-h-[300px] bg-slate-950 overflow-hidden select-none">
            <div ref={stageHostRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {webglError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 text-rose-300 text-sm p-6">
                3D 思索舞台初始化提示：{webglError}
              </div>
            )}

            {/* SVG 3D-to-2D Callout Leader Overlay */}
            <svg className="pointer-events-none absolute inset-0 w-full h-full">
              {callouts.map((c) => {
                const elbowX =
                  c.side === 'left'
                    ? Math.min(c.screenX, c.boxX + 128)
                    : Math.max(c.screenX, c.boxX);
                const anchorBoxY = c.boxY + 18;
                return (
                  <g key={c.id}>
                    <polyline
                      points={`${c.screenX},${c.screenY} ${elbowX},${anchorBoxY} ${
                        c.side === 'left' ? c.boxX + 128 : c.boxX
                      },${anchorBoxY}`}
                      fill="none"
                      stroke={c.color}
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeOpacity="0.85"
                    />
                    <circle cx={c.screenX} cy={c.screenY} r="4.5" fill={c.color} />
                    <circle
                      cx={c.screenX}
                      cy={c.screenY}
                      r="8"
                      fill="none"
                      stroke={c.color}
                      strokeOpacity="0.45"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Floating Callout Labels */}
            {callouts.map((c) => (
              <div
                key={`lbl-${c.id}`}
                style={{ left: c.boxX, top: c.boxY, borderColor: `${c.color}88` }}
                className="pointer-events-none absolute max-w-[175px] px-2 py-1 rounded-md bg-slate-900/88 border backdrop-blur-sm shadow-lg"
              >
                <div className="flex items-center gap-1 text-[11px] font-semibold leading-tight" style={{ color: c.color }}>
                  <span>{c.title}</span>
                  {c.isAnalogy && (
                    <span
                      data-testid="ponder-analogy-callout-badge"
                      className="px-1 py-0.2 rounded bg-violet-500/25 border border-violet-400/50 text-[9px] text-violet-200 shrink-0"
                    >
                      类比
                    </span>
                  )}
                </div>
                {c.detail && (
                  <div className="text-[10px] text-slate-300 leading-tight mt-0.5">
                    {c.detail}
                  </div>
                )}
              </div>
            ))}

            {/* Top-Left Live Metrics & Hint */}
            <div
              data-testid="ponder-live-metrics"
              className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2 max-w-[75%]"
            >
              {(effectiveMode === 'instance' && displayInstanceCtx ? displayInstanceCtx.liveMetrics : metrics).map((m, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] backdrop-blur-md shadow ${accentBadgeClass(
                    m.accent
                  )}`}
                >
                  <span className="opacity-80 mr-1.5">{m.label}:</span>
                  <span className="font-mono font-semibold">{m.value}</span>
                </div>
              ))}
            </div>

            {/* Top-Right Step Indicator */}
            <div className="pointer-events-none absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/70 text-[11px] text-slate-300 backdrop-blur-sm">
              章节 {stepIndex + 1} / {spec.steps.length} · 拖拽旋转视角
            </div>

            {/* Bottom Controls + Create-Mod Chapter Scrubber */}
            <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
              {spec.controls.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/88 border border-slate-700/80 backdrop-blur-md self-start">
                  {spec.controls.map((ctrl) => {
                    const val = activeParams[ctrl.key] ?? ctrl.defaultValue;
                    if (ctrl.kind === 'toggle') {
                      const active = val >= 0.5;
                      return (
                        <button
                          key={ctrl.key}
                          type="button"
                          data-testid={`ponder-ctrl-${ctrl.key}`}
                          onClick={() => handleControlChange(ctrl.key, active ? 0 : 1)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                            active
                              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                              : 'bg-slate-800 border-slate-600 text-slate-300'
                          }`}
                        >
                          <span className="text-[11px] text-slate-400">{ctrl.label}:</span>
                          <span>{active ? ctrl.trueLabel ?? 'ON' : ctrl.falseLabel ?? 'OFF'}</span>
                        </button>
                      );
                    }
                    const sMin = Math.min(ctrl.min ?? 0, val);
                    const sMax = Math.max(ctrl.max ?? 10, val);
                    return (
                      <label key={ctrl.key} className="flex items-center gap-2 text-xs text-slate-200">
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {ctrl.label}:
                        </span>
                        <input
                          type="range"
                          data-testid={`ponder-ctrl-${ctrl.key}`}
                          min={sMin}
                          max={sMax}
                          step={ctrl.step ?? 0.5}
                          value={val}
                          onChange={(e) => handleControlChange(ctrl.key, Number(e.target.value))}
                          className="w-28 accent-amber-400 cursor-pointer"
                        />
                        <span className="font-mono text-amber-300 text-[11px] min-w-[46px]">
                          {Number.isInteger(ctrl.step ?? 1) ? Number(val.toFixed(0)) : val.toFixed(1)}
                          {ctrl.unit ?? ''}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Create-style Scrubber Bar */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/92 border border-amber-500/35 backdrop-blur-md shadow-xl">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  title={isPlaying ? '暂停演示' : '继续播放'}
                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 transition"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectStep((stepIndex - 1 + spec.steps.length) % spec.steps.length)
                  }
                  title="上一步"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => selectStep((stepIndex + 1) % spec.steps.length)}
                  title="下一步"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    selectStep(0);
                    setIsPlaying(true);
                  }}
                  title="重播本模块"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Chapter Segments */}
                <div className="flex-1 flex items-center gap-1.5 ml-1">
                  {spec.steps.map((st, idx) => {
                    const active = idx === stepIndex;
                    const done = idx < stepIndex;
                    const fillPct = done ? 100 : active ? Math.round(stepProgress * 100) : 0;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => selectStep(idx)}
                        title={`${idx + 1}. ${st.title}`}
                        className={`group flex-1 text-left transition cursor-pointer ${
                          active ? 'opacity-100' : 'opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div className="text-[10px] truncate mb-1 text-slate-300 font-medium">
                          {idx + 1}. {st.title}
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-75 ${
                              active ? 'bg-amber-400' : 'bg-sky-500'
                            }`}
                            style={{ width: `${fillPct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Explanation & Formula & Module Index Sidebar */}
          <aside className="w-full md:w-[330px] lg:w-[360px] shrink-0 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col overflow-y-auto p-4 gap-4">
            {/* Active Step Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/35">
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide mb-1">
                步骤 {stepIndex + 1} · {currentStep.title}
              </div>
              <p data-testid="ponder-step-narration" className="text-xs leading-relaxed text-slate-200">
                {resolveStepNarration(spec, stepIndex, activeParams)}
              </p>
            </div>

            {effectiveMode === 'instance' && displayInstanceCtx && (
              <div
                data-testid="ponder-instance-card"
                className={`p-3.5 rounded-xl border space-y-2 ${
                  displayInstanceCtx.isOverridden
                    ? 'bg-amber-950/40 border-amber-500/45'
                    : 'bg-emerald-950/45 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] font-semibold ${
                      displayInstanceCtx.isOverridden ? 'text-amber-300' : 'text-emerald-300'
                    }`}
                  >
                    {displayInstanceCtx.isOverridden ? '当前元件试算推演' : '当前电路实测推导'} ·{' '}
                    {displayInstanceCtx.componentLabel}
                  </span>
                  <span
                    data-testid="ponder-instance-badge"
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      displayInstanceCtx.isOverridden
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-200'
                    }`}
                  >
                    {displayInstanceCtx.isOverridden ? '试算模式' : '工作台同步'}
                  </span>
                </div>
                <p
                  data-testid="ponder-instance-explanation"
                  className="text-xs leading-relaxed text-slate-100"
                >
                  {displayInstanceCtx.causalExplanation}
                </p>
                {displayInstanceCtx.pinSummary && (
                  <div
                    data-testid="ponder-instance-pins"
                    className="px-2 py-1.5 rounded bg-slate-950/80 border border-slate-800 font-mono text-[10px] text-sky-300 leading-relaxed break-all"
                  >
                    {displayInstanceCtx.pinSummary}
                  </div>
                )}
                {displayInstanceCtx.isOverridden && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="ponder-reset-instance-btn"
                      onClick={() => setInstanceOverrideParams(null)}
                      className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-medium text-slate-200 transition"
                    >
                      还原实测
                    </button>
                    {displayInstanceCtx.applyPropsPatch && (
                      <button
                        type="button"
                        data-testid="ponder-apply-props-btn"
                        onClick={handleApplyPropsToWorkbench}
                        className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium text-white transition"
                      >
                        应用到工作台
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {spec.analogyNote && (
              <div
                data-testid="ponder-analogy-note"
                className="px-3 py-2 rounded-lg bg-violet-950/40 border border-violet-500/35 text-[11px] text-violet-200 leading-relaxed flex items-start gap-2"
              >
                <span
                  data-testid="ponder-analogy-badge"
                  className="px-1.5 py-0.5 rounded bg-violet-500/25 border border-violet-400/50 text-[10px] font-semibold text-violet-100 shrink-0"
                >
                  原理类比
                </span>
                <span>{spec.analogyNote}</span>
              </div>
            )}

            {/* Formulas */}
            <div>
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                核心定量公式
              </h3>
              <div className="space-y-2">
                {spec.formulas.map((f, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800"
                  >
                    <div className="font-mono text-xs text-sky-300 font-semibold">{f.expr}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{f.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Takeaways */}
            <div>
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                本科电工学要点
              </h3>
              <ul className="space-y-1.5">
                {spec.keyTakeaways.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300 leading-snug">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick Switch Across All 30 Modules */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  全库模块快速切换 ({ALL_PONDER_TYPES.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                <button
                  type="button"
                  onClick={() => setCatFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    catFilter === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  全部
                </button>
                {(Object.keys(CATEGORY_LABELS) as ComponentCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCatFilter(cat)}
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      catFilter === cat
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {filteredModules.map((t) => {
                  const s = PONDER_DATA[t];
                  const selected = t === activeType;
                  return (
                    <button
                      key={t}
                      type="button"
                      data-testid={`ponder-switch-${t}`}
                      onClick={() => openPonder(t)}
                      className={`px-2 py-1.5 rounded-lg border text-left text-[11px] truncate transition ${
                        selected
                          ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 font-semibold'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
