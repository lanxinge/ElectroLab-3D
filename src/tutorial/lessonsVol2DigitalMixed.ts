import { getDefaultTruthChipConfig } from '../engine/customIcEngine';
import type { TruthChipConfig } from '../../shared/types';
import {
  boolProp,
  fmtI,
  fmtV,
  getTel,
  mkCircuit,
  mkComp,
  numProp,
} from './tutorialHelpers';
import type { TutorialLesson } from './tutorialTypes';

const LUT_EXPR_GATE_ARRAY: TruthChipConfig = {
  chipName: '门控三输出控制器 (EXPR)',
  mode: 'expr',
  slots: [
    { pinId: 's1', name: 'EN', role: 'IN' },
    { pinId: 's2', name: 'X', role: 'IN' },
    { pinId: 's3', name: 'Y', role: 'IN' },
    { pinId: 's4', name: 'NC4', role: 'NC' },
    { pinId: 's5', name: 'G_AND', role: 'OUT' },
    { pinId: 's6', name: 'G_OR', role: 'OUT' },
    { pinId: 's7', name: 'G_XOR', role: 'OUT' },
    { pinId: 's8', name: 'ALARM', role: 'OUT' },
  ],
  rows: {},
  expressions: {
    s5: 'EN & X & Y',
    s6: 'EN & (X | Y)',
    s7: 'EN & (X ^ Y)',
    s8: '!EN & (X | Y)',
  },
};

const LUT_TRAFFIC_INTERLOCK: TruthChipConfig = {
  chipName: '红绿灯互锁译码器 (LUT)',
  mode: 'expr',
  slots: [
    { pinId: 's1', name: 'P1', role: 'IN' },
    { pinId: 's2', name: 'P0', role: 'IN' },
    { pinId: 's3', name: 'EMG', role: 'IN' },
    { pinId: 's4', name: 'NC4', role: 'NC' },
    { pinId: 's5', name: 'NS_G', role: 'OUT' },
    { pinId: 's6', name: 'NS_R', role: 'OUT' },
    { pinId: 's7', name: 'EW_G', role: 'OUT' },
    { pinId: 's8', name: 'EW_R', role: 'OUT' },
  ],
  rows: {},
  expressions: {
    s5: '!EMG & !P1',
    s6: 'EMG | P1',
    s7: '!EMG & P1',
    s8: 'EMG | !P1',
  },
};

