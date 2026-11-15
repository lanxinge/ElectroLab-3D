import React, { useEffect, useMemo, useState } from 'react';
import { Check, Cpu, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import type { TruthChipConfig, TruthSlotDef, TruthSlotRole } from '../../shared/types';
import {
  evalBooleanExpression,
  parseTruthChipConfig,
  validateBooleanExpression,
} from '../engine/customIcEngine';
import { useCircuitStore } from '../store/useCircuitStore';
import { useUIStore } from '../store/useUIStore';

function buildHalfAdderPreset(slotCount: number): TruthChipConfig {
  const slots: TruthSlotDef[] = Array.from({ length: slotCount }, (_, i) => {
    const pinId = `s${i + 1}`;
    if (i === 0) return { pinId, name: 'A', role: 'IN' };
    if (i === 1) return { pinId, name: 'B', role: 'IN' };
    if (i === slotCount - 2) return { pinId, name: 'SUM', role: 'OUT' };
    if (i === slotCount - 1) return { pinId, name: 'COUT', role: 'OUT' };
    return { pinId, name: `NC${i + 1}`, role: 'NC' };
  });
  return {
    chipName: 'HALF_ADD',
    mode: 'table',
    slots,
    rows: { '00': '00', '01': '10', '10': '10', '11': '01' },
    expressions: {
      [`s${slotCount - 1}`]: 'A ^ B',
      [`s${slotCount}`]: 'A * B',
    },
  };
}

function buildMuxPreset(slotCount: number): TruthChipConfig {
  const slots: TruthSlotDef[] = Array.from({ length: slotCount }, (_, i) => {
    const pinId = `s${i + 1}`;
    if (i === 0) return { pinId, name: 'S', role: 'IN' };
    if (i === 1) return { pinId, name: 'D0', role: 'IN' };
    if (i === 2) return { pinId, name: 'D1', role: 'IN' };
    if (i === slotCount - 1) return { pinId, name: 'Y', role: 'OUT' };
    return { pinId, name: `NC${i + 1}`, role: 'NC' };
  });
  return {
    chipName: 'MUX_2TO1',
    mode: 'expr',
    slots,
    rows: {
      '000': '0', '001': '0', '010': '1', '011': '1',
      '100': '0', '101': '1', '110': '0', '111': '1',
    },
    expressions: {
      [`s${slotCount}`]: '(!S * D0) + (S * D1)',
    },
  };
}

function buildDecoder3to8Preset(slotCount: number): TruthChipConfig {
  const slots: TruthSlotDef[] = Array.from({ length: slotCount }, (_, i) => {
    const pinId = `s${i + 1}`;
    if (i === 0) return { pinId, name: 'A2', role: 'IN' };
    if (i === 1) return { pinId, name: 'A1', role: 'IN' };
    if (i === 2) return { pinId, name: 'A0', role: 'IN' };
    if (i >= 8) return { pinId, name: `Y${i - 8}`, role: 'OUT' };
    return { pinId, name: `NC${i + 1}`, role: 'NC' };
  });
  const rows: Record<string, string> = {};
  const expressions: Record<string, string> = {};
  for (let addr = 0; addr < 8; addr++) {
    const key = addr.toString(2).padStart(3, '0');
    const outArr = Array.from({ length: 8 }, (_, k) => (k === addr ? '1' : '0')).join('');
    rows[key] = outArr;
    const termA2 = (addr & 4) ? 'A2' : '!A2';
    const termA1 = (addr & 2) ? 'A1' : '!A1';
    const termA0 = (addr & 1) ? 'A0' : '!A0';
    expressions[`s${9 + addr}`] = `${termA2} * ${termA1} * ${termA0}`;
  }
  return {
    chipName: 'DEC_3TO8',
    mode: 'table',
    slots,
    rows,
    expressions,
  };
}

export const TruthChipEditorModal: React.FC = () => {
  const compId = useUIStore((s) => s.truthEditorCompId);
  const openTruthEditor = useUIStore((s) => s.openTruthEditor);
  const components = useCircuitStore((s) => s.components);
  const updateComponentProp = useCircuitStore((s) => s.updateComponentProp);

  const comp = useMemo(() => components.find((c) => c.id === compId) ?? null, [components, compId]);
  const [draft, setDraft] = useState<TruthChipConfig | null>(null);

  useEffect(() => {
    if (comp) {
      setDraft(parseTruthChipConfig(comp));
    } else {
      setDraft(null);
    }
  }, [comp?.id, comp?.props.truthConfigJson]);

  const inSlots = useMemo(
    () => (draft ? draft.slots.filter((s) => s.role === 'IN') : []),
    [draft]
  );
  const outSlots = useMemo(
    () => (draft ? draft.slots.filter((s) => s.role === 'OUT') : []),
    [draft]
  );
  const allowedVarNames = useMemo(
    () => Array.from(new Set(inSlots.flatMap((s) => [s.name.trim(), s.pinId]).filter(Boolean))),
    [inSlots]
  );
  const exprErrors = useMemo(() => {
    const map: Record<string, string> = {};
    if (!draft || draft.mode !== 'expr') return map;
    for (const outSlot of outSlots) {
      const expr = draft.expressions[outSlot.pinId] ?? '';
      const res = validateBooleanExpression(expr, allowedVarNames);
      if (!res.valid && res.error) {
        map[outSlot.pinId] = res.error;
      }
    }
    return map;
  }, [draft, outSlots, allowedVarNames]);

  if (!compId || !comp || !draft) return null;

  const tooManyInputsForTable = inSlots.length > 5;
  const tableRowCount = tooManyInputsForTable ? 0 : 1 << inSlots.length;

  const handleRoleChange = (pinId: string, role: TruthSlotRole) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const slots = prev.slots.map((s) => (s.pinId === pinId ? { ...s, role } : s));
      return { ...prev, slots };
    });
  };

  const handleSlotNameChange = (pinId: string, name: string) => {
    const clean = name.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 6);
    setDraft((prev) => {
      if (!prev) return prev;
      const slots = prev.slots.map((s) => (s.pinId === pinId ? { ...s, name: clean || pinId.toUpperCase() } : s));
      return { ...prev, slots };
    });
  };

  const toggleTableBit = (inVec: string, outIdx: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const outs = prev.slots.filter((s) => s.role === 'OUT');
      const cur = (prev.rows[inVec] || '').padEnd(outs.length, '0').slice(0, outs.length).split('');
      cur[outIdx] = cur[outIdx] === '1' ? '0' : '1';
      return {
        ...prev,
        rows: { ...prev.rows, [inVec]: cur.join('') },
      };
    });
  };

  const hasExprErrors = draft.mode === 'expr' && Object.keys(exprErrors).length > 0;
  const noOutError = outSlots.length === 0 ? '请至少分配 1 个 OUT 输出引脚。' : null;
  const canSave = !hasExprErrors && !noOutError;

  const handleSave = () => {
    if (!canSave) return;
    updateComponentProp(comp.id, 'chipName', draft.chipName.trim() || 'LUT');
    updateComponentProp(comp.id, 'truthConfigJson', JSON.stringify(draft));
    openTruthEditor(null);
  };

  const slotCount = draft.slots.length;

  return (
    <div
      data-testid="truth-editor-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-purple-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                {slotCount} 槽自定义真值/逻辑芯片编程器 — {comp.label}
              </h2>
              <p className="text-[11px] text-slate-400">
                可自由分配每个引脚的 IN / OUT / NC 角色与名称，并通过真值表或布尔公式定义映射规则
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openTruthEditor(null)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Chip name, mode & presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5">
                <span className="text-slate-400">丝印名称:</span>
                <input
                  type="text"
                  maxLength={12}
                  value={draft.chipName}
                  onChange={(e) => setDraft({ ...draft, chipName: e.target.value.toUpperCase() })}
                  className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-white"
                />
              </label>

              <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-0.5">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, mode: 'table' })}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                    draft.mode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  真值表模式
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, mode: 'expr' })}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium ${
                    draft.mode === 'expr' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  布尔公式模式
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> 预设:
              </span>
              <button
                type="button"
                onClick={() => setDraft(buildHalfAdderPreset(slotCount))}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
              >
                半加器
              </button>
              <button
                type="button"
                onClick={() => setDraft(buildMuxPreset(slotCount))}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
              >
                2:1 选择器
              </button>
              {slotCount >= 16 && (
                <button
                  type="button"
                  onClick={() => setDraft(buildDecoder3to8Preset(slotCount))}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px]"
                >
                  3-8 译码器
                </button>
              )}
            </div>
          </div>

          {/* Pin slot configuration grid */}
          <div>
            <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>DIP-{slotCount} 引脚槽位分配（当前: {inSlots.length} 输入 · {outSlots.length} 输出）</span>
              <span className="text-[10px] text-slate-500">NC 表示悬空不用，不显示在引脚端子上</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {draft.slots.map((slot, idx) => (
                <div
                  key={slot.pinId}
                  className={`p-2 rounded-lg border flex items-center justify-between gap-1.5 ${
                    slot.role === 'IN'
                      ? 'bg-sky-950/35 border-sky-500/40'
                      : slot.role === 'OUT'
                      ? 'bg-emerald-950/35 border-emerald-500/40'
                      : 'bg-slate-950/50 border-slate-800 opacity-70'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[9px] font-mono text-slate-500">Pin #{idx + 1} ({slot.pinId})</div>
                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) => handleSlotNameChange(slot.pinId, e.target.value)}
                      className="w-full bg-slate-900/90 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-white mt-0.5"
                    />
                  </div>
                  <select
                    data-testid={`slot-role-${slot.pinId}`}
                    value={slot.role}
                    onChange={(e) => handleRoleChange(slot.pinId, e.target.value as TruthSlotRole)}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-semibold"
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                    <option value="NC">NC</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Truth Table OR Expression Editor */}
          {draft.mode === 'table' ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-purple-300 mb-2">
                真值表点击映射 (点击右侧绿色/灰色 0/1 块即可翻转输出)
              </div>
              {inSlots.length === 0 || outSlots.length === 0 ? (
                <div className="text-slate-400 py-4 text-center">请至少分配 1 个 IN 引脚与 1 个 OUT 引脚。</div>
              ) : tooManyInputsForTable ? (
                <div className="text-amber-300 py-4 text-center space-y-2">
                  <div>当前输入超过 5 位（真值表行数 &gt; 32 行），请使用“布尔公式模式”编写高精度逻辑！</div>
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, mode: 'expr' })}
                    className="px-3 py-1 rounded bg-sky-600 text-white text-xs"
                  >
                    切换到布尔公式模式
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-60 overflow-y-auto">
                  <table className="w-full border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-700 bg-slate-900 text-slate-300">
                        {inSlots.map((s) => (
                          <th key={s.pinId} className="px-2 py-1 text-center text-sky-300">{s.name}</th>
                        ))}
                        <th className="px-2 py-1 text-center text-slate-500">→</th>
                        {outSlots.map((s) => (
                          <th key={s.pinId} className="px-2 py-1 text-center text-emerald-300">{s.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: tableRowCount }, (_, r) => {
                        const vec = r.toString(2).padStart(inSlots.length, '0');
                        const outVec = (draft.rows[vec] || '').padEnd(outSlots.length, '0');
                        return (
                          <tr key={vec} className="border-b border-slate-800/70 hover:bg-slate-900/60">
                            {vec.split('').map((b, i) => (
                              <td key={i} className="px-2 py-1 text-center text-slate-200">{b}</td>
                            ))}
                            <td className="px-2 py-1 text-center text-slate-600">⇒</td>
                            {outSlots.map((outS, oIdx) => {
                              const bit = outVec[oIdx] === '1' ? '1' : '0';
                              return (
                                <td key={outS.pinId} className="px-2 py-1 text-center">
                                  <button
                                    type="button"
                                    data-testid={`truth-cell-${vec}-${oIdx}`}
                                    onClick={() => toggleTableBit(vec, oIdx)}
                                    className={`w-7 h-5 rounded font-bold transition ${
                                      bit === '1'
                                        ? 'bg-emerald-500/30 border border-emerald-400 text-emerald-200'
                                        : 'bg-slate-800 border border-slate-700 text-slate-400'
                                    }`}
                                  >
                                    {bit}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-sky-300">布尔逻辑表达式编程</span>
                <span className="text-slate-400 font-mono">
                  可用变量: {inSlots.map((s) => s.name).join(', ') || '无'} | 运算符: ! (非), * &amp; (与), ^ (异或), + | (或)
                </span>
              </div>
              {outSlots.length === 0 ? (
                <div className="text-slate-400 py-3 text-center">请至少分配 1 个 OUT 输出引脚。</div>
              ) : (
                <div className="space-y-2.5">
                  {outSlots.map((outSlot) => {
                    const expr = draft.expressions[outSlot.pinId] ?? '0';
                    const errMsg = exprErrors[outSlot.pinId];
                    const sampleVars: Record<string, number> = {};
                    inSlots.forEach((s, idx) => {
                      sampleVars[s.name] = idx % 2 === 0 ? 1 : 0;
                      sampleVars[s.pinId] = sampleVars[s.name];
                    });
                    const sampleRes = errMsg ? null : evalBooleanExpression(expr, sampleVars);
                    return (
                      <div key={outSlot.pinId} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-20 font-mono text-emerald-300 font-semibold shrink-0">
                            {outSlot.name} =
                          </span>
                          <input
                            type="text"
                            data-testid={`expr-input-${outSlot.pinId}`}
                            value={expr}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                expressions: { ...draft.expressions, [outSlot.pinId]: e.target.value },
                              })
                            }
                            placeholder="例如: (A * B) + !C"
                            className={`flex-1 bg-slate-900 rounded px-2.5 py-1 font-mono text-white border ${
                              errMsg
                                ? 'border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500'
                                : 'border-slate-700'
                            }`}
                          />
                          {errMsg ? (
                            <span
                              data-testid={`expr-status-${outSlot.pinId}`}
                              className="text-[10px] font-mono text-rose-400 shrink-0"
                            >
                              公式错误 · 禁止烧录
                            </span>
                          ) : (
                            <span
                              data-testid={`expr-status-${outSlot.pinId}`}
                              className="text-[10px] font-mono text-emerald-400 shrink-0"
                            >
                              语法有效 · 示例试算 → {sampleRes}
                            </span>
                          )}
                        </div>
                        {errMsg && (
                          <div
                            data-testid={`expr-error-${outSlot.pinId}`}
                            className="ml-[88px] text-[11px] text-rose-300 bg-rose-950/50 border border-rose-500/35 rounded px-2 py-1"
                          >
                            {errMsg}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasExprErrors && (
                <div
                  data-testid="truth-editor-validation-banner"
                  className="text-[11px] text-rose-200 bg-rose-950/70 border border-rose-500/50 rounded-lg px-2.5 py-1.5"
                >
                  存在无效逻辑表达式：请修正红色报错后才能烧录保存（不会将不完整输入当作有效逻辑 0）。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            保存后芯片引脚数与 3D 封装丝印将自动同步刷新，并参与实时仿真与真值推导。
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openTruthEditor(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              取消
            </button>
            <button
              type="button"
              data-testid="truth-editor-save-btn"
              disabled={!canSave}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              烧录并应用芯片配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
