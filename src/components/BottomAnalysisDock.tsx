import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Trash2,
} from 'lucide-react';
import { formatEngineeringValue } from '../engine/componentCatalog';
import { useCircuitStore } from '../store/useCircuitStore';
import { KarnaughMapPanel } from './KarnaughMapPanel';

const SCOPE_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#ec4899'];

export const BottomAnalysisDock: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'digital'>('telemetry');
  const [collapsed, setCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const components = useCircuitStore((s) => s.components);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const selected = useCircuitStore((s) => s.selected);
  const oscilloscopeChannels = useCircuitStore((s) => s.oscilloscopeChannels);
  const oscilloscopeSamples = useCircuitStore((s) => s.oscilloscopeSamples);

  const setSelected = useCircuitStore((s) => s.setSelected);
  const toggleOscilloscopeChannel = useCircuitStore((s) => s.toggleOscilloscopeChannel);
  const clearOscilloscope = useCircuitStore((s) => s.clearOscilloscope);

  // Auto-switch to Digital tab when user loads a digital preset
  const activePresetId = useCircuitStore((s) => s.activePresetId);
  useEffect(() => {
    if (activePresetId === 'preset-majority-voter' || activePresetId === 'preset-full-adder-hex') {
      setActiveTab('digital');
    }
  }, [activePresetId]);

  // Draw Real-Time Oscilloscope Canvas
  useEffect(() => {
    if (collapsed || activeTab !== 'telemetry') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += h / 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Zero baseline
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (oscilloscopeSamples.length < 2 || oscilloscopeChannels.length === 0) return;

    // Auto scale Y
    let maxAbs = 5;
    for (const s of oscilloscopeSamples) {
      for (const ch of oscilloscopeChannels) {
        const v = Math.abs(s.values[ch] ?? 0);
        if (v > maxAbs) maxAbs = v;
      }
    }
    const scaleMax = Math.ceil(maxAbs * 1.15);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`+${scaleMax}V`, 6, 12);
    ctx.fillText(`0V`, 6, h / 2 - 4);
    ctx.fillText(`-${scaleMax}V`, 6, h - 5);

    const n = oscilloscopeSamples.length;
    oscilloscopeChannels.forEach((cid, cIdx) => {
      ctx.strokeStyle = SCOPE_COLORS[cIdx % SCOPE_COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = (i / Math.max(1, n - 1)) * w;
        const val = oscilloscopeSamples[i].values[cid] ?? 0;
        const y = h / 2 - (val / scaleMax) * (h * 0.44);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [oscilloscopeSamples, oscilloscopeChannels, collapsed, activeTab]);

  return (
    <div
      className={`shrink-0 border-t border-slate-800 bg-slate-900/95 flex flex-col transition-all ${
        collapsed ? 'h-9' : 'h-64'
      }`}
    >
      {/* Dock Tab Bar */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('telemetry');
              setCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === 'telemetry' && !collapsed
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            实时电参量与示波器
          </button>

          <button
            onClick={() => {
              setActiveTab('digital');
              setCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === 'digital' && !collapsed
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            数电真值表与卡诺图
          </button>
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded hover:bg-slate-800"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> 展开分析面板
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> 收起
            </>
          )}
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'digital' ? (
            <KarnaughMapPanel />
          ) : (
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 overflow-hidden">
              {/* Live Telemetry Table */}
              <div className="lg:col-span-7 overflow-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10">
                    <tr>
                      <th className="py-1.5 px-2.5 border-b border-slate-800">元件</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">电压 V</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">电流 I</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">功耗 P</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">负载率</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">状态</th>
                      <th className="py-1.5 px-2 border-b border-slate-800">示波</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c) => {
                      const tel = telemetryById[c.id];
                      const isSel = selected?.kind === 'component' && selected.id === c.id;
                      const scopedIdx = oscilloscopeChannels.indexOf(c.id);
                      const loadPct = Math.round((tel?.loadRatio ?? 0) * 100);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelected({ kind: 'component', id: c.id })}
                          className={`cursor-pointer border-b border-slate-800/50 ${
                            tel?.overloaded
                              ? 'bg-red-950/35 text-red-200'
                              : isSel
                              ? 'bg-sky-500/15 text-sky-100'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <td className="py-1 px-2.5 font-semibold">{c.label}</td>
                          <td className="py-1 px-2 text-sky-300">
                            {(tel?.voltageDrop ?? 0).toFixed(2)}V
                          </td>
                          <td className="py-1 px-2 text-emerald-300">
                            {Math.abs(tel?.current ?? 0) >= 1
                              ? `${(tel?.current ?? 0).toFixed(2)}A`
                              : `${((tel?.current ?? 0) * 1000).toFixed(1)}mA`}
                          </td>
                          <td className="py-1 px-2 text-amber-300">
                            {formatEngineeringValue(tel?.power ?? 0, 'W')}
                          </td>
                          <td className="py-1 px-2">
                            <span
                              className={
                                tel?.overloaded
                                  ? 'text-red-400 font-bold'
                                  : loadPct > 75
                                  ? 'text-amber-400'
                                  : 'text-slate-400'
                              }
                            >
                              {loadPct}%
                            </span>
                          </td>
                          <td className="py-1 px-2 truncate max-w-[140px] text-slate-400 font-sans">
                            {tel?.extraInfo || (c.type === 'GROUND' ? '0V参考地' : '正常')}
                          </td>
                          <td className="py-1 px-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOscilloscopeChannel(c.id);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                scopedIdx >= 0
                                  ? 'border-sky-400 text-sky-200 bg-sky-500/20'
                                  : 'border-slate-700 text-slate-500 hover:text-slate-200'
                              }`}
                            >
                              {scopedIdx >= 0 ? `CH${scopedIdx + 1}` : '+CH'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Multi-channel Real-Time Oscilloscope */}
              <div className="lg:col-span-5 flex flex-col p-2 bg-slate-950/70 overflow-hidden">
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-200">
                      <Activity className="w-3.5 h-3.5 text-sky-400" />
                      实时波形示波器
                    </span>
                    {oscilloscopeChannels.map((cid, idx) => {
                      const c = components.find((x) => x.id === cid);
                      if (!c) return null;
                      const tel = telemetryById[cid];
                      return (
                        <span
                          key={cid}
                          style={{ color: SCOPE_COLORS[idx % SCOPE_COLORS.length] }}
                          className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                        >
                          CH{idx + 1} {c.label}: {(tel?.voltageDrop ?? 0).toFixed(2)}V
                        </span>
                      );
                    })}
                  </div>
                  <button
                    onClick={clearOscilloscope}
                    title="清空波形缓存"
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 rounded overflow-hidden border border-slate-800">
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={165}
                    className="w-full h-full block"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
