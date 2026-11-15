import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  FolderOpen,
  FolderUp,
  GraduationCap,
  LayoutGrid,
  LogIn,
  LogOut,
  MessageSquareText,
  PackagePlus,
  Pause,
  Play,
  RotateCcw,
  Send,
  Trash2,
  Undo2,
  User,
} from 'lucide-react';
import { CIRCUIT_PRESETS } from '../presets/circuitPresets';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore, type SidebarMode } from '../store/useCircuitStore';
import { useTutorialStore } from '../store/useTutorialStore';
import { useUIStore } from '../store/useUIStore';
import { getLessonById } from '../tutorial/curriculumIndex';
import { downloadProjectFile, parseProjectFile } from '../utils/projectFileIO';

const TutorialHeaderStatus: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const currentLessonId = useTutorialStore((s) => s.currentLessonId);
  const currentStageIndex = useTutorialStore((s) => s.currentStageIndex);
  const lesson = getLessonById(currentLessonId);
  const stage = lesson.stages[currentStageIndex] ?? lesson.stages[0];

  return (
    <div className="hidden md:flex items-center gap-2 text-xs min-w-0">
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 min-w-0">
        <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate max-w-[300px]">
          第{lesson.lessonNumber}课 · {lesson.title} ({stage?.badge ?? `Step ${currentStageIndex + 1}`})
        </span>
      </div>
      <button
        type="button"
        data-testid="exit-tutorial-btn"
        onClick={onExit}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
        返回自由仿真台
      </button>
    </div>
  );
};