export const LESSONS_VOL2_DIGITAL_MIXED: TutorialLesson[] = [
  // =========================================================================
  // Lesson 20 (Ch.11): 基本逻辑门、异或与组合逻辑表决器
  // =========================================================================
  {
    id: 'ch11-gates-and-boolean',
    chapterId: 'ch11',
    lessonNumber: 20,
    title: '基本逻辑门、异或运算与多数表决电路',
    subtitle: '以高低电平（0V / 5V）代替十进制数字，验证与/或/非/异或基本门真值表并搭建三人少数服从多数表决器',
    textbookRef: '第11章 11.1–11.3 逻辑代数基础、基本逻辑门及组合逻辑设计',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch8-nmos-and-cmos-switch'],
    learningObjectives: [
      '掌握 AND（全 1 出 1）、OR（有 1 出 1）、NOT（取反）的开关映射关系',
      '理解 XOR（相异为 1、相同为 0）在数字比较与二进制加法中的核心作用',
      '会由真值表写出标准与或表达式 Y = AB + BC + AC 并用基本门搭出表决器',
    ],
    stages: [
      {
        id: 'l20-s1',
        stageNumber: 1,
        title: 'AND / OR / NOT 基本门并行实测',
        badge: 'Step 1 · 基本门真值表',
        conceptGoal: '与门有 0 出 0、全 1 出 1；或门有 1 出 1、全 0 出 0；非门永远将输入翻转。',
        explanation:
          '两组数字输入开关 A、B（0 = 0V 低电平，1 = 5V 高电平）同时送入并排的 AND 门、OR 门与对 A 取反的 NOT 门。当前 A=0、B=0，故 AND=0、OR=0、!A=1；可在下方切换 A、B 并切换到【数字逻辑】标签查看实时真值表！',
        analogy: '与门好比串联的两把开关，两人都合上灯才亮；或门好比并联开关，任一人合上即亮。',
        highlights: ['g_and', 'g_or', 'g_not', 'out_and', 'out_or'],
        newlyAddedIds: ['in_a', 'in_b', 'g_and', 'g_or', 'g_not', 'out_and', 'out_or', 'out_not'],
        circuit: mkCircuit(
          [
            mkComp('in_a', 'LOGIC_IN', 'A 输入', 100, 140, 0, { state: 0, varName: 'A' }),
            mkComp('in_b', 'LOGIC_IN', 'B 输入', 100, 290, 0, { state: 0, varName: 'B' }),
            mkComp('g_and', 'AND', 'AND 与门', 340, 120, 0),
            mkComp('g_or', 'OR', 'OR 或门', 340, 220, 0),
            mkComp('g_not', 'NOT', 'NOT 非门', 340, 320, 0),
            mkComp('out_and', 'LOGIC_OUT', 'Y_AND', 580, 120, 0, { outName: 'AND' }),
            mkComp('out_or', 'LOGIC_OUT', 'Y_OR', 580, 220, 0, { outName: 'OR' }),
            mkComp('out_not', 'LOGIC_OUT', 'Y_!A', 580, 320, 0, { outName: '!A' }),
          ],
          [
            ['in_a', 'out', 'g_and', 'a', '#38bdf8'],
            ['in_b', 'out', 'g_and', 'b', '#a855f7'],
            ['in_a', 'out', 'g_or', 'a', '#38bdf8'],
            ['in_b', 'out', 'g_or', 'b', '#a855f7'],
            ['in_a', 'out', 'g_not', 'a', '#38bdf8'],
            ['g_and', 'y', 'out_and', 'in', '#22c55e'],
            ['g_or', 'y', 'out_or', 'in', '#f59e0b'],
            ['g_not', 'y', 'out_not', 'in', '#ef4444'],
          ],
          'l20s1'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l20-s1-f1',
            title: '三门逻辑输出即时快照',
            formula: 'Y_AND = A·B，Y_OR = A+B，Y_NOT = ¬A',
            evaluate: (ctx) => {
              const a = numProp(ctx, 'in_a', 'state', 0) ? 1 : 0;
              const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
              const yAnd = getTel(ctx, 'out_and')?.logicState ?? 0;
              const yOr = getTel(ctx, 'out_or')?.logicState ?? 0;
              const yNot = getTel(ctx, 'out_not')?.logicState ?? 0;
              return {
                expression: `A=${a}, B=${b}`,
                result: `AND=${yAnd} | OR=${yOr} | !A=${yNot}`,
                status: yAnd === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l20-a',
            label: '输入信号 A',
            targetId: 'in_a',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (低电平 0V)', value: 0 },
              { label: '1 (高电平 5V)', value: 1 },
            ],
          },
          {
            id: 'qc-l20-b',
            label: '输入信号 B',
            targetId: 'in_b',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (低电平 0V)', value: 0 },
              { label: '1 (高电平 5V)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：AND 门双键串联逻辑', type: 'AND', componentId: 'g_and', stepIndex: 0 }],
        checkpoint: {
          title: '触发“全 1 与门输出为 1”',
          instruction: '将 A 与 B 同时切换为 1，验证 AND=1、OR=1 且 !A=0。',
          hint: '将下方 A 和 B 都选为 1。',
          check: (ctx) => {
            const yAnd = getTel(ctx, 'out_and')?.logicState ?? 0;
            const yOr = getTel(ctx, 'out_or')?.logicState ?? 0;
            const yNot = getTel(ctx, 'out_not')?.logicState ?? 0;
            const ok = yAnd === 1 && yOr === 1 && yNot === 0;
            return {
              passed: ok,
              message: ok
                ? '真值校验通过：A=1, B=1 -> AND=1, OR=1, !A=0！'
                : `当前 AND=${yAnd}, OR=${yOr}, !A=${yNot}（请将 A、B 都设为 1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动输入 A=1, B=1',
            description: '将输入端 A 与 B 同时拨为高电平 1，验证 AND=1、OR=1 与 !A=0',
            actions: [
              { kind: 'setProp', componentId: 'in_a', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_b', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l20-s2',
        stageNumber: 2,
        title: '异或门 (XOR) 与算术半加内核',
        badge: 'Step 2 · 异或与同或',
        conceptGoal: '异或门 A⊕B 在两输入相异时输出 1、相同时输出 0，是加法进位外“本位和”的核心。',
        explanation:
          '当前 A=1、B=0（相异），因此 XOR 输出 1，同时“同或等价/反与对比门”NAND 也输出 1。若将 B 也改为 1（A=B=1），两个相同的 1 在“相异门”面前互相抵消，XOR 立刻翻回 0（对应二进制 1+1 本位为 0、产生进位）！',
        analogy: '就像两扇双向楼梯灯控开关：拨动任意一把开关（状态相异）灯就亮，两人拨到同一方向（状态相同）灯就灭。',
        highlights: ['g_xor', 'out_xor'],
        newlyAddedIds: ['g_xor', 'g_nand', 'out_xor', 'out_nand'],
        circuit: mkCircuit(
          [
            mkComp('in_a', 'LOGIC_IN', 'A 输入', 110, 140, 0, { state: 1, varName: 'A' }),
            mkComp('in_b', 'LOGIC_IN', 'B 输入', 110, 280, 0, { state: 0, varName: 'B' }),
            mkComp('g_xor', 'XOR', 'XOR 异或门', 350, 140, 0),
            mkComp('g_nand', 'NAND', 'NAND 与非门', 350, 280, 0),
            mkComp('out_xor', 'LOGIC_OUT', 'Y_XOR', 580, 140, 0, { outName: 'XOR' }),
            mkComp('out_nand', 'LOGIC_OUT', 'Y_NAND', 580, 280, 0, { outName: 'NAND' }),
          ],
          [
            ['in_a', 'out', 'g_xor', 'a', '#38bdf8'],
            ['in_b', 'out', 'g_xor', 'b', '#a855f7'],
            ['in_a', 'out', 'g_nand', 'a', '#38bdf8'],
            ['in_b', 'out', 'g_nand', 'b', '#a855f7'],
            ['g_xor', 'y', 'out_xor', 'in', '#22c55e'],
            ['g_nand', 'y', 'out_nand', 'in', '#f59e0b'],
          ],
          'l20s2'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l20-s2-f1',
            title: '异或真值运算',
            formula: 'A ⊕ B = (!A · B) + (A · !B) （相异出 1，相同出 0）',
            evaluate: (ctx) => {
              const a = numProp(ctx, 'in_a', 'state', 1) ? 1 : 0;
              const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
              const yXor = getTel(ctx, 'out_xor')?.logicState ?? 0;
              const yNand = getTel(ctx, 'out_nand')?.logicState ?? 0;
              return {
                expression: `${a} ⊕ ${b}`,
                result: `XOR = ${yXor} | NAND = ${yNand}`,
                status: a === 1 && b === 1 && yXor === 0 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l20s2-a',
            label: '输入 A',
            targetId: 'in_a',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l20s2-b',
            label: '输入 B',
            targetId: 'in_b',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：XOR 相异为真与齿轮类比', type: 'XOR', componentId: 'g_xor', stepIndex: 0 }],
        checkpoint: {
          title: '验证“1 ⊕ 1 = 0”相同相消',
          instruction: '保持 A=1 并把 B 也调为 1，确认 XOR 门输出变为 0（且 NAND 也翻为 0）。',
          hint: '将输入 B 切换为 1。',
          check: (ctx) => {
            const a = numProp(ctx, 'in_a', 'state', 0) ? 1 : 0;
            const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
            const yXor = getTel(ctx, 'out_xor')?.logicState ?? 1;
            const yNand = getTel(ctx, 'out_nand')?.logicState ?? 1;
            const ok = a === 1 && b === 1 && yXor === 0 && yNand === 0;
            return {
              passed: ok,
              message: ok
                ? '验证成功：1 ⊕ 1 = 0，同态输入清零生效！'
                : `当前 A=${a}, B=${b}, XOR=${yXor}, NAND=${yNand}（请令 A=1, B=1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动设为 A=1, B=1',
            description: '令两路输入同为 1，观察 XOR 相消归零与 NAND 同步翻 0',
            actions: [
              { kind: 'setProp', componentId: 'in_a', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_b', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l20-s3',
        stageNumber: 3,
        title: '组合逻辑综合：三人少数服从多数表决器',
        badge: 'Step 3 · 组合综合实战',
        conceptGoal: '三人中至少两人投 1 则通过：Y = AB + BC + AC，典型两级与-或组合电路。',
        explanation:
          '工程表决系统把真值表中“赞成数 ≥ 2”的行化简为三对与门（AB、BC、AC）再通过或门相加。当前仅 C 投了 1 票，三对与门全为 0，PASS 熄灭。试让 A（或 B）也投赞成票 1，立即触发多数通过！',
        analogy: '就像航天三冗余飞控计算机：只要任意两台主机得出相同结果就采纳输出，容忍单机故障。',
        highlights: ['ab', 'bc', 'ac', 'out_vote'],
        newlyAddedIds: ['in_c', 'ab', 'bc', 'ac', 'or1', 'or2', 'out_vote'],
        circuit: mkCircuit(
          [
            mkComp('in_a', 'LOGIC_IN', '评委 A', 90, 110, 0, { state: 0, varName: 'A' }),
            mkComp('in_b', 'LOGIC_IN', '评委 B', 90, 220, 0, { state: 0, varName: 'B' }),
            mkComp('in_c', 'LOGIC_IN', '评委 C', 90, 330, 0, { state: 1, varName: 'C' }),
            mkComp('ab', 'AND', 'AB 项', 300, 120, 0),
            mkComp('bc', 'AND', 'BC 项', 300, 220, 0),
            mkComp('ac', 'AND', 'AC 项', 300, 320, 0),
            mkComp('or1', 'OR', 'OR1', 490, 170, 0),
            mkComp('or2', 'OR', 'OR2', 640, 240, 0),
            mkComp('out_vote', 'LOGIC_OUT', '表决通过 PASS', 800, 240, 0, { outName: 'PASS' }),
          ],
          [
            ['in_a', 'out', 'ab', 'a', '#38bdf8'],
            ['in_b', 'out', 'ab', 'b', '#a855f7'],
            ['in_b', 'out', 'bc', 'a', '#a855f7'],
            ['in_c', 'out', 'bc', 'b', '#f59e0b'],
            ['in_a', 'out', 'ac', 'a', '#38bdf8'],
            ['in_c', 'out', 'ac', 'b', '#f59e0b'],
            ['ab', 'y', 'or1', 'a', '#22c55e'],
            ['bc', 'y', 'or1', 'b', '#22c55e'],
            ['or1', 'y', 'or2', 'a', '#22c55e'],
            ['ac', 'y', 'or2', 'b', '#22c55e'],
            ['or2', 'y', 'out_vote', 'in', '#22c55e'],
          ],
          'l20s3'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l20-s3-f1',
            title: '三评委少数服从多数方程',
            formula: 'Y = AB + BC + AC （A+B+C ≥ 2 时 Y = 1）',
            evaluate: (ctx) => {
              const a = numProp(ctx, 'in_a', 'state', 0) ? 1 : 0;
              const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
              const c = numProp(ctx, 'in_c', 'state', 1) ? 1 : 0;
              const sum = a + b + c;
              const pass = getTel(ctx, 'out_vote')?.logicState ?? 0;
              return {
                expression: `赞成票数 ${a}+${b}+${c} = ${sum}/3`,
                result: `PASS = ${pass}`,
                status: pass === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l20s3-a',
            label: '评委 A 投票',
            targetId: 'in_a',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (反对)', value: 0 },
              { label: '1 (赞成)', value: 1 },
            ],
          },
          {
            id: 'qc-l20s3-b',
            label: '评委 B 投票',
            targetId: 'in_b',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (反对)', value: 0 },
              { label: '1 (赞成)', value: 1 },
            ],
          },
          {
            id: 'qc-l20s3-c',
            label: '评委 C 投票',
            targetId: 'in_c',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (反对)', value: 0 },
              { label: '1 (赞成)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：组合电路与或阵列综合', type: 'AND', componentId: 'ac', stepIndex: 1 }],
        checkpoint: {
          title: '实现多数赞成通过 (PASS = 1)',
          instruction: '令三位评委中至少有 2 人投赞成 (1)，触发 PASS 输出高电平。',
          hint: '例如在保持 C=1 的前提下将评委 A 切为 1（赞成）。',
          check: (ctx) => {
            const a = numProp(ctx, 'in_a', 'state', 0) ? 1 : 0;
            const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
            const c = numProp(ctx, 'in_c', 'state', 0) ? 1 : 0;
            const pass = getTel(ctx, 'out_vote')?.logicState ?? 0;
            const ok = a + b + c >= 2 && pass === 1;
            return {
              passed: ok,
              message: ok
                ? `多数表决通过！赞成 ${a + b + c} 票 -> PASS = 1`
                : `当前赞成 ${a + b + c} 票 -> PASS = ${pass}（需至少 2 票为 1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动令 A=1, C=1 通过表决',
            description: '使三位评委中 A 与 C 均投赞成票 1，驱动两级与或表决器输出 PASS=1',
            actions: [
              { kind: 'setProp', componentId: 'in_a', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_c', key: 'state', value: 1 },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 21 (Ch.11): 数据选择器 (MUX)、全加器与两位二进制加法译码
  // =========================================================================
  {
    id: 'ch11-mux-and-adders',
    chapterId: 'ch11',
    lessonNumber: 21,
    title: '数据选择器 (2:1 MUX)、全加器与多位二进制加法',
    subtitle: '掌握组合功能模块：多路复用数据道岔、考虑低位进位的全加器及两位行波进位加法器 + HEX 显示',
    textbookRef: '第11章 11.4 常用组合逻辑功能器件：MUX 与算术加法器',
    difficulty: '进阶',
    durationMin: 15,
    prerequisites: ['ch11-gates-and-boolean'],
    learningObjectives: [
      '理解二选一数据选择器 Y = ¬SEL·D0 + SEL·D1 的地址选择路由机制',
      '对比半加器与全加器的本质差别：Cin 进位链使高位得以感知低位溢出',
      '构建 2 位二进制行波进位加法器并用 7 段 HEX 显示器读取十进制/十六进制结果',
    ],
    stages: [
      {
        id: 'l21-s1',
        stageNumber: 1,
        title: '二选一数据选择器 (2:1 MUX) 数字道岔',
        badge: 'Step 1 · 多路复用路由',
        conceptGoal: '选择端 SEL=0 时导通 D0 通道；SEL=1 时无缝切换导通 D1 通道。',
        explanation:
          '当前 D0=0、D1=1，但控制选择端 SEL=0，因此输出 Y 仅跟随通道 D0 为 0。切换 SEL=1 相当于扳动铁路道岔，立刻把 D1 上的 1 号信号切送到唯一公共输出 Y！',
        analogy: '单刀双掷数字道岔：SEL 决定哪一条轨道上的列车（D0 或 D1）可以驶出公共干线 Y。',
        highlights: ['mux1', 'sel', 'out_y'],
        newlyAddedIds: ['d0', 'd1', 'sel', 'mux1', 'out_y'],
        circuit: mkCircuit(
          [
            mkComp('d0', 'LOGIC_IN', '通道 D0', 110, 120, 0, { state: 0, varName: 'D0' }),
            mkComp('d1', 'LOGIC_IN', '通道 D1', 110, 230, 0, { state: 1, varName: 'D1' }),
            mkComp('sel', 'LOGIC_IN', '选择端 SEL', 110, 340, 0, { state: 0, varName: 'SEL' }),
            mkComp('mux1', 'MUX_2_1', '2:1 数据选择器', 380, 220, 0),
            mkComp('out_y', 'LOGIC_OUT', '复用输出 Y', 640, 220, 0, { outName: 'Y' }),
          ],
          [
            ['d0', 'out', 'mux1', 'd0', '#38bdf8'],
            ['d1', 'out', 'mux1', 'd1', '#22c55e'],
            ['sel', 'out', 'mux1', 'sel', '#f59e0b'],
            ['mux1', 'y', 'out_y', 'in', '#a855f7'],
          ],
          'l21s1'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l21-s1-f1',
            title: '2:1 MUX 选择函数',
            formula: 'Y = (¬SEL · D0) + (SEL · D1)',
            evaluate: (ctx) => {
              const d0 = numProp(ctx, 'd0', 'state', 0) ? 1 : 0;
              const d1 = numProp(ctx, 'd1', 'state', 1) ? 1 : 0;
              const sel = numProp(ctx, 'sel', 'state', 0) ? 1 : 0;
              const y = getTel(ctx, 'out_y')?.logicState ?? 0;
              return {
                expression: `D0=${d0}, D1=${d1}, SEL=${sel}`,
                result: `选中 D${sel} -> Y = ${y}`,
                status: sel === 1 && y === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l21s1-sel',
            label: '地址选择端 SEL',
            targetId: 'sel',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (选通 D0)', value: 0 },
              { label: '1 (选通 D1)', value: 1 },
            ],
          },
          {
            id: 'qc-l21s1-d1',
            label: '输入数据 D1',
            targetId: 'd1',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：2:1 MUX 道岔选通机制', type: 'MUX_2_1', componentId: 'mux1', stepIndex: 0 }],
        checkpoint: {
          title: '切至 D1=1 数据通道',
          instruction: '保持 D0=0、D1=1，将 SEL 切为 1 使输出 Y 变为 1。',
          hint: '点击选择端 SEL 的“1 (选通 D1)”按钮。',
          check: (ctx) => {
            const sel = numProp(ctx, 'sel', 'state', 0) ? 1 : 0;
            const d1 = numProp(ctx, 'd1', 'state', 0) ? 1 : 0;
            const y = getTel(ctx, 'out_y')?.logicState ?? 0;
            const ok = sel === 1 && d1 === 1 && y === 1;
            return {
              passed: ok,
              message: ok
                ? 'MUX 选通验证成功：SEL=1 准确路由 D1=1 至输出 Y=1！'
                : `当前 SEL=${sel}, D1=${d1}, Y=${y}（需 SEL=1 且 D1=1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动选通 D1 通道 (Y=1)',
            description: '置地址端 SEL=1 使 2:1 MUX 将 D1=1 路由至输出 Y',
            actions: [
              { kind: 'setProp', componentId: 'd0', key: 'state', value: 0 },
              { kind: 'setProp', componentId: 'd1', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'sel', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l21-s2',
        stageNumber: 2,
        title: '半加器 vs 全加器（1+1+1 = 11₂）',
        badge: 'Step 2 · 算术进位链',
        conceptGoal: '全加器相比半加器多了低位进位端 Cin：S = A⊕B⊕Cin，Cout = AB + Cin(A⊕B)。',
        explanation:
          '上方 HALF_ADDER 仅把 A、B 相加；下方 FULL_ADDER 把 A、B 与低位进位 Cin 三数一起相加。当前 A=1, B=0, Cin=0（结果 01）。把 B 与 Cin 都设为 1，对比半加器（1+1=10₂）与全加器（1+1+1=11₂，即 S=1, Cout=1）！',
        analogy: '就像竖式加法里的十位：不仅要把本位的两个数字相加，还得把个位进上来的那个“小 1”算进去。',
        highlights: ['ha1', 'fa1', 'out_fa_s', 'out_fa_c'],
        newlyAddedIds: ['in_cin', 'ha1', 'fa1', 'out_ha_s', 'out_ha_c', 'out_fa_s', 'out_fa_c'],
        circuit: mkCircuit(
          [
            mkComp('in_a', 'LOGIC_IN', '被加数 A', 100, 120, 0, { state: 1, varName: 'A' }),
            mkComp('in_b', 'LOGIC_IN', '加数 B', 100, 230, 0, { state: 0, varName: 'B' }),
            mkComp('in_cin', 'LOGIC_IN', '低位进位 Cin', 100, 340, 0, { state: 0, varName: 'Cin' }),
            mkComp('ha1', 'HALF_ADDER', '半加器 (仅 A+B)', 370, 140, 0),
            mkComp('fa1', 'FULL_ADDER', '全加器 (A+B+Cin)', 370, 300, 0),
            mkComp('out_ha_s', 'LOGIC_OUT', 'HA_S', 630, 100, 0, { outName: 'HA_S' }),
            mkComp('out_ha_c', 'LOGIC_OUT', 'HA_C', 630, 175, 0, { outName: 'HA_C' }),
            mkComp('out_fa_s', 'LOGIC_OUT', 'FA_S (和)', 630, 265, 0, { outName: 'FA_S' }),
            mkComp('out_fa_c', 'LOGIC_OUT', 'FA_Cout (进位)', 630, 345, 0, { outName: 'FA_C' }),
          ],
          [
            ['in_a', 'out', 'ha1', 'a', '#38bdf8'],
            ['in_b', 'out', 'ha1', 'b', '#a855f7'],
            ['in_a', 'out', 'fa1', 'a', '#38bdf8'],
            ['in_b', 'out', 'fa1', 'b', '#a855f7'],
            ['in_cin', 'out', 'fa1', 'cin', '#f59e0b'],
            ['ha1', 's', 'out_ha_s', 'in', '#22c55e'],
            ['ha1', 'c', 'out_ha_c', 'in', '#eab308'],
            ['fa1', 's', 'out_fa_s', 'in', '#22c55e'],
            ['fa1', 'cout', 'out_fa_c', 'in', '#ef4444'],
          ],
          'l21s2'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l21-s2-f1',
            title: '三位二进制全加运算',
            formula: 'Sum = A ⊕ B ⊕ Cin，Cout = AB + Cin(A ⊕ B)',
            evaluate: (ctx) => {
              const a = numProp(ctx, 'in_a', 'state', 1) ? 1 : 0;
              const b = numProp(ctx, 'in_b', 'state', 0) ? 1 : 0;
              const cin = numProp(ctx, 'in_cin', 'state', 0) ? 1 : 0;
              const s = getTel(ctx, 'out_fa_s')?.logicState ?? 0;
              const c = getTel(ctx, 'out_fa_c')?.logicState ?? 0;
              return {
                expression: `${a} + ${b} + ${cin} = ${a + b + cin}`,
                result: `全加器 Cout=${c}, S=${s} (${c}${s}₂)`,
                status: s === 1 && c === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l21s2-b',
            label: '加数 B',
            targetId: 'in_b',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l21s2-cin',
            label: '低位进位 Cin',
            targetId: 'in_cin',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：全加器进位链结构', type: 'FULL_ADDER', componentId: 'fa1', stepIndex: 0 },
          { label: '思索：半加器无低位进位端', type: 'HALF_ADDER', componentId: 'ha1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '完成全满加 1 + 1 + 1 = 3 (11₂)',
          instruction: '令 A=1、B=1 且 Cin=1，观测全加器输出 FA_C=1 与 FA_S=1。',
          hint: '将加数 B 和低位进位 Cin 都设为 1。',
          check: (ctx) => {
            const s = getTel(ctx, 'out_fa_s')?.logicState ?? 0;
            const c = getTel(ctx, 'out_fa_c')?.logicState ?? 0;
            const ok = s === 1 && c === 1;
            return {
              passed: ok,
              message: ok
                ? '全满加成功：1 + 1 + 1 = 11₂（十进制 3），半加器仅能给出 10₂！'
                : `当前 FA_Cout=${c}, FA_S=${s}（需 A=B=Cin=1 得出 Cout=1, S=1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动执行 1+1+1 全满加',
            description: '设置 A=B=Cin=1 验证全加器产生和 S=1 及进位 Cout=1',
            actions: [
              { kind: 'setProp', componentId: 'in_a', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_b', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_cin', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l21-s3',
        stageNumber: 3,
        title: '2 位行波进位加法器 + 十六进制 HEX 显示',
        badge: 'Step 3 · 多位 CPU 加法器',
        conceptGoal: '将半加器的进位输出 Cout 直接连至高位全加器的 Cin，即可级联扩展成任意位宽加法器。',
        explanation:
          '这正是 CPU 算术逻辑单元 (ALU) 的缩影：低位半加器算出 A0+B0 的和 S0 与进位 C0，C0 跨越芯片连入高位全加器算出 S1 与溢出位 C1，三位结果直连 7 段 HEX 显示器！当前 A=01₂(1), B=01₂(1)，HEX 显示 2。试试调大输入使和 ≥ 5！',
        analogy: '就像算盘的两档：个位满二进一拨动十位的一颗珠子，两级联动即可表示最大 3+3=6 的整数运算。',
        highlights: ['ha0', 'fa1', 'hex1'],
        newlyAddedIds: ['a1', 'a0', 'b1', 'b0', 'ha0', 'fa1', 'hex1'],
        circuit: mkCircuit(
          [
            mkComp('a1', 'LOGIC_IN', 'A1 (高位)', 90, 90, 0, { state: 0, varName: 'A1' }),
            mkComp('a0', 'LOGIC_IN', 'A0 (低位)', 90, 170, 0, { state: 1, varName: 'A0' }),
            mkComp('b1', 'LOGIC_IN', 'B1 (高位)', 90, 260, 0, { state: 0, varName: 'B1' }),
            mkComp('b0', 'LOGIC_IN', 'B0 (低位)', 90, 340, 0, { state: 1, varName: 'B0' }),
            mkComp('ha0', 'HALF_ADDER', 'LSB 半加器', 330, 130, 0),
            mkComp('fa1', 'FULL_ADDER', 'MSB 全加器', 490, 280, 0),
            mkComp('hex1', 'HEX_DISPLAY', '和数 HEX 显示', 760, 210, 0),
            mkComp('gnd1', 'GROUND', 'GND', 760, 370, 0),
          ],
          [
            ['a0', 'out', 'ha0', 'a', '#38bdf8'],
            ['b0', 'out', 'ha0', 'b', '#a855f7'],
            ['ha0', 'c', 'fa1', 'cin', '#f59e0b'],
            ['a1', 'out', 'fa1', 'a', '#38bdf8'],
            ['b1', 'out', 'fa1', 'b', '#a855f7'],
            ['ha0', 's', 'hex1', 'd0', '#22c55e'],
            ['fa1', 's', 'hex1', 'd1', '#22c55e'],
            ['fa1', 'cout', 'hex1', 'd2', '#ef4444'],
            ['gnd1', 'gnd', 'hex1', 'd3', '#475569'],
          ],
          'l21s3'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l21-s3-f1',
            title: '2 位无符号二进制加法',
            formula: 'Sum = (2·A1 + A0) + (2·B1 + B0) ∈ [0, 6]',
            evaluate: (ctx) => {
              const A = (numProp(ctx, 'a1', 'state', 0) ? 2 : 0) + (numProp(ctx, 'a0', 'state', 1) ? 1 : 0);
              const B = (numProp(ctx, 'b1', 'state', 0) ? 2 : 0) + (numProp(ctx, 'b0', 'state', 1) ? 1 : 0);
              const hex = getTel(ctx, 'hex1')?.logicState ?? 0;
              return {
                expression: `A=${A} (${A.toString(2).padStart(2, '0')}₂) + B=${B} (${B.toString(2).padStart(2, '0')}₂)`,
                result: `HEX 显示 = ${hex} (0x${hex.toString(16).toUpperCase()})`,
                status: hex >= 5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l21s3-a1',
            label: '加数高位 A1 (权重 2)',
            targetId: 'a1',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l21s3-b1',
            label: '加数高位 B1 (权重 2)',
            targetId: 'b1',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l21s3-b0',
            label: '加数低位 B0 (权重 1)',
            targetId: 'b0',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：七段 HEX 译码器显示规则', type: 'HEX_DISPLAY', componentId: 'hex1', stepIndex: 0 }],
        checkpoint: {
          title: '进位加法令 HEX 读数达到 ≥ 5',
          instruction: '令 A1=1、B1=1（再配合低位 A0 或 B0=1），让总和达到 5 或 6。',
          hint: '将高位 A1 与 B1 都切换为 1（此时 3+3=6 或 3+2=5）。',
          check: (ctx) => {
            const hex = getTel(ctx, 'hex1')?.logicState ?? 0;
            const ok = hex >= 5;
            return {
              passed: ok,
              message: ok
                ? `高位进位级联成功！HEX 显示和数 = ${hex}（溢出位 Cout 点亮 d2）`
                : `当前 HEX 读数 = ${hex}（请把 A1 和 B1 调为 1 使总和 ≥ 5）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动计算 3 + 3 = 6',
            description: '将 2 位加数均设为 11₂ (3)，验证进位链累加并在 HEX 显示 6',
            actions: [
              { kind: 'setProp', componentId: 'a1', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'a0', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b1', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b0', key: 'state', value: 1 },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 22 (Ch.12): 触发器 (D_FF / JK_FF) 与模 10 (BCD) 计数器
  // =========================================================================
  {
    id: 'ch12-flipflops-and-counters',
    chapterId: 'ch12',
    lessonNumber: 22,
    title: 'D 触发器、JK 触发器与模 10 (BCD) 十进制计数器',
    subtitle: '从组合电路跨越到有时序记忆的数字世界：理解时钟上升沿采样、JK 四态翻转与反馈清零改制十进制计数器',
    textbookRef: '第12章 12.1–12.3 触发器与同步/异步计数器的设计',
    difficulty: '进阶',
    durationMin: 16,
    prerequisites: ['ch11-mux-and-adders'],
    learningObjectives: [
      '掌握 D 触发器仅在 CLK 0→1 上升沿瞬间采样锁存 D 的特性（其余时刻保持记忆）',
      '掌握 JK 触发器在 J=K=1 时的翻转特性及二进制二分频原理',
      '会通过外接“与门译码 Q3·Q1 → 异步清零 RST”将 4 位 16 进制计数器改造为模 10 (BCD) 计数器',
    ],
    stages: [
      {
        id: 'l22-s1',
        stageNumber: 1,
        title: 'D 触发器：时钟上升沿瞬间拍照锁存',
        badge: 'Step 1 · 1 位数字记忆',
        conceptGoal: 'Q* = D（仅当 CLK 发生 0→1 上升沿时刷新），时钟保持 0 或 1 期间 Q 稳固记忆旧值。',
        explanation:
          '组合门“输入变、输出立刻变”，而触发器必须等待发令枪——时钟上升沿 (0→1)！当前数据 D=1 已经准备好，但时钟 CLK=0，所以锁存输出 Q 仍为 0（互补端 ¬Q=1）。请按一次 CLK 从 0 跳到 1 发出上升沿“快门”，把 1 锁进芯片！',
        analogy: '就像机械快门相机：D 是镜头前的风景（可以随时变），但只有 CLK 从 0 按下到 1 的那一毫秒，相片 Q 才定格更新。',
        highlights: ['dff1', 'in_clk', 'out_q'],
        newlyAddedIds: ['in_d', 'in_clk', 'dff1', 'out_q', 'out_qn'],
        circuit: mkCircuit(
          [
            mkComp('in_d', 'LOGIC_IN', '数据端 D', 110, 140, 0, { state: 1, varName: 'D' }),
            mkComp('in_clk', 'LOGIC_IN', '手动时钟 CLK', 110, 290, 0, { state: 0, varName: 'CLK' }),
            mkComp('dff1', 'D_FF', '上升沿 D 触发器', 370, 210, 0),
            mkComp('out_q', 'LOGIC_OUT', '锁存输出 Q', 630, 150, 0, { outName: 'Q' }),
            mkComp('out_qn', 'LOGIC_OUT', '反相输出 ¬Q', 630, 280, 0, { outName: '!Q' }),
          ],
          [
            ['in_d', 'out', 'dff1', 'd', '#38bdf8'],
            ['in_clk', 'out', 'dff1', 'clk', '#f59e0b'],
            ['dff1', 'q', 'out_q', 'in', '#22c55e'],
            ['dff1', 'qn', 'out_qn', 'in', '#ef4444'],
          ],
          'l22s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l22-s1-f1',
            title: 'D 触发器次态方程',
            formula: 'Q(n+1) = D （在 CLK ↑ 瞬间更新，否则保持 Q(n)）',
            evaluate: (ctx) => {
              const d = numProp(ctx, 'in_d', 'state', 1) ? 1 : 0;
              const clk = numProp(ctx, 'in_clk', 'state', 0) ? 1 : 0;
              const q = getTel(ctx, 'out_q')?.logicState ?? 0;
              const qn = getTel(ctx, 'out_qn')?.logicState ?? 1;
              return {
                expression: `D=${d}, CLK=${clk}`,
                result: `当前记忆 Q=${q}, ¬Q=${qn}`,
                status: q === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l22s1-d',
            label: '数据输入 D',
            targetId: 'in_d',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l22s1-clk',
            label: '手动时钟脉冲 CLK',
            targetId: 'in_clk',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (待触发低电平)', value: 0 },
              { label: '1 (发出 ↑ 上升沿)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：D 触发器主从边沿锁存', type: 'D_FF', componentId: 'dff1', stepIndex: 0 }],
        checkpoint: {
          title: '触发时钟上升沿锁存 Q = 1',
          instruction: '保持数据 D=1，将 CLK 从 0 切换为 1（产生 ↑ 上升沿），使 Q=1、¬Q=0。',
          hint: '点击“手动时钟脉冲 CLK”的“1 (发出 ↑ 上升沿)”。',
          check: (ctx) => {
            const q = getTel(ctx, 'out_q')?.logicState ?? 0;
            const qn = getTel(ctx, 'out_qn')?.logicState ?? 1;
            const ok = q === 1 && qn === 0;
            return {
              passed: ok,
              message: ok ? '锁存成功！CLK ↑ 捕获到 D=1，当前 Q=1、¬Q=0' : `当前 Q=${q}, ¬Q=${qn}（请将 D=1 且 CLK 切为 1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动发出 CLK ↑ 上升沿锁存',
            description: '在 D=1 就绪后将手动时钟拉高产生 ↑ 上升沿，将 1 锁存进 Q',
            actions: [
              { kind: 'setProp', componentId: 'in_d', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_clk', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l22-s2',
        stageNumber: 2,
        title: 'JK 触发器四态功能与二分频器',
        badge: 'Step 2 · 翻转与二分频',
        conceptGoal: 'J=K=0 保持，J=1/K=0 置 1，J=0/K=1 清 0，J=K=1 每遇时钟上升沿必翻转（实现二分频）。',
        explanation:
          '本台架接入了 2 Hz 自动方波时钟 CLK。当前 J=1、K=0（强制置 1 模式），每次时钟上升沿来临 Q 均死锁在 1。把 K 也切为 1 进入 J=K=1“翻转分频模式”，再看右下示波器：Q 输出成为频率减半的 1 Hz 完美方波！',
        analogy: '就像机械圆珠笔的按压棘轮：J=K=1 时，每按一次（每个 CLK 上升沿）笔芯就在“伸出/缩回”间交替切换一次。',
        highlights: ['jk1', 'in_k', 'out_q'],
        newlyAddedIds: ['clk2', 'in_j', 'in_k', 'jk1'],
        circuit: mkCircuit(
          [
            mkComp('in_j', 'LOGIC_IN', 'J 激励', 110, 120, 0, { state: 1, varName: 'J' }),
            mkComp('clk2', 'CLOCK', '2 Hz 时钟源', 110, 220, 0, { frequency: 2 }),
            mkComp('in_k', 'LOGIC_IN', 'K 激励', 110, 320, 0, { state: 0, varName: 'K' }),
            mkComp('jk1', 'JK_FF', 'JK 触发器', 390, 220, 0),
            mkComp('out_q', 'LOGIC_OUT', '分频输出 Q (1 Hz)', 660, 160, 0, { outName: 'Q' }),
            mkComp('out_qn', 'LOGIC_OUT', '反相输出 ¬Q', 660, 290, 0, { outName: '!Q' }),
          ],
          [
            ['in_j', 'out', 'jk1', 'j', '#38bdf8'],
            ['clk2', 'out', 'jk1', 'clk', '#f59e0b'],
            ['in_k', 'out', 'jk1', 'k', '#a855f7'],
            ['jk1', 'q', 'out_q', 'in', '#22c55e'],
            ['jk1', 'qn', 'out_qn', 'in', '#ef4444'],
          ],
          'l22s2'
        ),
        prewarmSeconds: 0.3,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['clk2', 'out_q'],
        liveFormulas: [
          {
            id: 'l22-s2-f1',
            title: 'JK 触发器特征方程',
            formula: 'Q(n+1) = J·¬Q + ¬K·Q （J=K=1 时退化为 ¬Q 二分频）',
            evaluate: (ctx) => {
              const j = numProp(ctx, 'in_j', 'state', 1) ? 1 : 0;
              const k = numProp(ctx, 'in_k', 'state', 0) ? 1 : 0;
              const q = getTel(ctx, 'out_q')?.logicState ?? 0;
              const mode = j === 1 && k === 1 ? '翻转二分频 (f_clk/2)' : j === 1 && k === 0 ? '强制置 1' : j === 0 && k === 1 ? '强制清 0' : '保持';
              return {
                expression: `J=${j}, K=${k} -> 模式: ${mode}`,
                result: `实时采样 Q = ${q}`,
                status: j === 1 && k === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l22s2-j',
            label: 'J 控制端',
            targetId: 'in_j',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l22s2-k',
            label: 'K 控制端',
            targetId: 'in_k',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (置位/保持)', value: 0 },
              { label: '1 (与J=1联用→翻转)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：JK 触发器四态切换与二分频', type: 'JK_FF', componentId: 'jk1', stepIndex: 0 }],
        checkpoint: {
          title: '开启 J=K=1 二分频翻转工作',
          instruction: '使 J=1 且 K=1，让 JK 触发器进入二分频翻转模式并在示波器观察半频方波。',
          hint: '在保持 J=1 时将 K 切为 1。',
          check: (ctx) => {
            const j = numProp(ctx, 'in_j', 'state', 0) ? 1 : 0;
            const k = numProp(ctx, 'in_k', 'state', 0) ? 1 : 0;
            const ok = j === 1 && k === 1;
            return {
              passed: ok,
              message: ok
                ? '已进入 J=K=1 二分频模式！每两个时钟沿完成一次完整方波周期。'
                : `当前 J=${j}, K=${k}（请同时设为 J=1, K=1 启用翻转功能）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动开启 J=K=1 二分频',
            description: '将 K 切为 1 与 J=1 构成翻转触发器，实时输出 f_clk/2 方波',
            actions: [
              { kind: 'setProp', componentId: 'in_j', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_k', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l22-s3',
        stageNumber: 3,
        title: '反馈清零改制：模 10 (BCD 8421) 计数器',
        badge: 'Step 3 · 模 N 改制核心',
        conceptGoal: '4 位二进制天然计数 0~15；用与门检出“10 (1010₂ = Q3·Q1)”接至异步清零端 RST，即可在跳向 10 的纳秒瞬间归零。',
        explanation:
          '当前清零反馈开关 k_bcd 处于断开状态，5 Hz 时钟驱动 4 位计数器一直数满 0→F（经过 2 秒预热已经出现 A~F 十六进制读数！）。请合上 k_bcd 接入 Q3·Q1 与门清零环，计数器从此严格循环 0→1→…→9→0！',
        analogy: '就像机械水表读数盘一转到“10”就卡进回零弹簧瞬间弹回“0”，同时顺带把进位传给十位表盘。',
        highlights: ['cnt1', 'and_rst', 'k_bcd', 'hex1'],
        newlyAddedIds: ['clk3', 'cnt1', 'and_rst', 'k_bcd', 'r_pd', 'hex1'],
        circuit: mkCircuit(
          [
            mkComp('clk3', 'CLOCK', '5 Hz 时钟', 90, 170, 0, { frequency: 5 }),
            mkComp('cnt1', 'COUNTER_4BIT', '4 位二进制计数器', 310, 210, 0),
            mkComp('and_rst', 'AND', '1010₂ 译码 (Q3·Q1)', 480, 350, 0),
            mkComp('k_bcd', 'SWITCH_SPST', '模10清零反馈开关', 290, 350, 180, { closed: false }),
            mkComp('r_pd', 'RESISTOR', 'R_pd (10kΩ)', 170, 350, 90, { resistance: 10000, maxPower: 0.25 }),
            mkComp('gnd1', 'GROUND', 'GND', 170, 440, 0),
            mkComp('hex1', 'HEX_DISPLAY', '十进制 HEX 显示', 690, 200, 0),
          ],
          [
            ['clk3', 'out', 'cnt1', 'clk', '#f59e0b'],
            ['cnt1', 'q3', 'hex1', 'd3', '#38bdf8'],
            ['cnt1', 'q2', 'hex1', 'd2', '#22c55e'],
            ['cnt1', 'q1', 'hex1', 'd1', '#a855f7'],
            ['cnt1', 'q0', 'hex1', 'd0', '#f59e0b'],
            ['cnt1', 'q3', 'and_rst', 'a', '#38bdf8'],
            ['cnt1', 'q1', 'and_rst', 'b', '#a855f7'],
            ['and_rst', 'y', 'k_bcd', 'a', '#ef4444'],
            ['k_bcd', 'b', 'cnt1', 'rst', '#ef4444'],
            ['cnt1', 'rst', 'r_pd', 'a', '#64748b'],
            ['r_pd', 'b', 'gnd1', 'gnd', '#475569'],
          ],
          'l22s3'
        ),
        prewarmSeconds: 2.05,
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l22-s3-f1',
            title: '模 10 异步清零译码逻辑',
            formula: 'RST = Q3 · Q1  (仅在计至 10 = 1010₂ 瞬间归零，有效态 0~9)',
            evaluate: (ctx) => {
              const val = getTel(ctx, 'cnt1')?.logicState ?? 0;
              const closed = boolProp(ctx, 'k_bcd', 'closed');
              return {
                expression: `反馈开关: ${closed ? '闭合 (BCD 模10)' : '断开 (模16 十六进制)'}`,
                result: `当前计数 = ${val} (0x${val.toString(16).toUpperCase()}, ${(val >>> 0).toString(2).padStart(4, '0')}₂)`,
                status: closed && val <= 9 ? 'good' : val >= 10 ? 'warn' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l22s3-kbcd',
            label: '模 10 反馈清零开关 (k_bcd)',
            targetId: 'k_bcd',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [{ label: '思索：4 位同步计数器权重与清零', type: 'COUNTER_4BIT', componentId: 'cnt1', stepIndex: 0 }],
        checkpoint: {
          title: '合上开关锁定 0~9 十进制循环',
          instruction: '闭合模 10 清零反馈开关 k_bcd，观察计数器立即约束到 0~9（不再跳出 A~F）。',
          hint: '点击“模 10 反馈清零开关”切换为闭合。',
          check: (ctx) => {
            const closed = boolProp(ctx, 'k_bcd', 'closed');
            const val = getTel(ctx, 'cnt1')?.logicState ?? 15;
            const hex = getTel(ctx, 'hex1')?.logicState ?? 15;
            const ok = closed && val <= 9 && hex <= 9;
            return {
              passed: ok,
              message: ok
                ? `模 10 BCD 计数生效！当前数字 = ${val}（严格处于 0~9 循环内）`
                : `当前 k_bcd=${closed ? '合' : '断'}，计数=${val}（请闭合 k_bcd 激活 1010₂ 归零）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动闭合清零环切至 BCD 模 10',
            description: '闭合反馈开关接入 1010₂→RST 清零门，限定计数器在 0~9 循环',
            actions: [{ kind: 'setProp', componentId: 'k_bcd', key: 'closed', value: true }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 23 (Ch.12): 可编程 LUT 真值芯片 (CUSTOM_TRUTH_8) 与工程译码设计
  // =========================================================================
  {
    id: 'ch12-custom-ic-lut-design',
    chapterId: 'ch12',
    lessonNumber: 23,
    title: '可编程 8 槽真值芯片 (LUT) 与逻辑公式直烧设计',
    subtitle: '把一整块门电路微缩进可编程芯片：体验查表模式 (Table)、布尔公式直编模式 (Expr) 及红绿灯互锁实战',
    textbookRef: '第12章 12.4 可编程逻辑器件 (PLD / FPGA LUT 查找表原理)',
    difficulty: '进阶',
    durationMin: 14,
    prerequisites: ['ch11-gates-and-boolean'],
    learningObjectives: [
      '理解 FPGA 查找表 (LUT) 的本质：以真值表存储组合函数，无需焊接多颗分离门芯片',
      '学会用布尔表达式 (EN & X & Y) 直接编译烧录多输出使能控制芯片',
      '能独立分析并测试满足安全性（双红互锁、禁止双绿）的数字控制芯片',
    ],
    stages: [
      {
        id: 'l23-s1',
        stageNumber: 1,
        title: '一芯顶十门：8 槽查表模式 (LUT) 多数/奇偶集成块',
        badge: 'Step 1 · 真值查表编程',
        conceptGoal: '将任意三输入组合函数烧录到 8 行真值表中，单颗 CUSTOM_TRUTH_8 芯片同时输出 MAJ/ODD/AND3/OR3。',
        explanation:
          '工作台中央这颗 8 脚自定义芯片已写入三输入默认真值表：左脚 A, B, C 对应 s1~s3；右脚 s5=MAJ(多数), s6=ODD(奇校验), s7=AND3(全1), s8=OR3(全或)。当前 A=1, B=0, C=0 仅有 1 个高电平，试令 B=1、C=1 使三路全通，观察四输出同步翻变！',
        analogy: '就像电子乐谱盒：无需每次重新搭积木门电路，只要把真值表（乐谱）写入存储器，输入地址就直接弹出对应输出。',
        highlights: ['ic1', 'out_maj', 'out_and3'],
        newlyAddedIds: ['ic1', 'in_a', 'in_b', 'in_c', 'out_maj', 'out_odd', 'out_and3', 'out_or3'],
        circuit: mkCircuit(
          [
            mkComp('in_a', 'LOGIC_IN', '输入 A', 100, 120, 0, { state: 1, varName: 'A' }),
            mkComp('in_b', 'LOGIC_IN', '输入 B', 100, 220, 0, { state: 0, varName: 'B' }),
            mkComp('in_c', 'LOGIC_IN', '输入 C', 100, 320, 0, { state: 0, varName: 'C' }),
            mkComp('ic1', 'CUSTOM_TRUTH_8', '8槽 LUT 芯片', 380, 220, 0, {
              truthConfigJson: JSON.stringify(getDefaultTruthChipConfig(8)),
            }),
            mkComp('out_maj', 'LOGIC_OUT', 's5: MAJ (多数)', 670, 90, 0, { outName: 'MAJ' }),
            mkComp('out_odd', 'LOGIC_OUT', 's6: ODD (奇校验)', 670, 175, 0, { outName: 'ODD' }),
            mkComp('out_and3', 'LOGIC_OUT', 's7: AND3 (全1)', 670, 260, 0, { outName: 'AND3' }),
            mkComp('out_or3', 'LOGIC_OUT', 's8: OR3 (任1)', 670, 345, 0, { outName: 'OR3' }),
          ],
          [
            ['in_a', 'out', 'ic1', 's1', '#38bdf8'],
            ['in_b', 'out', 'ic1', 's2', '#a855f7'],
            ['in_c', 'out', 'ic1', 's3', '#f59e0b'],
            ['ic1', 's5', 'out_maj', 'in', '#22c55e'],
            ['ic1', 's6', 'out_odd', 'in', '#38bdf8'],
            ['ic1', 's7', 'out_and3', 'in', '#eab308'],
            ['ic1', 's8', 'out_or3', 'in', '#f43f5e'],
          ],
          'l23s1'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l23-s1-f1',
            title: 'LUT 芯片多输出实时译码',
            formula: 'MAJ = (A+B+C≥2)，ODD = A⊕B⊕C，AND3 = A·B·C',
            evaluate: (ctx) => {
              const maj = getTel(ctx, 'out_maj')?.logicState ?? 0;
              const odd = getTel(ctx, 'out_odd')?.logicState ?? 0;
              const and3 = getTel(ctx, 'out_and3')?.logicState ?? 0;
              const or3 = getTel(ctx, 'out_or3')?.logicState ?? 0;
              return {
                expression: `s5=${maj}, s6=${odd}, s7=${and3}, s8=${or3}`,
                result: and3 === 1 ? '全 1 态：四通道同时命中' : '部分使能状态',
                status: and3 === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l23s1-b',
            label: '输入 B (s2)',
            targetId: 'in_b',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l23s1-c',
            label: '输入 C (s3)',
            targetId: 'in_c',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：8 槽真值查找表硬件架构', type: 'CUSTOM_TRUTH_8', componentId: 'ic1', stepIndex: 0 }],
        checkpoint: {
          title: '触发“全 1 状态”四路联合输出',
          instruction: '令 A=1, B=1, C=1，使 MAJ、ODD、AND3、OR3 全部输出高电平 1。',
          hint: '在下方把 B 与 C 均切为 1。',
          check: (ctx) => {
            const maj = getTel(ctx, 'out_maj')?.logicState ?? 0;
            const odd = getTel(ctx, 'out_odd')?.logicState ?? 0;
            const and3 = getTel(ctx, 'out_and3')?.logicState ?? 0;
            const or3 = getTel(ctx, 'out_or3')?.logicState ?? 0;
            const ok = maj === 1 && odd === 1 && and3 === 1 && or3 === 1;
            return {
              passed: ok,
              message: ok
                ? 'LUT 并行查表验证通过！全 1 向量同时激活全部 4 路逻辑功能。'
                : `当前 MAJ=${maj}, ODD=${odd}, AND3=${and3}, OR3=${or3}（需 B=C=1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动设为 111 测试 LUT',
            description: '送入全 1 向量验证 8 槽查表芯片四路并行输出全部激活',
            actions: [
              { kind: 'setProp', componentId: 'in_a', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_b', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_c', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l23-s2',
        stageNumber: 2,
        title: '布尔表达式直烧模式 (Expr)：使能门控阵列',
        badge: 'Step 2 · 表达式编译模式',
        conceptGoal: '直接编写 s5="EN & X & Y" 等表达式烧录芯片，实现总使能闸门控制与未授权告警。',
        explanation:
          '芯片 ic2 已切换到布尔公式 (expr) 模式：总使能脚 EN 掌控全部主输出，只有 EN=1 时才放行 G_AND、G_OR、G_XOR；否则若 X 或 Y 偷跑高电平，ALARM=!EN&(X|Y) 将立刻鸣警！当前 EN=0、X=1、Y=1 正处于告警阻断态，打开 EN=1 解除告警并放行运算！',
        analogy: '就像数控机床的安全总钥匙：钥匙没插（EN=0）时硬按启动键 X/Y 只会拉响警报，钥匙插上后操作才生效。',
        highlights: ['ic2', 'in_en', 'out_gand', 'out_alarm'],
        newlyAddedIds: ['in_en', 'ic2', 'out_gand', 'out_gor', 'out_gxor', 'out_alarm'],
        circuit: mkCircuit(
          [
            mkComp('in_en', 'LOGIC_IN', '使能总开关 EN', 100, 120, 0, { state: 0, varName: 'EN' }),
            mkComp('in_x', 'LOGIC_IN', '信号 X', 100, 220, 0, { state: 1, varName: 'X' }),
            mkComp('in_y', 'LOGIC_IN', '信号 Y', 100, 320, 0, { state: 1, varName: 'Y' }),
            mkComp('ic2', 'CUSTOM_TRUTH_8', '公式烧录门控芯片', 380, 220, 0, {
              truthConfigJson: JSON.stringify(LUT_EXPR_GATE_ARRAY),
            }),
            mkComp('out_gand', 'LOGIC_OUT', 'G_AND = EN&X&Y', 680, 90, 0, { outName: 'G_AND' }),
            mkComp('out_gor', 'LOGIC_OUT', 'G_OR = EN&(X|Y)', 680, 175, 0, { outName: 'G_OR' }),
            mkComp('out_gxor', 'LOGIC_OUT', 'G_XOR = EN&(X^Y)', 680, 260, 0, { outName: 'G_XOR' }),
            mkComp('out_alarm', 'LOGIC_OUT', 'ALARM = !EN&(X|Y)', 680, 345, 0, { outName: 'ALARM' }),
          ],
          [
            ['in_en', 'out', 'ic2', 's1', '#22c55e'],
            ['in_x', 'out', 'ic2', 's2', '#38bdf8'],
            ['in_y', 'out', 'ic2', 's3', '#a855f7'],
            ['ic2', 's5', 'out_gand', 'in', '#22c55e'],
            ['ic2', 's6', 'out_gor', 'in', '#38bdf8'],
            ['ic2', 's7', 'out_gxor', 'in', '#f59e0b'],
            ['ic2', 's8', 'out_alarm', 'in', '#ef4444'],
          ],
          'l23s2'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l23-s2-f1',
            title: '使能门控与非法操作报警表达式',
            formula: 'G_AND = EN·X·Y | ALARM = ¬EN·(X + Y)',
            evaluate: (ctx) => {
              const en = numProp(ctx, 'in_en', 'state', 0) ? 1 : 0;
              const gAnd = getTel(ctx, 'out_gand')?.logicState ?? 0;
              const alarm = getTel(ctx, 'out_alarm')?.logicState ?? 0;
              return {
                expression: `EN=${en}`,
                result: `G_AND=${gAnd}, ALARM=${alarm}`,
                status: gAnd === 1 && alarm === 0 ? 'good' : alarm === 1 ? 'warn' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l23s2-en',
            label: '使能总开关 EN',
            targetId: 'in_en',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (锁定/触发告警)', value: 0 },
              { label: '1 (使能放行)', value: 1 },
            ],
          },
          {
            id: 'qc-l23s2-y',
            label: '信号 Y',
            targetId: 'in_y',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：自定义芯片公式安全解析', type: 'CUSTOM_TRUTH_8', componentId: 'ic2', stepIndex: 1 }],
        checkpoint: {
          title: '打开 EN 解除告警并激活 G_AND',
          instruction: '保持 X=1、Y=1，将 EN 切换为 1，确认 ALARM 灭 (0) 且 G_AND 亮 (1)。',
          hint: '点击“使能总开关 EN”为 1。',
          check: (ctx) => {
            const gAnd = getTel(ctx, 'out_gand')?.logicState ?? 0;
            const alarm = getTel(ctx, 'out_alarm')?.logicState ?? 1;
            const ok = gAnd === 1 && alarm === 0;
            return {
              passed: ok,
              message: ok
                ? '表达式门控验证通过：EN=1 放行全部运算输出，告警彻底清除！'
                : `当前 G_AND=${gAnd}, ALARM=${alarm}（请令 EN=1 且 X=Y=1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动授权 EN=1 放行',
            description: '拉高总使能脚 EN=1，清除未授权告警并放行运算表达式输出',
            actions: [
              { kind: 'setProp', componentId: 'in_en', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_x', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'in_y', key: 'state', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l23-s3',
        stageNumber: 3,
        title: '工程实战：十字路口红绿灯安全互锁译码器',
        badge: 'Step 3 · 互锁安全逻辑',
        conceptGoal: '正常相位保证东西与南北绿灯严格互斥 (NS_G · EW_G ≡ 0)；紧急模式 EMG=1 时强制双方向全红锁死。',
        explanation:
          '交通控制器绝不能允许东西、南北同时亮绿灯！本芯片写入互锁逻辑：常规状态 P1=0 时南北绿 (NS_G=1) 且东西红 (EW_R=1)；P1=1 时对调；一旦按下消防/救护车优先键 EMG=1，芯片强制 NS_R=1 且 EW_R=1 同时双红禁行！',
        analogy: '就像铁路信号联锁机：任何时刻同一交叉口绝不出现两条交叉绿灯进路，应急开关可一键全线红灯急停。',
        highlights: ['ic3', 'sw_emg', 'out_nsr', 'out_ewr'],
        newlyAddedIds: ['sw_p1', 'sw_p0', 'sw_emg', 'ic3', 'out_nsg', 'out_nsr', 'out_ewg', 'out_ewr'],
        circuit: mkCircuit(
          [
            mkComp('sw_p1', 'LOGIC_IN', '相位高位 P1', 100, 120, 0, { state: 0, varName: 'P1' }),
            mkComp('sw_p0', 'LOGIC_IN', '相位低位 P0', 100, 220, 0, { state: 0, varName: 'P0' }),
            mkComp('sw_emg', 'LOGIC_IN', '紧急全红 EMG', 100, 320, 0, { state: 0, varName: 'EMG' }),
            mkComp('ic3', 'CUSTOM_TRUTH_8', '交通联锁控制器', 380, 220, 0, {
              truthConfigJson: JSON.stringify(LUT_TRAFFIC_INTERLOCK),
            }),
            mkComp('out_nsg', 'LOGIC_OUT', '南北绿 NS_G', 680, 90, 0, { outName: 'NS_G' }),
            mkComp('out_nsr', 'LOGIC_OUT', '南北红 NS_R', 680, 175, 0, { outName: 'NS_R' }),
            mkComp('out_ewg', 'LOGIC_OUT', '东西绿 EW_G', 680, 260, 0, { outName: 'EW_G' }),
            mkComp('out_ewr', 'LOGIC_OUT', '东西红 EW_R', 680, 345, 0, { outName: 'EW_R' }),
          ],
          [
            ['sw_p1', 'out', 'ic3', 's1', '#38bdf8'],
            ['sw_p0', 'out', 'ic3', 's2', '#94a3b8'],
            ['sw_emg', 'out', 'ic3', 's3', '#ef4444'],
            ['ic3', 's5', 'out_nsg', 'in', '#22c55e'],
            ['ic3', 's6', 'out_nsr', 'in', '#ef4444'],
            ['ic3', 's7', 'out_ewg', 'in', '#22c55e'],
            ['ic3', 's8', 'out_ewr', 'in', '#ef4444'],
          ],
          'l23s3'
        ),
        preferredAnalysisTab: 'digital',
        liveFormulas: [
          {
            id: 'l23-s3-f1',
            title: '交通信号互锁安全性检查',
            formula: 'NS_G = ¬EMG·¬P1 | EW_G = ¬EMG·P1 | 双绿约束: NS_G·EW_G ≡ 0',
            evaluate: (ctx) => {
              const nsg = getTel(ctx, 'out_nsg')?.logicState ?? 0;
              const nsr = getTel(ctx, 'out_nsr')?.logicState ?? 0;
              const ewg = getTel(ctx, 'out_ewg')?.logicState ?? 0;
              const ewr = getTel(ctx, 'out_ewr')?.logicState ?? 0;
              return {
                expression: `南北(G=${nsg}, R=${nsr}) | 东西(G=${ewg}, R=${ewr})`,
                result: nsr === 1 && ewr === 1 ? '全向双红急停已锁定！' : '正常互斥放行中',
                status: nsr === 1 && ewr === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l23s3-p1',
            label: '常规相位切换 P1',
            targetId: 'sw_p1',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (南北通行)', value: 0 },
              { label: '1 (东西通行)', value: 1 },
            ],
          },
          {
            id: 'qc-l23s3-emg',
            label: '紧急双红急停 EMG',
            targetId: 'sw_emg',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (正常放行)', value: 0 },
              { label: '1 (全向红灯锁死)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：自定义 LUT 工业控灯拓展', type: 'CUSTOM_TRUTH_8', componentId: 'ic3', stepIndex: 2 }],
        checkpoint: {
          title: '触发紧急全红安全联锁',
          instruction: '按下紧急优先开关 EMG=1，确认南北与东西红灯同时点亮 (NS_R=1, EW_R=1) 且绿灯全灭。',
          hint: '将“紧急双红急停 EMG”切换为 1。',
          check: (ctx) => {
            const nsg = getTel(ctx, 'out_nsg')?.logicState ?? 1;
            const nsr = getTel(ctx, 'out_nsr')?.logicState ?? 0;
            const ewg = getTel(ctx, 'out_ewg')?.logicState ?? 1;
            const ewr = getTel(ctx, 'out_ewr')?.logicState ?? 0;
            const ok = nsr === 1 && ewr === 1 && nsg === 0 && ewg === 0;
            return {
              passed: ok,
              message: ok
                ? '安全联锁生效！双方向全部锁定红灯禁行，为应急车辆腾空路口。'
                : `当前 NS_R=${nsr}, EW_R=${ewr}（请将 EMG 设为 1 强制双红）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动开启 EMG 紧急全红',
            description: '置位紧急优先信号 EMG=1，强制东西与南北全部红灯互锁禁行',
            actions: [{ kind: 'setProp', componentId: 'sw_emg', key: 'state', value: 1 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 24 (Ch.13): NE555 时基脉冲电路（窗口滞回、单稳态、无稳态方波）
  // =========================================================================
  {
    id: 'ch13-timer-555-pulse-circuits',
    chapterId: 'ch13',
    lessonNumber: 24,
    title: 'NE555 时基芯片：窗口滞回、单稳态定时与多谐振荡',
    subtitle: '解剖模数混合经典神片 555 的三只 5kΩ 分压核心，实现可预测定宽脉冲与自激方波发生器',
    textbookRef: '第13章 13.1–13.3 555 定时器原理及单稳/多谐应用',
    difficulty: '进阶',
    durationMin: 18,
    prerequisites: ['ch3-rc-transient', 'ch9-opamp-math-and-comparators'],
    learningObjectives: [
      '熟记 555 芯片内部分压基准 1/3 Vcc (TRIG 低触发置1) 与 2/3 Vcc (THRES 高触发清0) 的滞回区间',
      '理解单稳态触发模式下 RC 充放电过程与脉宽公式 t_w = 1.1 R·C',
      '掌握无稳态多谐振荡器周而复始自动充放电并利用 f ≈ 1.44 / ((RA + 2RB)·C) 调节方波频率',
    ],
    stages: [
      {
        id: 'l24-s1',
        stageNumber: 1,
        title: '555 内部两级窗口比较器 (1/3 ~ 2/3 Vcc 滞回)',
        badge: 'Step 1 · 555 内部核芯',
        conceptGoal: '将 THRES 与 TRIG 短接接输入 V_c：高于 2/3 Vcc 必清 0；低于 1/3 Vcc 必置 1；中间保持原态抗抖动！',
        explanation:
          '555 名字源于内部三只串联的 5kΩ 分压电阻：它们产生精确的 1/3 Vcc (1.67V) 和 2/3 Vcc (3.33V) 两条门限。当前输入 Vc=4.0V 高于 3.33V，RS 触发器被强行复位 (OUT=0V)。将 Vc 逐步下拉越过 1.67V 下限，看看输出如何在接近 1.67V 时干脆利落地跳变为 5V！',
        analogy: '就像恒温水壶开关：水凉到低于 60°C (1/3 Vcc) 才启动烧水，加热到 90°C (2/3 Vcc) 才断开；在 60~90°C 之间保持当前状态不乱跳。',
        highlights: ['u555', 'vc', 'vm_out'],
        newlyAddedIds: ['vcc', 'vc', 'u555', 'r_load', 'vm_c', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'Vcc 5V 供电', 110, 140, 270, { voltage: 5 }),
            mkComp('vc', 'DC_SOURCE', '输入测试电位 Vc', 110, 310, 270, { voltage: 4.0 }),
            mkComp('u555', 'TIMER_555', 'NE555 定时器', 420, 220, 0),
            mkComp('r_load', 'RESISTOR', 'R_L (1kΩ)', 660, 230, 90, { resistance: 1000, maxPower: 0.5 }),
            mkComp('vm_c', 'VOLTMETER', 'PV_in 监测输入', 260, 320, 90, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out 输出电平', 760, 230, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 420, 400, 0),
          ],
          [
            ['vcc', 'pos', 'u555', 'vcc', '#ef4444'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vc', 'pos', 'u555', 'thres', '#38bdf8'],
            ['u555', 'thres', 'u555', 'trig', '#38bdf8'],
            ['vc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u555', 'gnd', 'gnd1', 'gnd', '#475569'],
            ['u555', 'out', 'r_load', 'a', '#22c55e'],
            ['r_load', 'b', 'gnd1', 'gnd', '#475569'],
            ['vc', 'pos', 'vm_c', 'pos', '#38bdf8'],
            ['gnd1', 'gnd', 'vm_c', 'neg', '#475569'],
            ['u555', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l24s1'
        ),
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out', 'vm_c'],
        liveFormulas: [
          {
            id: 'l24-s1-f1',
            title: '555 双门限滞回比较规则',
            formula: '下门限 1/3·Vcc = 1.67V (置1) | 上门限 2/3·Vcc = 3.33V (清0)',
            evaluate: (ctx) => {
              const vc = numProp(ctx, 'vc', 'voltage', 4.0);
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `V_in = ${vc.toFixed(2)}V（1/3Vcc=1.67V, 2/3Vcc=3.33V）`,
                result: `OUT = ${fmtV(vout)} (${vout > 2.5 ? '高电平 SET' : '低电平 RESET'})`,
                status: vout >= 4.4 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l24s1-vc',
            label: '扫描测试电位 Vc',
            targetId: 'vc',
            propKey: 'voltage',
            kind: 'slider',
            min: 0.5,
            max: 4.5,
            step: 0.2,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：555 三只 5kΩ 分压比较核', type: 'TIMER_555', componentId: 'u555', stepIndex: 0 }],
        checkpoint: {
          title: '跌破 1/3 Vcc 门限翻转输出为高电平',
          instruction: '把输入 Vc 下调至 1.6V 以下（如 1.0V），确认 555 输出跳变为 +5V 左右高电平。',
          hint: '向左拖动 Vc 滑块到 ≤ 1.5V。',
          check: (ctx) => {
            const vc = numProp(ctx, 'vc', 'voltage', 4.0);
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = vc < 1.65 && vout >= 4.4;
            return {
              passed: ok,
              message: ok
                ? `施密特滞回置位成功！Vc=${vc.toFixed(2)}V < 1.67V -> OUT=${vout.toFixed(2)}V`
                : `当前 Vc=${vc.toFixed(2)}V, OUT=${vout.toFixed(2)}V（需降到 < 1.67V 触发置 1）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动拉低 Vc 至 1.0V 触发',
            description: '把控制电压降至低于 1/3 Vcc (1.67V)，验证 555 输出跳变为高电平',
            actions: [{ kind: 'setProp', componentId: 'vc', key: 'voltage', value: 1.0 }],
          },
        },
      },
      {
        id: 'l24-s2',
        stageNumber: 2,
        title: '555 单稳态定宽脉冲定时器 (t_w = 1.1 R·C)',
        badge: 'Step 2 · 单稳态定宽定时',
        conceptGoal: 'TRIG 收到短暂负跳变脉冲后 OUT 立刻跳高，DIS 放电管截止让 C_t 经 R_t 充电，充至 2/3 Vcc 自动归零。',
        explanation:
          '定时参数 R_t = 100kΩ、C_t = 10μF，理论定宽时间 t_w = 1.1 × 100k × 10μ = 1.10s。左侧由微分耦合电容构成负沿触发开关 sw_trig：将它由“高 (0)”拨向“触发负沿 (1)”产生一个短暂低电平尖峰唤醒 555，随即看到 OUT 跳至 +5V、电容电压 V_c 指数爬升直到越过 3.33V 自动灭灯！',
        analogy: '就像楼道声控延时开关：拍一下手（负触发脉冲）灯亮起来（OUT=5V），沙漏 C_t 慢慢蓄满 2/3 后准时熄灭。',
        highlights: ['u555', 'rt', 'ct', 'sw_trig', 'vm_out'],
        newlyAddedIds: ['rt', 'ct', 'r_pull', 'c_trig', 'sw_trig', 'vm_ct'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'Vcc 5V', 90, 140, 270, { voltage: 5 }),
            mkComp('rt', 'RESISTOR', '定时电阻 Rt (100kΩ)', 300, 100, 0, { resistance: 100000, maxPower: 0.25 }),
            mkComp('ct', 'CAPACITOR', '定时电容 Ct (10µF)', 340, 320, 90, { capacitance: 10, maxVoltage: 16 }),
            mkComp('r_pull', 'RESISTOR', '触发上拉 10kΩ', 220, 180, 90, { resistance: 10000, maxPower: 0.25 }),
            mkComp('sw_trig', 'SWITCH_SPDT', '负沿触发开关', 90, 280, 0, { position: 0 }),
            mkComp('c_trig', 'CAPACITOR', '微分触发电容 1µF', 200, 280, 0, { capacitance: 1, maxVoltage: 16 }),
            mkComp('u555', 'TIMER_555', 'NE555 单稳核心', 490, 210, 0),
            mkComp('r_load', 'RESISTOR', 'R_L (1kΩ)', 710, 220, 90, { resistance: 1000, maxPower: 0.5 }),
            mkComp('vm_ct', 'VOLTMETER', 'PV_C 电容电压', 490, 370, 0, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out 脉冲输出', 810, 220, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 490, 440, 0),
          ],
          [
            ['vcc', 'pos', 'u555', 'vcc', '#ef4444'],
            ['vcc', 'pos', 'rt', 'a', '#ef4444'],
            ['rt', 'b', 'u555', 'thres', '#38bdf8'],
            ['u555', 'thres', 'u555', 'dis', '#a855f7'],
            ['u555', 'thres', 'ct', 'pos', '#38bdf8'],
            ['ct', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'pos', 'r_pull', 'a', '#ef4444'],
            ['r_pull', 'b', 'u555', 'trig', '#f59e0b'],
            ['vcc', 'pos', 'sw_trig', 'nc', '#ef4444'],
            ['sw_trig', 'no', 'gnd1', 'gnd', '#475569'],
            ['sw_trig', 'com', 'c_trig', 'neg', '#f59e0b'],
            ['c_trig', 'pos', 'u555', 'trig', '#f59e0b'],
            ['u555', 'gnd', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u555', 'out', 'r_load', 'a', '#22c55e'],
            ['r_load', 'b', 'gnd1', 'gnd', '#475569'],
            ['ct', 'pos', 'vm_ct', 'pos', '#38bdf8'],
            ['gnd1', 'gnd', 'vm_ct', 'neg', '#475569'],
            ['u555', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l24s2'
        ),
        prewarmSeconds: 0.1,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out', 'vm_ct'],
        liveFormulas: [
          {
            id: 'l24-s2-f1',
            title: '单稳态暂稳态脉宽公式',
            formula: 't_w = 1.1 · R_t · C_t = 1.1 × 100kΩ × 10µF = 1.10 s',
            evaluate: (ctx) => {
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const vct = getTel(ctx, 'vm_ct')?.voltageDrop ?? 0;
              const pos = numProp(ctx, 'sw_trig', 'position', 0);
              return {
                expression: `触发=${pos === 1 ? '已按下负沿' : '待命'} | V_Ct=${fmtV(vct)} (阈值 3.33V)`,
                result: `OUT = ${fmtV(vout)} (${vout > 2.5 ? '高脉冲输出中!' : '已恢复稳态低电平'})`,
                status: vout >= 4.2 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l24s2-trig',
            label: '单稳态负沿触发拨动开关',
            targetId: 'sw_trig',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '0 (复位充电准备)', value: 0 },
              { label: '1 (发出 ↓ 触发脉冲)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：555 内部放电管与单稳定时', type: 'TIMER_555', componentId: 'u555', stepIndex: 1 }],
        checkpoint: {
          title: '触发 555 单稳态产生定宽高脉冲',
          instruction: '将触发开关拨至 1 产生负跳变触发，捕捉 OUT 跳为 +5V 且 Ct 正在向 3.33V 攀升的暂稳过程。',
          hint: '点击“1 (发出 ↓ 触发脉冲)”按钮并在 1.1 秒暂稳期结束前即时观察脉冲（自动演示将在脉冲输出期内完成校验）。',
          check: (ctx) => {
            const pos = numProp(ctx, 'sw_trig', 'position', 0);
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const vct = getTel(ctx, 'vm_ct')?.voltageDrop ?? 0;
            const ok = pos === 1 && vout >= 4.2 && vct >= 0.8 && vct < 3.4;
            return {
              passed: ok,
              message: ok
                ? `单稳脉冲触发成功！OUT=${vout.toFixed(2)}V，V_Ct=${vct.toFixed(2)}V 正在朝 3.33V 指数上升`
                : `当前 OUT=${vout.toFixed(2)}V, V_Ct=${vct.toFixed(2)}V（需在切换为 1 后的 1.1s 脉冲期内观测）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动复位并触发单稳态脉冲',
            description: '先将触发开关复位至 0 并等待耦合电容与定时电路恢复，再拨至 1 发出负脉冲重新触发 1.1s 定时高电平',
            settleSeconds: 0.6,
            actions: [
              { kind: 'setProp', componentId: 'sw_trig', key: 'position', value: 0 },
              { kind: 'wait', seconds: 1.25 },
              { kind: 'setProp', componentId: 'sw_trig', key: 'position', value: 1 },
            ],
          },
        },
      },
      {
        id: 'l24-s3',
        stageNumber: 3,
        title: '555 无稳态多谐振荡器（方波信号发生器）',
        badge: 'Step 3 · 自激方波源',
        conceptGoal: '将 THRES 与 TRIG 相连并经 RA、RB 自举循环：电容电压永远在 1/3 Vcc ~ 2/3 Vcc 锯齿往返，无需外触发！',
        explanation:
          '拆掉外触发开关后，电容 Ct 经 RA+RB 充电到 2/3 Vcc (3.33V) 时自动导通 DIS 引脚，再经 RB 对地放电到 1/3 Vcc (1.67V) 又自动关闭 DIS，周而复始输出连续方波！由于真实 555 存在 DIS 饱和导通内阻（约 12Ω）、输入端漏电与离散翻转过冲，实际波形周期比理想公式 f_理 = 1.44/((RA+2RB)C) 略长：默认 RB=47kΩ 时实测约 1.31Hz（理论 1.39Hz），RB=10kΩ 时实测约 4.59Hz（理论 4.81Hz）。',
        analogy: '就像永不停歇的双稳态秋千：荡到高点 2/3 Vcc 自动泄力回落，跌到低点 1/3 Vcc 自动再推一把；每次换向还有一点点惯性滞后。',
        highlights: ['u555', 'ra', 'rb', 'ct', 'vm_out'],
        newlyAddedIds: ['ra', 'rb'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'Vcc 5V', 100, 180, 270, { voltage: 5 }),
            mkComp('ra', 'RESISTOR', '上臂电阻 RA (10kΩ)', 250, 100, 0, { resistance: 10000, maxPower: 0.25 }),
            mkComp('rb', 'RESISTOR', '充放共臂 RB (47kΩ)', 250, 220, 0, { resistance: 47000, maxPower: 0.25 }),
            mkComp('ct', 'CAPACITOR', '振荡电容 Ct (10µF)', 310, 340, 90, { capacitance: 10, maxVoltage: 16 }),
            mkComp('u555', 'TIMER_555', 'NE555 无稳振荡', 480, 210, 0),
            mkComp('r_load', 'RESISTOR', 'R_L (1kΩ)', 710, 210, 90, { resistance: 1000, maxPower: 0.5 }),
            mkComp('vm_ct', 'VOLTMETER', 'PV_C 锯齿波', 480, 360, 0, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out 方波输出', 810, 210, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 480, 440, 0),
          ],
          [
            ['vcc', 'pos', 'u555', 'vcc', '#ef4444'],
            ['vcc', 'pos', 'ra', 'a', '#ef4444'],
            ['ra', 'b', 'u555', 'dis', '#a855f7'],
            ['u555', 'dis', 'rb', 'a', '#a855f7'],
            ['rb', 'b', 'u555', 'thres', '#38bdf8'],
            ['u555', 'thres', 'u555', 'trig', '#38bdf8'],
            ['u555', 'thres', 'ct', 'pos', '#38bdf8'],
            ['ct', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u555', 'gnd', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u555', 'out', 'r_load', 'a', '#22c55e'],
            ['r_load', 'b', 'gnd1', 'gnd', '#475569'],
            ['ct', 'pos', 'vm_ct', 'pos', '#38bdf8'],
            ['gnd1', 'gnd', 'vm_ct', 'neg', '#475569'],
            ['u555', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l24s3'
        ),
        prewarmSeconds: 2.2,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out', 'vm_ct'],
        liveFormulas: [
          {
            id: 'l24-s3-f1',
            title: '理论公式 vs 输出边沿实测频率（含器件模型误差说明）',
            formula: '理论 f_理 ≈ 1.44/((RA+2RB)C) | 实测 f_实 = 1/T_实（含 DIS 内阻与阈值过冲偏移）',
            evaluate: (ctx) => {
              const ra = numProp(ctx, 'ra', 'resistance', 10000);
              const rb = numProp(ctx, 'rb', 'resistance', 47000);
              const cF = numProp(ctx, 'ct', 'capacitance', 10) * 1e-6;
              const idealFreq = 1.4427 / Math.max(1e-9, (ra + 2 * rb) * cF);
              const duty = ((ra + rb) / (ra + 2 * rb)) * 100;
              const vc = getTel(ctx, 'vm_ct')?.voltageDrop ?? 0;
              const wf = ctx.waveformStatsById?.vm_out;
              const measFreq = wf?.frequencyHz ?? null;
              const measPeriod = wf?.periodSec ?? null;
              const errPct =
                measFreq !== null && idealFreq > 0
                  ? ((measFreq - idealFreq) / idealFreq) * 100
                  : null;
              return {
                expression: `RA=${(ra / 1000).toFixed(0)}kΩ, RB=${(rb / 1000).toFixed(0)}kΩ, Vc=${vc.toFixed(2)}V | 理论 f_理 = ${idealFreq.toFixed(2)} Hz (占空比 D=${duty.toFixed(1)}%)`,
                result:
                  measFreq !== null && measPeriod !== null
                    ? `实测 f_实 = ${measFreq.toFixed(2)} Hz (周期 T_实 = ${(measPeriod * 1000).toFixed(0)} ms, 模型偏差 ${errPct!.toFixed(1)}%)`
                    : `正在采样连续方波边沿周期…（理论 ${idealFreq.toFixed(2)} Hz，请稍候完成 1 个完整周期）`,
                status: measFreq !== null && measFreq >= 4.0 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l24s3-rb',
            label: '调节充放电阻 RB',
            targetId: 'rb',
            propKey: 'resistance',
            kind: 'slider',
            min: 5000,
            max: 60000,
            step: 5000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：555 无稳态自激循环波形图解', type: 'TIMER_555', componentId: 'u555', stepIndex: 2 }],
        checkpoint: {
          title: '验证实际输出波形周期：使实测 f_实 ≥ 4.0 Hz (T_实 ≤ 0.25 s)',
          instruction: '将电阻 RB 下调至 ≤ 12 kΩ（例如 10 kΩ），等待示波器测得完整输出边沿周期，确认实际方波频率 ≥ 4.0 Hz。',
          hint: '向左拖动 RB 滑块到 10000 Ω，在底部【实时电参量与示波器】观察紧凑方波（RB=10kΩ 时实测约 4.59Hz / 理论 4.81Hz）。',
          check: (ctx) => {
            const ra = numProp(ctx, 'ra', 'resistance', 10000);
            const rb = numProp(ctx, 'rb', 'resistance', 47000);
            const cF = numProp(ctx, 'ct', 'capacitance', 10) * 1e-6;
            const idealFreq = 1.4427 / Math.max(1e-9, (ra + 2 * rb) * cF);
            const vc = getTel(ctx, 'vm_ct')?.voltageDrop ?? 0;
            const wf = ctx.waveformStatsById?.vm_out;
            const measPeriod = wf?.periodSec ?? null;
            const measFreq = wf?.frequencyHz ?? null;
            const ok =
              wf !== undefined &&
              wf.cycleCount >= 1 &&
              measPeriod !== null &&
              measPeriod > 0 &&
              measPeriod <= 0.25 &&
              measFreq !== null &&
              measFreq >= 4.0 &&
              vc >= 1.2 &&
              vc <= 3.8;
            return {
              passed: ok,
              message: ok
                ? `实测方波频率达标！实测 f_实=${measFreq!.toFixed(2)} Hz (T_实=${measPeriod!.toFixed(3)} s) · 理论 ${idealFreq.toFixed(2)} Hz`
                : measFreq !== null && measPeriod !== null
                ? `当前实测 f_实=${measFreq.toFixed(2)} Hz (T_实=${measPeriod.toFixed(3)} s) / 理论 ${idealFreq.toFixed(2)} Hz（需实际周期 T_实 ≤ 0.25s 即 f_实 ≥ 4.0Hz）`
                : `正在测量新参数下的实际输出波形周期…（理论 ${idealFreq.toFixed(2)} Hz，请等待完整周期完成）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动设为 RB=10kΩ (实测 ≈4.59Hz / 理论 4.81Hz)',
            description: '缩小充放共臂电阻 RB=10kΩ 并实测连续输出边沿周期，验证实际频率 ≥ 4.0 Hz',
            settleSeconds: 0.85,
            actions: [{ kind: 'setProp', componentId: 'rb', key: 'resistance', value: 10000 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 25 (Ch.13): 数模转换器 (DAC)：权电阻、R-2R 梯形与数字阶梯波合成
  // =========================================================================
  {
    id: 'ch13-dac-conversion',
    chapterId: 'ch13',
    lessonNumber: 25,
    title: '数模转换器 (DAC)：权电阻、R-2R 梯形与阶梯波合成',
    subtitle: '打通数字世界通向模拟世界的高速公路：以二进制电阻权重把离散数字码精确定量映射成连续电压',
    textbookRef: '第13章 13.4 D/A 转换器原理及主要技术指标',
    difficulty: '综合',
    durationMin: 16,
    prerequisites: ['ch9-opamp-math-and-comparators', 'ch12-flipflops-and-counters'],
    learningObjectives: [
      '掌握 4 位倒 T/权电阻网络中 10k/20k/40k/80k 对应 8/4/2/1 二进制权重的叠加计算',
      '理解 R-2R 梯形网络仅用 R 与 2R 两种阻值就能构造无穷高精度逐级分半电流的优势',
      '构建“计数器 + DAC”数字波形发生器，实测从数字整数到模拟阶梯电压的实时映射',
    ],
    stages: [
      {
        id: 'l25-s1',
        stageNumber: 1,
        title: '4 位二进制加权电阻 DAC (-0.5 V / LSB)',
        badge: 'Step 1 · 权电阻 DAC',
        conceptGoal: '让每位支路电阻按 1 : 2 : 4 : 8 倍增（10k/20k/40k/80k），反相虚地求和输出即严格等于 -0.5V × 数字值！',
        explanation:
          '四位数字输入 b3(8), b2(4), b1(2), b0(1)（高电平 = 5V）经 10kΩ、20kΩ、40kΩ、80kΩ 四支路汇入运放反相“虚地”求流，反馈电阻 Rf = 8kΩ，故每 1 个最低有效位 (LSB) 精准对应 -5 × (8k/80k) = -0.50V。当前输入 0010₂(2) 输出 -1.00V；把输入改成 1010₂(10)，看看能否准确合成 -5.00V！',
        analogy: '就像天平上分别标着 8g、4g、2g、1g 的四个砝码：只要挑出对应的砝码组合，就能精准称出 0~15g 中的任意重量。',
        highlights: ['b3', 'r3', 'r2', 'r1', 'r0', 'oa1', 'vm_out'],
        newlyAddedIds: ['b3', 'b2', 'b1', 'b0', 'r3', 'r2', 'r1', 'r0', 'rf', 'oa1', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('b3', 'LOGIC_IN', 'MSB b3 (权重8)', 90, 90, 0, { state: 0, varName: 'b3' }),
            mkComp('b2', 'LOGIC_IN', 'b2 (权重4)', 90, 170, 0, { state: 0, varName: 'b2' }),
            mkComp('b1', 'LOGIC_IN', 'b1 (权重2)', 90, 250, 0, { state: 1, varName: 'b1' }),
            mkComp('b0', 'LOGIC_IN', 'LSB b0 (权重1)', 90, 330, 0, { state: 0, varName: 'b0' }),
            mkComp('r3', 'RESISTOR', 'R3 (10kΩ)', 270, 90, 0, { resistance: 10000, maxPower: 0.25 }),
            mkComp('r2', 'RESISTOR', 'R2 (20kΩ)', 270, 170, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('r1', 'RESISTOR', 'R1 (40kΩ)', 270, 250, 0, { resistance: 40000, maxPower: 0.25 }),
            mkComp('r0', 'RESISTOR', 'R0 (80kΩ)', 270, 330, 0, { resistance: 80000, maxPower: 0.25 }),
            mkComp('rf', 'RESISTOR', 'Rf (8kΩ)', 530, 100, 0, { resistance: 8000, maxPower: 0.25 }),
            mkComp('oa1', 'OPAMP', '运放求和核心', 530, 220, 0, { railPos: 12, railNeg: -12, gain: 100000 }),
            mkComp('rl', 'RESISTOR', 'R_L (10kΩ)', 720, 240, 90, { resistance: 10000, maxPower: 0.5 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out 模拟输出', 820, 240, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 440, 380, 0),
          ],
          [
            ['b3', 'out', 'r3', 'a', '#ef4444'],
            ['b2', 'out', 'r2', 'a', '#f59e0b'],
            ['b1', 'out', 'r1', 'a', '#22c55e'],
            ['b0', 'out', 'r0', 'a', '#38bdf8'],
            ['r3', 'b', 'oa1', 'inm', '#a855f7'],
            ['r2', 'b', 'oa1', 'inm', '#a855f7'],
            ['r1', 'b', 'oa1', 'inm', '#a855f7'],
            ['r0', 'b', 'oa1', 'inm', '#a855f7'],
            ['oa1', 'inm', 'rf', 'a', '#f59e0b'],
            ['rf', 'b', 'oa1', 'out', '#f59e0b'],
            ['oa1', 'inp', 'gnd1', 'gnd', '#475569'],
            ['oa1', 'out', 'rl', 'a', '#22c55e'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['oa1', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l25s1'
        ),
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out'],
        liveFormulas: [
          {
            id: 'l25-s1-f1',
            title: '4 位权电阻 DAC 线性映射',
            formula: 'V_out = -0.5 V × (8·b3 + 4·b2 + 2·b1 + b0)',
            evaluate: (ctx) => {
              const b3 = numProp(ctx, 'b3', 'state', 0) ? 1 : 0;
              const b2 = numProp(ctx, 'b2', 'state', 0) ? 1 : 0;
              const b1 = numProp(ctx, 'b1', 'state', 1) ? 1 : 0;
              const b0 = numProp(ctx, 'b0', 'state', 0) ? 1 : 0;
              const code = b3 * 8 + b2 * 4 + b1 * 2 + b0;
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `数字码 ${b3}${b2}${b1}${b0}₂ = ${code} -> 理论 ${(-0.5 * code).toFixed(2)}V`,
                result: `实测 V_out = ${vout.toFixed(2)} V`,
                status: Math.abs(vout + 5.0) <= 0.15 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l25s1-b3',
            label: '最高位 b3 (8)',
            targetId: 'b3',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1 (+8 LSB / -4.0V)', value: 1 },
            ],
          },
          {
            id: 'qc-l25s1-b2',
            label: 'b2 (4)',
            targetId: 'b2',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l25s1-b1',
            label: 'b1 (2)',
            targetId: 'b1',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1 (+2 LSB / -1.0V)', value: 1 },
            ],
          },
          {
            id: 'qc-l25s1-b0',
            label: '最低位 b0 (1)',
            targetId: 'b0',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：运放虚地加法器求和本质', type: 'OPAMP', componentId: 'oa1', stepIndex: 1 }],
        checkpoint: {
          title: '合成为精确的 -5.00 V 模拟输出',
          instruction: '将 4 位二进制输入设为 1010₂（十进制 10，即 b3=1, b2=0, b1=1, b0=0），实测 V_out ≈ -5.00 V。',
          hint: '将最高位 b3 拨为 1，同时保留 b1=1, b2=0, b0=0。',
          check: (ctx) => {
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const b3 = numProp(ctx, 'b3', 'state', 0) ? 1 : 0;
            const b1 = numProp(ctx, 'b1', 'state', 0) ? 1 : 0;
            const ok = b3 === 1 && b1 === 1 && Math.abs(vout + 5.0) <= 0.15;
            return {
              passed: ok,
              message: ok
                ? `4 位 DAC 精度校准成功！1010₂ (10) -> 实测 V_out = ${vout.toFixed(2)}V`
                : `当前 V_out = ${vout.toFixed(2)}V（需输入 1010₂ 使输出 ≈ -5.00V）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动输入 1010₂ 输出 -5.00 V',
            description: '输入二进制 1010₂ (10)，在权电阻运放求和端精确合成 -5.00V',
            actions: [
              { kind: 'setProp', componentId: 'b3', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b2', key: 'state', value: 0 },
              { kind: 'setProp', componentId: 'b1', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b0', key: 'state', value: 0 },
            ],
          },
        },
      },
      {
        id: 'l25-s2',
        stageNumber: 2,
        title: 'R-2R 梯形电阻网络 DAC（消除超大阻值比）',
        badge: 'Step 2 · 工业 R-2R 梯形',
        conceptGoal: '仅需 R(10kΩ) 与 2R(20kΩ) 两种电阻，向右每阶戴维南等效阻抗恒为 R、权值精确减半，配合运放跟随无损输出！',
        explanation:
          '当分辨率升至 12 位时，权电阻需要跨越 2048 倍阻值极难制造；R-2R 梯形只用 10kΩ 与 20kΩ 两种标称电阻重复级联！终端接 20kΩ 到地，右侧节点接入运放电压跟随器隔离负载，直接输出精确正电压 V_out = 5V × N/16。当前 0100₂(4) 得 1.25V；改成 1100₂(12) 验证 3.75V！',
        analogy: '就像逐级减半的分流梯架：每一阶从左向右都正好“等分掉一半权重”，无需定制千奇百怪的特种电阻。',
        highlights: ['rs0', 'rs1', 'rs2', 'oa_buf', 'vm_out'],
        newlyAddedIds: ['r_term', 'rb0', 'rs0', 'rb1', 'rs1', 'rb2', 'rs2', 'rb3', 'oa_buf'],
        circuit: mkCircuit(
          [
            mkComp('b0', 'LOGIC_IN', 'LSB b0 (1)', 90, 90, 0, { state: 0, varName: 'b0' }),
            mkComp('b1', 'LOGIC_IN', 'b1 (2)', 90, 175, 0, { state: 0, varName: 'b1' }),
            mkComp('b2', 'LOGIC_IN', 'b2 (4)', 90, 260, 0, { state: 1, varName: 'b2' }),
            mkComp('b3', 'LOGIC_IN', 'MSB b3 (8)', 90, 345, 0, { state: 0, varName: 'b3' }),
            mkComp('r_term', 'RESISTOR', '端接 2R (20kΩ)', 210, 40, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('rb0', 'RESISTOR', '2R_0 (20kΩ)', 210, 110, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('rs0', 'RESISTOR', 'R_0 (10kΩ)', 350, 140, 90, { resistance: 10000, maxPower: 0.25 }),
            mkComp('rb1', 'RESISTOR', '2R_1 (20kΩ)', 210, 185, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('rs1', 'RESISTOR', 'R_1 (10kΩ)', 350, 225, 90, { resistance: 10000, maxPower: 0.25 }),
            mkComp('rb2', 'RESISTOR', '2R_2 (20kΩ)', 210, 270, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('rs2', 'RESISTOR', 'R_2 (10kΩ)', 350, 310, 90, { resistance: 10000, maxPower: 0.25 }),
            mkComp('rb3', 'RESISTOR', '2R_3 (20kΩ)', 210, 355, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('oa_buf', 'OPAMP', '电压跟随缓冲级', 540, 330, 0, { railPos: 12, railNeg: -12, gain: 100000 }),
            mkComp('rl', 'RESISTOR', 'R_L (10kΩ)', 740, 330, 90, { resistance: 10000, maxPower: 0.5 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out R-2R 输出', 840, 330, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 40, 0),
          ],
          [
            ['gnd1', 'gnd', 'r_term', 'a', '#475569'],
            ['r_term', 'b', 'rb0', 'b', '#38bdf8'],
            ['b0', 'out', 'rb0', 'a', '#38bdf8'],
            ['rb0', 'b', 'rs0', 'a', '#38bdf8'],
            ['rs0', 'b', 'rb1', 'b', '#22c55e'],
            ['b1', 'out', 'rb1', 'a', '#22c55e'],
            ['rb1', 'b', 'rs1', 'a', '#22c55e'],
            ['rs1', 'b', 'rb2', 'b', '#f59e0b'],
            ['b2', 'out', 'rb2', 'a', '#f59e0b'],
            ['rb2', 'b', 'rs2', 'a', '#f59e0b'],
            ['rs2', 'b', 'rb3', 'b', '#ef4444'],
            ['b3', 'out', 'rb3', 'a', '#ef4444'],
            ['rb3', 'b', 'oa_buf', 'inp', '#ef4444'],
            ['oa_buf', 'inm', 'oa_buf', 'out', '#a855f7'],
            ['oa_buf', 'out', 'rl', 'a', '#22c55e'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['oa_buf', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l25s2'
        ),
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out'],
        liveFormulas: [
          {
            id: 'l25-s2-f1',
            title: 'R-2R 梯形戴维南分半定律',
            formula: 'V_out = 5.0V × N / 16 （每 1 LSB = 0.3125 V）',
            evaluate: (ctx) => {
              const b3 = numProp(ctx, 'b3', 'state', 0) ? 1 : 0;
              const b2 = numProp(ctx, 'b2', 'state', 1) ? 1 : 0;
              const b1 = numProp(ctx, 'b1', 'state', 0) ? 1 : 0;
              const b0 = numProp(ctx, 'b0', 'state', 0) ? 1 : 0;
              const code = b3 * 8 + b2 * 4 + b1 * 2 + b0;
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `N=${code} (${b3}${b2}${b1}${b0}₂) -> 理论 ${(5 * code / 16).toFixed(3)}V`,
                result: `实测 V_out = ${vout.toFixed(3)} V`,
                status: Math.abs(vout - 3.75) <= 0.12 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l25s2-b3',
            label: '最高位 b3 (+2.50 V)',
            targetId: 'b3',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
          {
            id: 'qc-l25s2-b2',
            label: 'b2 (+1.25 V)',
            targetId: 'b2',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0', value: 0 },
              { label: '1', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：运放电压跟随高阻隔离作用', type: 'OPAMP', componentId: 'oa_buf', stepIndex: 0 }],
        checkpoint: {
          title: '以 R-2R 合成 1100₂ → +3.75 V',
          instruction: '令 b3=1 且 b2=1（即 N=12），验证输出精准升至 3.75 V 左右。',
          hint: '把最高位 b3 设为 1 并保持 b2=1。',
          check: (ctx) => {
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const b3 = numProp(ctx, 'b3', 'state', 0) ? 1 : 0;
            const b2 = numProp(ctx, 'b2', 'state', 0) ? 1 : 0;
            const ok = b3 === 1 && b2 === 1 && Math.abs(vout - 3.75) <= 0.12;
            return {
              passed: ok,
              message: ok
                ? `R-2R 等分特性完美验证！N=12 (1100₂) -> V_out = ${vout.toFixed(3)}V`
                : `当前 V_out = ${vout.toFixed(3)}V（请令 b3=1, b2=1 输出 3.75V）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动设为 1100₂ 输出 3.75 V',
            description: '设 b3=1, b2=1 (N=12)，检验 R-2R 梯形网络输出精确的 12/16 × 5V = 3.75V',
            actions: [
              { kind: 'setProp', componentId: 'b3', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b2', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'b1', key: 'state', value: 0 },
              { kind: 'setProp', componentId: 'b0', key: 'state', value: 0 },
            ],
          },
        },
      },
      {
        id: 'l25-s3',
        stageNumber: 3,
        title: '数模联奏：计数器 + DAC 自动阶梯波发生器',
        badge: 'Step 3 · 锯齿阶梯波发生',
        conceptGoal: '时钟驱动 4 位计数器 0→15 循环累加并直馈 DAC，立刻合成数字函数信号发生器级的 16 级阶梯锯齿波！',
        explanation:
          '将前面学过的两大模块强强联合：时钟推动 COUNTER_4BIT 不断按 0→15 节拍数数，q3~q0 在驱动 HEX 数码管的同时直接喂入 4 位权电阻 DAC！把左下时钟频率推高到 4 Hz 以上，在底部示波器中观赏一级一级规整下落的 16 级锯齿阶梯波吧！',
        analogy: '这就是数字音频 DAC 播放音乐或雷达扫描锯齿波的诞生原点：一串节拍整齐的整数，经梯形电阻变为流畅的台阶波。',
        highlights: ['clk', 'cnt1', 'oa1', 'vm_out', 'hex1'],
        newlyAddedIds: ['clk', 'cnt1', 'hex1'],
        circuit: mkCircuit(
          [
            mkComp('clk', 'CLOCK', '扫描时钟源', 80, 210, 0, { frequency: 1 }),
            mkComp('cnt1', 'COUNTER_4BIT', '4 位阶梯计数器', 240, 210, 0),
            mkComp('hex1', 'HEX_DISPLAY', '数字码值 HEX', 240, 390, 0),
            mkComp('r3', 'RESISTOR', 'R3 (10kΩ)', 430, 120, 0, { resistance: 10000, maxPower: 0.25 }),
            mkComp('r2', 'RESISTOR', 'R2 (20kΩ)', 430, 180, 0, { resistance: 20000, maxPower: 0.25 }),
            mkComp('r1', 'RESISTOR', 'R1 (40kΩ)', 430, 240, 0, { resistance: 40000, maxPower: 0.25 }),
            mkComp('r0', 'RESISTOR', 'R0 (80kΩ)', 430, 300, 0, { resistance: 80000, maxPower: 0.25 }),
            mkComp('rf', 'RESISTOR', 'Rf (8kΩ)', 640, 100, 0, { resistance: 8000, maxPower: 0.25 }),
            mkComp('oa1', 'OPAMP', 'DAC 运放级', 640, 210, 0, { railPos: 12, railNeg: -12, gain: 100000 }),
            mkComp('rl', 'RESISTOR', 'R_L (10kΩ)', 810, 220, 90, { resistance: 10000, maxPower: 0.5 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_out 阶梯波形', 900, 220, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 550, 390, 0),
          ],
          [
            ['clk', 'out', 'cnt1', 'clk', '#f59e0b'],
            ['cnt1', 'q3', 'r3', 'a', '#ef4444'],
            ['cnt1', 'q2', 'r2', 'a', '#f59e0b'],
            ['cnt1', 'q1', 'r1', 'a', '#22c55e'],
            ['cnt1', 'q0', 'r0', 'a', '#38bdf8'],
            ['cnt1', 'q3', 'hex1', 'd3', '#ef4444'],
            ['cnt1', 'q2', 'hex1', 'd2', '#f59e0b'],
            ['cnt1', 'q1', 'hex1', 'd1', '#22c55e'],
            ['cnt1', 'q0', 'hex1', 'd0', '#38bdf8'],
            ['r3', 'b', 'oa1', 'inm', '#a855f7'],
            ['r2', 'b', 'oa1', 'inm', '#a855f7'],
            ['r1', 'b', 'oa1', 'inm', '#a855f7'],
            ['r0', 'b', 'oa1', 'inm', '#a855f7'],
            ['oa1', 'inm', 'rf', 'a', '#f59e0b'],
            ['rf', 'b', 'oa1', 'out', '#f59e0b'],
            ['oa1', 'inp', 'gnd1', 'gnd', '#475569'],
            ['oa1', 'out', 'rl', 'a', '#22c55e'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['oa1', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l25s3'
        ),
        prewarmSeconds: 1.5,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out'],
        liveFormulas: [
          {
            id: 'l25-s3-f1',
            title: '实时数字计数与阶梯电压',
            formula: 'V_step(n) = -0.5V × n (n = 0..15) | 全周期 T = 16 / f_clk',
            evaluate: (ctx) => {
              const freq = numProp(ctx, 'clk', 'frequency', 1);
              const val = getTel(ctx, 'cnt1')?.logicState ?? 0;
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `时钟 ${freq.toFixed(1)} Hz | 当前数字 N=${val} (0x${val.toString(16).toUpperCase()})`,
                result: `阶梯输出 V_out = ${vout.toFixed(2)} V`,
                status: freq >= 4 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l25s3-freq',
            label: '时钟扫描频率 f_clk',
            targetId: 'clk',
            propKey: 'frequency',
            kind: 'slider',
            min: 0.5,
            max: 6,
            step: 0.5,
            unit: 'Hz',
          },
        ],
        ponderLinks: [{ label: '思索：4 位计数器二进制时序驱动', type: 'COUNTER_4BIT', componentId: 'cnt1', stepIndex: 2 }],
        checkpoint: {
          title: '提速时钟至 ≥ 4 Hz 生成清晰阶梯锯齿波',
          instruction: '将扫描时钟 f_clk 调升至 ≥ 4.0 Hz，在示波器上连续追踪阶梯负向扫描输出。',
          hint: '向右拖动 f_clk 滑块至 ≥ 4 Hz，并在底部【实时电参量与示波器】观察阶梯波形！',
          check: (ctx) => {
            const freq = numProp(ctx, 'clk', 'frequency', 1);
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const val = getTel(ctx, 'cnt1')?.logicState ?? 0;
            const ok = freq >= 4.0 && vout <= 0.05 && val >= 0 && val <= 15;
            return {
              passed: ok,
              message: ok
                ? `数字阶梯波合成成功！f_clk=${freq.toFixed(1)}Hz，当前台阶 N=${val} -> ${vout.toFixed(2)}V`
                : `当前 f_clk=${freq.toFixed(1)}Hz（请调高至 ≥ 4.0 Hz）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动升频至 4 Hz 输出阶梯波',
            description: '将时钟频率提高到 4 Hz 驱动 4 位计数器与 DAC 实时合成 16 级阶梯波形',
            actions: [{ kind: 'setProp', componentId: 'clk', key: 'frequency', value: 4 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 26 (Ch.14): 窗口比较、2 位闪速／并行 ADC 与温控联锁数模混合实验
  // =========================================================================
  {
    id: 'ch14-adc-and-mixed-signal-capstone',
    chapterId: 'ch14',
    lessonNumber: 26,
    title: '比较器越限报警、闪速／并行 ADC 与温控联锁实验',
    subtitle: '把模拟感知世界数字化，再以数字安全联锁控制大功率 NMOS 负载：完成电工学全书混合信号综合实战',
    textbookRef: '第14章 14.1–14.3 模/数转换 (ADC) 与数模混合温控联锁系统',
    difficulty: '综合',
    durationMin: 18,
    prerequisites: ['ch13-dac-conversion', 'ch8-nmos-and-cmos-switch'],
    learningObjectives: [
      '掌握双比较器 + 或门组成上下限“窗口越限报警器”的模拟→数字判决机制',
      '构建 2 位闪速／并行 ADC（参考电阻梯 + 三比较器温度计码 + 优先级编码器 + HEX）',
      '综合应用运放传感器比较、数字安全联锁与 NMOS 功率驱动完成温控联锁实验',
    ],
    stages: [
      {
        id: 'l26-s1',
        stageNumber: 1,
        title: '双限比较器窗口报警 (1.5 V ~ 3.5 V 安全区间)',
        badge: 'Step 1 · 模拟判决入数电',
        conceptGoal: '只要信号跌破下限 1.5V 或冲过上限 3.5V，任一单电源运放比较器翻转高电平即经或门点亮 ALARM！',
        explanation:
          '工业锅炉压力或电池电压必须在安全窗口内运行。上方比较器监视高压（V_in > 3.5V 报 1），下方比较器监视欠压（V_in < 1.5V 报 1），两者并入数字 OR 门。当前监测电压 Vs=2.5V 处在安全区（ALARM=0），试把 Vs 升高越过 3.5V（或降至 1.5V 以下）验证即时数字报警！',
        analogy: '就像电子安全走廊里的两道激光线：中间随便走都安静，但往上撞顶或往下踩线立刻触发同一盏数字警灯。',
        highlights: ['oa_hi', 'oa_lo', 'or_alarm', 'out_alarm'],
        newlyAddedIds: ['vs', 'vref_hi', 'vref_lo', 'oa_hi', 'oa_lo', 'or_alarm', 'out_alarm'],
        circuit: mkCircuit(
          [
            mkComp('vs', 'DC_SOURCE', '待测传感器 Vs', 100, 220, 270, { voltage: 2.5 }),
            mkComp('vref_hi', 'DC_SOURCE', '上限基准 3.5V', 100, 100, 270, { voltage: 3.5 }),
            mkComp('vref_lo', 'DC_SOURCE', '下限基准 1.5V', 100, 340, 270, { voltage: 1.5 }),
            mkComp('oa_hi', 'OPAMP', '上限比较器 (Vs>3.5)', 360, 140, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('oa_lo', 'OPAMP', '下限比较器 (Vs<1.5)', 360, 300, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('or_alarm', 'OR', '越限汇总或门', 570, 220, 0),
            mkComp('out_alarm', 'LOGIC_OUT', '系统越限 ALARM', 770, 220, 0, { outName: 'ALARM' }),
            mkComp('gnd1', 'GROUND', 'GND', 100, 430, 0),
          ],
          [
            ['vs', 'pos', 'oa_hi', 'inp', '#38bdf8'],
            ['vref_hi', 'pos', 'oa_hi', 'inm', '#ef4444'],
            ['vref_lo', 'pos', 'oa_lo', 'inp', '#f59e0b'],
            ['vs', 'pos', 'oa_lo', 'inm', '#38bdf8'],
            ['vs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vref_hi', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vref_lo', 'neg', 'gnd1', 'gnd', '#475569'],
            ['oa_hi', 'out', 'or_alarm', 'a', '#ef4444'],
            ['oa_lo', 'out', 'or_alarm', 'b', '#f59e0b'],
            ['or_alarm', 'y', 'out_alarm', 'in', '#ef4444'],
          ],
          'l26s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l26-s1-f1',
            title: '窗口区间布尔化转换',
            formula: 'ALARM = (Vs > 3.5V) OR (Vs < 1.5V)',
            evaluate: (ctx) => {
              const vs = numProp(ctx, 'vs', 'voltage', 2.5);
              const alarm = getTel(ctx, 'out_alarm')?.logicState ?? 0;
              return {
                expression: `Vs = ${vs.toFixed(2)}V（安全窗口 1.50 ~ 3.50 V）`,
                result: `数字报警 ALARM = ${alarm} (${alarm ? '越限触发!' : '正常安全'})`,
                status: alarm === 1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l26s1-vs',
            label: '调节待测电压 Vs',
            targetId: 'vs',
            propKey: 'voltage',
            kind: 'slider',
            min: 0.5,
            max: 4.8,
            step: 0.2,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：运放单电源开环比较器跳变', type: 'OPAMP', componentId: 'oa_hi', stepIndex: 2 }],
        checkpoint: {
          title: '越出 1.5~3.5 V 窗口触发 ALARM = 1',
          instruction: '将传感器电位 Vs 调高于 3.5V（或低于 1.5V），验证比较器→或门直接驱亮数字报警端 ALARM=1。',
          hint: '向右拖动 Vs 滑块至 ≥ 3.8V。',
          check: (ctx) => {
            const vs = numProp(ctx, 'vs', 'voltage', 2.5);
            const alarm = getTel(ctx, 'out_alarm')?.logicState ?? 0;
            const ok = (vs > 3.55 || vs < 1.45) && alarm === 1;
            return {
              passed: ok,
              message: ok
                ? `越限报警混合转换成功！Vs=${vs.toFixed(2)}V 越出窗口 -> ALARM=1`
                : `当前 Vs=${vs.toFixed(2)}V 仍在安全区，ALARM=${alarm}`,
            };
          },
          autoDemo: {
            buttonLabel: '自动模拟超压 4.2V 触发 ALARM',
            description: '抬高传感器电压至 4.2V 越过 3.5V 上限，使比较器经或门点亮 ALARM',
            actions: [{ kind: 'setProp', componentId: 'vs', key: 'voltage', value: 4.2 }],
          },
        },
      },
      {
        id: 'l26-s2',
        stageNumber: 2,
        title: '2 位闪速／并行 ADC (Flash ADC：温度计码→二进制 HEX)',
        badge: 'Step 2 · 闪速／并行 ADC',
        conceptGoal: '4V 基准四等分为 3V/2V/1V 阶梯，3 路比较器一次并发生成温度计码 C3C2C1，编码门阵列无延迟译出 0~3！',
        explanation:
          '这是转换速度最快的闪速／并行 A/D 架构（Flash ADC）：四只 1kΩ 分压电阻同步造出 3.0V、2.0V、1.0V 三个参考阶梯；输入电压 Vin 同时与这三档比较得出温度计码 [C3,C2,C1]，再由 NOT/AND/OR 编码电路秒变二进制 B1=C2, B0=C3|(¬C2·C1) 写入 HEX！逐步调高 Vin：0.5V→0，1.5V→1，2.5V→2，3.6V→3！',
        analogy: '就像在墙上同时划好 1米、2米、3米 三条刻度线：你站过去一扫就立刻知道跨越了几条线，完全不必一根一根尺子慢慢试！',
        highlights: ['vin', 'cmp3', 'cmp2', 'cmp1', 'hex1'],
        newlyAddedIds: ['vref', 'vin', 'cmp3', 'cmp2', 'cmp1', 'not_c2', 'and_b0', 'or_b0', 'hex1'],
        circuit: mkCircuit(
          [
            mkComp('vref', 'DC_SOURCE', 'Vref 4.0V', 80, 90, 270, { voltage: 4.0 }),
            mkComp('r4', 'RESISTOR', 'R4 (1kΩ)', 200, 90, 90, { resistance: 1000, maxPower: 0.25 }),
            mkComp('r3', 'RESISTOR', 'R3 (1kΩ)', 200, 175, 90, { resistance: 1000, maxPower: 0.25 }),
            mkComp('r2', 'RESISTOR', 'R2 (1kΩ)', 200, 260, 90, { resistance: 1000, maxPower: 0.25 }),
            mkComp('r1', 'RESISTOR', 'R1 (1kΩ)', 200, 345, 90, { resistance: 1000, maxPower: 0.25 }),
            mkComp('vin', 'DC_SOURCE', '模拟采样 Vin', 80, 260, 270, { voltage: 0.5 }),
            mkComp('cmp3', 'OPAMP', 'CMP3 (3V档)', 390, 110, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('cmp2', 'OPAMP', 'CMP2 (2V档)', 390, 220, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('cmp1', 'OPAMP', 'CMP1 (1V档)', 390, 330, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('not_c2', 'NOT', '¬C2', 560, 260, 0),
            mkComp('and_b0', 'AND', '¬C2·C1', 670, 300, 0),
            mkComp('or_b0', 'OR', 'B0 = C3+(¬C2·C1)', 770, 220, 0),
            mkComp('hex1', 'HEX_DISPLAY', '量化结果 HEX', 900, 200, 0),
            mkComp('gnd1', 'GROUND', 'GND', 200, 440, 0),
          ],
          [
            ['vref', 'pos', 'r4', 'a', '#ef4444'],
            ['r4', 'b', 'r3', 'a', '#f59e0b'],
            ['r3', 'b', 'r2', 'a', '#22c55e'],
            ['r2', 'b', 'r1', 'a', '#38bdf8'],
            ['r1', 'b', 'gnd1', 'gnd', '#475569'],
            ['vref', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r4', 'b', 'cmp3', 'inm', '#f59e0b'],
            ['r3', 'b', 'cmp2', 'inm', '#22c55e'],
            ['r2', 'b', 'cmp1', 'inm', '#38bdf8'],
            ['vin', 'pos', 'cmp3', 'inp', '#a855f7'],
            ['vin', 'pos', 'cmp2', 'inp', '#a855f7'],
            ['vin', 'pos', 'cmp1', 'inp', '#a855f7'],
            ['cmp2', 'out', 'hex1', 'd1', '#22c55e'],
            ['cmp2', 'out', 'not_c2', 'a', '#22c55e'],
            ['not_c2', 'y', 'and_b0', 'a', '#38bdf8'],
            ['cmp1', 'out', 'and_b0', 'b', '#38bdf8'],
            ['cmp3', 'out', 'or_b0', 'a', '#ef4444'],
            ['and_b0', 'y', 'or_b0', 'b', '#38bdf8'],
            ['or_b0', 'y', 'hex1', 'd0', '#ef4444'],
            ['gnd1', 'gnd', 'hex1', 'd2', '#475569'],
            ['gnd1', 'gnd', 'hex1', 'd3', '#475569'],
          ],
          'l26s2'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l26-s2-f1',
            title: '4 档位 2-bit Flash 量化对照',
            formula: '[0~1V)->0 | [1~2V)->1 | [2~3V)->2 | [3~4V]->3',
            evaluate: (ctx) => {
              const vin = numProp(ctx, 'vin', 'voltage', 0.5);
              const hex = getTel(ctx, 'hex1')?.logicState ?? 0;
              return {
                expression: `模拟输入 Vin = ${vin.toFixed(2)}V（参考梯 1.0V / 2.0V / 3.0V）`,
                result: `ADC 数字量化值 HEX = ${hex} (${(hex >>> 0).toString(2).padStart(2, '0')}₂)`,
                status: hex === 3 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l26s2-vin',
            label: '模拟输入电压 Vin',
            targetId: 'vin',
            propKey: 'voltage',
            kind: 'slider',
            min: 0.2,
            max: 3.9,
            step: 0.1,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：HEX 数码管实时二进制译码', type: 'HEX_DISPLAY', componentId: 'hex1', stepIndex: 0 }],
        checkpoint: {
          title: '全量程量化测试：使 HEX 显示 3 (11₂)',
          instruction: '建议逐档体验 1.5V(1) → 2.5V(2)，最后调升 Vin 至 > 3.1V 让闪速／并行 ADC 输出满量程 3！',
          hint: '将 Vin 滑块推到 ≥ 3.2V（例如 3.6V）。',
          check: (ctx) => {
            const vin = numProp(ctx, 'vin', 'voltage', 0.5);
            const hex = getTel(ctx, 'hex1')?.logicState ?? 0;
            const ok = vin >= 3.1 && hex === 3;
            return {
              passed: ok,
              message: ok
                ? `2-bit 闪速／并行 ADC 满量程量化成功！Vin=${vin.toFixed(2)}V -> HEX=3 (11₂)`
                : `当前 Vin=${vin.toFixed(2)}V -> 量化输出 ${hex}（顺便推至 ≥ 3.2V 验证 11₂ = 3）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动注入 3.6V 量化输出 3',
            description: '注入 3.6V 模拟量使 3 路比较器与优先编码器在 HEX 上实时量化输出 3',
            actions: [{ kind: 'setProp', componentId: 'vin', key: 'voltage', value: 3.6 }],
          },
        },
      },
      {
        id: 'l26-s3',
        stageNumber: 3,
        title: '全书贯通：运放测温 + 数字安全联锁 + NMOS 温控联锁实验',
        badge: 'Step 3 · 温控联锁实验',
        conceptGoal: '模拟传感越限 → 运放比较判决 → 数字与门安全联锁 → NMOS 大功率低边开关点亮 12V 风扇负载！',
        explanation:
          '这最后一战串联起你学过的全部模电与数电知识！我们通过手动调节温度传感电压 V_temp，与设定阈值 2.8V 在运放中比出数字过温位，再与自动允许开关 AUTO 送入数字 AND 门做安全联锁，最终经栅极电阻驱动 N-MOSFET 功率管导通 12V/1A 风扇灯泡（本实验不模拟风扇吹风降温的热反馈回路）。将 V_temp 升高到 ≥ 3.2V，触发温控联锁点亮风扇负载吧！',
        analogy: '就像工业设备的过温安全联锁链：温度探头越限（模拟）→ 比较判决（模转数）→ 安全许可（数字与门）→ MOS 功率桥驱动执行器（强电负载）！',
        highlights: ['v_temp', 'oa_ctrl', 'and_fan', 'q_fan', 'fan_lamp'],
        newlyAddedIds: ['v_temp', 'v_set', 'oa_ctrl', 'sw_auto', 'and_fan', 'out_drv', 'r_gate', 'q_fan', 'v_bus', 'fan_lamp', 'am_fan'],
        circuit: mkCircuit(
          [
            mkComp('v_temp', 'DC_SOURCE', '温度传感器 V_temp', 80, 120, 270, { voltage: 2.0 }),
            mkComp('v_set', 'DC_SOURCE', '报警阈值 2.8V', 80, 250, 270, { voltage: 2.8 }),
            mkComp('oa_ctrl', 'OPAMP', '过温比较器', 290, 180, 0, { railPos: 5, railNeg: 0, gain: 100000 }),
            mkComp('sw_auto', 'LOGIC_IN', '自动散热允许 AUTO', 290, 320, 0, { state: 1, varName: 'AUTO' }),
            mkComp('and_fan', 'AND', '安全联锁门', 490, 250, 0),
            mkComp('out_drv', 'LOGIC_OUT', '栅极驱动命令', 490, 110, 0, { outName: 'DRV' }),
            mkComp('r_gate', 'RESISTOR', 'Rg (100Ω)', 610, 250, 0, { resistance: 100, maxPower: 0.25 }),
            mkComp('q_fan', 'NMOS', '功率 NMOS 开关', 750, 250, 0, { vth: 2.0, kp: 0.25 }),
            mkComp('v_bus', 'DC_SOURCE', '12V 直流母线', 890, 100, 270, { voltage: 12 }),
            mkComp('fan_lamp', 'LAMP', '风扇负载灯 (12V/12W)', 750, 100, 0, { ratedVoltage: 12, ratedPower: 12 }),
            mkComp('am_fan', 'AMMETER', 'PA_fan 负载电流', 850, 175, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 750, 400, 0),
          ],
          [
            ['v_temp', 'pos', 'oa_ctrl', 'inp', '#ef4444'],
            ['v_set', 'pos', 'oa_ctrl', 'inm', '#38bdf8'],
            ['v_temp', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v_set', 'neg', 'gnd1', 'gnd', '#475569'],
            ['oa_ctrl', 'out', 'and_fan', 'a', '#f59e0b'],
            ['sw_auto', 'out', 'and_fan', 'b', '#22c55e'],
            ['and_fan', 'y', 'out_drv', 'in', '#22c55e'],
            ['and_fan', 'y', 'r_gate', 'a', '#22c55e'],
            ['r_gate', 'b', 'q_fan', 'g', '#22c55e'],
            ['v_bus', 'pos', 'fan_lamp', 'p1', '#ef4444'],
            ['fan_lamp', 'p2', 'am_fan', 'pos', '#f59e0b'],
            ['am_fan', 'neg', 'q_fan', 'd', '#38bdf8'],
            ['q_fan', 's', 'gnd1', 'gnd', '#475569'],
            ['v_bus', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l26s3'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l26-s3-f1',
            title: '模数混联全链路状态追踪',
            formula: 'V_temp > 2.8V & AUTO=1  =>  DRV=5V  =>  NMOS 导通供电',
            evaluate: (ctx) => {
              const vt = numProp(ctx, 'v_temp', 'voltage', 2.0);
              const drv = getTel(ctx, 'out_drv')?.logicState ?? 0;
              const iFan = getTel(ctx, 'am_fan')?.current ?? 0;
              return {
                expression: `温度=${vt.toFixed(2)}V | 数字驱动 DRV=${drv}`,
                result: `散热风载电流 I_fan = ${fmtI(iFan)}`,
                status: drv === 1 && iFan >= 0.4 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l26s3-vt',
            label: '环境温度电压 V_temp',
            targetId: 'v_temp',
            propKey: 'voltage',
            kind: 'slider',
            min: 1.0,
            max: 4.5,
            step: 0.2,
            unit: 'V',
          },
          {
            id: 'qc-l26s3-auto',
            label: '自动散热允许开关 AUTO',
            targetId: 'sw_auto',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (强制禁用)', value: 0 },
              { label: '1 (自动使能)', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：NMOS 栅压沟道低边开关', type: 'NMOS', componentId: 'q_fan', stepIndex: 1 },
          { label: '思索：运放单电源阈值比较判决', type: 'OPAMP', componentId: 'oa_ctrl', stepIndex: 2 },
        ],
        checkpoint: {
          title: '触发过温保护启动 12V 散热执行器',
          instruction: '保持 AUTO=1 并将温度感知 V_temp 调高至 3.2V 以上，点亮强电风扇灯泡（电流 ≥ 0.4 A）。',
          hint: '向右拖动 V_temp 滑块到 ≥ 3.2V（如 3.8V）。',
          check: (ctx) => {
            const drv = getTel(ctx, 'out_drv')?.logicState ?? 0;
            const iFan = getTel(ctx, 'am_fan')?.current ?? 0;
            const ok = drv === 1 && iFan >= 0.4;
            return {
              passed: ok,
              message: ok
                ? `全书下册温控联锁实验通关！DRV=${drv} 精准撬动 I_fan=${fmtI(iFan)} 大功率风扇负载！`
                : `当前 DRV=${drv}, I_fan=${fmtI(iFan)}（需 AUTO=1 且 V_temp ≥ 3.2V）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动升温至 3.8V 触发温控联锁',
            description: '启用 AUTO=1 并将温度信号升至 3.8V，经比较器+与门驱动 NMOS 散热灯负载',
            actions: [
              { kind: 'setProp', componentId: 'sw_auto', key: 'state', value: 1 },
              { kind: 'setProp', componentId: 'v_temp', key: 'voltage', value: 3.8 },
            ],
          },
        },
      },
    ],
  },
];
