import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Radio,
  Trash2,
} from 'lucide-react';
import { formatEngineeringValue } from '../engine/componentCatalog';
import {
  computeNiceScaleBound,
  extractScopeSampleValue,
  formatScopeAxisTick,
  formatScopeChannelValue,
  getScopeChannelMeta,
  type ScopeChannelMeta,
} from '../engine/scopeChannelMeta';
import { useCircuitStore, type AnalysisTab } from '../store/useCircuitStore';
import { KarnaughMapPanel } from './KarnaughMapPanel';

const SCOPE_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#ec4899'];

interface BottomAnalysisDockProps {
  embedded?: boolean;
  heightPx?: number;
}

export const BottomAnalysisDock: React.FC<BottomAnalysisDockProps> = ({
  embedded = false,
  heightPx,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('telemetry');
  const [collapsed, setCollapsed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const components = useCircuitStore((s) => s.components);
  const telemetryById = useCircuitStore((s) => s.telemetryById);
  const selected = useCircuitStore((s) => s.selected);
  const oscilloscopeChannels = useCircuitStore((s) => s.oscilloscopeChannels);
  const oscilloscopeSamples = useCircuitStore((s) => s.oscilloscopeSamples);
  const preferredAnalysisTab = useCircuitStore((s) => s.preferredAnalysisTab);

  const setSelected = useCircuitStore((s) => s.setSelected);
  const toggleOscilloscopeChannel = useCircuitStore((s) => s.toggleOscilloscopeChannel);
  const clearOscilloscope = useCircuitStore((s) => s.clearOscilloscope);

  // Auto-switch to Digital or preferred tutorial tab when circuit context specifies it
  const activePresetId = useCircuitStore((s) => s.activePresetId);
  const circuitLoadVersion = useCircuitStore((s) => s.circuitLoadVersion);
  useEffect(() => {
    if (preferredAnalysisTab) {
      setActiveTab(preferredAnalysisTab);
      setCollapsed(false);
    } else if (
      activePresetId === 'preset-majority-voter' ||
      activePresetId === 'preset-full-adder-hex'
    ) {
      setActiveTab('digital');
    }
  }, [activePresetId, preferredAnalysisTab, circuitLoadVersion]);

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

    if (oscilloscopeSamples.length < 1 || oscilloscopeChannels.length === 0) return;

    const metaByChannel = new Map<string, ScopeChannelMeta>();
    let hasVoltage = false;
    let hasCurrent = false;
    let maxVoltageAbs = 0;
    let maxCurrentAbs = 0;

    for (const cid of oscilloscopeChannels) {
      const comp = components.find((x) => x.id === cid);
      const meta = getScopeChannelMeta(comp);
      metaByChannel.set(cid, meta);
      if (meta.dimension === 'current') hasCurrent = true;
      else hasVoltage = true;
    }

    for (const s of oscilloscopeSamples) {
      for (const ch of oscilloscopeChannels) {
        const meta = metaByChannel.get(ch);
        const v = Math.abs(s.values[ch] ?? 0);
        if (meta?.dimension === 'current') {
          if (v > maxCurrentAbs) maxCurrentAbs = v;
        } else {
          if (v > maxVoltageAbs) maxVoltageAbs = v;
        }
      }
    }

    const vScaleMax = computeNiceScaleBound(maxVoltageAbs, 1);
    const iScaleMax = computeNiceScaleBound(maxCurrentAbs, 0.001);

    ctx.font = '10px monospace';
    if (hasVoltage && hasCurrent) {
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText(formatScopeAxisTick(vScaleMax, 'voltage', vScaleMax), 6, 12);
      ctx.fillText('0V', 6, h / 2 - 4);
      ctx.fillText(formatScopeAxisTick(-vScaleMax, 'voltage', vScaleMax), 6, h - 5);

      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'right';
      ctx.fillText(formatScopeAxisTick(iScaleMax, 'current', iScaleMax), w - 6, 12);
      ctx.fillText(formatScopeAxisTick(0, 'current', iScaleMax), w - 6, h / 2 - 4);
      ctx.fillText(formatScopeAxisTick(-iScaleMax, 'current', iScaleMax), w - 6, h - 5);
      ctx.textAlign = 'left';
    } else if (hasCurrent) {
      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'left';
      ctx.fillText(formatScopeAxisTick(iScaleMax, 'current', iScaleMax), 6, 12);
      ctx.fillText(formatScopeAxisTick(0, 'current', iScaleMax), 6, h / 2 - 4);
      ctx.fillText(formatScopeAxisTick(-iScaleMax, 'current', iScaleMax), 6, h - 5);
    } else {
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText(formatScopeAxisTick(vScaleMax, 'voltage', vScaleMax), 6, 12);
      ctx.fillText('0V', 6, h / 2 - 4);
      ctx.fillText(formatScopeAxisTick(-vScaleMax, 'voltage', vScaleMax), 6, h - 5);
    }

    const n = oscilloscopeSamples.length;
    oscilloscopeChannels.forEach((cid, cIdx) => {
      const meta = metaByChannel.get(cid);
      const scaleMax = meta?.dimension === 'current' ? iScaleMax : vScaleMax;
      ctx.strokeStyle = SCOPE_COLORS[cIdx % SCOPE_COLORS.length];
      ctx.lineWidth = 2;
      if (n === 1) {
        const val = oscilloscopeSamples[0].values[cid] ?? 0;
        const y = h / 2 - (val / scaleMax) * (h * 0.44);
        ctx.fillStyle = SCOPE_COLORS[cIdx % SCOPE_COLORS.length];
        ctx.beginPath();
        ctx.arc(8, y, 3, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
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
  }, [oscilloscopeSamples, oscilloscopeChannels, components, collapsed, activeTab]);

  return (
    <div
      className={`shrink-0 ${
        embedded
          ? 'w-full h-full flex flex-col border-0 bg-transparent'
          : 'border-t border-slate-800 bg-slate-900/95 flex flex-col transition-all'
      } ${embedded ? '' : collapsed ? 'h-9' : heightPx ? '' : 'h-64'}`}
      style={!embedded && !collapsed && heightPx ? { height: heightPx } : undefined}
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
              setActiveTab('ac');
              setCollapsed(false);
            }}
            data-testid="analysis-tab-ac"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
              activeTab === 'ac' && !collapsed
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            交流有效值与功率因数
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
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'digital' ? (
            <KarnaughMapPanel />
          ) : activeTab === 'ac' ? (
            <div data-testid="analysis-ac-table" className="h-full overflow-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 z-10">
                  <tr>
                    <th className="py-1.5 px-2.5 border-b border-slate-800">元件</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">有效值电压 Urms</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">有效值电流 Irms</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">平均有功 P</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">视在功率 S</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">功率因数 cosφ</th>
                    <th className="py-1.5 px-2 border-b border-slate-800">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {components.map((c) => {
                    const tel = telemetryById[c.id];
                    const isSel = selected?.kind === 'component' && selected.id === c.id;
                    const uRms = tel?.vRms ?? Math.abs(tel?.voltageDrop ?? 0);
                    const iRms = tel?.iRms ?? Math.abs(tel?.current ?? 0);
                    const pAvg = tel?.avgPower ?? tel?.power ?? 0;
                    const sApp = tel?.apparentPower ?? uRms * iRms;
                    const pf = tel?.powerFactor ?? (sApp > 1e-7 ? Math.min(1, pAvg / sApp) : 1);
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
                        <td className="py-1 px-2 text-sky-300">{uRms.toFixed(2)} V~</td>
                        <td className="py-1 px-2 text-emerald-300">
                          {iRms >= 1 ? `${iRms.toFixed(2)} A~` : `${(iRms * 1000).toFixed(1)} mA~`}
                        </td>
                        <td className="py-1 px-2 text-amber-300">{formatEngineeringValue(pAvg, 'W')}</td>
                        <td className="py-1 px-2 text-cyan-300">{formatEngineeringValue(sApp, 'VA')}</td>
                        <td className="py-1 px-2 text-violet-300 font-semibold">{pf.toFixed(3)}</td>
                        <td className="py-1 px-2 truncate max-w-[160px] text-slate-400 font-sans">
                          {tel?.overloaded ? '过压/过载告警！' : tel?.extraInfo || '正常'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                      const meta = getScopeChannelMeta(c);
                      const measured = tel ? extractScopeSampleValue(c, tel) : 0;
                      return (
                        <span
                          key={cid}
                          data-testid={`scope-channel-pill-${cid}`}
                          style={{ color: SCOPE_COLORS[idx % SCOPE_COLORS.length] }}
                          className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800"
                        >
                          CH{idx + 1} {c.label} · {meta.quantityLabel}: {formatScopeChannelValue(measured, meta)}
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
