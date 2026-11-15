import React, { useEffect, useMemo, useState } from 'react';
import { Cloud, CloudUpload, Cpu, PackagePlus, Plus, Trash2, X } from 'lucide-react';
import { packageCircuitAsIc } from '../engine/customIcEngine';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { useCustomIcStore } from '../store/useCustomIcStore';
import { useUIStore } from '../store/useUIStore';

const IC_COLORS = ['#0284c7', '#7c3aed', '#059669', '#d97706', '#e11d48'];

export const PackageIcModal: React.FC = () => {
  const open = useUIStore((s) => s.packageIcModalOpen);
  const setOpen = useUIStore((s) => s.setPackageIcModalOpen);

  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const projectTitle = useCircuitStore((s) => s.projectTitle);
  const spawnCustomIc = useCircuitStore((s) => s.spawnCustomIc);

  const user = useAuthStore((s) => s.user);
  const cloudIcs = useCustomIcStore((s) => s.cloudIcs);
  const loading = useCustomIcStore((s) => s.loading);
  const saveCloudIc = useCustomIcStore((s) => s.saveCloudIc);
  const deleteCloudIc = useCustomIcStore((s) => s.deleteCloudIc);
  const addSessionIc = useCustomIcStore((s) => s.addSessionIc);

  const [name, setName] = useState('我的封装芯片');
  const [codeName, setCodeName] = useState('U_CUSTOM');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(IC_COLORS[0]);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (open) {
      setName(`${projectTitle.replace(/\s+/g, '') || '自制电路'} IC`);
      setCodeName('U_MOD');
      setDescription(`由 ${components.length} 个元器件与 ${wires.length} 根连线打包封装`);
      setFeedback(null);
    }
  }, [open, projectTitle, components.length, wires.length]);

  const { previewPayload, packageError } = useMemo(() => {
    try {
      const payload = packageCircuitAsIc(
        { components, wires },
        { name: name || 'Custom IC', codeName: codeName || 'U', description, color }
      );
      return { previewPayload: payload, packageError: null as string | null };
    } catch (err) {
      return {
        previewPayload: null,
        packageError: err instanceof Error ? err.message : '当前电路暂不支持直接打包',
      };
    }
  }, [components, wires, name, codeName, description, color]);

  if (!open) return null;

  const hasPins = Boolean(previewPayload && previewPayload.pins.length > 0);
  const inPins = previewPayload ? previewPayload.pins.filter((p) => p.direction === 'in') : [];
  const outPins = previewPayload ? previewPayload.pins.filter((p) => p.direction === 'out') : [];

  const handleSaveCloud = async () => {
    setFeedback(null);
    if (!user) {
      setFeedback({ kind: 'err', text: '请先在顶部栏登录个人账号，即可将集成芯片永久保存到云端数据库！' });
      return;
    }
    if (!previewPayload || !hasPins) {
      setFeedback({ kind: 'err', text: packageError || '工作台中暂无任何端口：请先放置 IC 输入/输出端口或开关激励！' });
      return;
    }
    try {
      const saved = await saveCloudIc(previewPayload);
      setFeedback({ kind: 'ok', text: `已将「${saved.name}」永久保存至云端个人芯片库！` });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : '云端保存失败' });
    }
  };

  const handleSaveAndSpawn = async () => {
    setFeedback(null);
    if (!previewPayload || !hasPins) {
      setFeedback({ kind: 'err', text: packageError || '无法打包：未检测到对外端口引脚。' });
      return;
    }
    addSessionIc(previewPayload);
    if (user) {
      try {
        await saveCloudIc(previewPayload);
      } catch {
        // Still allow local session spawn if cloud transient error
      }
    }
    spawnCustomIc(previewPayload);
    setOpen(false);
  };

  return (
    <div
      data-testid="package-ic-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-4xl max-h-[88vh] flex flex-col bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-fuchsia-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                集成电路模块打包与云端芯片库 (Hierarchical IC)
              </h2>
              <p className="text-[11px] text-slate-400">
                将当前工作台电路封装为可无限复用、真实层次展开仿真的标准集成块，并永久存入个人云端账号
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Package current workbench */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3.5">
            <div className="font-semibold text-fuchsia-300 flex items-center gap-1.5 text-xs">
              <Cpu className="w-4 h-4" /> 打包当前工作台电路
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="col-span-2">
                <span className="text-[11px] text-slate-400 block mb-1">芯片模块名称</span>
                <input
                  type="text"
                  data-testid="package-ic-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                />
              </label>
              <label>
                <span className="text-[11px] text-slate-400 block mb-1">芯片代号 (≤8字符)</span>
                <input
                  type="text"
                  maxLength={8}
                  value={codeName}
                  onChange={(e) => setCodeName(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 font-mono text-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] text-slate-400 block mb-1">功能备注说明</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">丝印标记色:</span>
              <div className="flex items-center gap-1.5">
                {IC_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-5 h-5 rounded-full border-2 ${
                      color === c ? 'border-white scale-110' : 'border-transparent opacity-70'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Pin auto-detection summary */}
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">内部拓扑规模:</span>
                <span className="font-mono text-sky-300">
                  {previewPayload
                    ? `${previewPayload.internalCircuit.components.length} 元件 · ${previewPayload.internalCircuit.wires.length} 导线`
                    : `${components.length} 元件 · ${wires.length} 导线`}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                自动提取封装引脚 ({previewPayload?.pins.length ?? 0}):
              </div>
              {hasPins ? (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="space-y-0.5">
                    <div className="text-sky-400">左侧输入 ({inPins.length}):</div>
                    {inPins.map((p) => (
                      <div key={p.pinId} className="px-1.5 py-0.5 rounded bg-sky-950/50 border border-sky-500/30">
                        {p.pinId}: {p.name}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-emerald-400">右侧输出 ({outPins.length}):</div>
                    {outPins.map((p) => (
                      <div key={p.pinId} className="px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30">
                        {p.pinId}: {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-amber-400 text-[11px]">
                  {packageError || '未检测到 IC 封装端口：请放入「IC 输入端口 / IC 输出端口」或逻辑输入输出开关后再打包。'}
                </div>
              )}
            </div>

            {feedback && (
              <div
                className={`p-2 rounded text-[11px] border ${
                  feedback.kind === 'ok'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/40 text-red-200'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                data-testid="save-cloud-ic-btn"
                disabled={loading || !hasPins}
                onClick={handleSaveCloud}
                className="w-full py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <CloudUpload className="w-4 h-4" />
                {loading ? '正在上传至云端...' : '永久保存至云端账号'}
              </button>
              <button
                type="button"
                data-testid="spawn-packaged-ic-btn"
                disabled={!hasPins}
                onClick={handleSaveAndSpawn}
                className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" />
                {user ? '保存到云端并在工作台生成该芯片' : '暂存本会话并生成到工作台'}
              </button>
            </div>
          </div>

          {/* Right: Cloud library */}
          <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-lg p-3.5 flex flex-col">
            <div className="font-semibold text-sky-300 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-4 h-4" /> 我的云端集成芯片库
              </span>
              <span className="text-[10px] text-slate-400">
                {user ? `账号: ${user.displayName}` : '未登录'}
              </span>
            </div>

            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4 space-y-2 border border-dashed border-slate-800 rounded-lg">
                <Cloud className="w-7 h-7 text-slate-600" />
                <p>登录后，您保存的每一个自定义集成块都将跨设备永久同步至云端。</p>
              </div>
            ) : cloudIcs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-4 border border-dashed border-slate-800 rounded-lg">
                云端芯片库暂空，请在左侧打包你的第一颗定制集成芯片！
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 max-h-96 pr-1">
                {cloudIcs.map((ic) => (
                  <div
                    key={ic.id}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-500/40 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ic.color }}
                        />
                        <span className="font-semibold text-white truncate">{ic.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300">
                          {ic.codeName}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {ic.icPayload.pins.length} 引脚 · 含 {ic.icPayload.internalCircuit.components.length} 子元件
                        {ic.description ? ` · ${ic.description}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-testid={`spawn-cloud-ic-${ic.id}`}
                        onClick={() => {
                          spawnCustomIc(ic.icPayload);
                          setOpen(false);
                        }}
                        className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px]"
                      >
                        放入台面
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCloudIc(ic.id)}
                        title="永久删除"
                        className="p-1.5 rounded bg-slate-800 hover:bg-red-900/60 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
