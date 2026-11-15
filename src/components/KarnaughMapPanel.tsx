import React, { useMemo, useState } from 'react';
import { Cpu, Sparkles, Wand2 } from 'lucide-react';
import {
  analyzeDigitalCircuit,
  buildKarnaughMapAndSimplify,
  synthesizeCircuitFromMinterms,
  type KMapLiteral,
  type KMapLoop,
} from '../engine/digitalLogicAnalysis';
import { useCircuitStore } from '../store/useCircuitStore';

const CELL_W = 54;
const CELL_H = 44;
const PAD_L = 58;
const PAD_T = 44;

function LiteralText({ literals }: { literals: KMapLiteral[] }) {
  if (literals.length === 0) return <span>1</span>;
  return (
    <span className="inline-flex items-baseline font-mono">
      {literals.map((l, idx) => (
        <span
          key={idx}
          className={l.negated ? 'border-t border-current pt-[0.5px] mx-[0.5px]' : 'mx-[0.5px]'}
        >
          {l.varName}
        </span>
      ))}
    </span>
  );
}

function renderLoopOverlay(loop: KMapLoop, numRows: number, numCols: number, idx: number) {
  const inset = 4 + (idx % 4) * 3;
  const rx = 9;
  const xStart = PAD_L + loop.colSpan.start * CELL_W + inset;
  const xEnd = PAD_L + (loop.colSpan.end + 1) * CELL_W - inset;
  const yStart = PAD_T + loop.rowSpan.start * CELL_H + inset;
  const yEnd = PAD_T + (loop.rowSpan.end + 1) * CELL_H - inset;

  const rowWraps = loop.rowSpan.kind === 'wrap';
  const colWraps = loop.colSpan.kind === 'wrap';

  // Simple interior or full-axis rectangle
  if (!rowWraps && !colWraps) {
    return (
      <rect
        key={loop.id}
        x={xStart}
        y={yStart}
        width={Math.max(12, xEnd - xStart)}
        height={Math.max(12, yEnd - yStart)}
        rx={rx}
        fill={`${loop.color}1a`}
        stroke={loop.color}
        strokeWidth={2}
      />
    );
  }

  // Toroidal wrap-around open edge brackets
  const elements: React.ReactNode[] = [];
  if (colWraps && !rowWraps) {
    // Left edge (col 0) open to left, Right edge (col numCols-1) open to right
    const lx1 = PAD_L + 1;
    const lx2 = PAD_L + CELL_W - inset;
    const rx1 = PAD_L + (numCols - 1) * CELL_W + inset;
    const rx2 = PAD_L + numCols * CELL_W - 1;
    elements.push(
      <path
        key={`${loop.id}-cl`}
        d={`M ${lx1} ${yStart} L ${lx2 - rx} ${yStart} Q ${lx2} ${yStart} ${lx2} ${yStart + rx} L ${lx2} ${yEnd - rx} Q ${lx2} ${yEnd} ${lx2 - rx} ${yEnd} L ${lx1} ${yEnd}`}
        fill={`${loop.color}18`}
        stroke={loop.color}
        strokeWidth={2}
      />,
      <path
        key={`${loop.id}-cr`}
        d={`M ${rx2} ${yStart} L ${rx1 + rx} ${yStart} Q ${rx1} ${yStart} ${rx1} ${yStart + rx} L ${rx1} ${yEnd - rx} Q ${rx1} ${yEnd} ${rx1 + rx} ${yEnd} L ${rx2} ${yEnd}`}
        fill={`${loop.color}18`}
        stroke={loop.color}
        strokeWidth={2}
      />
    );
  } else if (rowWraps && !colWraps) {
    const ty1 = PAD_T + 1;
    const ty2 = PAD_T + CELL_H - inset;
    const by1 = PAD_T + (numRows - 1) * CELL_H + inset;
    const by2 = PAD_T + numRows * CELL_H - 1;
    elements.push(
      <path
        key={`${loop.id}-rt`}
        d={`M ${xStart} ${ty1} L ${xStart} ${ty2 - rx} Q ${xStart} ${ty2} ${xStart + rx} ${ty2} L ${xEnd - rx} ${ty2} Q ${xEnd} ${ty2} ${xEnd} ${ty2 - rx} L ${xEnd} ${ty1}`}
        fill={`${loop.color}18`}
        stroke={loop.color}
        strokeWidth={2}
      />,
      <path
        key={`${loop.id}-rb`}
        d={`M ${xStart} ${by2} L ${xStart} ${by1 + rx} Q ${xStart} ${by1} ${xStart + rx} ${by1} L ${xEnd - rx} ${by1} Q ${xEnd} ${by1} ${xEnd} ${by1 + rx} L ${xEnd} ${by2}`}
        fill={`${loop.color}18`}
        stroke={loop.color}
        strokeWidth={2}
      />
    );
  } else {
    // 4-corner wrap-around! Draw 4 corner brackets
    const lx1 = PAD_L + 1;
    const lx2 = PAD_L + CELL_W - inset;
    const rx1 = PAD_L + (numCols - 1) * CELL_W + inset;
    const rx2 = PAD_L + numCols * CELL_W - 1;
    const ty1 = PAD_T + 1;
    const ty2 = PAD_T + CELL_H - inset;
    const by1 = PAD_T + (numRows - 1) * CELL_H + inset;
    const by2 = PAD_T + numRows * CELL_H - 1;
    elements.push(
      <path
        key={`${loop.id}-tl`}
        d={`M ${lx1} ${ty2} L ${lx2 - rx} ${ty2} Q ${lx2} ${ty2} ${lx2} ${ty2 - rx} L ${lx2} ${ty1}`}
        fill="none"
        stroke={loop.color}
        strokeWidth={2.2}
      />,
      <path
        key={`${loop.id}-tr`}
        d={`M ${rx2} ${ty2} L ${rx1 + rx} ${ty2} Q ${rx1} ${ty2} ${rx1} ${ty2 - rx} L ${rx1} ${ty1}`}
        fill="none"
        stroke={loop.color}
        strokeWidth={2.2}
      />,
      <path
        key={`${loop.id}-bl`}
        d={`M ${lx1} ${by1} L ${lx2 - rx} ${by1} Q ${lx2} ${by1} ${lx2} ${by1 + rx} L ${lx2} ${by2}`}
        fill="none"
        stroke={loop.color}
        strokeWidth={2.2}
      />,
      <path
        key={`${loop.id}-br`}
        d={`M ${rx2} ${by1} L ${rx1 + rx} ${by1} Q ${rx1} ${by1} ${rx1} ${by1 + rx} L ${rx1} ${by2}`}
        fill="none"
        stroke={loop.color}
        strokeWidth={2.2}
      />
    );
  }
  return <g key={loop.id}>{elements}</g>;
}

