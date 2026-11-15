import React, { useState } from 'react';
import {
  BookOpen,
  Cpu,
  FolderOpen,
  LogIn,
  LogOut,
  MessageSquareText,
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

export const HeaderBar: React.FC<{
  activeView: 'simulator' | 'forum';
  onChangeView: (v: 'simulator' | 'forum') => void;
  onOpenAuth: () => void;
  onOpenPublish: () => void;
  onOpenProjects: () => void;
}> = ({ activeView, onChangeView, onOpenAuth, onOpenPublish, onOpenProjects }) => {
  const [presetsOpen, setPresetsOpen] = useState(false);

  const projectTitle = useCircuitStore((s) => s.projectTitle);
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

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-12 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 whitespace-nowrap">
      {/* Brand + Primary Navigation */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xs shadow">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="hidden 2xl:block leading-tight">
            <div className="text-xs font-bold text-slate-100 tracking-tight">ElectroLab 3D</div>
            <div className="text-[10px] text-sky-400">本科电工学全栈仿真台</div>
          </div>
        </div>

        <nav className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => onChangeView('simulator')}
            className={`px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
              activeView === 'simulator'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            3D/2D 仿真台
          </button>
          <button
            onClick={() => onChangeView('forum')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition whitespace-nowrap ${
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
            <span className="px-1.5 font-mono text-[11px] text-slate-400 hidden xl:inline">
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-100 border border-slate-700 whitespace-nowrap"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              经典实验范例
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
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            <LogIn className="w-3.5 h-3.5" />
            登录 / 注册
          </button>
        )}
      </div>
    </header>
  );
};
