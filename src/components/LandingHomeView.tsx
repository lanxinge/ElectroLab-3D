import React from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Cpu,
  FolderKanban,
  GraduationCap,
  Layers,
  Lightbulb,
  LogIn,
  MessageSquareText,
  Play,
  Sparkles,
  UserCheck,
  UserPlus,
  Waves,
  Zap,
} from 'lucide-react';
import { COMPONENT_CATALOG } from '../engine/componentCatalog';
import { CIRCUIT_PRESETS } from '../presets/circuitPresets';
import { useAuthStore } from '../store/useAuthStore';
import { useCircuitStore } from '../store/useCircuitStore';
import { usePonderStore } from '../store/usePonderStore';
import { TOTAL_TUTORIAL_STAGES, TUTORIAL_CHAPTERS, TUTORIAL_LESSONS } from '../tutorial/curriculumIndex';

interface LandingHomeViewProps {
  onOpenWorkbench: () => void;
  onOpenTutorial: (lessonId?: string, volume?: 'all' | 'vol1' | 'vol2') => void;
  onOpenForum: () => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenProjects: () => void;
}

const FEATURED_PRESET_IDS = [
  'preset-ac-nixie-encoder',
  'preset-turing-4bit-cpu',
  'preset-rc-transient',
  'preset-opamp-inverting',
];

