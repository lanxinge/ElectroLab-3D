import React, { useEffect, useState } from 'react';
import { Sparkles, Sliders, X } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { useSimulationRunner } from './hooks/useSimulationRunner';
import { useCircuitStore } from './store/useCircuitStore';
import { useCustomIcStore } from './store/useCustomIcStore';
import { usePonderStore } from './store/usePonderStore';
import { useUIStore } from './store/useUIStore';
import { HeaderBar } from './components/HeaderBar';
import { ComponentPalette } from './components/ComponentPalette';
import { Workbench3DView } from './components/Workbench3DView';
import { Schematic2DSidebar } from './components/Schematic2DSidebar';
import { PropertyInspector } from './components/PropertyInspector';
import { BottomAnalysisDock } from './components/BottomAnalysisDock';
import { ForumView } from './components/ForumView';
import { LandingHomeView } from './components/LandingHomeView';
import { AuthModal } from './components/AuthModal';
import { PublishCircuitModal } from './components/PublishCircuitModal';
import { MyProjectsModal } from './components/MyProjectsModal';
import { PonderHoverOverlay } from './components/PonderHoverOverlay';
import { PonderModal } from './components/PonderModal';
import { FloatingPanelOrb } from './components/FloatingPanelOrb';
import { TruthChipEditorModal } from './components/TruthChipEditorModal';
import { PackageIcModal } from './components/PackageIcModal';
import { TutorialWorkspace } from './components/TutorialWorkspace';
import { useTutorialStore } from './store/useTutorialStore';
import { parseProjectFile } from './utils/projectFileIO';

