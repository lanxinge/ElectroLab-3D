import React, { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { ComponentCategory, ComponentType } from '../../shared/types';
import { CATEGORY_LABELS, COMPONENT_CATALOG } from '../engine/componentCatalog';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';

const CATEGORY_ORDER: ComponentCategory[] = [
  'power',
  'passive',
  'semiconductor',
  'instrument',
  'digital',
];

const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  power: 'text-red-400 border-red-500/30',
  passive: 'text-sky-400 border-sky-500/30',
  semiconductor: 'text-amber-400 border-amber-500/30',
  instrument: 'text-emerald-400 border-emerald-500/30',
  digital: 'text-purple-400 border-purple-500/30',
};

export const ComponentPalette: React.FC = () => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<ComponentCategory | 'all'>('all');
  const addComponent = useCircuitStore((s) => s.addComponent);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Object.values(COMPONENT_CATALOG).filter((spec) => {
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
    <aside className="w-60 shrink-0 h-full flex flex-col bg-slate-900/95 border-r border-slate-800 select-none">
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
      </div>
    </aside>
  );
};
