import React, { useEffect, useState } from 'react';
import { Download, FolderOpen, Save, Trash2, Upload, X } from 'lucide-react';
import type { CircuitData, SavedProject } from '../../shared/types';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { downloadProjectFile, parseProjectFile } from '../utils/projectFileIO';

export const MyProjectsModal: React.FC<{
  onClose: () => void;
  onOpenAuth: () => void;
  onLoadProject: (circuit: CircuitData, title: string) => void;
}> = ({ onClose, onOpenAuth, onLoadProject }) => {
  const user = useAuthStore((s) => s.user);
  const apiFetch = useAuthStore((s) => s.apiFetch);

  const projectTitle = useCircuitStore((s) => s.projectTitle);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveTitle, setSaveTitle] = useState(projectTitle || '未命名电路实验');
  const [saveDesc, setSaveDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ projects: SavedProject[] }>('/api/projects');
      setProjects(data.projects);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleSaveCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setError(null);
    setSuccessMsg(null);
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          title: saveTitle,
          description: saveDesc,
          category: '综合设计',
          circuitData: { components, wires },
        }),
      });
      setSuccessMsg('已成功保存至您的云端实验库！');
      fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleExportJson = () => {
    downloadProjectFile(projectTitle, { components, wires });
    setSuccessMsg('工程已导出，可从项目库或工作台重新打开。');
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const parsed = parseProjectFile(await file.text());
      onLoadProject(parsed.circuit, parsed.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : '无法读取电路工程文件');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="font-semibold text-slate-100 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-400" />
            <span>个人云端电路仓库与本地导入导出</span>
          </div>
          <button onClick={onClose} aria-label="关闭项目库" className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Local JSON import/export */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3">
            <span className="text-slate-300">本地工程 · .elab.json / .json</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                导出 JSON
              </button>
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                导入 JSON
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-950/70 border border-red-500/60 text-red-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 px-3 py-2 rounded-lg">
              {successMsg}
            </div>
          )}

          {!user ? (
            <div className="text-center py-8 bg-slate-950/60 rounded-lg border border-slate-800 space-y-3">
              <div className="text-slate-300">登录后即可将您的电路设计永久保存至云端数据库</div>
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
              >
                去登录 / 注册
              </button>
            </div>
          ) : (
            <>
              <form
                onSubmit={handleSaveCloud}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5"
              >
                <div className="font-semibold text-slate-200">将当前工作台电路另存为云端项目</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                    placeholder="项目名称"
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                  <input
                    type="text"
                    value={saveDesc}
                    onChange={(e) => setSaveDesc(e.target.value)}
                    placeholder="备注说明 (选填)"
                    className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                >
                  <Save className="w-3.5 h-3.5" />
                  保存到云端 ({components.length} 元件)
                </button>
              </form>

              <div className="space-y-2">
                <div className="font-semibold text-slate-300">
                  我的云端项目列表 ({projects.length})
                </div>
                {loading ? (
                  <div className="text-slate-400 py-4 text-center">加载中...</div>
                ) : projects.length === 0 ? (
                  <div className="text-slate-500 py-4 text-center">暂无云端保存的项目</div>
                ) : (
                  projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3 hover:border-slate-700"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-semibold text-slate-100 truncate">{p.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {p.description || '无描述'} · {p.circuitData.components.length} 元件 ·{' '}
                          {p.updatedAt}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            try { onLoadProject(p.circuitData, p.title); }
                            catch (err) { setError(err instanceof Error ? err.message : '加载工程失败'); }
                          }}
                          className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white"
                        >
                          加载到实验台
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-900/60 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