export function App() {
  const [activeView, setActiveView] = useState<'home' | 'simulator' | 'tutorial' | 'forum'>('home');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  const openAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setShowAuthModal(true);
  };
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [forumRefreshTrigger, setForumRefreshTrigger] = useState(0);
  const [dropNotice, setDropNotice] = useState<string | null>(null);

  const initAuth = useAuthStore((s) => s.initAuth);
  const user = useAuthStore((s) => s.user);
  const fetchCloudIcs = useCustomIcStore((s) => s.fetchCloudIcs);
  const clearCloudIcs = useCustomIcStore((s) => s.clearCloudIcs);

  const sidebarMode = useCircuitStore((s) => s.sidebarMode);
  const setSidebarMode = useCircuitStore((s) => s.setSidebarMode);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const selected = useCircuitStore((s) => s.selected);
  const components = useCircuitStore((s) => s.components);
  const telemetryById = useCircuitStore((s) => s.telemetryById);

  const layoutMode = useUIStore((s) => s.layoutMode);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const setInspectorOpen = useUIStore((s) => s.setInspectorOpen);
  const schematicOpen = useUIStore((s) => s.schematicOpen);
  const setSchematicOpen = useUIStore((s) => s.setSchematicOpen);
  const analysisOpen = useUIStore((s) => s.analysisOpen);
  const setAnalysisOpen = useUIStore((s) => s.setAnalysisOpen);
  const paletteWidth = useUIStore((s) => s.paletteWidth);
  const setPaletteWidth = useUIStore((s) => s.setPaletteWidth);
  const rightColumnWidth = useUIStore((s) => s.rightColumnWidth);
  const setRightColumnWidth = useUIStore((s) => s.setRightColumnWidth);
  const analysisHeight = useUIStore((s) => s.analysisHeight);
  const setAnalysisHeight = useUIStore((s) => s.setAnalysisHeight);
  const splitInspectorHeight = useUIStore((s) => s.splitInspectorHeight);
  const setSplitInspectorHeight = useUIStore((s) => s.setSplitInspectorHeight);

  // Independent simulation runner: keeps time & waveforms advancing in 2d-only and tutorial modes too
  useSimulationRunner(activeView === 'simulator' || activeView === 'tutorial');

  const handleChangeView = (nextView: 'home' | 'simulator' | 'tutorial' | 'forum') => {
    if (nextView === activeView) return;
    if (nextView === 'tutorial') {
      useTutorialStore.getState().enterTutorial();
    } else if (activeView === 'tutorial') {
      useTutorialStore.getState().exitTutorial(false);
    }
    setActiveView(nextView);
  };

  const handleOpenTutorialFromHome = (lessonId?: string, volume: 'all' | 'vol1' | 'vol2' = 'all') => {
    useTutorialStore.getState().enterTutorial(lessonId, lessonId ? 0 : undefined, volume);
    setActiveView('tutorial');
  };

  const startResize = (
    e: React.PointerEvent,
    startVal: number,
    onUpdate: (next: number) => void,
    axis: 'x' | 'y',
    sign: 1 | -1 = 1
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startCoord = axis === 'x' ? e.clientX : e.clientY;
    const onMove = (ev: PointerEvent) => {
      const cur = axis === 'x' ? ev.clientX : ev.clientY;
      onUpdate(startVal + (cur - startCoord) * sign);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (user) {
      fetchCloudIcs();
    } else {
      clearCloudIcs();
    }
  }, [user?.id, fetchCloudIcs, clearCloudIcs]);

  const selectedComp =
    selected?.kind === 'component'
      ? components.find((c) => c.id === selected.id) ?? null
      : null;
  const selectedTel = selectedComp ? telemetryById[selectedComp.id] : undefined;

  const handleWorkspaceDrop = async (e: React.DragEvent) => {
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.json')) return;
    e.preventDefault();
    try {
      const text = await file.text();
      const parsed = parseProjectFile(text);
      loadCircuit(parsed.circuit, parsed.title, null);
      setDropNotice(`已从拖拽文件载入工程: ${parsed.title}`);
    } catch (err) {
      setDropNotice(err instanceof Error ? err.message : '导入工程文件失败');
    }
    setTimeout(() => setDropNotice(null), 3200);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <HeaderBar
        activeView={activeView}
        onChangeView={handleChangeView}
        onOpenAuth={openAuth}
        onOpenPublish={() => setShowPublishModal(true)}
        onOpenProjects={() => setShowProjectsModal(true)}
      />

      {activeView === 'home' ? (
        <LandingHomeView
          onOpenWorkbench={() => handleChangeView('simulator')}
          onOpenTutorial={handleOpenTutorialFromHome}
          onOpenForum={() => handleChangeView('forum')}
          onOpenAuth={openAuth}
          onOpenProjects={() => setShowProjectsModal(true)}
        />
      ) : activeView === 'tutorial' ? (
        <TutorialWorkspace
          onExitToSimulator={(keep) => {
            useTutorialStore.getState().exitTutorial(keep);
            setActiveView('simulator');
          }}
        />
      ) : activeView === 'forum' ? (
        <ForumView
          refreshTrigger={forumRefreshTrigger}
          onForkToSimulator={() => handleChangeView('simulator')}
          onOpenPublish={() => setShowPublishModal(true)}
          onOpenAuth={openAuth}
        />
      ) : layoutMode === 'split' ? (
        <div
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDrop={handleWorkspaceDrop}
        >
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Left Component Library */}
            <ComponentPalette />

            {/* Center 3D Workbench */}
            {sidebarMode !== '2d-only' && <Workbench3DView />}

            {/* Right Sidebar: Stable-Height Property Inspector + 2D Classical Schematic */}
            <aside
              data-testid="split-right-aside"
              style={sidebarMode !== '2d-only' ? { width: rightColumnWidth } : undefined}
              className={`relative flex flex-col border-l border-slate-800 bg-slate-900/95 shrink-0 ${
                sidebarMode === '2d-only' ? 'flex-1 min-w-0' : ''
              }`}
            >
              {sidebarMode !== '2d-only' && (
                <div
                  data-testid="resize-split-right-handle"
                  onPointerDown={(e) =>
                    startResize(e, rightColumnWidth, setRightColumnWidth, 'x', -1)
                  }
                  title="拖拽调整右侧栏宽度"
                  className="absolute top-0 bottom-0 -left-1 w-2 cursor-col-resize hover:bg-sky-500/40 z-20 transition-colors"
                />
              )}
              {sidebarMode === '3d-only' ? (
                <div
                  data-testid="split-inspector-slot"
                  className="flex-1 min-h-0 overflow-hidden"
                >
                  <PropertyInspector compact={false} />
                </div>
              ) : (
                <>
                  <div
                    data-testid="split-inspector-slot"
                    style={{ height: splitInspectorHeight }}
                    className="shrink-0 overflow-hidden"
                  >
                    <PropertyInspector compact={false} />
                  </div>
                  <div
                    data-testid="resize-split-inspector-handle"
                    onPointerDown={(e) =>
                      startResize(e, splitInspectorHeight, setSplitInspectorHeight, 'y', 1)
                    }
                    title="拖拽调整属性栏高度"
                    className="h-1.5 bg-slate-800/80 hover:bg-sky-500/50 cursor-row-resize shrink-0 transition-colors"
                  />
                  <div className="flex-1 min-h-0" data-testid="split-schematic-container">
                    <Schematic2DSidebar
                      onExpandToggle={() =>
                        setSidebarMode(sidebarMode === '2d-only' ? 'split' : '2d-only')
                      }
                    />
                  </div>
                </>
              )}
            </aside>
          </div>

          <div
            data-testid="resize-split-analysis-handle"
            onPointerDown={(e) => startResize(e, analysisHeight, setAnalysisHeight, 'y', -1)}
            title="拖拽调整底部解析区高度"
            className="h-1 bg-slate-800/90 hover:bg-sky-500/50 cursor-row-resize shrink-0 transition-colors"
          />
          {/* Bottom Real-Time Telemetry + Oscilloscope + Digital Truth Table & Karnaugh Map */}
          <BottomAnalysisDock heightPx={analysisHeight} />
        </div>
      ) : (
        <div
          data-testid="floating-workbench-container"
          className="relative flex-1 min-h-0 overflow-hidden flex"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault();
          }}
          onDrop={handleWorkspaceDrop}
        >
          {/* Full-screen uncluttered 3D workbench */}
          <Workbench3DView />

          {/* Floating Palette Drawer */}
          {paletteOpen && (
            <div
              data-testid="floating-palette-drawer"
              style={{ top: 12, left: 12, bottom: 12, width: paletteWidth }}
              className="absolute rounded-2xl border border-slate-700/80 bg-slate-900/92 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col z-20"
            >
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-sky-300 shrink-0">
                <span>元件库</span>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(false)}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ComponentPalette className="w-full border-r-0 bg-transparent flex-1 min-h-0" />
              <div
                data-testid="resize-palette-handle"
                onPointerDown={(e) => startResize(e, paletteWidth, setPaletteWidth, 'x', 1)}
                title="拖拽调整元件库宽度"
                className="absolute top-2 bottom-2 right-0 w-1.5 cursor-col-resize hover:bg-sky-400/50 transition-colors"
              />
            </div>
          )}

          {/* Selected Component Quick Peek Pill when Inspector is collapsed */}
          {!inspectorOpen && selected && (
            <div
              data-testid="selected-peek-pill"
              style={{ right: schematicOpen ? rightColumnWidth + 24 : 12 }}
              className="absolute top-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 shadow-xl text-xs"
            >
              <span className="font-mono font-semibold text-sky-300">
                {selectedComp ? selectedComp.label : '导线选中'}
              </span>
              {selectedTel && (
                <span className="font-mono text-[11px] text-emerald-300">
                  {selectedTel.voltageDrop.toFixed(2)}V · {(selectedTel.current * 1000).toFixed(1)}mA
                </span>
              )}
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-200 text-[11px]"
              >
                <Sliders className="w-3 h-3" />
                属性
              </button>
              {selectedComp && (
                <button
                  type="button"
                  onClick={() =>
                    usePonderStore.getState().openPonder(selectedComp.type, selectedComp.id)
                  }
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px]"
                >
                  <Sparkles className="w-3 h-3" />
                  思索
                </button>
              )}
            </div>
          )}

          {/* Coordinated Non-Overlapping Right Drawers (Inspector + 2D Schematic) */}
          {(inspectorOpen || schematicOpen) && (
            <div
              data-testid="floating-right-column"
              style={{
                top: 12,
                right: 12,
                bottom: analysisOpen ? analysisHeight + 24 : 84,
                width: rightColumnWidth,
              }}
              className="absolute flex flex-col z-20 pointer-events-none"
            >
              <div
                data-testid="resize-right-handle"
                onPointerDown={(e) =>
                  startResize(e, rightColumnWidth, setRightColumnWidth, 'x', -1)
                }
                title="拖拽调整右侧栏宽度"
                className="pointer-events-auto absolute top-2 bottom-2 -left-1 w-2 cursor-col-resize hover:bg-sky-400/50 rounded transition-colors z-30"
              />

              {inspectorOpen && (
                <div
                  data-testid="floating-inspector-drawer"
                  style={
                    schematicOpen
                      ? { height: Math.min(splitInspectorHeight, 195) }
                      : undefined
                  }
                  className={`pointer-events-auto ${
                    schematicOpen ? 'shrink-0' : 'max-h-full'
                  } rounded-2xl border border-slate-700/80 bg-slate-900/94 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col`}
                >
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-300 shrink-0">
                    <span>属性与实时探针</span>
                    <button
                      type="button"
                      onClick={() => setInspectorOpen(false)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <PropertyInspector compact={false} />
                  </div>
                </div>
              )}

              {inspectorOpen && schematicOpen && (
                <div
                  data-testid="resize-floating-stack-handle"
                  onPointerDown={(e) =>
                    startResize(e, splitInspectorHeight, setSplitInspectorHeight, 'y', 1)
                  }
                  title="拖拽调节属性栏与 2D 原理图比例"
                  className="pointer-events-auto h-2.5 flex items-center justify-center cursor-row-resize shrink-0 group"
                >
                  <div className="w-12 h-1 rounded-full bg-slate-700 group-hover:bg-sky-400 transition-colors" />
                </div>
              )}

              {schematicOpen && (
                <div
                  data-testid="floating-schematic-drawer"
                  className="pointer-events-auto flex-1 min-h-[160px] rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-cyan-300 shrink-0">
                    <span>2D 经典电路原理图</span>
                    <button
                      type="button"
                      onClick={() => setSchematicOpen(false)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <Schematic2DSidebar />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Bottom Analysis Sheet (never overlaps Palette or Right Drawers) */}
          {analysisOpen && (
            <div
              data-testid="floating-analysis-drawer"
              style={{
                bottom: 12,
                left: paletteOpen ? paletteWidth + 24 : 12,
                right: 88,
                height: analysisHeight,
              }}
              className="absolute rounded-2xl border border-slate-700/80 bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col z-20"
            >
              <div
                data-testid="resize-analysis-handle"
                onPointerDown={(e) => startResize(e, analysisHeight, setAnalysisHeight, 'y', -1)}
                title="拖拽调整实时分析区高度"
                className="h-1.5 bg-transparent hover:bg-emerald-400/50 cursor-row-resize shrink-0 transition-colors"
              />
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-300 shrink-0">
                <span>实时分析工作区（示波器 / 负载 / 真值表 / 卡诺图）</span>
                <button
                  type="button"
                  onClick={() => setAnalysisOpen(false)}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <BottomAnalysisDock embedded />
              </div>
            </div>
          )}

          {/* Draggable Floating Orb */}
          <FloatingPanelOrb />

          {dropNotice && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-slate-900 border border-sky-500/60 text-sky-200 text-xs shadow-xl">
              {dropNotice}
            </div>
          )}
        </div>
      )}

      {showAuthModal && (
        <AuthModal initialTab={authInitialTab} onClose={() => setShowAuthModal(false)} />
      )}
      {showPublishModal && (
        <PublishCircuitModal
          onClose={() => setShowPublishModal(false)}
          onPublished={() => {
            setForumRefreshTrigger((n) => n + 1);
            setActiveView('forum');
          }}
        />
      )}
      {showProjectsModal && (
        <MyProjectsModal
          onClose={() => setShowProjectsModal(false)}
          onOpenAuth={() => {
            setShowProjectsModal(false);
            openAuth('login');
          }}
        />
      )}
      <TruthChipEditorModal />
      <PackageIcModal />
      <PonderHoverOverlay />
      <PonderModal />
    </div>
  );
}

export default App;
