import { LESSONS_CH0_TO_CH2 } from './lessonsCh0ToCh2';
import { LESSONS_CH3_TO_CH6 } from './lessonsCh3ToCh6';
import { LESSONS_VOL2_ANALOG } from './lessonsVol2Analog';
import { LESSONS_VOL2_DIGITAL_MIXED } from './lessonsVol2DigitalMixed';
import type { TutorialChapter, TutorialLesson } from './tutorialTypes';

export const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'ch0',
    volume: 'vol1',
    chapterNumber: 0,
    title: '第0章 零基础认识电与仪表',
    subtitle: '电位、参考地、闭合回路与安全测量的第一性原理',
    accent: 'amber',
    lessonIds: ['ch0-loop-and-meters'],
  },
  {
    id: 'ch1',
    volume: 'vol1',
    chapterNumber: 1,
    title: '第1章 电路基本定律',
    subtitle: '欧姆定律、分压、焦耳功率限额及基尔霍夫定律 (KCL/KVL)',
    accent: 'sky',
    lessonIds: ['ch1-ohm-and-power', 'ch1-kirchhoff-laws'],
  },
  {
    id: 'ch2',
    volume: 'vol1',
    chapterNumber: 2,
    title: '第2章 电路分析与等效定理',
    subtitle: '电桥平衡、源模型等效、叠加定理与戴维南最大功率匹配',
    accent: 'emerald',
    lessonIds: ['ch2-bridge-and-source-models', 'ch2-superposition', 'ch2-thevenin-max-power'],
  },
  {
    id: 'ch3',
    volume: 'vol1',
    chapterNumber: 3,
    title: '第3章 动态电路一阶暂态',
    subtitle: 'RC/RL 充放电三要素法与感性反电动势续流保护',
    accent: 'violet',
    lessonIds: ['ch3-rc-transient', 'ch3-rl-transient-freewheel'],
  },
  {
    id: 'ch4',
    volume: 'vol1',
    chapterNumber: 4,
    title: '第4章 正弦交流、谐振与功率因数',
    subtitle: '交流有效值、容感抗演进、RLC 串联谐振及无功电容就地补偿',
    accent: 'cyan',
    lessonIds: ['ch4-ac-phasor-rlc-resonance', 'ch4-power-factor-correction'],
  },
  {
    id: 'ch5',
    volume: 'vol1',
    chapterNumber: 5,
    title: '第5章 三相交流供电与安全',
    subtitle: '三相四线 Y0 对称性、断零过压故障抢修及三角形 Δ 接法',
    accent: 'rose',
    lessonIds: ['ch5-three-phase-circuits'],
  },
  {
    id: 'ch6',
    volume: 'vol1',
    chapterNumber: 6,
    title: '第6章 变压器与直流稳压电源',
    subtitle: '隔离降压、半波电容平波与齐纳 5V 直流电源综合贯通',
    accent: 'indigo',
    lessonIds: ['ch6-transformer-and-control'],
  },
  {
    id: 'ch7',
    volume: 'vol2',
    chapterNumber: 7,
    title: '第7章 半导体二极管与光电器件',
    subtitle: 'PN 结单向导电、桥式全波整流滤波、齐纳稳压及多色 LED 驱动',
    accent: 'rose',
    lessonIds: ['ch7-diodes-and-rectifiers', 'ch7-led-and-opto-drive'],
  },
  {
    id: 'ch8',
    volume: 'vol2',
    chapterNumber: 8,
    title: '第8章 三极管放大与场效应开关',
    subtitle: 'BJT 静态 Q 点、共射交流放大与发射极旁路电容，NMOS 开关及 CMOS 反相',
    accent: 'amber',
    lessonIds: ['ch8-bjt-amplifiers', 'ch8-nmos-and-cmos-switch'],
  },
  {
    id: 'ch9',
    volume: 'vol2',
    chapterNumber: 9,
    title: '第9章 集成运算放大器及其应用',
    subtitle: '虚短虚断黄金法则、同相/反相/差分放大、加法积分及滞回比较器',
    accent: 'sky',
    lessonIds: ['ch9-opamp-negative-feedback', 'ch9-opamp-math-and-comparators'],
  },
  {
    id: 'ch10',
    volume: 'vol2',
    chapterNumber: 10,
    title: '第10章 直流稳压电源系统设计',
    subtitle: '基准稳压、BJT 射极扩流跟随与运放串联反馈可调线性稳压器',
    accent: 'emerald',
    lessonIds: ['ch10-linear-series-regulator'],
  },
  {
    id: 'ch11',
    volume: 'vol2',
    chapterNumber: 11,
    title: '第11章 门电路与组合逻辑设计',
    subtitle: '基本逻辑门、异或门、多数表决综合、2:1 MUX、全加器与 2 位行波加法',
    accent: 'violet',
    lessonIds: ['ch11-gates-and-boolean', 'ch11-mux-and-adders'],
  },
  {
    id: 'ch12',
    volume: 'vol2',
    chapterNumber: 12,
    title: '第12章 触发器、计数器与 LUT 芯片',
    subtitle: 'D/JK 触发器分频、模 10 (BCD) 反馈清零计数器及 8 槽自定义真值芯片',
    accent: 'indigo',
    lessonIds: ['ch12-flipflops-and-counters', 'ch12-custom-ic-lut-design'],
  },
  {
    id: 'ch13',
    volume: 'vol2',
    chapterNumber: 13,
    title: '第13章 555 时基电路与数模转换 (DAC)',
    subtitle: 'NE555 滞回/单稳/多谐振荡脉冲电路、4 位权电阻与 R-2R 梯形阶梯波 DAC',
    accent: 'cyan',
    lessonIds: ['ch13-timer-555-pulse-circuits', 'ch13-dac-conversion'],
  },
  {
    id: 'ch14',
    volume: 'vol2',
    chapterNumber: 14,
    title: '第14章 模数转换 (ADC) 与温控联锁',
    subtitle: '窗口报警器、2 位闪速／并行 ADC 及温控联锁 NMOS 驱动实验',
    accent: 'emerald',
    lessonIds: ['ch14-adc-and-mixed-signal-capstone'],
  },
];

export const TUTORIAL_LESSONS: TutorialLesson[] = [
  ...LESSONS_CH0_TO_CH2,
  ...LESSONS_CH3_TO_CH6,
  ...LESSONS_VOL2_ANALOG,
  ...LESSONS_VOL2_DIGITAL_MIXED,
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
