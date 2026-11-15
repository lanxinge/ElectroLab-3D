import React, { useMemo, useState } from 'react';
import { Cpu, PackagePlus, Plus, Search, Trash2 } from 'lucide-react';
import type { ComponentCategory, ComponentType } from '../../shared/types';
import { CATEGORY_LABELS, COMPONENT_CATALOG } from '../engine/componentCatalog';
import { useCircuitStore } from '../store/useCircuitStore';
import { useCustomIcStore } from '../store/useCustomIcStore';
import { usePonderStore } from '../store/usePonderStore';
import { useUIStore } from '../store/useUIStore';

const CATEGORY_ORDER: ComponentCategory[] = [
  'power',
  'passive',
  'semiconductor',
  'instrument',
  'digital',
  'custom',
];

const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  power: 'text-red-400 border-red-500/30',
  passive: 'text-sky-400 border-sky-500/30',
  semiconductor: 'text-amber-400 border-amber-500/30',
  instrument: 'text-emerald-400 border-emerald-500/30',
  digital: 'text-purple-400 border-purple-500/30',
  custom: 'text-fuchsia-400 border-fuchsia-500/30',
};

export const ComponentPalette: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<ComponentCategory | 'all'>('all');
  const addComponent = useCircuitStore((s) => s.addComponent);
  const spawnCustomIc = useCircuitStore((s) => s.spawnCustomIc);
  const cloudIcs = useCustomIcStore((s) => s.cloudIcs);
  const sessionIcs = useCustomIcStore((s) => s.sessionIcs);
  const deleteCloudIc = useCustomIcStore((s) => s.deleteCloudIc);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Object.values(COMPONENT_CATALOG).filter((spec) => {
      // Blank CUSTOM_IC without payload is spawned from packaged Cloud/Session ICs below
      if (spec.type === 'CUSTOM_IC') return false;
      if (activeCat !== 'all' && spec.category !== activeCat) return false;
      if (!q) return true;
      return (
        spec.name.toLowerCase().includes(q) ||
        spec.shortName.toLowerCase().includes(q) ||
        spec.type.toLowerCase().includes(q) ||
        spec.description.toLowerCase().includes(q)
      );
    });
    const map = new Map<ComponentCategory, typeof list>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of list) map.get(item.category)!.push(item);
    return map;
  }, [query, activeCat]);

  const handleDragStart = (e: React.DragEvent, type: ComponentType) => {
    e.dataTransfer.setData('application/x-electrolab-component', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside className={`w-60 shrink-0 h-full flex flex-col bg-slate-900/95 border-r border-slate-800 select-none ${className}`}>
      <div className="p-2.5 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-200 mb-2 flex items-center justify-between">
          <span>元件库 (点击/拖入3D台)</span>
          <span className="text-[10px] text-slate-500">{Object.keys(COMPONENT_CATALOG).length} 类</span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索电阻、运放、全加器..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-md pl-8 pr-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <button
            onClick={() => setActiveCat('all')}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              activeCat === 'all'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            全部
          </button>
          {CATEGORY_ORDER.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeCat === cat
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {CATEGORY_LABELS[cat].slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const items = grouped.get(cat) || [];
          if (items.length === 0) return null;
          return (
            <div key={cat}>
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 border-l-2 ${CATEGORY_COLORS[cat]}`}
              >
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {items.map((spec) => (
                  <button
                    key={spec.type}
                    data-testid={`palette-item-${spec.type}`}
                    draggable
                    onDragStart={(e) => {
                      usePonderStore.getState().clearHoverIfSource('palette');
                      handleDragStart(e, spec.type);
                    }}
                    onMouseDown={() => usePonderStore.getState().clearHoverIfSource('palette')}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      usePonderStore.getState().setHoveredTarget({
                        type: spec.type,
                        label: spec.name,
                        source: 'palette',
                        anchorX: rect.right + 4,
                        anchorY: rect.top,
                      });
                    }}
                    onMouseLeave={() => usePonderStore.getState().clearHoverIfSource('palette')}
                    onClick={() => addComponent(spec.type)}
                    title={spec.description}
                    className="group flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-sky-500/50 transition"
                  >
                    <div className="min-w-0 pr-1">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {spec.name}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {spec.pins.length} 引脚 · {spec.shortName}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {(activeCat === 'all' || activeCat === 'custom') && (
          <div data-testid="palette-cloud-ics-section">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 px-1 border-l-2 text-fuchsia-400 border-fuchsia-500/30 flex items-center justify-between">
              <span>云端 / 自封装集成芯片</span>
              <span className="text-[9px] text-slate-500">{cloudIcs.length + sessionIcs.length} 颗</span>
            </div>
            <button
              type="button"
              data-testid="palette-package-ic-btn"
              onClick={() => useUIStore.getState().setPackageIcModalOpen(true)}
              className="w-full mb-1.5 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/40 text-fuchsia-200 text-[11px] font-medium transition"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              打包当前电路为 IC
            </button>

            <div className="grid grid-cols-1 gap-1">
              {cloudIcs.map((item) => (
                <div
                  key={`cloud-${item.id}`}
                  data-testid={`cloud-ic-item-${item.id}`}
                  className="group flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 hover:border-fuchsia-500/50 transition"
                >
                  <button
                    type="button"
                    onClick={() => spawnCustomIc(item.icPayload)}
                    className="flex-1 min-w-0 text-left flex items-center gap-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{item.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        云端 · {item.codeName} · {item.icPayload.pins.length} 引脚
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCloudIc(item.id)}
                    title="从云端删除该芯片"
                    className="p-1 text-slate-500 hover:text-red-400 opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {sessionIcs.map((ic, idx) => (
                <button
                  key={`sess-${ic.name}-${idx}`}
                  type="button"
                  onClick={() => spawnCustomIc(ic)}
                  className="flex items-center justify-between w-full text-left px-2 py-1.5 rounded-md bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-sky-500/50 transition"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Cpu className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">{ic.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        本地会话 · {ic.pins.length} 引脚
                      </div>
                    </div>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
