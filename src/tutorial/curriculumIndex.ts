import { LESSONS_CH0_TO_CH2 } from './lessonsCh0ToCh2';
import { LESSONS_CH3_TO_CH6 } from './lessonsCh3ToCh6';
import type { TutorialChapter, TutorialLesson } from './tutorialTypes';

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'ch0',
    chapterNumber: 0,
    title: '第0章 零基础认识电与仪表',
    subtitle: '电位、参考地、闭合回路与安全测量的第一性原理',
    accent: 'amber',
    lessonIds: ['ch0-loop-and-meters'],
  },
  {
    id: 'ch1',
    chapterNumber: 1,
    title: '第1章 电路基本定律',
    subtitle: '欧姆定律、分压、焦耳功率限额及基尔霍夫定律 (KCL/KVL)',
    accent: 'sky',
    lessonIds: ['ch1-ohm-and-power', 'ch1-kirchhoff-laws'],
  },
  {
    id: 'ch2',
    chapterNumber: 2,
    title: '第2章 电路分析与等效定理',
    subtitle: '电桥平衡、源模型等效、叠加定理与戴维南最大功率匹配',
    accent: 'emerald',
    lessonIds: ['ch2-bridge-and-source-models', 'ch2-superposition', 'ch2-thevenin-max-power'],
  },
  {
    id: 'ch3',
    chapterNumber: 3,
    title: '第3章 动态电路一阶暂态',
    subtitle: 'RC/RL 充放电三要素法与感性反电动势续流保护',
    accent: 'violet',
    lessonIds: ['ch3-rc-transient', 'ch3-rl-transient-freewheel'],
  },
  {
    id: 'ch4',
    chapterNumber: 4,
    title: '第4章 正弦交流、谐振与功率因数',
    subtitle: '交流有效值、容感抗演进、RLC 串联谐振及无功电容就地补偿',
    accent: 'cyan',
    lessonIds: ['ch4-ac-phasor-rlc-resonance', 'ch4-power-factor-correction'],
  },
  {
    id: 'ch5',
    chapterNumber: 5,
    title: '第5章 三相交流供电与安全',
    subtitle: '三相四线 Y0 对称性、断零过压故障抢修及三角形 Δ 接法',
    accent: 'rose',
    lessonIds: ['ch5-three-phase-circuits'],
  },
  {
    id: 'ch6',
    chapterNumber: 6,
    title: '第6章 变压器与直流稳压电源',
    subtitle: '隔离降压、半波电容平波与齐纳 5V 直流电源综合贯通',
    accent: 'indigo',
    lessonIds: ['ch6-transformer-and-control'],
  },
];

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  ...LESSONS_CH0_TO_CH2,
  ...LESSONS_CH3_TO_CH6,
];

export const TOTAL_TUTORIAL_STAGES = TUTORIAL_LESSONS.reduce(
  (sum, l) => sum + l.stages.length,
  0
);

export function getLessonById(lessonId: string): TutorialLesson {
  return TUTORIAL_LESSONS.find((l) => l.id === lessonId) ?? TUTORIAL_LESSONS[0];
}

export function getChapterById(chapterId: string): TutorialChapter | undefined {
  return TUTORIAL_CHAPTERS.find((c) => c.id === chapterId);
}
