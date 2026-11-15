import React from 'react';
import { ArrowRight, BookOpen, CircuitBoard, Cpu, Play, Sparkles, Waves } from 'lucide-react';
import { COMPONENT_CATALOG } from '../engine/componentCatalog';
import { CIRCUIT_PRESETS } from '../presets/circuitPresets';
import { useCircuitStore } from '../store/useCircuitStore';
import { useTutorialStore } from '../store/useTutorialStore';
import { useUIStore } from '../store/useUIStore';
import { getLessonById, TOTAL_TUTORIAL_STAGES, TUTORIAL_CHAPTERS, TUTORIAL_LESSONS } from '../tutorial/curriculumIndex';

interface LandingHomeViewProps {
  onOpenWorkbench: () => void;
  onOpenTutorial: (lessonId?: string, volume?: 'all' | 'vol1' | 'vol2') => void;
  onOpenForum: () => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenProjects: () => void;
}

const highlights = [
  { id: 'ch3-rc-transient', name: '看见电容充放电', detail: '拨动开关，把电压曲线与时间常数联系起来。', icon: Waves, color: 'text-sky-300' },
  { id: 'ch13-timer-555-pulse-circuits', name: '让电路自己产生节拍', detail: '从双门限到单稳脉冲，亲手调出 555 方波。', icon: Cpu, color: 'text-violet-300' },
  { id: 'ch13-dac-conversion', name: '把数字变成电压', detail: '改变二进制输入，观察 DAC 合成阶梯波。', icon: CircuitBoard, color: 'text-emerald-300' },
];
const featuredIds = ['preset-rc-transient', 'preset-opamp-inverting', 'preset-ac-nixie-encoder', 'preset-turing-4bit-cpu'];

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({ onOpenWorkbench, onOpenTutorial, onOpenForum, onOpenProjects }) => {
  const lessonId = useTutorialStore(s => s.currentLessonId);
  const stageIndex = useTutorialStore(s => s.currentStageIndex);
  const completed = useTutorialStore(s => s.completedStageIds);
  const lesson = getLessonById(lessonId);
  const hasProgress = completed.length > 0 || lessonId !== TUTORIAL_LESSONS[0].id || stageIndex > 0;
  const launchPreset = (id: string) => {
    const preset = CIRCUIT_PRESETS.find(p => p.id === id);
    if (!preset) return;
    useCircuitStore.getState().loadCircuit(structuredClone(preset.circuit), preset.title, preset.id, { isRunning: true });
    useUIStore.getState().setAnalysisOpen(true);
    onOpenWorkbench();
  };

  return (
    <main data-testid="landing-home-view" className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_80%_0%,_rgba(14,165,233,0.12),_transparent_55%)]">
      <div className="max-w-6xl mx-auto px-6 sm:px-9 py-10 lg:py-14 space-y-10">
        <section className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs tracking-widest text-sky-300 font-semibold"><CircuitBoard className="w-4 h-4" /> ELECTROLAB 3D <span className="text-slate-500 tracking-normal">交互电路实验室</span></div>
            <h1 className="mt-5 text-4xl sm:text-5xl xl:text-6xl font-bold leading-[1.2] tracking-tight">看见电路。<br /><span className="text-sky-300">理解原理。</span></h1>
            <p className="mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-slate-400">搭接电路、调节参数，让抽象公式变成眼前的变化。<br className="hidden sm:block" />在 3D 实验台与 2D 原理图之间，找到自己的理解方式。</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button data-testid="home-cta-tutorial" onClick={() => onOpenTutorial()} className="inline-flex items-center gap-2 rounded-xl bg-sky-400 hover:bg-sky-300 px-5 py-3 text-sm font-bold text-slate-950 transition"><Play className="w-4 h-4" />{hasProgress ? '继续学习' : '开始第一课'}<ArrowRight className="w-4 h-4" /></button>
              <button data-testid="home-cta-simulator" onClick={onOpenWorkbench} className="rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 px-5 py-3 text-sm text-slate-200 transition">进入自由实验台</button>
            </div>
            <p className="mt-3 text-xs text-slate-500">无需登录即可实验 · 工程可保存到本地</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-800"><span className="text-xs text-sky-200 flex items-center gap-2"><BookOpen className="w-4 h-4" />你的学习工作台</span><span className="font-mono text-xs text-slate-500">{completed.length} / {TOTAL_TUTORIAL_STAGES}</span></div>
            {/* 原创电路示意：从操作到观察的学习过程。 */}
            <svg viewBox="0 0 440 150" className="w-full h-40 text-sky-400" role="img" aria-label="电源、电阻和电容组成的充放电回路示意">
              <defs><pattern id="home-grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#1e293b" /></pattern></defs><rect width="440" height="150" fill="url(#home-grid)" />
              <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M70 53V35H160 M200 35H300V68 M300 83V122H70V96" opacity=".7" /><circle cx="70" cy="75" r="21" /><path d="M64 70H76 M70 64V76 M65 84H75" /><rect x="160" y="24" width="40" height="22" rx="3" /><path d="M281 69H319 M281 82H319" stroke="#34d399" /><path d="M335 112C345 108 350 54 370 45S402 41 415 41" stroke="#34d399" /></g>
              <g fill="#94a3b8" fontSize="11" fontFamily="sans-serif"><text x="60" y="145">电源</text><text x="169" y="66">电阻</text><text x="280" y="145">电容</text><text x="348" y="135">观察变化</text></g>
            </svg>
            <div className="px-5 pb-5"><p className="text-[11px] text-slate-500">{hasProgress ? '上次学习到' : '从这里开始'}</p><p className="mt-1 text-sm font-semibold text-slate-200">{lesson.title}</p><p className="mt-1 text-xs text-slate-400">步骤 {stageIndex + 1} · {lesson.stages[stageIndex]?.title}</p>
              <div className="mt-4 h-1.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label="课程完成进度" aria-valuenow={completed.length} aria-valuemin={0} aria-valuemax={TOTAL_TUTORIAL_STAGES}><div className="h-full bg-sky-400 transition-all" style={{ width: `${completed.length / TOTAL_TUTORIAL_STAGES * 100}%` }} /></div>
            </div>
          </div>
        </section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-slate-800/80 py-5">
          {[[Object.keys(COMPONENT_CATALOG).length, '类交互器件'], [TUTORIAL_CHAPTERS.length, '章电工电子课程'], [TUTORIAL_LESSONS.length, '课渐进实验'], [TOTAL_TUTORIAL_STAGES, '个可操作步骤']].map(([n, label]) => <div key={label} className="flex items-baseline gap-2"><span className="text-2xl font-semibold text-slate-100 font-mono">{n}</span><span className="text-xs text-slate-500">{label}</span></div>)}
        </div>
        <section>
          <div className="flex flex-wrap gap-3 items-end justify-between mb-4"><div><p className="text-xs text-sky-300 mb-1">先动手，再理解</p><h2 className="text-lg font-semibold">三个实验，认识这个实验室</h2></div><div className="flex gap-3 text-xs text-slate-400"><button data-testid="home-jump-vol1" onClick={() => onOpenTutorial('ch0-loop-and-meters', 'vol1')} className="hover:text-sky-300">上册 · 电路基础 →</button><button data-testid="home-jump-vol2" onClick={() => onOpenTutorial('ch7-diodes-and-rectifiers', 'vol2')} className="hover:text-sky-300">下册 · 模电数电 →</button></div></div>
          <div className="grid md:grid-cols-3 gap-4">
            {highlights.map(({ id, name, detail, icon: Icon, color }, i) => <button key={id} data-testid={`home-lesson-${id}`} onClick={() => onOpenTutorial(id)} className="group text-left rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-600 p-5 transition"><div className="flex justify-between items-center"><Icon className={`w-6 h-6 ${color}`} /><span className="text-xs font-mono text-slate-600">0{i + 1}</span></div><h3 className="mt-4 font-semibold text-sm">{name}</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">{detail}</p><span className={`mt-4 inline-flex items-center gap-1 text-xs ${color}`}>开始实验<ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" /></span></button>)}
          </div>
        </section>
        <section>
          <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-semibold">自由探索</h2><button onClick={onOpenProjects} className="text-xs text-sky-300 hover:text-sky-200">打开我的工程 →</button></div>
          <div className="grid sm:grid-cols-2 gap-3">{featuredIds.map(id => CIRCUIT_PRESETS.find(p => p.id === id)).filter(p => !!p).map(preset => <button key={preset.id} data-testid={`home-preset-${preset.id}`} onClick={() => launchPreset(preset.id)} className="flex items-center gap-4 text-left rounded-xl border border-slate-800 hover:border-slate-600 bg-slate-900/40 p-4 transition"><Sparkles className="w-5 h-5 text-slate-500 shrink-0" /><div className="min-w-0 flex-1"><p className="text-sm text-slate-200 truncate">{preset.title}</p><p className="text-xs text-slate-500 mt-1">{preset.category} · {preset.circuit.components.length} 个元件</p></div><ArrowRight className="w-4 h-4 text-slate-500 shrink-0" /></button>)}</div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-3 pb-4 text-xs text-slate-500"><span>ElectroLab 3D · 让理解，发生在每一次操作里。</span><button onClick={onOpenForum} className="hover:text-sky-300">去社区交流实验 →</button></footer>
      </div>
    </main>
  );
};
