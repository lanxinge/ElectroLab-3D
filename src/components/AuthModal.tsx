import React, { useState } from 'react';
import { GraduationCap, LogIn, UserPlus, X } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('华东理工大学');
  const [major, setMajor] = useState('电气工程及其自动化');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === 'login') {
        await login(username, password);
      } else {
        await register({ username, password, displayName, university, major });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = async (u: string, p: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(u, p);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-slate-100">
            <GraduationCap className="w-5 h-5 text-sky-400" />
            <span>ElectroLab 本科电工学社区账号</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
            <button
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                tab === 'login' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              登录账号
            </button>
            <button
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                tab === 'register' ? 'bg-sky-500 text-slate-950 font-semibold' : 'text-slate-400'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              学生注册
            </button>
          </div>

          {error && (
            <div className="bg-red-950/70 border border-red-500/60 text-red-200 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">用户名 (英文/数字)</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如: zhangsan2026"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">密码 (至少 6 位)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-slate-400 mb-1">昵称 / 姓名</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例如: 张三 (电气2401)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">高校/学院</label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">专业</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition disabled:opacity-60"
            >
              {submitting ? '正在处理...' : tab === 'login' ? '立即登录' : '注册并登录'}
            </button>
          </form>

          {/* Demo quick-login buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-[11px] text-slate-400">快速体验演示账号 (密码均为 123456):</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => quickLogin('linxiao', '123456')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
              >
                一键登录: 林晓 (学生)
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => quickLogin('chenyu', '123456')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700"
              >
                一键登录: 陈宇 (助教)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
