import React, { useEffect, useState } from 'react';
import {
  Flame,
  GitFork,
  Heart,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import type { ForumCategory, ForumPost, ForumPostDetail } from '../../shared/types';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { CircuitSchematicPreview } from './Schematic2DSidebar';

const CATEGORIES: Array<ForumCategory | '全部'> = [
  '全部',
  '模电基础',
  '数电逻辑',
  '暂态与滤波',
  '运算放大',
  '综合设计',
  '问答求助',
];

export const ForumView: React.FC<{
  refreshTrigger: number;
  onForkToSimulator: () => void;
  onOpenPublish: () => void;
  onOpenAuth: () => void;
}> = ({ refreshTrigger, onForkToSimulator, onOpenPublish, onOpenAuth }) => {
  const user = useAuthStore((s) => s.user);
  const apiFetch = useAuthStore((s) => s.apiFetch);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ForumCategory | '全部'>('全部');
  const [sort, setSort] = useState<'latest' | 'likes'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePostDetail, setActivePostDetail] = useState<ForumPostDetail | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== '全部') params.set('category', category);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('sort', sort);
      const data = await apiFetch<{ posts: ForumPost[] }>(`/api/forum/posts?${params.toString()}`);
      setPosts(data.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [category, sort, refreshTrigger, user?.id]);

  const openDetail = async (postId: number) => {
    try {
      const data = await apiFetch<{ post: ForumPostDetail }>(`/api/forum/posts/${postId}`);
      setActivePostDetail(data.post);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleLike = async (postId: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      const res = await apiFetch<{ liked: boolean; likesCount: number }>(
        `/api/forum/posts/${postId}/like`,
        { method: 'POST' }
      );
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likedByMe: res.liked, likesCount: res.likesCount } : p
        )
      );
      if (activePostDetail?.id === postId) {
        setActivePostDetail({
          ...activePostDetail,
          likedByMe: res.liked,
          likesCount: res.likesCount,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFork = async (post: ForumPost, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await apiFetch<{ title: string; circuitData: ForumPost['circuitData']; forksCount: number }>(
        `/api/forum/posts/${post.id}/fork`,
        { method: 'POST' }
      );
      loadCircuit(res.circuitData, `[Fork] ${res.title}`, null);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, forksCount: res.forksCount } : p))
      );
      setActivePostDetail(null);
      onForkToSimulator();
    } catch {
      loadCircuit(post.circuitData, `[Fork] ${post.title}`, null);
      onForkToSimulator();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePostDetail) return;
    if (!user) {
      onOpenAuth();
      return;
    }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await apiFetch<{ comment: ForumPostDetail['comments'][number]; commentsCount: number }>(
        `/api/forum/posts/${activePostDetail.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ content: commentText.trim() }),
        }
      );
      setActivePostDetail({
        ...activePostDetail,
        commentsCount: res.commentsCount,
        comments: [...activePostDetail.comments, res.comment],
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePostDetail.id ? { ...p, commentsCount: res.commentsCount } : p
        )
      );
      setCommentText('');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await apiFetch(`/api/forum/posts/${postId}`, { method: 'DELETE' });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setActivePostDetail(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero / Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-xl p-5">
          <div>
            <h1 className="text-xl font-bold text-slate-100">
              本科电工学电路作品交流论坛
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              分享模电、数电、卡诺图与运放实验电路，支持一键 Fork 到 3D+2D 仿真工作台直接调试与测量！
            </p>
          </div>
          <button
            onClick={() => (user ? onOpenPublish() : onOpenAuth())}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs shrink-0 transition"
          >
            <Plus className="w-4 h-4" />
            发布我的工作台电路
          </button>
        </div>

        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  category === cat
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchPosts();
              }}
              className="relative"
            >
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索作品或作者..."
                className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </form>
            <button
              onClick={() => setSort((s) => (s === 'latest' ? 'likes' : 'latest'))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:border-sky-500/50"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {sort === 'latest' ? '最新发布' : '最多点赞'}
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">正在加载论坛电路作品...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-800 rounded-xl">
            暂无匹配的电路帖子，快来发布第一个实验作品吧！
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article
                key={post.id}
                onClick={() => openDetail(post.id)}
                className="group bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-xl overflow-hidden flex flex-col cursor-pointer transition shadow-lg"
              >
                {/* 2D Schematic Preview Thumbnail */}
                <div className="h-44 relative border-b border-slate-800 overflow-hidden">
                  <CircuitSchematicPreview circuit={post.circuitData} />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] text-sky-300 font-medium">
                    {post.category}
                  </span>
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/85 text-[10px] font-mono text-slate-400">
                    {post.circuitData.components.length} 元件 · {post.circuitData.wires.length} 导线
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="font-semibold text-sm text-slate-100 group-hover:text-sky-300 transition line-clamp-1">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {post.summary}
                    </p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate">
                        <strong className="text-slate-200">{post.authorName}</strong> ·{' '}
                        {post.authorUniversity}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <button
                          onClick={(e) => handleToggleLike(post.id, e)}
                          className={`flex items-center gap-1 transition ${
                            post.likedByMe
                              ? 'text-rose-400 font-semibold'
                              : 'text-slate-400 hover:text-rose-400'
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${post.likedByMe ? 'fill-current' : ''}`}
                          />
                          {post.likesCount}
                        </button>
                        <span className="flex items-center gap-1 text-slate-400">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.commentsCount}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <GitFork className="w-3.5 h-3.5" />
                          {post.forksCount}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleFork(post, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white text-[11px] font-medium transition"
                      >
                        <GitFork className="w-3 h-3" />
                        在模拟器运行
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {activePostDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[11px] shrink-0">
                  {activePostDetail.category}
                </span>
                <h2 className="font-bold text-slate-100 truncate">{activePostDetail.title}</h2>
              </div>
              <button
                onClick={() => setActivePostDetail(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                <div>
                  作者: <strong className="text-slate-200">{activePostDetail.authorName}</strong> (
                  {activePostDetail.authorUniversity} · {activePostDetail.authorMajor}) ·{' '}
                  {activePostDetail.createdAt}
                </div>
                <div className="flex items-center gap-2">
                  {user?.id === activePostDetail.userId && (
                    <button
                      onClick={() => handleDeletePost(activePostDetail.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/60 hover:bg-red-900 text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除帖子
                    </button>
                  )}
                  <button
                    onClick={() => handleFork(activePostDetail)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    Fork 到 3D+2D 工作台运行
                  </button>
                </div>
              </div>

              <div className="h-64 rounded-xl overflow-hidden border border-slate-800">
                <CircuitSchematicPreview circuit={activePostDetail.circuitData} />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 text-slate-200 leading-relaxed whitespace-pre-wrap">
                {activePostDetail.content}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleLike(activePostDetail.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition ${
                    activePostDetail.likedByMe
                      ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-rose-500/50'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${activePostDetail.likedByMe ? 'fill-current' : ''}`}
                  />
                  点赞 ({activePostDetail.likesCount})
                </button>
                <span className="text-slate-400">
                  已被加载运行 {activePostDetail.forksCount} 次
                </span>
              </div>

              {/* Comments Section */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="font-semibold text-slate-200">
                  实验交流评论 ({activePostDetail.comments.length})
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder={
                      user ? '发表你的电路分析或改进建议...' : '登录后即可参与评论讨论...'
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    评论
                  </button>
                </form>

                <div className="space-y-2.5">
                  {activePostDetail.comments.length === 0 ? (
                    <div className="text-slate-500 text-center py-4">暂无评论，来抢占沙发吧！</div>
                  ) : (
                    activePostDetail.comments.map((cm) => (
                      <div
                        key={cm.id}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            <strong className="text-sky-300">{cm.authorName}</strong> ·{' '}
                            {cm.authorUniversity}
                          </span>
                          <span>{cm.createdAt}</span>
                        </div>
                        <div className="text-slate-200 leading-relaxed">{cm.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
