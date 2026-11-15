import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Cable,
  Eye,
  EyeOff,
  MousePointer2,
  RotateCw,
  Trash2,
  Video,
} from 'lucide-react';
import type { ComponentType, PinRef } from '../../shared/types';
import { COMPONENT_CATALOG, WIRE_COLORS } from '../engine/componentCatalog';
import { Workbench3DEngine, type ProjectedLabel } from '../sim3d/Workbench3DEngine';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';

export const Workbench3DView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Workbench3DEngine | null>(null);
  const labelDomMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hoverPin, setHoverPin] = useState<PinRef | null>(null);

  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const selected = useCircuitStore((s) => s.selected);
  const activeTool = useCircuitStore((s) => s.activeTool);
  const wireColor = useCircuitStore((s) => s.wireColor);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const show3DLabels = useCircuitStore((s) => s.show3DLabels);
  const warnings = useCircuitStore((s) => s.warnings);
  const implicitGroundUsed = useCircuitStore((s) => s.implicitGroundUsed);
  const wiringDraftFrom = useCircuitStore((s) => s.wiringDraftFrom);

  const setActiveTool = useCircuitStore((s) => s.setActiveTool);
  const setWireColor = useCircuitStore((s) => s.setWireColor);
  const setShow3DLabels = useCircuitStore((s) => s.setShow3DLabels);
  const rotateComponent = useCircuitStore((s) => s.rotateComponent);
  const removeEntity = useCircuitStore((s) => s.removeEntity);
  const addComponent = useCircuitStore((s) => s.addComponent);
  const setWiringDraftFrom = useCircuitStore((s) => s.setWiringDraftFrom);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    try {
      const engine = new Workbench3DEngine(el, {
        getState: () => {
          const st = useCircuitStore.getState();
          return {
            components: st.components,
            wires: st.wires,
            selected: st.selected,
            activeTool: st.activeTool,
            telemetryById: st.telemetryById,
            wireTelemetryById: st.wireTelemetryById,
            isRunning: st.isRunning,
            simTime: st.simTime,
            wiringDraftFrom: st.wiringDraftFrom,
            show3DLabels: st.show3DLabels,
          };
        },
        onStepSim: (dt) => useCircuitStore.getState().stepSimulation(dt),
        onSelect: (sel) => useCircuitStore.getState().setSelected(sel),
        onDeleteEntity: (kind, id) => useCircuitStore.getState().removeEntity(kind, id),
        onStartDragHistory: () => useCircuitStore.getState().pushUndoSnapshot(),
        onMoveComponent3D: (id, pos) =>
          useCircuitStore.getState().moveComponent3D(id, pos, false),
        onToggleInteractive: (id) =>
          useCircuitStore.getState().toggleInteractiveComponent(id),
        onSetWiringDraft: (pin) => useCircuitStore.getState().setWiringDraftFrom(pin),
        onCompleteWire: (from, to) => useCircuitStore.getState().addWire(from, to),
        onHoverPinChange: (pin) => setHoverPin(pin),
        onHoverComponentChange: (hit) => {
          const ponder = usePonderStore.getState();
          if (!hit) {
            ponder.clearHoverIfSource('3d');
            return;
          }
          const comp = useCircuitStore
            .getState()
            .components.find((c) => c.id === hit.componentId);
          if (!comp) return;
          ponder.setHoveredTarget({
            type: comp.type,
            label: `${COMPONENT_CATALOG[comp.type].name} (${comp.label})`,
            componentId: comp.id,
            source: '3d',
            anchorX: hit.clientX,
            anchorY: hit.clientY,
          });
        },
        onLabelsUpdated: (labels: ProjectedLabel[]) => {
          for (const lbl of labels) {
            const dom = labelDomMap.current.get(lbl.id);
            if (!dom) continue;
            if (!lbl.visible) {
              dom.style.opacity = '0';
            } else {
              dom.style.opacity = '1';
              dom.style.transform = `translate3d(${lbl.x}px, ${lbl.y}px, 0) translate(-50%, -100%)`;
            }
          }
        },
      });
      engineRef.current = engine;
      setWebglError(null);
      return () => {
        engine.dispose();
        engineRef.current = null;
      };
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'WebGL 初始化失败');
    }
  }, []);

  useEffect(() => {
    engineRef.current?.syncSceneFromStore();
  }, [components, wires]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/x-electrolab-component') as ComponentType;
    if (!type || !COMPONENT_CATALOG[type]) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      addComponent(type);
      return;
    }
    // Map drop position roughly to [-8, 8] x [-6, 6]
    const nx = (((e.clientX - rect.left) / rect.width) * 2 - 1) * 7.5;
    const nz = (((e.clientY - rect.top) / rect.height) * 2 - 1) * 5.5;
    addComponent(type, [Number(nx.toFixed(2)), 0, Number(nz.toFixed(2))]);
  };

  const hoveredPinLabel = hoverPin
    ? (() => {
        const c = components.find((x) => x.id === hoverPin.componentId);
        if (!c) return null;
        const p = COMPONENT_CATALOG[c.type]?.pins.find((x) => x.id === hoverPin.pinId);
        return `${c.label} · 引脚 ${p?.label || hoverPin.pinId}`;
      })()
    : null;

  return (
    <div
      className="relative flex-1 h-full overflow-hidden bg-slate-950 select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Three.js Canvas Mount */}
      <div ref={containerRef} className="w-full h-full" />

      {webglError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center z-30">
          <AlertTriangle className="w-10 h-10 text-amber-400 mb-3" />
          <div className="text-sm font-medium text-slate-200 mb-1">3D WebGL 上下文不可用</div>
          <div className="text-xs text-slate-400 max-w-md">{webglError} — 您仍可使用右侧 2D 经典电路图编辑器进行连线与实时仿真。</div>
        </div>
      )}

      {/* Floating 3D HTML Labels */}
      {show3DLabels && !webglError && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {components.map((c) => {
            const tel = telemetryById[c.id];
            const isSel = selected?.kind === 'component' && selected.id === c.id;
            const badgeVal =
              c.type === 'LOGIC_IN' || c.type === 'LOGIC_OUT' || c.type === 'CLOCK'
                ? `${tel?.logicState ?? 0}`
                : c.type === 'HEX_DISPLAY'
                ? `HEX:${(tel?.logicState ?? 0).toString(16).toUpperCase()}`
                : c.type === 'GROUND'
                ? '0V'
                : `${(tel?.voltageDrop ?? 0).toFixed(2)}V · ${
                    Math.abs(tel?.current ?? 0) >= 1
                      ? `${(tel?.current ?? 0).toFixed(2)}A`
                      : `${((tel?.current ?? 0) * 1000).toFixed(1)}mA`
                  }`;

            return (
              <div
                key={c.id}
                ref={(node) => {
                  if (node) labelDomMap.current.set(c.id, node);
                  else labelDomMap.current.delete(c.id);
                }}
                style={{ opacity: 0, left: 0, top: 0 }}
                className={`absolute px-1.5 py-0.5 rounded text-[10px] font-mono whitespace-nowrap border backdrop-blur-sm transition-colors ${
                  tel?.overloaded
                    ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg shadow-red-500/20'
                    : isSel
                    ? 'bg-sky-950/90 border-sky-400 text-sky-100'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-200'
                }`}
              >
                <span className="font-semibold">{c.label}</span>
                <span className="mx-1 text-slate-500">|</span>
                <span className={tel?.overloaded ? 'text-red-300 font-bold' : 'text-emerald-300'}>
                  {badgeVal}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Top-Left 3D Tool HUD */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-md shadow-lg">
          <button
            onClick={() => setActiveTool('select')}
            title="选择 / 3D自由拖拽 (点击开关可切换)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTool === 'select'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            拖拽/选择
          </button>
          <button
            onClick={() => setActiveTool('wire')}
            title="导线连接模式 (直接点击任意引脚也可拉线)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTool === 'wire'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            接线
          </button>
          <button
            onClick={() => setActiveTool('delete')}
            title="点击元件或导线即可删除"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTool === 'delete'
                ? 'bg-red-500 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
        </div>

        {/* Wire Color Picker */}
        <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2 py-1.5 backdrop-blur-md shadow-lg">
          <span className="text-[11px] text-slate-400 mr-0.5">线色:</span>
          {WIRE_COLORS.map((wc) => (
            <button
              key={wc.value}
              title={wc.name}
              onClick={() => setWireColor(wc.value)}
              style={{ backgroundColor: wc.value }}
              className={`w-3.5 h-3.5 rounded-full transition-transform ${
                wireColor === wc.value
                  ? 'ring-2 ring-white scale-110'
                  : 'opacity-70 hover:opacity-100'
              }`}
            />
          ))}
        </div>

        {/* Selected Component Quick Actions */}
        {selected?.kind === 'component' && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-sky-500/40 rounded-lg p-1 backdrop-blur-md">
            <button
              onClick={() => rotateComponent(selected.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-sky-300 hover:bg-slate-800"
              title="顺时针旋转 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              旋转
            </button>
            <button
              onClick={() => removeEntity('component', selected.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-slate-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
              移除
            </button>
          </div>
        )}
        {selected?.kind === 'wire' && (
          <div className="flex items-center gap-1 bg-slate-900/90 border border-sky-500/40 rounded-lg p-1 backdrop-blur-md">
            <button
              onClick={() => removeEntity('wire', selected.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-slate-800"
            >
              <Trash2 className="w-3.5 h-3.5" />
              剪断导线
            </button>
          </div>
        )}
      </div>

      {/* Top-Right Camera Presets & Label Toggle */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <div className="flex items-center bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur-md text-xs">
          <Video className="w-3.5 h-3.5 text-slate-400 mx-1.5" />
          <button
            onClick={() => engineRef.current?.setCameraPreset('iso')}
            className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 hover:text-sky-300"
          >
            立体
          </button>
          <button
            onClick={() => engineRef.current?.setCameraPreset('top')}
            className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 hover:text-sky-300"
          >
            俯视
          </button>
          <button
            onClick={() => engineRef.current?.setCameraPreset('front')}
            className="px-2 py-0.5 rounded text-slate-300 hover:bg-slate-800 hover:text-sky-300"
          >
            正视
          </button>
        </div>

        <button
          onClick={() => setShow3DLabels(!show3DLabels)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs backdrop-blur-md ${
            show3DLabels
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
              : 'bg-slate-900/90 border-slate-700 text-slate-400'
          }`}
        >
          {show3DLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          3D标签
        </button>
      </div>

      {/* Bottom Status / Warnings / Pin Hover Banner */}
      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none z-10">
        <div className="flex flex-col gap-1.5 max-w-lg">
          {warnings.length > 0 && (
            <div className="pointer-events-auto flex items-center gap-2 bg-red-950/90 border border-red-500/70 text-red-200 px-3 py-1.5 rounded-lg text-xs shadow-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{warnings.slice(0, 2).join('；')}</span>
            </div>
          )}
          {implicitGroundUsed && (
            <div className="bg-amber-950/80 border border-amber-500/50 text-amber-200 px-2.5 py-1 rounded text-[11px]">
              提示：当前模拟回路未显式连接 GND 元件，系统已自动将电源负极设为 0V 参考地。
            </div>
          )}
          {wiringDraftFrom && (
            <div className="pointer-events-auto flex items-center gap-2 bg-emerald-950/90 border border-emerald-500/70 text-emerald-200 px-3 py-1.5 rounded-lg text-xs">
              <span>正在拉线中：请点击目标引脚完成连接（右键或 ESC 取消）</span>
              <button
                onClick={() => setWiringDraftFrom(null)}
                className="underline text-emerald-300"
              >
                取消
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900/85 border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] text-slate-300 backdrop-blur-sm">
          {hoveredPinLabel
            ? `🎯 ${hoveredPinLabel}（点击或拖拽至另一引脚连线）`
            : '左键拖拽元件/引脚 · 右键旋转视角 · 滚轮缩放 · 点击开关切换'}
        </div>
      </div>
    </div>
  );
};