export const HeaderBar: React.FC<{
  activeView: 'home' | 'simulator' | 'tutorial' | 'forum';
  onChangeView: (v: 'home' | 'simulator' | 'tutorial' | 'forum') => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenPublish: () => void;
  onOpenProjects: () => void;
}> = ({ activeView, onChangeView, onOpenAuth, onOpenPublish, onOpenProjects }) => {
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [panelMenuOpen, setPanelMenuOpen] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const projectTitle = useCircuitStore((s) => s.projectTitle);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const isRunning = useCircuitStore((s) => s.isRunning);
  const simTime = useCircuitStore((s) => s.simTime);
  const sidebarMode = useCircuitStore((s) => s.sidebarMode);
  const historyPast = useCircuitStore((s) => s.historyPast);

  const toggleRunning = useCircuitStore((s) => s.toggleRunning);
  const resetSimulationTime = useCircuitStore((s) => s.resetSimulationTime);
  const undo = useCircuitStore((s) => s.undo);
  const clearWorkbench = useCircuitStore((s) => s.clearWorkbench);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const setSidebarMode = useCircuitStore((s) => s.setSidebarMode);

  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);
  const paletteOpen = useUIStore((s) => s.paletteOpen);
  const togglePalette = useUIStore((s) => s.togglePalette);
  const inspectorOpen = useUIStore((s) => s.inspectorOpen);
  const toggleInspector = useUIStore((s) => s.toggleInspector);
  const schematicOpen = useUIStore((s) => s.schematicOpen);
  const toggleSchematic = useUIStore((s) => s.toggleSchematic);
  const analysisOpen = useUIStore((s) => s.analysisOpen);
  const toggleAnalysis = useUIStore((s) => s.toggleAnalysis);
  const collapseAllPanels = useUIStore((s) => s.collapseAllPanels);
  const setPackageIcModalOpen = useUIStore((s) => s.setPackageIcModalOpen);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const showTempNotice = (msg: string) => {
    setFileNotice(msg);
    setTimeout(() => setFileNotice(null), 3200);
  };

  const handleSaveLocalFile = () => {
    const saved = downloadProjectFile(projectTitle, { components, wires });
    showTempNotice(`已导出 ${saved.projectTitle}.elab.json`);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseProjectFile(text);
      loadCircuit(parsed.circuit, parsed.title, null);
      if (activeView !== 'simulator') onChangeView('simulator');
      showTempNotice(`已载入工程: ${parsed.title}`);
    } catch (err) {
      showTempNotice(err instanceof Error ? err.message : '读取本地工程文件失败');
    }
  };

  return (
    <header className="h-12 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 whitespace-nowrap">
      {/* Brand + Primary Navigation */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onChangeView('home')}
          title="返回平台首页"
          className="flex items-center gap-2 shrink-0 text-left rounded-lg hover:bg-slate-800/70 pr-1.5 py-0.5 transition"
        >
          <img src="/brand/electrolab-icon.webp" alt="ElectroLab 3D" width={32} height={32} className="w-8 h-8 shrink-0" />
          <div className="hidden 2xl:block leading-tight">
            <div className="text-xs font-bold text-slate-100 tracking-tight">ElectroLab 3D</div>
            <div className="text-[10px] text-sky-400">本科电工学全栈仿真台</div>
          </div>
        </button>

        <nav className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs shrink-0">
          <button
            data-testid="nav-home-btn"
            onClick={() => onChangeView('home')}
            className={`px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
              activeView === 'home'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            首页
          </button>
          <button
            data-testid="nav-simulator-btn"
            onClick={() => onChangeView('simulator')}
            className={`px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
              activeView === 'simulator'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            3D/2D 工作场
          </button>
          <button
            data-testid="nav-tutorial-btn"
            onClick={() => onChangeView('tutorial')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
              activeView === 'tutorial'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-amber-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            教学模式
          </button>
          <button
            data-testid="nav-forum-btn"
            onClick={() => onChangeView('forum')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
              activeView === 'forum'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <MessageSquareText className="w-3.5 h-3.5" />
            交流论坛
          </button>
        </nav>

        {activeView === 'simulator' && (
          <span className="hidden 2xl:inline-block text-xs text-slate-400 truncate max-w-[180px]">
            {projectTitle}
          </span>
        )}
      </div>

      {/* Simulator Transport & Tools */}
      {activeView === 'simulator' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={toggleRunning}
              className={`flex items-center gap-1 px-2 py-1 rounded-md font-medium transition whitespace-nowrap ${
                isRunning
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? '运行中' : '已暂停'}
            </button>
            <span
              data-testid="sim-time-readout"
              className="px-1.5 font-mono text-[11px] text-slate-400 inline"
            >
              t={simTime.toFixed(1)}s
            </span>
            <button
              onClick={resetSimulationTime}
              title="重置暂态仿真时间"
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Presets Menu */}
          <div className="relative">
            <button
              onClick={() => setPresetsOpen((o) => !o)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 border border-slate-700 whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden 2xl:inline">经典实验</span>范例
            </button>
            {presetsOpen && (
              <div
                onMouseLeave={() => setPresetsOpen(false)}
                className="absolute right-0 mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1"
              >
                {CIRCUIT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      loadCircuit(p.circuit, p.title, p.id);
                      setPresetsOpen(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-100">{p.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 shrink-0 ml-1">
                        {p.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{p.summary}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={undo}
            disabled={historyPast.length === 0}
            title="撤销上一步"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearWorkbench}
            title="清空工作台"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-300 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Layout switcher */}
          {layoutMode === 'split' && (
            <div className="hidden lg:flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {(
                [
                  ['split', '3D+2D分屏'],
                  ['3d-only', '纯3D'],
                  ['2d-only', '纯2D'],
                ] as Array<[SidebarMode, string]>
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setSidebarMode(m)}
                  className={`px-2 py-0.5 rounded ${
                    sidebarMode === m ? 'bg-slate-800 text-sky-300 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Panel Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              data-testid="panel-menu-btn"
              onClick={() => setPanelMenuOpen((o) => !o)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 border border-slate-700 whitespace-nowrap"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              <span>面板菜单</span>
            </button>
            {panelMenuOpen && (
              <div
                data-testid="panel-menu-dropdown"
                onMouseLeave={() => setPanelMenuOpen(false)}
                className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 space-y-1.5 text-xs"
              >
                <div className="text-[10px] font-semibold text-slate-400 px-1.5">信息面板显隐</div>
                {[
                  { label: '元件库面板', open: paletteOpen, toggle: togglePalette, testid: 'menu-toggle-palette' },
                  { label: '属性与实时探针', open: inspectorOpen, toggle: toggleInspector, testid: 'menu-toggle-inspector' },
                  { label: '2D 经典电路图', open: schematicOpen, toggle: toggleSchematic, testid: 'menu-toggle-schematic' },
                  { label: '示波器 / 真值表 / 卡诺图', open: analysisOpen, toggle: toggleAnalysis, testid: 'menu-toggle-analysis' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    data-testid={item.testid}
                    onClick={item.toggle}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition"
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        item.open ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {item.open ? '已开' : '收起'}
                    </span>
                  </button>
                ))}
                <div className="border-t border-slate-800 pt-1.5 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 px-1.5">工作台排布模式</div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      data-testid="menu-mode-floating"
                      onClick={() => {
                        setLayoutMode('floating');
                        setPanelMenuOpen(false);
                      }}
                      className={`flex items-center justify-center gap-1 py-1 rounded border text-[11px] ${
                        layoutMode === 'floating'
                          ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {layoutMode === 'floating' && <Check className="w-3 h-3" />}
                      悬浮小球
                    </button>
                    <button
                      type="button"
                      data-testid="menu-mode-split"
                      onClick={() => {
                        setLayoutMode('split');
                        setPanelMenuOpen(false);
                      }}
                      className={`flex items-center justify-center gap-1 py-1 rounded border text-[11px] ${
                        layoutMode === 'split'
                          ? 'bg-sky-500/20 border-sky-400/60 text-sky-200 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {layoutMode === 'split' && <Check className="w-3 h-3" />}
                      经典分栏
                    </button>
                  </div>
                  {layoutMode === 'floating' && (
                    <button
                      type="button"
                      onClick={() => {
                        collapseAllPanels();
                        setPanelMenuOpen(false);
                      }}
                      className="w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                    >
                      一键收起所有面板
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Local Save / Load & Package IC */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.elab.json"
            data-testid="load-local-file-input"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            data-testid="save-local-file-btn"
            onClick={handleSaveLocalFile}
            title="导出本地电路工程文件 (.elab.json)"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden 2xl:inline">导出</span>
          </button>
          <button
            type="button"
            data-testid="load-local-file-btn"
            onClick={() => fileInputRef.current?.click()}
            title="导入本地电路工程文件 (.elab.json / .json)"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs"
          >
            <FolderUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden 2xl:inline">导入</span>
          </button>
          <button
            type="button"
            data-testid="header-package-ic-btn"
            onClick={() => setPackageIcModalOpen(true)}
            title="打包当前电路为可云端复用的集成电路芯片"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-fuchsia-600/25 hover:bg-fuchsia-600/40 text-fuchsia-200 border border-fuchsia-500/40 text-xs"
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">打包IC</span>
          </button>
        </div>
      )}

      {/* Tutorial Middle Breadcrumb */}
      {activeView === 'tutorial' && <TutorialHeaderStatus onExit={() => onChangeView('simulator')} />}

      {fileNotice && (
        <div
          data-testid="header-file-notice"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-lg bg-slate-900 border border-sky-500/60 text-sky-200 text-xs shadow-xl"
        >
          {fileNotice}
        </div>
      )}

      {/* Right User / Save / Publish */}
      <div className="flex items-center gap-1.5 shrink-0 text-xs">
        <button
          onClick={onOpenProjects}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        >
          <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">项目库</span>
        </button>

        <button
          onClick={() => (user ? onOpenPublish() : onOpenAuth())}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden md:inline">发表作品</span>
        </button>

        {user ? (
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <div className="flex items-center gap-1 text-slate-200 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span className="max-w-[95px] truncate">{user.displayName}</span>
            </div>
            <button
              onClick={logout}
              title="退出登录"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-300 hover:bg-slate-800"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              data-testid="header-login-btn"
              onClick={() => onOpenAuth('login')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium whitespace-nowrap transition"
            >
              <LogIn className="w-3.5 h-3.5 text-sky-400" />
              登录
            </button>
            <button
              data-testid="header-register-btn"
              onClick={() => onOpenAuth('register')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold whitespace-nowrap transition"
            >
              学生注册
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
