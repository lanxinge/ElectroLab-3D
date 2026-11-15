import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import type { ForumCategory } from '../../shared/types';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { CircuitSchematicPreview } from './Schematic2DSidebar';

const CATEGORIES: ForumCategory[] = [
  '模电基础',
  '数电逻辑',
  '暂态与滤波',
  '运算放大',
  '综合设计',
  '问答求助',
];

export const PublishCircuitModal: React.FC<{
  onClose: () => void;
  onPublished: () => void;
}> = ({ onClose, onPublished }) => {
  const projectTitle = useCircuitStore((s) => s.projectTitle);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const apiFetch = useAuthStore((s) => s.apiFetch);

  const [title, setTitle] = useState(projectTitle || '我的电工学实验作品');
  const [category, setCategory] = useState<ForumCategory>('综合设计');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('电工学实验, 3D仿真');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (components.length === 0) {
      setError('当前工作台为空，请先搭建电路再发布！');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const tags = tagsStr
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

      await apiFetch('/api/forum/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          summary,
          content,
          category,
          tags,
          circuitData: { components, wires },
        }),
      });
      onPublished();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="font-semibold text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-sky-400" />
            <span>发布当前电路作品到交流论坛</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="bg-red-950/70 border border-red-500/60 text-red-200 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1">作品标题 *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">实验分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ForumCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">一句话简介 (选填)</label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="简述电路功能或关键实验现象"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">电路原理与实验分析 *</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享您的设计思路、KVL/KCL 计算结果、卡诺图化简过程或遇到的问题..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">标签 (逗号分隔)</label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          </div>

          <div>
            <div className="text-slate-400 mb-1">
              附带电路快照预览 ({components.length} 个元件 · {wires.length} 根导线)
            </div>
            <div className="h-44 rounded-lg overflow-hidden border border-slate-800">
              <CircuitSchematicPreview circuit={{ components, wires }} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold disabled:opacity-60"
            >
              {submitting ? '正在发布...' : '立即公开发布'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
