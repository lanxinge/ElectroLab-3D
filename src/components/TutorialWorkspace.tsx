import React from 'react';
import {
  ArrowUpRight,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  StepForward,
  X,
} from 'lucide-react';
import { useCircuitStore, type SidebarMode } from '../store/useCircuitStore';
import { useTutorialStore } from '../store/useTutorialStore';
import { BottomAnalysisDock } from './BottomAnalysisDock';
import { PropertyInspector } from './PropertyInspector';
import { Schematic2DSidebar } from './Schematic2DSidebar';
import { TutorialCoursePanel } from './TutorialCoursePanel';
import { Workbench3DView } from './Workbench3DView';

export const TutorialWorkspace: React.FC<{
  onExitToSimulator: (keepCurrentCircuit: boolean) => void;
}> = ({ onExitToSimulator }) => {
  const isRunning = useCircuitStore((s) => s.isRunning);
  const simTime = useCircuitStore((s) => s.simTime);
  const transientAnchor = useCircuitStore((s) => s.transientAnchor);
  const hasReactiveElement = useCircuitStore((s) =>
    s.components.some((c) => c.type === 'CAPACITOR' || c.type === 'INDUCTOR')
  );
  const switchDt = Math.max(0, simTime - transientAnchor.t0);
  const timeScale = useCircuitStore((s) => s.timeScale);
  const componentCount = useCircuitStore((s) => s.components.length);
  const viewPreference = useTutorialStore((s) => s.viewPreference);
  const sidebarMode = viewPreference === 'auto' ? (componentCount >= 12 ? '2d-only' : 'split') : viewPreference;

  const toggleRunning = useCircuitStore((s) => s.toggleRunning);
  const resetSimulationTime = useCircuitStore((s) => s.resetSimulationTime);
  const stepOnce = useCircuitStore((s) => s.stepOnce);
  const setTimeScale = useCircuitStore((s) => s.setTimeScale);
  const setSidebarMode = useTutorialStore((s) => s.setViewPreference);

  const inspectorOpen = useTutorialStore((s) => s.inspectorOpen);
  const setInspectorOpen = useTutorialStore((s) => s.setInspectorOpen);

  return (
    <div
      data-testid="tutorial-workspace"
      className="flex-1 flex min-h-0 overflow-hidden bg-slate-950"
    >
      {/* Left Interactive Course & Checkpoint Column */}
      <TutorialCoursePanel />

      {/* Right Workbench Column: Transport Bar + 3D/2D Split + Bottom Analysis Dock */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Compact Tutorial Transport & View Bar */}
        <div className="min-h-10 py-1.5 px-3 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
              <button
                type="button"
                onClick={toggleRunning}
                className={`flex items-center gap-1 px-2 py-0.5 rounded font-medium ${
                  isRunning
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isRunning ? '运行中' : '已暂停'}
              </button>
              <span className="px-1.5 font-mono text-[11px] text-slate-400">
                t={simTime.toFixed(2)}s
              </span>
              {hasReactiveElement && transientAnchor.hasSwitched && (
                <span
                  data-testid="tutorial-switch-dt"
                  title="本次开关切换后的暂态经历时间 Δt"
                  className="px-1.5 font-mono text-[11px] text-amber-300 border-l border-slate-800"
                >
                  Δt={switchDt.toFixed(2)}s
                </span>
              )}
              <button
                type="button"
                data-testid="tutorial-step-once-btn"
                onClick={() => stepOnce()}
                title="推进单个仿真微步"
                className="p-1 text-slate-300 hover:text-sky-300 rounded"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetSimulationTime}
                title="重置仿真时间"
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-0.5 bg-slate-950 border border-slate-800 rounded-md p-0.5 text-[11px]">
              <Clock className="w-3 h-3 text-slate-500 mx-1" />
              {[
                [1, '1×'],
                [0.2, '0.2×'],
                [0.05, '0.05×'],
              ].map(([scale, lbl]) => (
                <button
                  key={String(scale)}
                  type="button"
                  onClick={() => setTimeScale(Number(scale))}
                  className={`px-1.5 py-0.5 rounded transition ${
                    Math.abs(timeScale - Number(scale)) < 0.015
                      ? 'bg-sky-500/25 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5 text-[11px]">
              {(
                [
                  ['auto', '自动视图'],
                  ['split', '3D+2D'],
                  ['3d-only', '纯3D'],
                  ['2d-only', '纯2D'],
                ] as ['auto' | SidebarMode, string][]
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSidebarMode(mode)}
                  className={`px-2 py-0.5 rounded transition ${
                    viewPreference === mode
                      ? 'bg-sky-500/25 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              data-testid="tutorial-inspector-toggle-btn"
              onClick={() => setInspectorOpen(!inspectorOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] ${
                inspectorOpen
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'
              }`}
            >
              <Sliders className="w-3 h-3" />
              属性参数
            </button>

            <button
              type="button"
              data-testid="tutorial-keep-exit-btn"
              onClick={() => {
                useCircuitStore.getState().setSidebarMode(sidebarMode);
                onExitToSimulator(true);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/25 hover:bg-emerald-600/40 text-emerald-200 border border-emerald-500/40 text-[11px] font-medium"
            >
              <ArrowUpRight className="w-3 h-3" />
              带电路去自由台
            </button>
          </div>
        </div>

        {/* Center 3D + 2D Split Workspace (single WebGL Workbench3DView instance) */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {sidebarMode !== '2d-only' && <Workbench3DView />}

          {sidebarMode !== '3d-only' && (
            <aside
              data-testid="tutorial-schematic-aside"
              className={
                sidebarMode === '2d-only'
                  ? 'flex-1 min-w-0 flex flex-col bg-slate-900/95'
                  : 'w-[40%] min-w-[260px] max-w-[440px] shrink-0 flex flex-col border-l border-slate-800 bg-slate-900/95'
              }
            >
              <Schematic2DSidebar
                onExpandToggle={() =>
                  setSidebarMode(sidebarMode === '2d-only' ? 'split' : '2d-only')
                }
              />
            </aside>
          )}

          {/* Optional Slide-over Property Inspector */}
          {inspectorOpen && (
            <div
              data-testid="tutorial-inspector-drawer"
              className="absolute top-0 right-0 bottom-0 w-72 z-20 bg-slate-900/98 border-l border-slate-700 shadow-2xl flex flex-col"
            >
              <div className="h-8 px-2.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
                <span className="font-semibold">器件参数精细微调</span>
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <PropertyInspector compact={false} />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Dock: Live Telemetry / AC RMS & PF / Oscilloscope */}
        <BottomAnalysisDock heightPx={230} />
      </div>
    </div>
  );
};