export const KarnaughMapPanel: React.FC = () => {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const updateComponentProp = useCircuitStore((s) => s.updateComponentProp);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);

  const [selectedOutputKey, setSelectedOutputKey] = useState<string | null>(null);
  const [mode, setMode] = useState<'circuit' | 'studio'>('circuit');
  const [studioVars, setStudioVars] = useState<number>(3);
  const [studioMinterms, setStudioMinterms] = useState<number[]>([3, 5, 6, 7]);
  const [hoveredLoopId, setHoveredLoopId] = useState<string | null>(null);

  const analysis = useMemo(
    () => analyzeDigitalCircuit({ components, wires }, selectedOutputKey),
    [components, wires, selectedOutputKey]
  );

  const studioVarNames = useMemo(
    () => ['A', 'B', 'C', 'D'].slice(0, studioVars),
    [studioVars]
  );
  const studioKmap = useMemo(
    () => buildKarnaughMapAndSimplify(studioVarNames, studioMinterms),
    [studioVarNames, studioMinterms]
  );

  const activeKmap = mode === 'circuit' ? analysis.kmap : studioKmap;

  const applyRowInputs = (bits: (0 | 1)[]) => {
    analysis.inputs.forEach((inp, idx) => {
      updateComponentProp(inp.id, 'state', bits[idx]);
    });
  };

  const toggleStudioMinterm = (m: number) => {
    setStudioMinterms((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    );
  };

  const handleSynthesizeToWorkbench = () => {
    const generated = synthesizeCircuitFromMinterms(studioVarNames, studioMinterms);
    loadCircuit(
      generated,
      `卡诺图综合电路 (${studioKmap?.simplifiedExpr || '0'})`,
      null
    );
    setMode('circuit');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950/90 text-xs">
      {/* Sub-header mode switch */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('circuit')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              mode === 'circuit'
                ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            实时电路真值表与卡诺图
          </button>
          <button
            onClick={() => setMode('studio')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
              mode === 'studio'
                ? 'bg-sky-500/25 text-sky-200 border border-sky-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            卡诺图化简与反向综合门电路
          </button>
        </div>

        {mode === 'circuit' && analysis.outputs.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">观测输出端:</span>
            <select
              value={analysis.activeOutputKey ?? ''}
              onChange={(e) => setSelectedOutputKey(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-sky-300"
            >
              {analysis.outputs.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'studio' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">变量数:</span>
            {[2, 3, 4].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setStudioVars(v);
                  setStudioMinterms((prev) => prev.filter((m) => m < 1 << v));
                }}
                className={`px-2 py-0.5 rounded border text-xs ${
                  studioVars === v
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                    : 'bg-slate-900 border-slate-700 text-slate-300'
                }`}
              >
                {v} 变量
              </button>
            ))}
            <button
              onClick={handleSynthesizeToWorkbench}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium ml-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              一键生成门电路到3D台
            </button>
          </div>
        )}
      </div>

      {/* Main Content Split: Truth Table (Left) + K-Map & Boolean Algebra (Right) */}
      <div className="flex-1 overflow-auto p-3">
        {mode === 'circuit' && analysis.notice && (
          <div className="mb-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300">
            {analysis.notice}
          </div>
        )}

        {mode === 'circuit' && (analysis.inputs.length === 0 || analysis.outputs.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-6">
            <Cpu className="w-8 h-8 text-slate-600" />
            <div>当前电路尚未包含成对的“逻辑输入 (LOGIC_IN)”与“逻辑输出 (LOGIC_OUT / 门电路)”。</div>
            <button
              onClick={() => setMode('studio')}
              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs"
            >
              前往“卡诺图综合工作室”快速生成数电电路
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Truth Table */}
            <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  真值表 (点击行可快速切换开关输入)
                </span>
                <span className="text-[10px] text-slate-400">
                  {mode === 'circuit' ? `共 ${analysis.rows.length} 行` : `点击切换 m_i`}
                </span>
              </div>
              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-center font-mono text-[11px]">
                  <thead className="bg-slate-950/90 text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-1 px-2 border-b border-slate-800">m</th>
                      {(mode === 'circuit'
                        ? analysis.inputs.map((i) => i.varName)
                        : studioVarNames
                      ).map((vn) => (
                        <th key={vn} className="py-1 px-2 border-b border-slate-800 text-sky-300">
                          {vn}
                        </th>
                      ))}
                      {mode === 'circuit' ? (
                        analysis.outputs.map((o) => (
                          <th
                            key={o.key}
                            className={`py-1 px-2 border-b border-slate-800 ${
                              o.key === analysis.activeOutputKey
                                ? 'text-emerald-300 bg-emerald-950/30'
                                : 'text-slate-300'
                            }`}
                          >
                            {o.label}
                          </th>
                        ))
                      ) : (
                        <th className="py-1 px-2 border-b border-slate-800 text-emerald-300">Y</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {mode === 'circuit'
                      ? analysis.rows.map((row) => {
                          const isActive = row.index === analysis.activeRowIndex;
                          return (
                            <tr
                              key={row.index}
                              onClick={() => applyRowInputs(row.inputs)}
                              className={`cursor-pointer border-b border-slate-800/50 transition ${
                                isActive
                                  ? 'bg-sky-500/20 text-white font-bold'
                                  : 'hover:bg-slate-800/60 text-slate-300'
                              }`}
                            >
                              <td className="py-1 px-2 text-slate-500">m{row.index}</td>
                              {row.inputs.map((b, i) => (
                                <td key={i} className="py-1 px-2">
                                  {b}
                                </td>
                              ))}
                              {analysis.outputs.map((o) => {
                                const val = row.outputs[o.key];
                                return (
                                  <td
                                    key={o.key}
                                    className={`py-1 px-2 ${
                                      val === 1 ? 'text-emerald-400 font-bold' : 'text-slate-500'
                                    }`}
                                  >
                                    {val}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      : Array.from({ length: 1 << studioVars }, (_, m) => {
                          const bits = Array.from({ length: studioVars }, (_2, bi) =>
                            (m >> (studioVars - 1 - bi)) & 1
                          );
                          const val = studioMinterms.includes(m) ? 1 : 0;
                          return (
                            <tr
                              key={m}
                              onClick={() => toggleStudioMinterm(m)}
                              className="cursor-pointer border-b border-slate-800/50 hover:bg-slate-800/60"
                            >
                              <td className="py-1 px-2 text-slate-500">m{m}</td>
                              {bits.map((b, i) => (
                                <td key={i} className="py-1 px-2 text-slate-300">
                                  {b}
                                </td>
                              ))}
                              <td
                                className={`py-1 px-2 font-bold ${
                                  val === 1 ? 'text-emerald-400' : 'text-slate-500'
                                }`}
                              >
                                {val}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gray-Code SVG Karnaugh Map + Minimal Boolean Simplification */}
            {activeKmap && (
              <div className="lg:col-span-7 flex flex-col sm:flex-row gap-4 items-start bg-slate-900/70 border border-slate-800 rounded-lg p-3">
                {/* SVG K-Map Grid */}
                <div className="shrink-0">
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>格雷码卡诺图 ({activeKmap.varNames.join(', ')})</span>
                    {mode === 'studio' && (
                      <span className="text-[10px] text-sky-400">点击格子切换 0/1</span>
                    )}
                  </div>

                  {(() => {
                    const numRows = activeKmap.rowCodes.length;
                    const numCols = activeKmap.colCodes.length;
                    const svgW = PAD_L + numCols * CELL_W + 16;
                    const svgH = PAD_T + numRows * CELL_H + 16;
                    const visibleLoops = hoveredLoopId
                      ? activeKmap.loops.filter((l) => l.id === hoveredLoopId)
                      : activeKmap.loops;

                    return (
                      <svg
                        width={svgW}
                        height={svgH}
                        className="bg-slate-950 rounded border border-slate-800 select-none"
                      >
                        {/* Diagonal header split */}
                        <line
                          x1={10}
                          y1={10}
                          x2={PAD_L}
                          y2={PAD_T}
                          stroke="#334155"
                          strokeWidth={1.2}
                        />
                        <text x={PAD_L - 8} y={20} textAnchor="end" fontSize={11} fontWeight="bold" fill="#38bdf8">
                          {activeKmap.colVarLabel}
                        </text>
                        <text x={14} y={PAD_T - 8} textAnchor="start" fontSize={11} fontWeight="bold" fill="#f59e0b">
                          {activeKmap.rowVarLabel}
                        </text>

                        {/* Column Gray codes */}
                        {activeKmap.colCodes.map((code, c) => (
                          <text
                            key={c}
                            x={PAD_L + c * CELL_W + CELL_W / 2}
                            y={PAD_T - 10}
                            textAnchor="middle"
                            fontSize={11}
                            fontFamily="monospace"
                            fill="#cbd5e1"
                          >
                            {code}
                          </text>
                        ))}

                        {/* Row Gray codes */}
                        {activeKmap.rowCodes.map((code, r) => (
                          <text
                            key={r}
                            x={PAD_L - 10}
                            y={PAD_T + r * CELL_H + CELL_H / 2 + 4}
                            textAnchor="end"
                            fontSize={11}
                            fontFamily="monospace"
                            fill="#cbd5e1"
                          >
                            {code}
                          </text>
                        ))}

                        {/* Grid Cells */}
                        {activeKmap.grid.map((row, r) =>
                          row.map((cell, c) => {
                            const x = PAD_L + c * CELL_W;
                            const y = PAD_T + r * CELL_H;
                            const isCurrentLiveCell =
                              mode === 'circuit' && cell.minterm === analysis.activeRowIndex;
                            return (
                              <g
                                key={`${r}-${c}`}
                                onClick={() => {
                                  if (mode === 'studio') toggleStudioMinterm(cell.minterm);
                                }}
                                className={mode === 'studio' ? 'cursor-pointer' : ''}
                              >
                                <rect
                                  x={x}
                                  y={y}
                                  width={CELL_W}
                                  height={CELL_H}
                                  fill={
                                    isCurrentLiveCell
                                      ? 'rgba(56,189,248,0.18)'
                                      : cell.value === 1
                                      ? 'rgba(34,197,94,0.08)'
                                      : 'transparent'
                                  }
                                  stroke="#1e293b"
                                  strokeWidth={1.2}
                                />
                                <text
                                  x={x + 5}
                                  y={y + 12}
                                  fontSize={8.5}
                                  fontFamily="monospace"
                                  fill="#64748b"
                                >
                                  m{cell.minterm}
                                </text>
                                <text
                                  x={x + CELL_W / 2}
                                  y={y + CELL_H / 2 + 6}
                                  textAnchor="middle"
                                  fontSize={16}
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                  fill={cell.value === 1 ? '#4ade80' : '#475569'}
                                >
                                  {cell.value}
                                </text>
                              </g>
                            );
                          })
                        )}

                        {/* Prime Implicant Loops */}
                        <g pointerEvents="none">
                          {visibleLoops.map((loop, idx) =>
                            renderLoopOverlay(loop, numRows, numCols, idx)
                          )}
                        </g>
                      </svg>
                    );
                  })()}
                </div>

                {/* Simplified Expression & Loop Legend */}
                <div className="flex-1 min-w-0 space-y-2.5">
                  <div className="bg-slate-950 rounded-md p-2.5 border border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-slate-400">标准最小项和 (SOP):</div>
                    <div className="font-mono text-xs text-sky-300 break-all">
                      Y = {activeKmap.canonicalSumText}
                    </div>
                    <div className="text-[10px] text-slate-400 pt-1">
                      卡诺图/Q-M 最简与或表达式:
                    </div>
                    <div className="text-sm font-bold text-emerald-300 flex flex-wrap items-baseline gap-1">
                      <span className="font-mono">Y =</span>
                      {activeKmap.loops.length === 0 ? (
                        <span className="font-mono">0</span>
                      ) : (
                        activeKmap.loops.map((l, i) => (
                          <React.Fragment key={l.id}>
                            {i > 0 && <span className="text-slate-400">+</span>}
                            <span
                              onMouseEnter={() => setHoveredLoopId(l.id)}
                              onMouseLeave={() => setHoveredLoopId(null)}
                              style={{ color: l.color }}
                              className="cursor-pointer px-1 rounded hover:bg-slate-800"
                            >
                              <LiteralText literals={l.literals} />
                            </span>
                          </React.Fragment>
                        ))
                      )}
                    </div>
                  </div>

                  {activeKmap.loops.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400">
                        质蕴涵项分组详情 (悬停高亮对应卡诺图圈):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeKmap.loops.map((loop) => (
                          <div
                            key={loop.id}
                            onMouseEnter={() => setHoveredLoopId(loop.id)}
                            onMouseLeave={() => setHoveredLoopId(null)}
                            style={{ borderColor: loop.color }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded border bg-slate-950/90 cursor-pointer hover:bg-slate-800 text-[11px]"
                          >
                            <span
                              style={{ backgroundColor: loop.color }}
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                            />
                            <span className="font-semibold text-slate-100">
                              <LiteralText literals={loop.literals} />
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              (m{loop.minterms.join(',')})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
