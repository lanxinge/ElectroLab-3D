import React, { useRef, useState } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  Minimize2,
  PackagePlus,
  Sliders,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react';
import { useCircuitStore } from '../store/useCircuitStore';
import { useUIStore } from '../store/useUIStore';

export const FloatingPanelOrb: React.FC = () => {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const orbExpanded = useUIStore((s) => s.orbExpanded);
  const toggleOrbExpanded = useUIStore((s) => s.toggleOrbExpanded);
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

  const selected = useCircuitStore((s) => s.selected);
  const warnings = useCircuitStore((s) => s.warnings);

  const [pos, setPos] = useState<{ right: number; bottom: number }>({ right: 20, bottom: 20 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origRight: number;
    origBottom: number;
    moved: boolean;
  } | null>(null);

  if (layoutMode === 'split') return null;

  const activeCount = [paletteOpen, inspectorOpen, schematicOpen, analysisOpen].filter(Boolean).length;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origRight: pos.right,
      origBottom: pos.bottom,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.hypot(dx, dy) >= 6) {
      d.moved = true;
    }
    if (!d.moved) return;
    const maxRight = Math.max(20, window.innerWidth - 76);
    const maxBottom = Math.max(20, window.innerHeight - 120);
    setPos({
      right: Math.min(maxRight, Math.max(12, d.origRight - dx)),
      bottom: Math.min(maxBottom, Math.max(12, d.origBottom - dy)),
    });
  };

  const handlePointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !d.moved) {
      toggleOrbExpanded();
    }
  };

  const orbOpenSideLeft = pos.right < 260;

  return (
    <div
      style={{ right: `${pos.right}px`, bottom: `${pos.bottom}px` }}
      className="fixed z-40 select-none"
    >
      {/* Expanded floating dock menu */}
      {orbExpanded && (
        <div
          data-testid="floating-orb-menu"
          className={`absolute bottom-16 ${
            orbOpenSideLeft ? 'right-0' : 'left-0'
          } w-60 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-2.5 space-y-1.5 text-xs`}
        >
          <div className="flex items-center justify-between px-1.5 pb-1 border-b border-slate-800">
            <span className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 工作台悬浮面板
            </span>
            <button
              type="button"
              onClick={toggleOrbExpanded}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            data-testid="orb-toggle-palette"
            onClick={togglePalette}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition ${
              paletteOpen
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              元件库面板
            </span>
            <span className="text-[10px] font-mono">{paletteOpen ? '已展开' : '已收起'}</span>
          </button>

          <button
            type="button"
            data-testid="orb-toggle-inspector"
            onClick={toggleInspector}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition ${
              inspectorOpen
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              属性与实时探针
            </span>
            <span className="text-[10px] font-mono">
              {inspectorOpen ? '已展开' : selected ? '有选中' : '已收起'}
            </span>
          </button>

          <button
            type="button"
            data-testid="orb-toggle-schematic"
            onClick={toggleSchematic}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition ${
              schematicOpen
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Workflow className="w-3.5 h-3.5 text-cyan-400" />
              2D 经典电路图
            </span>
            <span className="text-[10px] font-mono">{schematicOpen ? '已展开' : '已收起'}</span>
          </button>

          <button
            type="button"
            data-testid="orb-toggle-analysis"
            onClick={toggleAnalysis}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg border transition ${
              analysisOpen
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              示波器 / 真值表 / 卡诺图
            </span>
            <span className="text-[10px] font-mono">
              {analysisOpen ? '已展开' : warnings.length > 0 ? `${warnings.length} 警报` : '已收起'}
            </span>
          </button>

          <div className="pt-1 border-t border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              data-testid="orb-open-package-ic"
              onClick={() => {
                setPackageIcModalOpen(true);
                toggleOrbExpanded();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-fuchsia-600/25 hover:bg-fuchsia-600/35 border border-fuchsia-500/40 text-fuchsia-200 text-[11px]"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              封装云端 IC
            </button>
            <button
              type="button"
              data-testid="orb-collapse-all"
              onClick={collapseAllPanels}
              title="全部收起还我纯净 3D 画布"
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              全收
            </button>
          </div>
        </div>
      )}

      {/* Draggable Floating Orb trigger */}
      <button
        type="button"
        data-testid="floating-panel-orb"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        title="点击展开/收起信息面板菜单 · 可自由拖拽位置"
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-transform active:scale-95 cursor-grab active:cursor-grabbing ${
          orbExpanded
            ? 'bg-gradient-to-br from-sky-500 to-indigo-600 border-sky-300 text-white shadow-sky-500/40'
            : 'bg-slate-900/90 hover:bg-slate-800 backdrop-blur-xl border-sky-500/50 text-sky-300 shadow-sky-900/50'
        }`}
      >
        <Cpu className="w-6 h-6" />
        {(activeCount > 0 || warnings.length > 0) && (
          <span
            className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center border border-slate-950 ${
              warnings.length > 0
                ? 'bg-amber-500 text-slate-950'
                : 'bg-emerald-500 text-slate-950'
            }`}
          >
            {warnings.length > 0 ? warnings.length : activeCount}
          </span>
        )}
      </button>
    </div>
  );
};