export const LandingHomeView: React.FC<LandingHomeViewProps> = ({
  onOpenWorkbench,
  onOpenTutorial,
  onOpenForum,
  onOpenAuth,
  onOpenProjects,
}) => {
  const user = useAuthStore((s) => s.user);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const openPonder = usePonderStore((s) => s.openPonder);

  const moduleCount = Object.keys(COMPONENT_CATALOG).length;
  const vol1Count = TUTORIAL_CHAPTERS.filter((c) => c.volume === 'vol1').length;
  const vol2Count = TUTORIAL_CHAPTERS.filter((c) => c.volume === 'vol2').length;

  const featuredPresets = FEATURED_PRESET_IDS.map((id) =>
    CIRCUIT_PRESETS.find((p) => p.id === id)
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  const handleLaunchPreset = (presetId: string) => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    loadCircuit(structuredClone(preset.circuit), preset.title, preset.id, { isRunning: true });
    onOpenWorkbench();
  };

  return (
    <div
      data-testid="landing-home-view"
      className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(14,165,233,0.16),_transparent_58%)]"
    >
      <div className="max-w-7xl mx-auto px-5 py-6 space-y-6">
        {/* Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/95 to-sky-950/50 p-6 md:p-7 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ElectroLab 3D · 虚实融合三维电路仿真与本科电工学教学平台
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-50 tracking-tight leading-snug">
                3D + 2D 联动电路工作场，从零基础原理到图灵完备 4 位微处理器
              </h1>

              <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
                内置实时改进节点法 (MNA) 与数字事件混合求解引擎：既可在 3D 实验室与 2D 原理图分屏/悬浮模式自由搭接电路、观察 50Hz 交流双向光球与辉光灯管数码显示，也能通过 3D 思索剧场透视底层原理，或跟随上下册 {TUTORIAL_CHAPTERS.length} 章课程逐步通关。
              </p>

              {/* Direct Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  data-testid="home-cta-simulator"
                  onClick={onOpenWorkbench}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  立即进入 3D/2D 工作场
                  <ArrowRight className="w-4 h-4" />
                </button>

                {user ? (
                  <button
                    data-testid="home-cta-projects"
                    onClick={onOpenProjects}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow transition"
                  >
                    <FolderKanban className="w-4 h-4" />
                    我的云端工程 ({user.displayName})
                  </button>
                ) : (
                  <>
                    <button
                      data-testid="home-cta-register"
                      onClick={() => onOpenAuth('register')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow transition"
                    >
                      <UserPlus className="w-4 h-4" />
                      免费注册学生账号
                    </button>
                    <button
                      data-testid="home-cta-login"
                      onClick={() => onOpenAuth('login')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-medium text-sm transition"
                    >
                      <LogIn className="w-4 h-4 text-sky-400" />
                      账号登录
                    </button>
                  </>
                )}

                <button
                  data-testid="home-cta-tutorial"
                  onClick={() => onOpenTutorial(undefined, 'all')}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-200 font-semibold text-sm transition"
                >
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  零基础教学模式
                </button>

                <button
                  data-testid="home-cta-forum"
                  onClick={onOpenForum}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm transition"
                >
                  <MessageSquareText className="w-4 h-4 text-sky-400" />
                  交流论坛
                </button>
              </div>
            </div>

            {/* Right Stats Summary Card */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-sky-400" />
                  器件与功能模块
                </div>
                <div className="mt-1 text-2xl font-extrabold text-sky-300 font-mono">
                  {moduleCount} 类
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  含辉光管 / 编解码器 / 4位 CPU 全套组件
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  体系化闯关课程
                </div>
                <div className="mt-1 text-2xl font-extrabold text-amber-300 font-mono">
                  {TUTORIAL_CHAPTERS.length} 章 · {TOTAL_TUTORIAL_STAGES} 关
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  电工学上册 {vol1Count} 章 + 下册 {vol2Count} 章 ({TUTORIAL_LESSONS.length} 节)
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-cyan-400" />
                  抗混叠交流动效
                </div>
                <div className="mt-1 text-xl font-extrabold text-cyan-300 font-mono">
                  50Hz+ 双向流
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  交流正弦往复穿梭 · 整流单向脉动智能区分
                </div>
              </div>

              <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3.5">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  自定义与云端
                </div>
                <div className="mt-1 text-xl font-extrabold text-emerald-300 font-mono">
                  LUT / 云端 IC
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  8/16 槽真值表 · 自由封装子电路同步云端
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Platform Capabilities */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              平台核心功能与教学特色
            </h2>
            <span className="text-xs text-slate-400">支持 3D 实验室 / 纯 2D 原理图 / 双屏协同</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2 hover:border-cyan-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                  <Waves className="w-4 h-4" />
                  交流双向电流动效升级
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  实时波形统计
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                50Hz/60Hz 交流导线不再因帧率混叠假死或停滞：基于一个完整工频周期内的交流有效值与过零反转判定，3D 能量球与 2D 虚线均以平滑正弦往复流清晰呈现，二极管半波整流支路仍保持单向直流推进。
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2 hover:border-amber-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  辉光灯管与优先编解码模块
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  显示与译码
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                全新建模 0–9 十进制玻璃辉光灯管（金属丝网罩、暖橙氖光晕与 BCD 消隐控制），搭配 4-2 优先编码器 (含 GS/EO 级联指示)、2-4 译码器与 4 位 2 选 1 多路选择器，直观展示编码到可视数字显示全链路。
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2 hover:border-emerald-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  图灵完备 4 位计算套件
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  4-bit CPU
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                配齐 4 位寄存器 (<code className="text-emerald-200">REGISTER_4BIT</code>)、8 功能算术逻辑单元 (<code className="text-emerald-200">ALU_4BIT</code> 含 COUT/ZERO 标志位) 与支持界面十六进制改写的 <code className="text-emerald-200">16×4 RAM</code>，配合时钟与状态控制即可运行累加计数等图灵完备数据通路。
              </p>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5 hover:border-sky-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-sky-300 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  电工学上下册零基础教学
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {TUTORIAL_CHAPTERS.length} 章 {TOTAL_TUTORIAL_STAGES} 关
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                覆盖电位参考地、基尔霍夫、暂态三要素、谐振无功补偿、三相供电到下册二极管整流、BJT/MOS、运放、组合/时序数字逻辑与 NE555。支持一键切换上册或下册课程：
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  data-testid="home-jump-vol1"
                  onClick={() => onOpenTutorial('ch0-loop-and-meters', 'vol1')}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-medium transition"
                >
                  开始上册学习
                </button>
                <button
                  data-testid="home-jump-vol2"
                  onClick={() => onOpenTutorial('ch7-diodes-and-rectifiers', 'vol2')}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition"
                >
                  开始下册学习
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5 hover:border-violet-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-violet-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  MC 机械动力风格 3D 思索
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  {moduleCount} 类全覆盖
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                工作台中鼠标悬停任意模块按 <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200">W</kbd> 或点击“思索”，即可弹出独立 3D 原理动画与“解释当前元件”工作台联动参数。立即试看：
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  data-testid="home-ponder-nixie"
                  onClick={() => openPonder('NIXIE_TUBE')}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 text-[11px] font-medium transition"
                >
                  思索：辉光灯管
                </button>
                <button
                  data-testid="home-ponder-alu"
                  onClick={() => openPonder('ALU_4BIT')}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-200 text-[11px] font-medium transition"
                >
                  思索：4 位 ALU
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 space-y-2 hover:border-indigo-500/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  工程持久化、真值芯片与社区
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  本地 + 云端
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                支持本地导入/导出 <code className="text-indigo-200">.electrolab.json</code> 工程文件、8/16 槽真值表与逻辑表达式定制芯片、电路打包为云端集成模块、4 通道同步示波器及社区一键 Fork 复现实验。
              </p>
            </div>
          </div>
        </section>

        {/* Featured Presets Quick Launch */}
        <section className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              精选实验直达工作场（点击即刻加载并运行）
            </h2>
            <button
              onClick={onOpenWorkbench}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 transition"
            >
              打开空白工作场
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {featuredPresets.map((preset) => (
              <button
                key={preset.id}
                data-testid={`home-preset-${preset.id}`}
                onClick={() => handleLaunchPreset(preset.id)}
                className="text-left rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/50 p-4 flex flex-col justify-between gap-3 transition group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-medium">
                      {preset.category}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {preset.circuit.components.length} 元件 · {preset.circuit.wires.length} 连线
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition">
                    {preset.title}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {preset.description}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 group-hover:translate-x-0.5 transition">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  载入工作场并运行
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
