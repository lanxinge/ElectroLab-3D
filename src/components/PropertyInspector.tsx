import React from 'react';
import { Activity, AlertTriangle, Cpu, Flame, PackagePlus, RotateCw, SlidersHorizontal, Sparkles, Trash2, Zap } from 'lucide-react';
import { COMPONENT_CATALOG, formatEngineeringValue } from '../engine/componentCatalog';
import { parseCustomIcPayload, parseTruthChipConfig } from '../engine/customIcEngine';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';
import { useUIStore } from '../store/useUIStore';

export const PropertyInspector: React.FC<{ compact?: boolean }> = ({ compact = true }) => {
  const selected = useCircuitStore((s) => s.selected);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const wireTelemetryById = useCircuitStore((s) => s.wireTelemetryById);
  const oscilloscopeChannels = useCircuitStore((s) => s.oscilloscopeChannels);

  const updateComponentLabel = useCircuitStore((s) => s.updateComponentLabel);
  const updateComponentProp = useCircuitStore((s) => s.updateComponentProp);
  const rotateComponent = useCircuitStore((s) => s.rotateComponent);
  const removeEntity = useCircuitStore((s) => s.removeEntity);
  const toggleInteractiveComponent = useCircuitStore((s) => s.toggleInteractiveComponent);
  const toggleOscilloscopeChannel = useCircuitStore((s) => s.toggleOscilloscopeChannel);

  if (!selected) {
    return (
      <div className={`p-3 border-b border-slate-800 bg-slate-900/70 text-xs text-slate-400 overflow-y-auto ${compact ? '' : 'h-full'}`}>
        <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          属性与实时电参量探针
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500">
          点击 3D 或 2D 画布中的任意元件或导线，即可实时调节阻值、电容、电源波形，并查看实时电压、电流、功耗负载率。
        </p>
      </div>
    );
  }

  if (selected.kind === 'wire') {
    const wire = wires.find((w) => w.id === selected.id);
    if (!wire) return null;
    const wt = wireTelemetryById[wire.id];
    const fc = components.find((c) => c.id === wire.from.componentId);
    const tc = components.find((c) => c.id === wire.to.componentId);

    return (
      <div className={`p-3 border-b border-slate-800 bg-slate-900/80 text-xs space-y-2.5 overflow-y-auto ${compact ? '' : 'h-full'}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sky-300">导线连接详情</span>
          <button
            onClick={() => removeEntity('wire', wire.id)}
            className="flex items-center gap-1 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            剪断
          </button>
        </div>
        <div className="bg-slate-950 rounded p-2 border border-slate-800 font-mono text-[11px] space-y-1">
          <div>
            端点: {fc?.label}.{wire.from.pinId} ➔ {tc?.label}.{wire.to.pinId}
          </div>
          <div>节点电位: {(wt?.voltage ?? 0).toFixed(3)} V</div>
          <div>
            支路电流:{' '}
            <span className="text-emerald-400">
              {Math.abs(wt?.current ?? 0) >= 1
                ? `${(wt?.current ?? 0).toFixed(3)} A`
                : `${((wt?.current ?? 0) * 1000).toFixed(2)} mA`}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const comp = components.find((c) => c.id === selected.id);
  if (!comp) return null;
  const spec = COMPONENT_CATALOG[comp.type];
  const tel = telemetryById[comp.id];
  const loadPct = Math.min(200, Math.round((tel?.loadRatio ?? 0) * 100));
  const isScoped = oscilloscopeChannels.includes(comp.id);

  return (
    <div className={`p-3 border-b border-slate-800 bg-slate-900/85 text-xs space-y-2.5 overflow-y-auto ${compact ? 'max-h-[340px]' : 'h-full'}`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-semibold text-slate-100">{spec.name}</div>
          <div className="text-[10px] text-slate-400">{spec.description}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            data-testid="inspector-ponder-btn"
            onClick={() => usePonderStore.getState().openPonder(comp.type, comp.id)}
            title="开启 Create 风格 3D 思索原理演示 (W)"
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-[11px] font-medium transition"
          >
            <Sparkles className="w-3 h-3" />
            思索
          </button>
          <button
            onClick={() => rotateComponent(comp.id)}
            title="旋转 90°"
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => removeEntity('component', comp.id)}
            title="删除元件"
            className="p-1.5 rounded bg-slate-800 hover:bg-red-900/60 text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Label + Scope Channel Toggle */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-400 shrink-0">位号:</label>
        <input
          type="text"
          value={comp.label}
          onChange={(e) => updateComponentLabel(comp.id, e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-100"
        />
        <button
          onClick={() => toggleOscilloscopeChannel(comp.id)}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-[11px] ${
            isScoped
              ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3 h-3" />
          {isScoped ? '已接入示波器' : '接入示波器'}
        </button>
      </div>

      {/* Parameter Editors */}
      <div className="space-y-2 bg-slate-950/70 p-2 rounded border border-slate-800">
        {comp.type === 'DC_SOURCE' && (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-slate-400">直流电压 (V)</span>
              <span className="font-mono text-sky-300">{Number(comp.props.voltage ?? 5)} V</span>
            </div>
            <input
              type="range"
              min={0}
              max={24}
              step={0.5}
              value={Number(comp.props.voltage ?? 5)}
              onChange={(e) => updateComponentProp(comp.id, 'voltage', Number(e.target.value))}
              className="w-full accent-sky-400"
            />
          </div>
        )}

        {comp.type === 'AC_SOURCE' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px]">波形:</span>
              <select
                value={String(comp.props.waveform ?? 'sine')}
                onChange={(e) => updateComponentProp(comp.id, 'waveform', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs"
              >
                <option value="sine">正弦波 (Sine)</option>
                <option value="square">方波 (Square)</option>
              </select>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-[11px]">
              <label>
                <span className="text-slate-400 block">幅值(V)</span>
                <input
                  type="number"
                  step={0.5}
                  value={Number(comp.props.amplitude ?? 5)}
                  onChange={(e) => updateComponentProp(comp.id, 'amplitude', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
                />
              </label>
              <label>
                <span className="text-slate-400 block">频率(Hz)</span>
                <input
                  type="number"
                  step={0.5}
                  min={0.1}
                  value={Number(comp.props.frequency ?? 2)}
                  onChange={(e) => updateComponentProp(comp.id, 'frequency', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
                />
              </label>
              <label>
                <span className="text-slate-400 block">初相(°)</span>
                <input
                  type="number"
                  min={-180}
                  max={180}
                  step={15}
                  value={Number(comp.props.phase ?? 0)}
                  onChange={(e) => updateComponentProp(comp.id, 'phase', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
                />
              </label>
              <label>
                <span className="text-slate-400 block">偏置(V)</span>
                <input
                  type="number"
                  step={0.5}
                  value={Number(comp.props.dcOffset ?? 0)}
                  onChange={(e) => updateComponentProp(comp.id, 'dcOffset', Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
                />
              </label>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-slate-400">三相快捷角:</span>
              {[0, -120, 120].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => updateComponentProp(comp.id, 'phase', deg)}
                  className={`px-1.5 py-0.5 rounded border font-mono ${
                    Number(comp.props.phase ?? 0) === deg
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {deg > 0 ? `+${deg}°` : `${deg}°`}
                </button>
              ))}
            </div>
          </div>
        )}

        {(comp.type === 'VOLTMETER' || comp.type === 'AMMETER') && (
          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-400">测量挡位:</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => updateComponentProp(comp.id, 'mode', 'dc')}
                className={`py-1 rounded border font-medium transition ${
                  comp.props.mode !== 'rms'
                    ? 'bg-sky-500/20 border-sky-400/70 text-sky-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                直流 / 瞬时挡 (DC)
              </button>
              <button
                type="button"
                onClick={() => updateComponentProp(comp.id, 'mode', 'rms')}
                className={`py-1 rounded border font-medium transition ${
                  comp.props.mode === 'rms'
                    ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                交流有效值挡 (AC~)
              </button>
            </div>
          </div>
        )}

        {comp.type === 'CURRENT_SOURCE' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">恒定电流 (mA):</span>
            <input
              type="number"
              step={1}
              value={Number(comp.props.current ?? 0.02) * 1000}
              onChange={(e) =>
                updateComponentProp(comp.id, 'current', Number(e.target.value) / 1000)
              }
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono"
            />
          </label>
        )}

        {(comp.type === 'RESISTOR' || comp.type === 'POTENTIOMETER') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">标称阻值 (Ω):</span>
              <input
                type="number"
                min={1}
                step={10}
                value={Number(comp.props.resistance ?? 220)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'resistance', Math.max(1, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </div>
            {comp.type === 'POTENTIOMETER' && (
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">滑臂位置 (A→W)</span>
                  <span className="font-mono text-sky-300">
                    {Math.round(Number(comp.props.ratio ?? 0.5) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  value={Number(comp.props.ratio ?? 0.5)}
                  onChange={(e) => updateComponentProp(comp.id, 'ratio', Number(e.target.value))}
                  className="w-full accent-sky-400"
                />
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">额定功率 (W):</span>
              <input
                type="number"
                min={0.1}
                step={0.25}
                value={Number(comp.props.maxPower ?? spec.maxPower)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'maxPower', Math.max(0.05, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </div>
          </div>
        )}

        {comp.type === 'CAPACITOR' && (
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">电容量 (µF):</span>
              <input
                type="number"
                min={1}
                step={10}
                value={Number(comp.props.capacitance ?? 100)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'capacitance', Math.max(0.1, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </label>
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">额定耐压 (V):</span>
              <input
                type="number"
                min={5}
                step={25}
                value={Number(comp.props.maxVoltage ?? 450)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'maxVoltage', Math.max(1, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </label>
          </div>
        )}

        {comp.type === 'INDUCTOR' && (
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">电感量 (mH):</span>
              <input
                type="number"
                min={1}
                step={10}
                value={Number(comp.props.inductance ?? 100)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'inductance', Math.max(0.1, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </label>
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">额定载流 (A):</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={Number(comp.props.maxCurrent ?? 8)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'maxCurrent', Math.max(0.1, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </label>
          </div>
        )}

        {(comp.type === 'SWITCH_SPST' || comp.type === 'SWITCH_SPDT' || comp.type === 'LOGIC_IN' || comp.type === 'IC_PORT_IN') && (
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => toggleInteractiveComponent(comp.id)}
              className="w-full py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition"
            >
              {comp.type === 'SWITCH_SPST'
                ? Boolean(comp.props.closed ?? true)
                  ? '当前: 闭合 (点击断开)'
                  : '当前: 断开 (点击闭合)'
                : comp.type === 'SWITCH_SPDT'
                ? `当前接通: ${Number(comp.props.position ?? 0) === 0 ? 'A (NC)' : 'B (NO)'} (点击切换)`
                : `逻辑电平: ${Number(comp.props.state ?? 0) ? '1 (5V)' : '0 (0V)'} (点击翻转)`}
            </button>
          </div>
        )}

        {(comp.type === 'IC_PORT_IN' || comp.type === 'IC_PORT_OUT') && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">封装引脚名:</span>
            <input
              type="text"
              maxLength={8}
              value={String(comp.props.portName ?? comp.label)}
              onChange={(e) => updateComponentProp(comp.id, 'portName', e.target.value.trim() || comp.label)}
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-center"
            />
          </label>
        )}

        {comp.type === 'INF_SOURCE' && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">输出模式:</span>
              <select
                value={String(comp.props.waveform ?? 'dc')}
                onChange={(e) => updateComponentProp(comp.id, 'waveform', e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs"
              >
                <option value="dc">无限恒压直流 (DC)</option>
                <option value="sine">无限交流正弦 (Sine)</option>
                <option value="square">无限交流方波 (Square)</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">无限电压/幅值 (V):</span>
              <input
                type="number"
                step={10}
                value={Number(comp.props.voltage ?? 12)}
                onChange={(e) => updateComponentProp(comp.id, 'voltage', Number(e.target.value) || 0)}
                className="w-28 bg-slate-900 border border-rose-500/50 rounded px-2 py-0.5 font-mono text-right text-rose-200"
              />
            </div>
            {String(comp.props.waveform ?? 'dc') !== 'dc' && (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">频率 (Hz):</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={Number(comp.props.frequency ?? 2)}
                  onChange={(e) => updateComponentProp(comp.id, 'frequency', Math.max(0.1, Number(e.target.value) || 2))}
                  className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
                />
              </div>
            )}
            <div className="grid grid-cols-4 gap-1 text-[10px]">
              {[12, 220, 10000, 1000000].map((vPreset) => (
                <button
                  key={vPreset}
                  type="button"
                  onClick={() => updateComponentProp(comp.id, 'voltage', vPreset)}
                  className="py-1 rounded bg-slate-800 hover:bg-rose-900/50 border border-slate-700 text-slate-200 font-mono"
                >
                  {vPreset >= 1e6 ? '1MV' : vPreset >= 1000 ? `${vPreset / 1000}kV` : `${vPreset}V`}
                </button>
              ))}
            </div>
          </div>
        )}

        {comp.type === 'INF_RESISTOR' && (
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">理想无穷断路 (R=∞, I=0):</span>
              <input
                type="checkbox"
                checked={comp.props.idealInfinite !== false}
                onChange={(e) => updateComponentProp(comp.id, 'idealInfinite', e.target.checked)}
                className="accent-fuchsia-500"
              />
            </label>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-400">自定义超高阻值 (Ω):</span>
              <input
                type="number"
                min={1e6}
                step={1e6}
                disabled={comp.props.idealInfinite !== false}
                value={Number(comp.props.resistance ?? 1e12)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'resistance', Math.max(1e6, Number(e.target.value) || 1e12))
                }
                className="w-28 bg-slate-900 border border-fuchsia-500/40 rounded px-2 py-0.5 font-mono text-right text-fuchsia-200 disabled:opacity-40"
              />
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {[
                { label: '1GΩ', val: 1e9, inf: false },
                { label: '1TΩ', val: 1e12, inf: false },
                { label: '∞ 开路', val: 1e15, inf: true },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    updateComponentProp(comp.id, 'idealInfinite', p.inf);
                    updateComponentProp(comp.id, 'resistance', p.val);
                  }}
                  className="py-1 rounded bg-slate-800 hover:bg-fuchsia-900/40 border border-slate-700 text-slate-200 font-mono"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {comp.type === 'ZENER_DIODE' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">齐纳稳压值 Vz (V):</span>
            <input
              type="number"
              min={1.2}
              max={100}
              step={0.1}
              value={Number(comp.props.vz ?? 5.1)}
              onChange={(e) => updateComponentProp(comp.id, 'vz', Math.max(1.2, Number(e.target.value)))}
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
            />
          </label>
        )}

        {comp.type === 'NMOS' && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <label>
              <span className="text-slate-400 block">阈值 V_th (V)</span>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.1}
                value={Number(comp.props.vth ?? 2.0)}
                onChange={(e) => updateComponentProp(comp.id, 'vth', Math.max(0.2, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
              />
            </label>
            <label>
              <span className="text-slate-400 block">跨导 kp (A/V²)</span>
              <input
                type="number"
                min={0.005}
                max={2}
                step={0.01}
                value={Number(comp.props.kp ?? 0.08)}
                onChange={(e) => updateComponentProp(comp.id, 'kp', Math.max(0.001, Number(e.target.value)))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
              />
            </label>
          </div>
        )}

        {comp.type === 'TRANSFORMER' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">匝数比 Ns : Np:</span>
            <input
              type="number"
              min={0.05}
              max={20}
              step={0.05}
              value={Number(comp.props.ratio ?? 2.0)}
              onChange={(e) =>
                updateComponentProp(comp.id, 'ratio', Math.max(0.05, Number(e.target.value) || 2.0))
              }
              className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
            />
          </label>
        )}

        {comp.type === 'LAMP' && (
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <label>
              <span className="text-slate-400 block">额定电压 (V)</span>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={Number(comp.props.ratedVoltage ?? 5)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'ratedVoltage', Math.max(0.5, Number(e.target.value)))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
              />
            </label>
            <label>
              <span className="text-slate-400 block">额定功率 (W)</span>
              <input
                type="number"
                min={0.05}
                step={0.25}
                value={Number(comp.props.ratedPower ?? 1.5)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'ratedPower', Math.max(0.05, Number(e.target.value)))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 font-mono"
              />
            </label>
          </div>
        )}

        {comp.type === 'FUSE' && (
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">熔断电流阈值 I_trip (A):</span>
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={Number(comp.props.tripCurrent ?? 0.5)}
                onChange={(e) =>
                  updateComponentProp(comp.id, 'tripCurrent', Math.max(0.01, Number(e.target.value)))
                }
                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
              />
            </label>
            {Boolean(comp.props.blown) && (
              <div className="p-2 rounded bg-red-950/60 border border-red-500/50 space-y-1.5">
                <div className="flex items-center gap-1 text-red-300 text-[11px] font-medium">
                  <Flame className="w-3.5 h-3.5" /> 已过流熔断 — 电路已安全断开
                </div>
                <button
                  type="button"
                  data-testid="reset-fuse-btn"
                  onClick={() => toggleInteractiveComponent(comp.id)}
                  className="w-full py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-medium"
                >
                  更换并恢复保险丝
                </button>
              </div>
            )}
          </div>
        )}

        {(comp.type === 'CUSTOM_TRUTH_8' || comp.type === 'CUSTOM_TRUTH_16') && (() => {
          const cfg = parseTruthChipConfig(comp);
          const inCount = cfg.slots.filter((s) => s.role === 'IN').length;
          const outCount = cfg.slots.filter((s) => s.role === 'OUT').length;
          return (
            <div className="space-y-2">
              <label className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">芯片型号名:</span>
                <input
                  type="text"
                  maxLength={12}
                  value={String(comp.props.chipName ?? cfg.chipName)}
                  onChange={(e) => updateComponentProp(comp.id, 'chipName', e.target.value.trim() || cfg.chipName)}
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
                />
              </label>
              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>配置引脚: {inCount} IN / {outCount} OUT</span>
                <span className="text-purple-300">{cfg.mode === 'expr' ? '公式模式' : '真值表模式'}</span>
              </div>
              <button
                type="button"
                data-testid="open-truth-editor-btn"
                onClick={() => useUIStore.getState().openTruthEditor(comp.id)}
                className="w-full py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                打开真值芯片编程器
              </button>
            </div>
          );
        })()}

        {comp.type === 'CUSTOM_IC' && (() => {
          const payload = parseCustomIcPayload(comp);
          return (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-fuchsia-300 font-medium text-[11px]">
                <Cpu className="w-3.5 h-3.5" />
                <span>{payload.name} ({payload.codeName})</span>
              </div>
              <div className="text-[10px] text-slate-400">
                封装内部含 {payload.internalCircuit.components.length} 个元件 ·{' '}
                {payload.internalCircuit.wires.length} 根连线 · {payload.pins.length} 引脚
              </div>
              <button
                type="button"
                onClick={() => useUIStore.getState().setPackageIcModalOpen(true)}
                className="w-full py-1 rounded bg-fuchsia-600/30 hover:bg-fuchsia-600/40 border border-fuchsia-500/40 text-fuchsia-200 text-[11px] flex items-center justify-center gap-1"
              >
                <PackagePlus className="w-3.5 h-3.5" />
                打开云端 IC 封装库
              </button>
            </div>
          );
        })()}

        {comp.type === 'LOGIC_IN' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">真值表变量名:</span>
            <input
              type="text"
              maxLength={4}
              value={String(comp.props.varName ?? comp.label)}
              onChange={(e) => updateComponentProp(comp.id, 'varName', e.target.value.trim() || 'X')}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-center"
            />
          </label>
        )}

        {comp.type === 'LOGIC_OUT' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">输出信号名:</span>
            <input
              type="text"
              maxLength={6}
              value={String(comp.props.outName ?? comp.label)}
              onChange={(e) => updateComponentProp(comp.id, 'outName', e.target.value.trim() || 'Y')}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-center"
            />
          </label>
        )}

        {comp.type === 'CLOCK' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">时钟频率 (Hz):</span>
            <input
              type="number"
              min={0.2}
              max={20}
              step={0.5}
              value={Number(comp.props.frequency ?? 1)}
              onChange={(e) =>
                updateComponentProp(comp.id, 'frequency', Math.max(0.1, Number(e.target.value)))
              }
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
            />
          </label>
        )}

        {comp.type === 'LED' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">发光颜色:</span>
            <select
              value={String(comp.props.color ?? 'red')}
              onChange={(e) => updateComponentProp(comp.id, 'color', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5"
            >
              <option value="red">红光 (Red)</option>
              <option value="green">绿光 (Green)</option>
              <option value="yellow">黄光 (Yellow)</option>
              <option value="blue">蓝光 (Blue)</option>
            </select>
          </label>
        )}

        {comp.type === 'BJT_NPN' && (
          <label className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">电流放大倍数 β:</span>
            <input
              type="number"
              min={20}
              max={400}
              step={10}
              value={Number(comp.props.beta ?? 100)}
              onChange={(e) => updateComponentProp(comp.id, 'beta', Number(e.target.value))}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right"
            />
          </label>
        )}
      </div>

      {/* Live Telemetry Box */}
      {tel && (
        <div
          className={`p-2 rounded border space-y-1.5 ${
            tel.overloaded
              ? 'bg-red-950/60 border-red-500/70'
              : 'bg-slate-950/90 border-slate-800'
          }`}
        >
          <div className="grid grid-cols-3 gap-1 text-center font-mono">
            <div className="bg-slate-900 rounded p-1">
              <div className="text-[10px] text-slate-500">压降 V</div>
              <div className="text-xs text-sky-300 font-semibold">{tel.voltageDrop.toFixed(2)}V</div>
            </div>
            <div className="bg-slate-900 rounded p-1">
              <div className="text-[10px] text-slate-500">电流 I</div>
              <div className="text-xs text-emerald-300 font-semibold">
                {Math.abs(tel.current) >= 1
                  ? `${tel.current.toFixed(2)}A`
                  : `${(tel.current * 1000).toFixed(1)}mA`}
              </div>
            </div>
            <div className="bg-slate-900 rounded p-1">
              <div className="text-[10px] text-slate-500">
                {comp.type === 'CAPACITOR' || comp.type === 'INDUCTOR' || comp.type === 'TRANSFORMER'
                  ? '热损耗 P'
                  : '功耗 P'}
              </div>
              <div className="text-xs text-amber-300 font-semibold">
                {formatEngineeringValue(tel.power, 'W')}
              </div>
            </div>
          </div>

          {tel.vRms !== undefined &&
            comp.type !== 'GROUND' &&
            (comp.props.mode === 'rms' ||
              components.some(
                (x) =>
                  x.type === 'AC_SOURCE' ||
                  (x.type === 'INF_SOURCE' && String(x.props.waveform ?? 'dc') !== 'dc')
              )) && (
              <div className="grid grid-cols-2 gap-1 text-center font-mono text-[10px]">
                <div className="bg-slate-900/90 rounded px-1.5 py-1 border border-slate-800/80">
                  <span className="text-slate-400 mr-1">有效值:</span>
                  <span className="text-cyan-300 font-semibold">
                    {tel.vRms.toFixed(2)}V~ ·{' '}
                    {(tel.iRms ?? 0) >= 1
                      ? `${(tel.iRms ?? 0).toFixed(2)}A~`
                      : `${((tel.iRms ?? 0) * 1000).toFixed(1)}mA~`}
                  </span>
                </div>
                <div className="bg-slate-900/90 rounded px-1.5 py-1 border border-slate-800/80">
                  <span className="text-slate-400 mr-1">有功/cosφ:</span>
                  <span className="text-amber-200 font-semibold">
                    {formatEngineeringValue(tel.avgPower ?? tel.power, 'W')} ·{' '}
                    {(tel.powerFactor ?? 1).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

          <div>
            <div className="flex justify-between text-[10px] mb-0.5">
              <span className="text-slate-400">
                {comp.type === 'CAPACITOR'
                  ? `耐压裕度 (${Math.abs(tel.vRms !== undefined ? Math.max(Math.abs(tel.voltageDrop), tel.vRms * Math.SQRT2) : tel.voltageDrop).toFixed(1)}V / ${Number(comp.props.maxVoltage ?? 450)}V)`
                  : comp.type === 'INDUCTOR'
                  ? `电流负载 (${(tel.iRms ?? Math.abs(tel.current)).toFixed(2)}A / ${Number(comp.props.maxCurrent ?? 8)}A · 铜耗 ${tel.power.toFixed(3)}W)`
                  : comp.type === 'TRANSFORMER'
                  ? `副边负载 (${(tel.iRms ?? Math.abs(tel.current)).toFixed(2)}A / ${Number(comp.props.maxCurrent ?? 15)}A)`
                  : `负载率 (${tel.power.toFixed(3)}W / ${tel.maxPower}W)`}
              </span>
              <span className={tel.overloaded ? 'text-red-400 font-bold' : 'text-slate-300'}>
                {loadPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                style={{ width: `${Math.min(100, loadPct)}%` }}
                className={`h-full transition-all ${
                  tel.overloaded
                    ? 'bg-red-500'
                    : loadPct > 75
                    ? 'bg-amber-400'
                    : 'bg-emerald-400'
                }`}
              />
            </div>
          </div>

          {tel.extraInfo && (
            <div className="text-[11px] text-slate-300 flex items-center justify-between">
              <span>状态: {tel.extraInfo}</span>
              {tel.overloaded && (
                <span className="flex items-center gap-0.5 text-red-400 font-semibold">
                  <AlertTriangle className="w-3 h-3" /> 过载
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
