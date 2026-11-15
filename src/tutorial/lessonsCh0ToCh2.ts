import {
  boolProp,
  fmtI,
  fmtP,
  fmtV,
  getTel,
  mkCircuit,
  mkComp,
  numProp,
  pinV,
} from './tutorialHelpers';
import type { TutorialLesson } from './tutorialTypes';

export const LESSONS_CH0_TO_CH2: TutorialLesson[] = [
  // =========================================================================
  // Lesson 1 (Ch.0): 认识电源、参考地、回路与电表
  // =========================================================================
  {
    id: 'ch0-loop-and-meters',
    chapterId: 'ch0',
    lessonNumber: 1,
    title: '认识电源、参考地、回路与电表',
    subtitle: '从零建立电位参考面、完整闭合回路、电压/电流表接法与熔丝短路保护概念',
    textbookRef: '第1章 1.1–1.3 电路的作用与组成部分',
    difficulty: '入门',
    durationMin: 12,
    prerequisites: [],
    learningObjectives: [
      '理解电压（电势差）必须依托参考零电位（GND）定义',
      '掌握形成稳定工作电流必须具备完整闭合回路',
      '牢记电压表并联高阻、电流表串联低阻的使用铁律',
      '认识短路故障电流猛增危害及熔断器过流隔离机理',
    ],
    stages: [
      {
        id: 'l1-s1',
        stageNumber: 1,
        title: '电源与参考地：电位差从何而来',
        badge: 'Step 1 · 建压',
        conceptGoal: '单独的电源和参考地能建立稳定的 5V 电位差，但没有闭合负载回路时电流为零。',
        explanation:
          '直流稳压源就像把电荷抬高到 5V 高台的水泵，而参考地（GND）则是海拔 0V 的海平面。高阻电压表并联在两端可读取电势差 U = φ(+) - φ(-)，但由于尚未接入用电器形成闭合通路，电源对外输出电流 I = 0。',
        analogy: '类比水塔：水泵把水抽到 5m 高处形成水压，但阀门和下游管道未接通时，水管里没有水流。',
        highlights: ['v1', 'gnd1', 'vm1'],
        newlyAddedIds: ['v1', 'gnd1', 'vm1'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (5V)', 180, 250, 270, { voltage: 5 }),
            mkComp('vm1', 'VOLTMETER', 'PV1 电压表', 410, 250, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 180, 390, 0),
          ],
          [
            ['v1', 'pos', 'vm1', 'pos', '#ef4444'],
            ['v1', 'neg', 'vm1', 'neg', '#64748b'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l1s1'
        ),
        liveFormulas: [
          {
            id: 'f-pot',
            title: '节点电位与端电压',
            formula: 'U = φ(V1+) - φ(GND)',
            evaluate: (ctx) => {
              const vp = pinV(ctx, 'vm1', 'pos');
              const vn = pinV(ctx, 'vm1', 'neg');
              const diff = vp - vn;
              return {
                expression: `${fmtV(vp)} - ${fmtV(vn)}`,
                result: fmtV(diff),
                status: Math.abs(diff - 5) < 0.2 ? 'good' : 'normal',
              };
            },
          },
          {
            id: 'f-open-i',
            title: '开路输出电流',
            formula: 'I_out (开路)',
            evaluate: (ctx) => {
              const i = Math.abs(getTel(ctx, 'v1')?.current ?? 0);
              return {
                expression: '无闭合负载支路 (仅 10MΩ 电压表)',
                result: fmtI(i),
                status: 'good',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l1s1-v',
            label: '调节电源电压 V1',
            targetId: 'v1',
            propKey: 'voltage',
            kind: 'slider',
            min: 1,
            max: 12,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [
          { label: '思索：直流电源原理', type: 'DC_SOURCE', componentId: 'v1', stepIndex: 0 },
          { label: '思索：参考地 GND', type: 'GROUND', componentId: 'gnd1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '建立并调整电路参考电压',
          instruction: '尝试把电源 V1 电压调至 9V 以上（或一键演示），观察电压表读数实时升高但输出电流仍接近零。',
          hint: '拖动上方 V1 电压滑块到 9V 及以上。',
          check: (ctx) => {
            const vm = Math.abs(getTel(ctx, 'vm1')?.voltageDrop ?? 0);
            return {
              passed: vm >= 8.9,
              message: vm >= 8.9 ? `已建立 ${fmtV(vm)} 开路电位差，且电流近零` : `当前电压表读数 ${fmtV(vm)}，请调至 ≥ 9.0V`,
            };
          },
          autoDemo: {
            buttonLabel: '一键演示：升压至 9V',
            description: '将 V1 调节至 9V 观察端压升高与开路零电流特性',
            actions: [{ kind: 'setProp', componentId: 'v1', key: 'voltage', value: 9 }],
          },
        },
      },

      {
        id: 'l1-s2',
        stageNumber: 2,
        title: '开关与负载灯泡：合闸点亮闭合回路',
        badge: 'Step 2 · 闭环',
        conceptGoal: '接通开关 K1 才能打通从正极经负载回负极的电荷循环通道。',
        explanation:
          '相比第 1 步，我们在上方串入了单刀开关 K1 与 5V/1.5W 白炽灯 L1。K1 断开时（默认状态），全额 5V 电压都堵在开关绝缘空气间隙两端，灯泡两端压降为 0V 不发光；合闸闭合后回路打通，电能转化为光热。',
        analogy: '类比阀门：水管阀门紧闭时水压全部作用在阀瓣上；一旦拧开闸阀，整条水路奔涌带动水轮发亮。',
        highlights: ['k1', 'l1'],
        newlyAddedIds: ['k1', 'l1'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (5V)', 160, 260, 270, { voltage: 5 }),
            mkComp('k1', 'SWITCH_SPST', 'K1 开关', 310, 150, 0, { closed: false }),
            mkComp('l1', 'LAMP', 'L1 灯泡', 480, 260, 90, { ratedVoltage: 5, ratedPower: 1.5 }),
            mkComp('gnd1', 'GROUND', 'GND', 160, 400, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'a', '#ef4444'],
            ['k1', 'b', 'l1', 'p1', '#f59e0b'],
            ['l1', 'p2', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l1s2'
        ),
        liveFormulas: [
          {
            id: 'f-k1-state',
            title: '开关导通判据',
            formula: 'K1 = ON 时 ΔV_K ≈ 0V，K1 = OFF 时 ΔV_K ≈ E',
            evaluate: (ctx) => {
              const closed = boolProp(ctx, 'k1', 'closed', false);
              const dv = Math.abs(getTel(ctx, 'k1')?.voltageDrop ?? 0);
              return {
                expression: closed ? '刀闸已合闸导通' : '刀闸断开承受开路电压',
                result: `ΔV_K1 = ${fmtV(dv)}`,
                status: closed ? 'good' : 'normal',
              };
            },
          },
          {
            id: 'f-lamp-p',
            title: '负载发光功率',
            formula: 'P_L1 = U_L1 × I_L1',
            evaluate: (ctx) => {
              const u = Math.abs(getTel(ctx, 'l1')?.voltageDrop ?? 0);
              const i = Math.abs(getTel(ctx, 'l1')?.current ?? 0);
              const p = Math.abs(getTel(ctx, 'l1')?.power ?? u * i);
              return {
                expression: `${fmtV(u)} × ${fmtI(i)}`,
                result: fmtP(p),
                status: p > 0.5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l1s2-k1',
            label: '开关 K1 合/分闸',
            targetId: 'k1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：开关原理', type: 'SWITCH_SPST', componentId: 'k1', stepIndex: 1 },
          { label: '思索：白炽灯灯丝', type: 'LAMP', componentId: 'l1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '闭合开关 K1 点亮灯泡',
          instruction: '点击快速控制栏“合闸 K1”开关（或直接点击 3D 开关闸刀），构成闭合回路并点亮 L1。',
          hint: '使 L1 消耗功率大于 1.0 W 即完成通关。',
          check: (ctx) => {
            const p = Math.abs(getTel(ctx, 'l1')?.power ?? 0);
            return {
              passed: p >= 1.0,
              message: p >= 1.0 ? `闭合回路建立成功！灯泡功耗 ${fmtP(p)}` : '开关仍处于断开状态，电流为 0',
            };
          },
          autoDemo: {
            buttonLabel: '一键合闸点亮回路',
            description: '闭合 K1 打通回路点亮 5V/1.5W 白炽灯',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'closed', value: true }],
          },
        },
      },

      {
        id: 'l1-s3',
        stageNumber: 3,
        title: '双表联合测量：电压并联、电流串联',
        badge: 'Step 3 · 测量',
        conceptGoal: '学会正确连接数字电流表（串联支路）与电压表（跨接负载两端）验证电功率公式。',
        explanation:
          '现在我们在 K1 后串联了一块内阻极小的电流表 PA1 来拦截统计流经灯丝的总电流；同时把内阻高达 10MΩ 的电压表 PV1 并联跨接在 L1 两端，做到“测压不泄流，测流不分压”。',
        analogy: '电流表好比装在管道内的轻质水轮，必须串进主管路；电压表好比两端接压力管的压差表，只需并联旁通。',
        highlights: ['pa1', 'pv1'],
        newlyAddedIds: ['pa1', 'pv1'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (5V)', 140, 270, 270, { voltage: 5 }),
            mkComp('k1', 'SWITCH_SPST', 'K1 开关', 270, 140, 0, { closed: true }),
            mkComp('pa1', 'AMMETER', 'PA1 电流表', 430, 140, 0, { mode: 'dc' }),
            mkComp('l1', 'LAMP', 'L1 (5V/1.5W)', 540, 270, 90, { ratedVoltage: 5, ratedPower: 1.5 }),
            mkComp('pv1', 'VOLTMETER', 'PV1 电压表', 680, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 140, 410, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'a', '#ef4444'],
            ['k1', 'b', 'pa1', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'l1', 'p1', '#38bdf8'],
            ['l1', 'p2', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['l1', 'p1', 'pv1', 'pos', '#a855f7'],
            ['l1', 'p2', 'pv1', 'neg', '#64748b'],
          ],
          'l1s3'
        ),
        liveFormulas: [
          {
            id: 'f-iv-product',
            title: '双表乘积测功率',
            formula: 'P_测 = U(PV1) × I(PA1)',
            evaluate: (ctx) => {
              const u = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
              const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              return {
                expression: `${fmtV(u)} × ${fmtI(i)}`,
                result: fmtP(u * i),
                status: u * i > 0.5 ? 'good' : 'normal',
              };
            },
          },
          {
            id: 'f-r-hot',
            title: '反推灯丝电阻',
            formula: 'R_L1 = U / I',
            evaluate: (ctx) => {
              const u = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
              const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              const r = i > 1e-4 ? u / i : Infinity;
              return {
                expression: i > 1e-4 ? `${fmtV(u)} / ${fmtI(i)}` : '断路无穷大',
                result: Number.isFinite(r) ? `${r.toFixed(2)} Ω` : '∞',
                status: 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l1s3-v1',
            label: '调节 V1 电源电压',
            targetId: 'v1',
            propKey: 'voltage',
            kind: 'slider',
            min: 2,
            max: 7,
            step: 0.5,
            unit: 'V',
          },
          {
            id: 'qc-l1s3-k1',
            label: '开关 K1 状态',
            targetId: 'k1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：电压表原理与忌串联', type: 'VOLTMETER', componentId: 'pv1', stepIndex: 2 },
          { label: '思索：电流表原理与忌短路', type: 'AMMETER', componentId: 'pa1', stepIndex: 2 },
        ],
        checkpoint: {
          title: '实测功率随电压平方变化',
          instruction: '保持 K1 闭合，将 V1 调节至 6.0V 以上，验证 U×I 功率随之快速增长。',
          hint: '因为 P = U²/R，电压升高 20%，功率会增加约 44%。',
          check: (ctx) => {
            const u = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
            const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
            const p = u * i;
            return {
              passed: u >= 5.9 && p >= 2.0,
              message: u >= 5.9 && p >= 2.0 ? `过压实测成立：U=${fmtV(u)}, P=${fmtP(p)}` : `当前 PV1=${fmtV(u)}, 功率=${fmtP(p)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键升压到 6.5V 测算功率',
            description: '闭合 K1 并将 V1 设为 6.5V 观察 PA1/PV1 同步攀升',
            actions: [
              { kind: 'setProp', componentId: 'k1', key: 'closed', value: true },
              { kind: 'setProp', componentId: 'v1', key: 'voltage', value: 6.5 },
            ],
          },
        },
      },

      {
        id: 'l1-s4',
        stageNumber: 4,
        title: '短路故障与熔断器：过流熔断保护',
        badge: 'Step 4 · 保护',
        conceptGoal: '体会“电源绝对不能无负载直连”，学会用熔断器在故障瞬间物理断开电路。',
        explanation:
          '我们在主干线加装了额定 0.5A 熔断器 F1，并在灯泡 L1 两端跨接了一个“误操作短路开关”K_short。正常情况下约 0.30A 电流安全通过；一旦闭合 K_short 旁路灯泡，电源经导线形成极低阻短路通道，大电流瞬时击断 F1 保护整套系统！',
        analogy: '就像防洪堤上的保险薄弱泄洪闸：电流一旦越过 0.5A 安全警戒线，熔丝立即自毁切断上游电源。',
        highlights: ['f1', 'k_short'],
        newlyAddedIds: ['f1', 'k_short'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (5V)', 130, 270, 270, { voltage: 5 }),
            mkComp('f1', 'FUSE', 'F1 (0.5A)', 260, 140, 0, { tripCurrent: 0.5, blown: false }),
            mkComp('pa1', 'AMMETER', 'PA1 干路电流', 410, 140, 0, { mode: 'dc' }),
            mkComp('k_short', 'SWITCH_SPST', 'K_short 旁路短路', 480, 270, 90, { closed: false }),
            mkComp('l1', 'LAMP', 'L1 灯泡', 640, 270, 90, { ratedVoltage: 5, ratedPower: 1.5 }),
            mkComp('gnd1', 'GROUND', 'GND', 130, 410, 0),
          ],
          [
            ['v1', 'pos', 'f1', 'p1', '#ef4444'],
            ['f1', 'p2', 'pa1', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'k_short', 'a', '#fb7185'],
            ['k_short', 'a', 'l1', 'p1', '#38bdf8'],
            ['k_short', 'b', 'v1', 'neg', '#475569'],
            ['l1', 'p2', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l1s4'
        ),
        liveFormulas: [
          {
            id: 'f-fuse-status',
            title: '熔断器状态监控',
            formula: 'I_干路 vs I_熔断 (0.50 A)',
            evaluate: (ctx) => {
              const blown = boolProp(ctx, 'f1', 'blown', false);
              const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              return {
                expression: blown ? '过流已物理熔断开路' : `当前干路电流 ${fmtI(i)} < 0.50A`,
                result: blown ? '已熔断 (断电保护中)' : '正常导通',
                status: blown ? 'warn' : 'good',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l1s4-short',
            label: '故障模拟 K_short',
            targetId: 'k_short',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
          {
            id: 'qc-l1s4-reset',
            label: '复位恢复 F1 熔丝',
            targetId: 'f1',
            propKey: 'blown',
            kind: 'reset-fuse',
          },
        ],
        ponderLinks: [
          { label: '思索：熔断器保护机理', type: 'FUSE', componentId: 'f1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '触发并观察短路熔断保护',
          instruction: '闭合 K_short 模拟电源输出短接，观察 F1 瞬间触发过流熔断切断整路电流。',
          hint: '触发熔断后如欲复原实验，须先断开 K_short 再点击“复位 F1 熔丝”。',
          check: (ctx) => {
            const blown = boolProp(ctx, 'f1', 'blown', false);
            return {
              passed: blown,
              message: blown ? '短路保护成功触发：F1 已断开隔离故障！' : '当前处于安全负载状态，尚未触发短路',
            };
          },
          autoDemo: {
            buttonLabel: '一键触发短路熔断测试',
            description: '闭合旁路开关 K_short，触发 F1 0.5A 过流熔断',
            actions: [{ kind: 'setProp', componentId: 'k_short', key: 'closed', value: true }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 2 (Ch.1): 欧姆定律、串联分压与焦耳功率限制
  // =========================================================================
  {
    id: 'ch1-ohm-and-power',
    chapterId: 'ch1',
    lessonNumber: 2,
    title: '欧姆定律、串联分压与焦耳功耗',
    subtitle: '掌握 U = I·R 定量关系、电位器连续分压比及焦耳热 P = I²R 过载红线',
    textbookRef: '第1章 1.4–1.5 欧姆定律与电功率',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch0-loop-and-meters'],
    learningObjectives: [
      '定量验证固定电压下电流与电阻成反比 I = U / R',
      '掌握两电阻与电位器的无载分压公式 U_out = U_in · R2 / (R1 + R2)',
      '计算元件耗散功率 P = U·I = I²R = U²/R，避免超出额定功率',
    ],
    stages: [
      {
        id: 'l2-s1',
        stageNumber: 1,
        title: '欧姆定律定量测量：I = U / R',
        badge: 'Step 1 · 欧姆',
        conceptGoal: '保持两端电压 U 不变，电阻减半则电流翻倍。',
        explanation:
          '12V 恒压源驱动单个电阻 R1，电压表 PV1 读取 R1 端压，电流表 PA1 读取电流。初始 R1 = 240 Ω 时 I = 12/240 = 50 mA。试着将 R1 减半到 120 Ω 或更小，实时观察电流倍数关系。',
        analogy: '管道水压固定时，滤网孔隙阻碍减小一半，水流量立即翻番。',
        highlights: ['r1', 'pa1', 'pv1'],
        newlyAddedIds: ['v1', 'r1', 'pa1', 'pv1'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 160, 260, 270, { voltage: 12 }),
            mkComp('pa1', 'AMMETER', 'PA1', 330, 150, 0, { mode: 'dc' }),
            mkComp('r1', 'RESISTOR', 'R1', 500, 260, 90, { resistance: 240, maxPower: 2.0 }),
            mkComp('pv1', 'VOLTMETER', 'PV1', 640, 260, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 160, 400, 0),
          ],
          [
            ['v1', 'pos', 'pa1', 'pos', '#ef4444'],
            ['pa1', 'neg', 'r1', 'a', '#38bdf8'],
            ['r1', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r1', 'a', 'pv1', 'pos', '#a855f7'],
            ['r1', 'b', 'pv1', 'neg', '#64748b'],
          ],
          'l2s1'
        ),
        liveFormulas: [
          {
            id: 'f-ohm',
            title: '欧姆定律实测验算',
            formula: 'I_理 = U(R1) / R1',
            evaluate: (ctx) => {
              const u = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
              const r = Math.max(0.1, numProp(ctx, 'r1', 'resistance', 240));
              const iMeas = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              return {
                expression: `${fmtV(u)} / ${r.toFixed(0)} Ω → 理论 ${fmtI(u / r)}`,
                result: `实测 ${fmtI(iMeas)}`,
                status: Math.abs(iMeas - u / r) < 0.002 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l2s1-r1',
            label: '调节电阻 R1',
            targetId: 'r1',
            propKey: 'resistance',
            kind: 'slider',
            min: 60,
            max: 600,
            step: 20,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：电阻色环与欧姆定律', type: 'RESISTOR', componentId: 'r1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '令支路电流提升至 100 mA 以上',
          instruction: '减小电阻 R1（≤ 120 Ω）或升高电源电压，使 PA1 读数超过 95 mA。',
          check: (ctx) => {
            const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
            return {
              passed: i >= 0.095,
              message: i >= 0.095 ? `验证成功！当前支路电流 ${fmtI(i)}` : `当前电流 ${fmtI(i)} < 95 mA`,
            };
          },
          autoDemo: {
            buttonLabel: '一键阻值减半 (120Ω → 100mA)',
            description: '将 R1 由 240Ω 调至 120Ω 验证 I 翻倍',
            actions: [{ kind: 'setProp', componentId: 'r1', key: 'resistance', value: 120 }],
          },
        },
      },

      {
        id: 'l2-s2',
        stageNumber: 2,
        title: '电位器连续分压公式',
        badge: 'Step 2 · 分压',
        conceptGoal: '旋转电位器滑臂比例 α，本质上是在平滑改变上下串联电阻的比例分配。',
        explanation:
          '将 1kΩ 电位器 RV1 的两端跨接 10V 与 GND，滑臂 W 接 10MΩ 电压表 PV1，因此不向后级漏流（空载）。此时下段电阻 R_WG = α · R_total，输出电压严格线性跟随 U_W = 10V × α。',
        analogy: '就像一把 10 米高的斜坡滑梯：滑片位置百分比 α 决定了你距离地面海平面的高度比例。',
        highlights: ['rv1', 'pv1'],
        newlyAddedIds: ['rv1'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (10V)', 160, 260, 270, { voltage: 10 }),
            mkComp('rv1', 'POTENTIOMETER', 'RV1 (1kΩ)', 380, 260, 90, {
              resistance: 1000,
              ratio: 0.35,
              maxPower: 1.0,
            }),
            mkComp('pv1', 'VOLTMETER', 'PV1 (Vw)', 560, 310, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 160, 400, 0),
          ],
          [
            ['v1', 'pos', 'rv1', 'b', '#ef4444'],
            ['rv1', 'a', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rv1', 'wiper', 'pv1', 'pos', '#f59e0b'],
            ['v1', 'neg', 'pv1', 'neg', '#64748b'],
          ],
          'l2s2'
        ),
        liveFormulas: [
          {
            id: 'f-pot-div',
            title: '电位器分压公式',
            formula: 'U_W = U_in × α',
            evaluate: (ctx) => {
              const vin = numProp(ctx, 'v1', 'voltage', 10);
              const alpha = numProp(ctx, 'rv1', 'ratio', 0.35);
              const vw = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
              return {
                expression: `${fmtV(vin)} × ${(alpha * 100).toFixed(0)}% = ${fmtV(vin * alpha)}`,
                result: `实测 ${fmtV(vw)}`,
                status: Math.abs(vw - vin * alpha) < 0.1 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l2s2-alpha',
            label: '旋转滑臂比例 α',
            targetId: 'rv1',
            propKey: 'ratio',
            kind: 'slider',
            min: 0.05,
            max: 0.95,
            step: 0.05,
          },
        ],
        ponderLinks: [
          { label: '思索：旋转电位器分压', type: 'POTENTIOMETER', componentId: 'rv1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '分压调节输出至 7.5V 以上',
          instruction: '旋转 RV1 滑臂比例 α ≥ 0.75，将抽头输出提升至 7.5V 以上。',
          check: (ctx) => {
            const vw = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
            return {
              passed: vw >= 7.4,
              message: vw >= 7.4 ? `分压达标：U_W = ${fmtV(vw)}` : `当前输出 U_W = ${fmtV(vw)} < 7.4V`,
            };
          },
          autoDemo: {
            buttonLabel: '一键将滑臂旋转到 α = 0.80',
            description: '调整电位器抽头比 α = 0.80 获得 8.00V 输出',
            actions: [{ kind: 'setProp', componentId: 'rv1', key: 'ratio', value: 0.8 }],
          },
        },
      },

      {
        id: 'l2-s3',
        stageNumber: 3,
        title: '限流与焦耳功耗红线：拯救过载 LED',
        badge: 'Step 3 · 安全区',
        conceptGoal: '理解焦耳耗散功率 P = I²R 与 LED 必须串联限流电阻的安全边界。',
        explanation:
          '当前 5V 源经小电阻 R_lim = 68Ω 直接驱动 LED1（最大安全功耗仅 60mW），过大的正向电流使 LED1 触发过载警示！你需要增大限流电阻 R_lim ≥ 180Ω，把正向电流压低至 17mA 以下消除过载。',
        analogy: '就像消防水龙直接浇花会把花瓣撕裂，必须串入合适阻力的限流节流阀把流速稳在安全区。',
        highlights: ['r_lim', 'led1'],
        newlyAddedIds: ['led1', 'r_lim'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (5V)', 150, 260, 270, { voltage: 5 }),
            mkComp('r_lim', 'RESISTOR', 'R_lim 限流', 330, 150, 0, { resistance: 68, maxPower: 0.5 }),
            mkComp('pa1', 'AMMETER', 'PA1 (If)', 500, 150, 0, { mode: 'dc' }),
            mkComp('led1', 'LED', 'LED1', 560, 290, 90, { color: 'red', maxPower: 0.06 }),
            mkComp('gnd1', 'GROUND', 'GND', 150, 400, 0),
          ],
          [
            ['v1', 'pos', 'r_lim', 'a', '#ef4444'],
            ['r_lim', 'b', 'pa1', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'led1', 'anode', '#38bdf8'],
            ['led1', 'cathode', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l2s3'
        ),
        liveFormulas: [
          {
            id: 'f-led-p',
            title: 'LED 功耗与限流关系',
            formula: 'I_f ≈ (V_s - V_f) / R_lim ,  P_led = V_f · I_f',
            evaluate: (ctx) => {
              const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              const p = Math.abs(getTel(ctx, 'led1')?.power ?? 0);
              const over = Boolean(getTel(ctx, 'led1')?.overloaded);
              return {
                expression: `I_f = ${fmtI(i)}, P_led = ${fmtP(p)}`,
                result: over ? '过载告警！请增大 R_lim' : '安全工作区 (<60mW)',
                status: over ? 'warn' : 'good',
              };
            },
          },
          {
            id: 'f-joule-r',
            title: '限流电阻焦耳发热',
            formula: 'P_R = I² × R_lim',
            evaluate: (ctx) => {
              const pR = Math.abs(getTel(ctx, 'r_lim')?.power ?? 0);
              const r = numProp(ctx, 'r_lim', 'resistance', 68);
              return {
                expression: `R_lim = ${r.toFixed(0)} Ω`,
                result: fmtP(pR),
                status: pR > 0.45 ? 'warn' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l2s3-rlim',
            label: '限流电阻 R_lim',
            targetId: 'r_lim',
            propKey: 'resistance',
            kind: 'slider',
            min: 47,
            max: 470,
            step: 10,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：LED 为什么要串限流电阻', type: 'LED', componentId: 'led1', stepIndex: 1 },
          { label: '思索：电阻焦耳热警示', type: 'RESISTOR', componentId: 'r_lim', stepIndex: 2 },
        ],
        checkpoint: {
          title: '调高 R_lim 消除 LED 过载告警',
          instruction: '将 R_lim 调至 180Ω 及以上，把电流降至安全区并彻底消除过载警告。',
          check: (ctx) => {
            const over = Boolean(getTel(ctx, 'led1')?.overloaded);
            const i = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
            return {
              passed: !over && i > 0.002 && i <= 0.022,
              message:
                !over && i > 0.002 && i <= 0.022
                  ? `安全运行中！I_f = ${fmtI(i)}，LED 正常亮起无过载`
                  : `当前 I_f = ${fmtI(i)}，${over ? 'LED 过载报警未解除' : '请将 R_lim 调至 180~330Ω'}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键更换 220Ω 安全限流电阻',
            description: '将 R_lim 调为 220Ω，把 LED 电流控在 ~13.5mA 安全点亮区',
            actions: [{ kind: 'setProp', componentId: 'r_lim', key: 'resistance', value: 220 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 3 (Ch.1): 基尔霍夫定律 (KCL 与 KVL)
  // =========================================================================
  {
    id: 'ch1-kirchhoff-laws',
    chapterId: 'ch1',
    lessonNumber: 3,
    title: '基尔霍夫定律 (KCL 与 KVL)',
    subtitle: '掌握复杂多支路与多网孔电路的两大核心基石：节点电流守恒与回路电压闭合和为零',
    textbookRef: '第1章 1.6 基尔霍夫定律',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch1-ohm-and-power'],
    learningObjectives: [
      '用节点电流守恒 ΣI_进 = ΣI_出 验证并联分流规律 (KCL)',
      '用闭合回路电势升降平衡 ΣU = 0 验证串联分压规律 (KVL)',
      '结合 KCL 与两电阻支路建立多电源公共节点电压方程',
    ],
    stages: [
      {
        id: 'l3-s1',
        stageNumber: 1,
        title: 'KCL 节点电流定律：ΣI_进 = ΣI_出',
        badge: 'Step 1 · KCL',
        conceptGoal: '任一节点不会凭空囤积或毁灭电荷，流入干路总电流恒等于所有分流支路之和。',
        explanation:
          '12V 电源经总电流表 PA_tot 注入中心汇流节点后分成 R1 (200Ω) 与 R2 (400Ω) 两条并联支路。初始 I1 = 60 mA, I2 = 30 mA，干路 PA_tot 精确等于 90 mA。试着调整 R2 观察两支路此消彼长而守恒公式始终成立！',
        analogy: '就像分叉路口车流统计站：每分钟开进岔路口的总车辆数，必然等于两条分叉车道开出的车辆数相加。',
        highlights: ['pa_tot', 'pa1', 'pa2'],
        newlyAddedIds: ['pa_tot', 'r2', 'pa2'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 130, 270, 270, { voltage: 12 }),
            mkComp('pa_tot', 'AMMETER', 'PA_tot 干路', 270, 140, 0, { mode: 'dc' }),
            mkComp('pa1', 'AMMETER', 'PA1 支路1', 420, 210, 90, { mode: 'dc' }),
            mkComp('r1', 'RESISTOR', 'R1 (200Ω)', 420, 330, 90, { resistance: 200, maxPower: 2.0 }),
            mkComp('pa2', 'AMMETER', 'PA2 支路2', 600, 210, 90, { mode: 'dc' }),
            mkComp('r2', 'RESISTOR', 'R2', 600, 330, 90, { resistance: 400, maxPower: 2.0 }),
            mkComp('gnd1', 'GROUND', 'GND', 130, 420, 0),
          ],
          [
            ['v1', 'pos', 'pa_tot', 'pos', '#ef4444'],
            ['pa_tot', 'neg', 'pa1', 'pos', '#f59e0b'],
            ['pa_tot', 'neg', 'pa2', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'r1', 'a', '#38bdf8'],
            ['pa2', 'neg', 'r2', 'a', '#34d399'],
            ['r1', 'b', 'v1', 'neg', '#475569'],
            ['r2', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l3s1'
        ),
        liveFormulas: [
          {
            id: 'f-kcl',
            title: '节点 KCL 实时核验',
            formula: 'I_tot = I_1 + I_2',
            evaluate: (ctx) => {
              const it = Math.abs(getTel(ctx, 'pa_tot')?.current ?? 0);
              const i1 = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              const i2 = Math.abs(getTel(ctx, 'pa2')?.current ?? 0);
              return {
                expression: `${fmtI(i1)} + ${fmtI(i2)} = ${fmtI(i1 + i2)}`,
                result: `干路 ${fmtI(it)}`,
                status: Math.abs(it - (i1 + i2)) < 0.002 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l3s1-r2',
            label: '调节支路电阻 R2',
            targetId: 'r2',
            propKey: 'resistance',
            kind: 'slider',
            min: 100,
            max: 800,
            step: 50,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：电流表统计支路流量', type: 'AMMETER', componentId: 'pa_tot', stepIndex: 0 },
        ],
        checkpoint: {
          title: '令两条并联支路均分电流（各 60mA）',
          instruction: '调整支路 R2 阻值到 200Ω，使支路 2 与支路 1 均分 120mA 总电流。',
          check: (ctx) => {
            const it = Math.abs(getTel(ctx, 'pa_tot')?.current ?? 0);
            const i1 = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
            const i2 = Math.abs(getTel(ctx, 'pa2')?.current ?? 0);
            const ok = Math.abs(i1 - i2) < 0.003 && it >= 0.115;
            return {
              passed: ok,
              message: ok ? `KCL 均分成立：${fmtI(i1)} + ${fmtI(i2)} = ${fmtI(it)}` : `当前 I1=${fmtI(i1)}, I2=${fmtI(i2)}, 总=${fmtI(it)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键设置 R2 = 200Ω 均分干路',
            description: '将 R2 调至 200Ω 使 I1=I2=60mA, I_tot=120mA',
            actions: [{ kind: 'setProp', componentId: 'r2', key: 'resistance', value: 200 }],
          },
        },
      },

      {
        id: 'l3-s2',
        stageNumber: 2,
        title: 'KVL 回路电压定律：ΣU_降 = U_源',
        badge: 'Step 2 · KVL',
        conceptGoal: '沿任意闭合环路转一圈，电势上升总和必等于电势降落总和。',
        explanation:
          'V1 串联起 R1(100Ω)、R2(200Ω)、R3(300Ω) 三级分压阶梯。不管总电压如何调节，三块电压表 PV1 + PV2 + PV3 的读数之和永远精确锁定等于电源总电压 U_S。',
        analogy: '如同爬上一座 12 米高塔后走三段台阶下来返回地面：三段下楼梯高度落差之和必严格等于 12 米。',
        highlights: ['pv1', 'pv2', 'pv3'],
        newlyAddedIds: ['r3', 'pv1', 'pv2', 'pv3'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 电源', 120, 270, 270, { voltage: 12 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 280, 140, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (200Ω)', 480, 140, 0, { resistance: 200, maxPower: 2.0 }),
            mkComp('r3', 'RESISTOR', 'R3 (300Ω)', 660, 270, 90, { resistance: 300, maxPower: 2.0 }),
            mkComp('pv1', 'VOLTMETER', 'PV1 (U1)', 280, 240, 0, { mode: 'dc' }),
            mkComp('pv2', 'VOLTMETER', 'PV2 (U2)', 480, 240, 0, { mode: 'dc' }),
            mkComp('pv3', 'VOLTMETER', 'PV3 (U3)', 780, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 410, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#ef4444'],
            ['r1', 'b', 'r2', 'a', '#f59e0b'],
            ['r2', 'b', 'r3', 'a', '#38bdf8'],
            ['r3', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r1', 'a', 'pv1', 'pos', '#a855f7'],
            ['r1', 'b', 'pv1', 'neg', '#64748b'],
            ['r2', 'a', 'pv2', 'pos', '#a855f7'],
            ['r2', 'b', 'pv2', 'neg', '#64748b'],
            ['r3', 'a', 'pv3', 'pos', '#a855f7'],
            ['r3', 'b', 'pv3', 'neg', '#64748b'],
          ],
          'l3s2'
        ),
        liveFormulas: [
          {
            id: 'f-kvl',
            title: '回路 KVL 压降总和',
            formula: 'U1 + U2 + U3 = U_S',
            evaluate: (ctx) => {
              const u1 = Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0);
              const u2 = Math.abs(getTel(ctx, 'pv2')?.voltageDrop ?? 0);
              const u3 = Math.abs(getTel(ctx, 'pv3')?.voltageDrop ?? 0);
              const us = numProp(ctx, 'v1', 'voltage', 12);
              const sum = u1 + u2 + u3;
              return {
                expression: `${u1.toFixed(2)} + ${u2.toFixed(2)} + ${u3.toFixed(2)} = ${fmtV(sum)}`,
                result: `电源 ${fmtV(us)}`,
                status: Math.abs(sum - us) < 0.05 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l3s2-v1',
            label: '电源电压 V1',
            targetId: 'v1',
            propKey: 'voltage',
            kind: 'slider',
            min: 6,
            max: 24,
            step: 3,
            unit: 'V',
          },
        ],
        ponderLinks: [
          { label: '思索：电压表跨接读电势差', type: 'VOLTMETER', componentId: 'pv1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '升压验证按 1:2:3 比例分压的 KVL 平衡',
          instruction: '将 V1 调节至 18V，此时 U1=3V、U2=6V、U3=9V，验证总压降精准等于 18.00V。',
          check: (ctx) => {
            const us = numProp(ctx, 'v1', 'voltage', 12);
            const sum =
              Math.abs(getTel(ctx, 'pv1')?.voltageDrop ?? 0) +
              Math.abs(getTel(ctx, 'pv2')?.voltageDrop ?? 0) +
              Math.abs(getTel(ctx, 'pv3')?.voltageDrop ?? 0);
            const ok = us >= 17.5 && Math.abs(sum - us) < 0.1;
            return {
              passed: ok,
              message: ok ? `KVL 平衡成立：${fmtV(sum)} ≈ ${fmtV(us)}` : `当前总额 ${fmtV(sum)}，请先升压到 ≥ 18V`,
            };
          },
          autoDemo: {
            buttonLabel: '一键升压到 18V 测算阶梯 KVL',
            description: '将 V1 设为 18V 验证 3V + 6V + 9V = 18V',
            actions: [{ kind: 'setProp', componentId: 'v1', key: 'voltage', value: 18 }],
          },
        },
      },

      {
        id: 'l3-s3',
        stageNumber: 3,
        title: '双电源交汇节点：节点电位方程初探',
        badge: 'Step 3 · 节点法',
        conceptGoal: '结合 KCL 与欧姆定律写出中心节点 X 的唯一未知电位方程。',
        explanation:
          '当两个独立电压源 V1 (12V) 与 V2 (6V) 分别经 R1 (100Ω)、R2 (200Ω) 向中央公共负载 R3 (100Ω) 供电时，只需对节点 X 列一条 KCL 方程：(12-Vx)/100 + (6-Vx)/200 = Vx/100，立刻解得 Vx = 6.00V！',
        analogy: '就像两座不同水位的蓄水池通过两根管子给中间水箱供水同时向下排水，中间水位高度稳定在供需平衡点。',
        highlights: ['r3', 'vm_x', 'v2'],
        newlyAddedIds: ['v2', 'vm_x'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 130, 270, 270, { voltage: 12 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 270, 150, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('r3', 'RESISTOR', 'R3 (100Ω)', 430, 270, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (200Ω)', 590, 150, 0, { resistance: 200, maxPower: 2.0 }),
            mkComp('v2', 'DC_SOURCE', 'V2', 730, 270, 270, { voltage: 6 }),
            mkComp('vm_x', 'VOLTMETER', 'PV_X 节点电位', 550, 300, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 430, 410, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#ef4444'],
            ['r1', 'b', 'r3', 'a', '#f59e0b'],
            ['r2', 'a', 'r3', 'a', '#38bdf8'],
            ['r2', 'b', 'v2', 'pos', '#a78bfa'],
            ['r3', 'a', 'vm_x', 'pos', '#34d399'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r3', 'b', 'gnd1', 'gnd', '#475569'],
            ['v2', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vm_x', 'neg', 'gnd1', 'gnd', '#64748b'],
          ],
          'l3s3'
        ),
        liveFormulas: [
          {
            id: 'f-nodal-vx',
            title: '节点电压法理论解',
            formula: 'Vx = (V1/R1 + V2/R2) / (1/R1 + 1/R2 + 1/R3)',
            evaluate: (ctx) => {
              const v1 = numProp(ctx, 'v1', 'voltage', 12);
              const v2 = numProp(ctx, 'v2', 'voltage', 6);
              const r1 = numProp(ctx, 'r1', 'resistance', 100);
              const r2 = numProp(ctx, 'r2', 'resistance', 200);
              const r3 = numProp(ctx, 'r3', 'resistance', 100);
              const vxCalc = (v1 / r1 + v2 / r2) / (1 / r1 + 1 / r2 + 1 / r3);
              const vxMeas = Math.abs(getTel(ctx, 'vm_x')?.voltageDrop ?? 0);
              return {
                expression: `公式解 Vx = ${fmtV(vxCalc)}`,
                result: `实测 ${fmtV(vxMeas)}`,
                status: Math.abs(vxCalc - vxMeas) < 0.05 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l3s3-v2',
            label: '调节右侧电源 V2',
            targetId: 'v2',
            propKey: 'voltage',
            kind: 'slider',
            min: 0,
            max: 18,
            step: 3,
            unit: 'V',
          },
        ],
        ponderLinks: [
          { label: '思索：电源联合维持节点电位', type: 'DC_SOURCE', componentId: 'v2', stepIndex: 0 },
        ],
        checkpoint: {
          title: '抬升 V2 电压使公共节点 Vx ≥ 7.0V',
          instruction: '将右侧电源 V2 调高至 12V（由 6V 升至 12V），节点 Vx 将升至 7.20V。',
          check: (ctx) => {
            const vx = Math.abs(getTel(ctx, 'vm_x')?.voltageDrop ?? 0);
            return {
              passed: vx >= 7.0,
              message: vx >= 7.0 ? `节点电压法验算通过！Vx = ${fmtV(vx)}` : `当前 Vx = ${fmtV(vx)} < 7.0V`,
            };
          },
          autoDemo: {
            buttonLabel: '一键设 V2 = 12V 观察节点抬升到 7.20V',
            description: '将 V2 升至 12V 验算 Vx = 7.20V',
            actions: [{ kind: 'setProp', componentId: 'v2', key: 'voltage', value: 12 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 4 (Ch.2): 混联电路、惠斯通电桥平衡与电源模型互换
  // =========================================================================
  {
    id: 'ch2-bridge-and-source-models',
    chapterId: 'ch2',
    lessonNumber: 4,
    title: '惠斯通电桥平衡与电源模型等效',
    subtitle: '掌握非串非并电桥的平衡条件 R1·R4 = R2·R3，及实际电压源与电流源的外特性等效变换',
    textbookRef: '第2章 2.1–2.2 支路串并联等效与电源模型互换',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch1-kirchhoff-laws'],
    learningObjectives: [
      '判断什么时候电桥达到零电流平衡状态：对臂乘积相等',
      '利用 E = I_s · R_0 完成实际电压源与实际电流源的等效互换',
      '明确“对外电路等效”≠“电源内部损耗相同”的关键物理边界',
    ],
    stages: [
      {
        id: 'l4-s1',
        stageNumber: 1,
        title: '惠斯通电桥：寻找零电流平衡点',
        badge: 'Step 1 · 电桥',
        conceptGoal: '既非串联也非并联的桥式网架，满足 R1·R4 = R2·R3 时中心桥臂电流精确归零。',
        explanation:
          '左臂 R1(100Ω)/R2(100Ω) 把 10V 电源平分为 5.00V 基准点；右臂 R3(200Ω) 与待调电阻 R4(初始 100Ω) 暂时失衡使中心点仅 3.33V，因而桥臂电流表 PA_brg 测得明显偏转电流。调节 R4 使两臂分压比对齐即可实现高精度电桥平衡！',
        analogy: '就像在两个平行斜坡桥之间架一座独木桥：只有左右两岸海拔完全等高时，桥面上才彻底没有水流。',
        highlights: ['pa_brg', 'r4'],
        newlyAddedIds: ['r1', 'r2', 'r3', 'r4', 'pa_brg'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (10V)', 120, 270, 270, { voltage: 10 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 300, 170, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (100Ω)', 300, 370, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('pa_brg', 'AMMETER', 'PA_brg 检流', 450, 270, 0, { mode: 'dc' }),
            mkComp('r3', 'RESISTOR', 'R3 (200Ω)', 600, 170, 90, { resistance: 200, maxPower: 2.0 }),
            mkComp('r4', 'RESISTOR', 'R4 可调臂', 600, 370, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 430, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#ef4444'],
            ['v1', 'pos', 'r3', 'a', '#ef4444'],
            ['r1', 'b', 'r2', 'a', '#38bdf8'],
            ['r1', 'b', 'pa_brg', 'pos', '#f59e0b'],
            ['pa_brg', 'neg', 'r3', 'b', '#f59e0b'],
            ['r3', 'b', 'r4', 'a', '#34d399'],
            ['r2', 'b', 'v1', 'neg', '#475569'],
            ['r4', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l4s1'
        ),
        liveFormulas: [
          {
            id: 'f-bridge-bal',
            title: '对臂乘积平衡条件',
            formula: 'R1 × R4 vs R2 × R3',
            evaluate: (ctx) => {
              const r4 = numProp(ctx, 'r4', 'resistance', 100);
              const ib = Math.abs(getTel(ctx, 'pa_brg')?.current ?? 0);
              return {
                expression: `100×${r4.toFixed(0)} = ${(100 * r4).toFixed(0)} vs 100×200 = 20000`,
                result: `桥流 ${fmtI(ib)}`,
                status: ib < 0.001 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l4s1-r4',
            label: '调节桥臂 R4',
            targetId: 'r4',
            propKey: 'resistance',
            kind: 'slider',
            min: 50,
            max: 400,
            step: 25,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：电流表微安计零偏指示', type: 'AMMETER', componentId: 'pa_brg', stepIndex: 0 },
        ],
        checkpoint: {
          title: '将惠斯通电桥调至零偏平衡',
          instruction: '调整 R4 阻值至 200Ω，使对臂乘积 R1·R4 = R2·R3，检流表读数逼近 0.0 mA。',
          check: (ctx) => {
            const ib = Math.abs(getTel(ctx, 'pa_brg')?.current ?? 0);
            return {
              passed: ib < 0.001,
              message: ib < 0.001 ? '电桥已精确平衡，检流电流 < 1 mA！' : `桥臂尚失衡，当前不平衡电流 ${fmtI(ib)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键调平电桥 (设 R4 = 200Ω)',
            description: '调整 R4 = 200Ω 实现对称电桥平衡归零',
            actions: [{ kind: 'setProp', componentId: 'r4', key: 'resistance', value: 200 }],
          },
        },
      },

      {
        id: 'l4-s2',
        stageNumber: 2,
        title: '戴维南/诺顿源模型互换：外特性完全等价',
        badge: 'Step 2 · 源互换',
        conceptGoal: '12V 串 6Ω 电压源模型与 2A 并 6Ω 电流源模型，给外部任意相同负载 RL 供电时端电压与电流完全相等。',
        explanation:
          '左侧是“12V 理想电压源 V1 串联内阻 R_s1 = 6Ω”；右侧是“2A 恒流源 Is2 (=12V/6Ω) 并联同阻值内阻 R_s2 = 6Ω”。两边接一模一样的负载电阻 R_L1 = R_L2 = 12Ω，电流表 PA1 与 PA2 读数精确同为 0.667 A！',
        analogy: '就像两个包装外观截然不同的电源模块黑盒，只要对外端口输出同一条 U-I 外特性直线，外部负载就感知不出任何区别。',
        highlights: ['pa1', 'pa2', 'is2'],
        newlyAddedIds: ['is2', 'rs2', 'pa2', 'rl2'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            // Left: Voltage source model 12V + 6Ω -> RL1
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 110, 270, 270, { voltage: 12 }),
            mkComp('rs1', 'RESISTOR', 'Rs1 (6Ω)', 230, 150, 0, { resistance: 6, maxPower: 60 }),
            mkComp('pa1', 'AMMETER', 'PA1 (左负载流)', 340, 200, 90, { mode: 'dc' }),
            mkComp('rl1', 'RESISTOR', 'RL1', 340, 330, 90, { resistance: 12, maxPower: 60 }),
            mkComp('gnd1', 'GROUND', 'GND1', 110, 420, 0),
            // Right: Current source model 2A || 6Ω -> RL2
            mkComp('is2', 'CURRENT_SOURCE', 'Is2 (2A)', 490, 270, 270, { current: 2 }),
            mkComp('rs2', 'RESISTOR', 'Rs2 (6Ω)', 610, 270, 90, { resistance: 6, maxPower: 60 }),
            mkComp('pa2', 'AMMETER', 'PA2 (右负载流)', 740, 200, 90, { mode: 'dc' }),
            mkComp('rl2', 'RESISTOR', 'RL2', 740, 330, 90, { resistance: 12, maxPower: 60 }),
            mkComp('gnd2', 'GROUND', 'GND2', 490, 420, 0),
          ],
          [
            ['v1', 'pos', 'rs1', 'a', '#ef4444'],
            ['rs1', 'b', 'pa1', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'rl1', 'a', '#38bdf8'],
            ['rl1', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],

            ['is2', 'pos', 'rs2', 'a', '#a78bfa'],
            ['is2', 'pos', 'pa2', 'pos', '#f59e0b'],
            ['pa2', 'neg', 'rl2', 'a', '#38bdf8'],
            ['rs2', 'b', 'is2', 'neg', '#475569'],
            ['rl2', 'b', 'is2', 'neg', '#475569'],
            ['is2', 'neg', 'gnd2', 'gnd', '#475569'],
          ],
          'l4s2'
        ),
        liveFormulas: [
          {
            id: 'f-src-equiv',
            title: '两侧负载电流全等验证',
            formula: 'I_L1 = E/(Rs+RL) vs I_L2 = Is·Rs/(Rs+RL)',
            evaluate: (ctx) => {
              const i1 = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
              const i2 = Math.abs(getTel(ctx, 'pa2')?.current ?? 0);
              return {
                expression: `左模型 ${fmtI(i1)} vs 右模型 ${fmtI(i2)}`,
                result: Math.abs(i1 - i2) < 0.02 ? '对外绝对等价!' : '请保持两端 RL 相等比较',
                status: Math.abs(i1 - i2) < 0.02 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l4s2-rl1',
            label: '左负载 RL1',
            targetId: 'rl1',
            propKey: 'resistance',
            kind: 'slider',
            min: 6,
            max: 30,
            step: 6,
            unit: 'Ω',
          },
          {
            id: 'qc-l4s2-rl2',
            label: '右负载 RL2',
            targetId: 'rl2',
            propKey: 'resistance',
            kind: 'slider',
            min: 6,
            max: 30,
            step: 6,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：恒流源水车类比', type: 'CURRENT_SOURCE', componentId: 'is2', stepIndex: 1 },
        ],
        checkpoint: {
          title: '同步改变两处负载到 24Ω 验证新工况仍等价',
          instruction: '将 RL1 与 RL2 同时调至 24Ω，确认两处外电路电流同步降至完全一致的 0.40 A。',
          check: (ctx) => {
            const rl1 = numProp(ctx, 'rl1', 'resistance', 12);
            const rl2 = numProp(ctx, 'rl2', 'resistance', 12);
            const i1 = Math.abs(getTel(ctx, 'pa1')?.current ?? 0);
            const i2 = Math.abs(getTel(ctx, 'pa2')?.current ?? 0);
            const ok = rl1 >= 23 && rl2 >= 23 && Math.abs(i1 - i2) < 0.02;
            return {
              passed: ok,
              message: ok ? `等价性验证成功：${fmtI(i1)} == ${fmtI(i2)}` : `左 ${fmtI(i1)} (RL=${rl1}Ω), 右 ${fmtI(i2)} (RL=${rl2}Ω)`,
            };
          },
          autoDemo: {
            buttonLabel: '一键同步设为 24Ω 验算等价',
            description: '将 RL1 与 RL2 均调至 24Ω 验证两边流同为 0.40A',
            actions: [
              { kind: 'setProp', componentId: 'rl1', key: 'resistance', value: 24 },
              { kind: 'setProp', componentId: 'rl2', key: 'resistance', value: 24 },
            ],
          },
        },
      },

      {
        id: 'l4-s3',
        stageNumber: 3,
        title: '电源等价的界限：内部发热量完全不等',
        badge: 'Step 3 · 内耗对比',
        conceptGoal: '对外电路完全等价的两个电源，空载或轻载时内部电阻耗散功率并不相同。',
        explanation:
          '对比上面两个模型在开路（断开负载 K_load）下的自身发热：电压源开路时没有电流，内阻 Rs1 消耗 0 W；而恒流源模型的 2A 电流在外部断开后必须全部经内阻 Rs2 自循环，白白发热 I²Rs2 = 24 W！所以等价只针对外部端口，不可混淆内部效率。',
        analogy: '水塔阀门关掉就不再耗水泵功；定排量水泵把下游憋住，只能靠内循环泄压阀不断消耗全部水泵能量发热。',
        highlights: ['rs1', 'rs2', 'k_l1', 'k_l2'],
        newlyAddedIds: ['k_l1', 'k_l2'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 110, 270, 270, { voltage: 12 }),
            mkComp('rs1', 'RESISTOR', 'Rs1 (6Ω)', 230, 150, 0, { resistance: 6, maxPower: 60 }),
            mkComp('k_l1', 'SWITCH_SPST', 'K1 负载开关', 340, 190, 90, { closed: true }),
            mkComp('rl1', 'RESISTOR', 'RL1 (12Ω)', 340, 330, 90, { resistance: 12, maxPower: 60 }),
            mkComp('gnd1', 'GROUND', 'GND1', 110, 420, 0),

            mkComp('is2', 'CURRENT_SOURCE', 'Is2 (2A)', 490, 270, 270, { current: 2 }),
            mkComp('rs2', 'RESISTOR', 'Rs2 (6Ω)', 610, 270, 90, { resistance: 6, maxPower: 60 }),
            mkComp('k_l2', 'SWITCH_SPST', 'K2 负载开关', 740, 190, 90, { closed: true }),
            mkComp('rl2', 'RESISTOR', 'RL2 (12Ω)', 740, 330, 90, { resistance: 12, maxPower: 60 }),
            mkComp('gnd2', 'GROUND', 'GND2', 490, 420, 0),
          ],
          [
            ['v1', 'pos', 'rs1', 'a', '#ef4444'],
            ['rs1', 'b', 'k_l1', 'a', '#f59e0b'],
            ['k_l1', 'b', 'rl1', 'a', '#38bdf8'],
            ['rl1', 'b', 'v1', 'neg', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],

            ['is2', 'pos', 'rs2', 'a', '#a78bfa'],
            ['is2', 'pos', 'k_l2', 'a', '#f59e0b'],
            ['k_l2', 'b', 'rl2', 'a', '#38bdf8'],
            ['rs2', 'b', 'is2', 'neg', '#475569'],
            ['rl2', 'b', 'is2', 'neg', '#475569'],
            ['is2', 'neg', 'gnd2', 'gnd', '#475569'],
          ],
          'l4s3'
        ),
        liveFormulas: [
          {
            id: 'f-int-loss',
            title: '两侧电源内阻发热比较',
            formula: 'P_Rs1 vs P_Rs2',
            evaluate: (ctx) => {
              const p1 = Math.abs(getTel(ctx, 'rs1')?.power ?? 0);
              const p2 = Math.abs(getTel(ctx, 'rs2')?.power ?? 0);
              return {
                expression: `左 P(Rs1) = ${fmtP(p1)} vs 右 P(Rs2) = ${fmtP(p2)}`,
                result: p1 < 0.05 && p2 > 20 ? '空载零耗 vs 24W 自耗!' : '负载接通态对比',
                status: p1 < 0.05 && p2 > 20 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l4s3-k1',
            label: '左负载开关 K1',
            targetId: 'k_l1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
          {
            id: 'qc-l4s3-k2',
            label: '右负载开关 K2',
            targetId: 'k_l2',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：恒流源开路隐患', type: 'CURRENT_SOURCE', componentId: 'is2', stepIndex: 2 },
        ],
        checkpoint: {
          title: '断开两侧负载，见证空载内损剧烈分化',
          instruction: '同时断开 K1 与 K2 使两端负载开路，观察左内阻发热归零而右内阻飙升至 24W。',
          check: (ctx) => {
            const p1 = Math.abs(getTel(ctx, 'rs1')?.power ?? 0);
            const p2 = Math.abs(getTel(ctx, 'rs2')?.power ?? 0);
            const ok = p1 < 0.05 && p2 >= 22;
            return {
              passed: ok,
              message: ok ? `验证完毕：P_Rs1 = ${fmtP(p1)}，P_Rs2 = ${fmtP(p2)}（不等价内部损耗）` : `当前 P_Rs1=${fmtP(p1)}, P_Rs2=${fmtP(p2)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键断开双侧负载对比内耗',
            description: '断开 K1、K2 直观展示电压源不发热而恒流源空载内耗 24W',
            actions: [
              { kind: 'setProp', componentId: 'k_l1', key: 'closed', value: false },
              { kind: 'setProp', componentId: 'k_l2', key: 'closed', value: false },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 5 (Ch.2): 叠加定理（安全 SPDT 切换置零实验）
  // =========================================================================
  {
    id: 'ch2-superposition',
    chapterId: 'ch2',
    lessonNumber: 5,
    title: '叠加定理：各独立源单独作用的叠加',
    subtitle: '用单刀双掷开关安全演示“电压源置零（短接接地）”而绝不误短接真实电源本身',
    textbookRef: '第2章 2.4 叠加定理',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch1-kirchhoff-laws'],
    learningObjectives: [
      '掌握独立电压源“置零（移除）”等同于将该电源端短接为 0V（绝非直接短接源两端！）',
      '逐一开启独立源测得支路电流分量 I′ 与 I″，验证线性回路满足 I = I′ + I″',
      '明确非线性的功率 P 绝对不能按叠加定理直接相加',
    ],
    stages: [
      {
        id: 'l5-s1',
        stageNumber: 1,
        title: '双电源共同作用总响应 (60 mA)',
        badge: 'Step 1 · 共作用',
        conceptGoal: '首先测量 V1 (12V) 与 V2 (6V) 同时驱动中间 R3 (100Ω) 时流过的总电流 I3 = 60.0 mA。',
        explanation:
          '注意开关设计巧思：K1、K2 均为单刀双掷开关（SPDT）。拨到位 0 (NC) 时接入各自电源；拨到位 1 (NO) 时把电路输入脚切换到 GND 接地（完成数学上的“电源置零”），而电源自身保持开路悬空毫发无损！',
        analogy: '就像两台水泵同时给中间水池供水，先记录同时开机时的总水流量，随后再分步单独关闭另一台作叠加对照。',
        highlights: ['k1', 'k2', 'am3'],
        newlyAddedIds: ['k1', 'k2', 'am3'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 100, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 选通/置零', 210, 150, 0, { position: 0 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 330, 150, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('am3', 'AMMETER', 'PA3 负载电流', 460, 220, 90, { mode: 'dc' }),
            mkComp('r3', 'RESISTOR', 'R3 (100Ω)', 460, 330, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (200Ω)', 590, 150, 0, { resistance: 200, maxPower: 2.0 }),
            mkComp('k2', 'SWITCH_SPDT', 'K2 选通/置零', 710, 150, 180, { position: 0 }),
            mkComp('v2', 'DC_SOURCE', 'V2 (6V)', 820, 270, 270, { voltage: 6 }),
            mkComp('gnd1', 'GROUND', 'GND', 460, 430, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'nc', '#ef4444'],
            ['k1', 'no', 'gnd1', 'gnd', '#475569'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am3', 'pos', '#38bdf8'],
            ['r2', 'a', 'am3', 'pos', '#38bdf8'],
            ['am3', 'neg', 'r3', 'a', '#34d399'],
            ['r2', 'b', 'k2', 'com', '#a78bfa'],
            ['v2', 'pos', 'k2', 'nc', '#a78bfa'],
            ['k2', 'no', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r3', 'b', 'gnd1', 'gnd', '#475569'],
            ['v2', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l5s1'
        ),
        liveFormulas: [
          {
            id: 'f-sup-total',
            title: '共同作用实测总电流',
            formula: 'I3(全) = V_X / R3',
            evaluate: (ctx) => {
              const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
              const k1z = numProp(ctx, 'k1', 'position', 0) === 1;
              const k2z = numProp(ctx, 'k2', 'position', 0) === 1;
              return {
                expression: `V1:${k1z ? '置零' : '12V'}, V2:${k2z ? '置零' : '6V'}`,
                result: `I3 = ${fmtI(i3)}`,
                status: Math.abs(i3 - 0.06) < 0.002 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l5s1-k1',
            label: '左侧源开关 K1',
            targetId: 'k1',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接通 V1 (12V)', value: 0 },
              { label: '置零 V1 (接地)', value: 1 },
            ],
          },
          {
            id: 'qc-l5s1-k2',
            label: '右侧源开关 K2',
            targetId: 'k2',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接通 V2 (6V)', value: 0 },
              { label: '置零 V2 (接地)', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：单刀双掷道岔选通', type: 'SWITCH_SPDT', componentId: 'k1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '保持双源同时接入记录总电流 60.0 mA',
          instruction: '确认 K1 与 K2 均处于接通状态，观察 PA3 读数稳定为 60.0 mA，随后切换下步拆解分量。',
          check: (ctx) => {
            const k1 = numProp(ctx, 'k1', 'position', 0);
            const k2 = numProp(ctx, 'k2', 'position', 0);
            const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
            const ok = k1 === 0 && k2 === 0 && Math.abs(i3 - 0.06) < 0.003;
            return {
              passed: ok,
              message: ok ? `总响应基准记录完成：I3 = ${fmtI(i3)}` : `当前 I3 = ${fmtI(i3)}，请确保双电源接通`,
            };
          },
          autoDemo: {
            buttonLabel: '一键确认双源共作用 (60.0 mA)',
            description: '设置 K1=0, K2=0 记录双源共同驱动下 I3 = 60.0 mA',
            actions: [
              { kind: 'setProp', componentId: 'k1', key: 'position', value: 0 },
              { kind: 'setProp', componentId: 'k2', key: 'position', value: 0 },
            ],
          },
        },
      },

      {
        id: 'l5-s2',
        stageNumber: 2,
        title: '仅 V1 单独作用（将 V2 置零接地 → 48 mA）',
        badge: 'Step 2 · 分量 I′',
        conceptGoal: '令 V2 置零后，R2 (200Ω) 与 R3 (100Ω) 并联后和 R1 串联分流，算得 I3′ = 48.0 mA。',
        explanation:
          '将 K2 切换至“置零 (接地)”位：R2 相当于直接并接在地线上。于是从 V1 看出去等效负载是 R3 ∥ R2 = 100 ∥ 200 = 66.67Ω，VX′ = 12 × 66.67 / 166.67 = 4.80V，因此 I3′ = 48.0 mA。',
        analogy: '关闭右水泵且留出其回流管线接地，看左水泵独自能推动多少支路流量。',
        highlights: ['k2', 'am3'],
        newlyAddedIds: [],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 100, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 接通 V1', 210, 150, 0, { position: 0 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 330, 150, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('am3', 'AMMETER', 'PA3 (测 I′)', 460, 220, 90, { mode: 'dc' }),
            mkComp('r3', 'RESISTOR', 'R3 (100Ω)', 460, 330, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (200Ω)', 590, 150, 0, { resistance: 200, maxPower: 2.0 }),
            mkComp('k2', 'SWITCH_SPDT', 'K2 选通/置零', 710, 150, 180, { position: 0 }),
            mkComp('v2', 'DC_SOURCE', 'V2 (6V)', 820, 270, 270, { voltage: 6 }),
            mkComp('gnd1', 'GROUND', 'GND', 460, 430, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'nc', '#ef4444'],
            ['k1', 'no', 'gnd1', 'gnd', '#475569'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am3', 'pos', '#38bdf8'],
            ['r2', 'a', 'am3', 'pos', '#38bdf8'],
            ['am3', 'neg', 'r3', 'a', '#34d399'],
            ['r2', 'b', 'k2', 'com', '#a78bfa'],
            ['v2', 'pos', 'k2', 'nc', '#a78bfa'],
            ['k2', 'no', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r3', 'b', 'gnd1', 'gnd', '#475569'],
            ['v2', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l5s2'
        ),
        liveFormulas: [
          {
            id: 'f-sup-p1',
            title: 'V1 单作用理论分量',
            formula: 'I3′ = 12V × [R2/(R2+R3)] / (R1 + R2∥R3) = 48.0 mA',
            evaluate: (ctx) => {
              const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
              const k2z = numProp(ctx, 'k2', 'position', 0) === 1;
              return {
                expression: k2z ? 'V2 已置零，实测分量 I′' : '请先将 K2 切换为置零!',
                result: fmtI(i3),
                status: k2z && Math.abs(i3 - 0.048) < 0.002 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l5s2-k2',
            label: '右侧源开关 K2',
            targetId: 'k2',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接通 V2 (6V)', value: 0 },
              { label: '置零 V2 (接地)', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：SPDT 切换支路原理', type: 'SWITCH_SPDT', componentId: 'k2', stepIndex: 1 },
        ],
        checkpoint: {
          title: '将 V2 置零接地，测得分量 I′ = 48.0 mA',
          instruction: '拨动开关 K2 切到“置零 V2 (接地)”，验证电流从 60 mA 变为 48.0 mA。',
          check: (ctx) => {
            const k1 = numProp(ctx, 'k1', 'position', 0);
            const k2 = numProp(ctx, 'k2', 'position', 0);
            const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
            const ok = k1 === 0 && k2 === 1 && Math.abs(i3 - 0.048) < 0.002;
            return {
              passed: ok,
              message: ok ? `第一分量测定：I3′ = ${fmtI(i3)} (占总电流 80%)` : `当前 I3 = ${fmtI(i3)}，请将 K2 置零`,
            };
          },
          autoDemo: {
            buttonLabel: '一键将 V2 置零测分量 I′ (48mA)',
            description: '保持 K1=0，拨动 K2=1 将 V2 置零测得 I′ = 48.0 mA',
            actions: [
              { kind: 'setProp', componentId: 'k1', key: 'position', value: 0 },
              { kind: 'setProp', componentId: 'k2', key: 'position', value: 1 },
            ],
          },
        },
      },

      {
        id: 'l5-s3',
        stageNumber: 3,
        title: '仅 V2 单独作用（将 V1 置零 → 12 mA）与线性累加',
        badge: 'Step 3 · I′+I″',
        conceptGoal: 'I3′ (48.0 mA) + I3″ (12.0 mA) = 60.0 mA，精准还原第一步总响应！',
        explanation:
          '现在把 K1 拨到“置零 V1 (接地)”，同时 K2 恢复“接通 V2 (6V)”。算算：R1(100Ω)∥R3(100Ω)=50Ω，VX″ = 6 × 50 / (200+50) = 1.20V，于是 I3″ = 12.0 mA！48mA + 12mA 丝毫不差等于 60mA。思考：那为什么功率 0.36W ≠ 0.23W + 0.014W？因为功率与电流平方成非线性！',
        analogy: '两台水泵分别单独贡献 48 升/分 与 12 升/分，线性水量可直接相加成 60 升/分。',
        highlights: ['k1', 'k2', 'am3'],
        newlyAddedIds: [],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 100, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 选通/置零', 210, 150, 0, { position: 0 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 330, 150, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('am3', 'AMMETER', 'PA3 (测 I″)', 460, 220, 90, { mode: 'dc' }),
            mkComp('r3', 'RESISTOR', 'R3 (100Ω)', 460, 330, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (200Ω)', 590, 150, 0, { resistance: 200, maxPower: 2.0 }),
            mkComp('k2', 'SWITCH_SPDT', 'K2 接通 V2', 710, 150, 180, { position: 0 }),
            mkComp('v2', 'DC_SOURCE', 'V2 (6V)', 820, 270, 270, { voltage: 6 }),
            mkComp('gnd1', 'GROUND', 'GND', 460, 430, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'nc', '#ef4444'],
            ['k1', 'no', 'gnd1', 'gnd', '#475569'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am3', 'pos', '#38bdf8'],
            ['r2', 'a', 'am3', 'pos', '#38bdf8'],
            ['am3', 'neg', 'r3', 'a', '#34d399'],
            ['r2', 'b', 'k2', 'com', '#a78bfa'],
            ['v2', 'pos', 'k2', 'nc', '#a78bfa'],
            ['k2', 'no', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r3', 'b', 'gnd1', 'gnd', '#475569'],
            ['v2', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l5s3'
        ),
        liveFormulas: [
          {
            id: 'f-sup-sum',
            title: '叠加验证方程',
            formula: 'I′(48 mA) + I″ = I_全(60 mA)',
            evaluate: (ctx) => {
              const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
              const k1z = numProp(ctx, 'k1', 'position', 0) === 1;
              const k2z = numProp(ctx, 'k2', 'position', 0) === 1;
              return {
                expression: k1z && !k2z ? `48.0 mA + ${fmtI(i3)}` : '请设置 V1 置零且 V2 接通',
                result: k1z && !k2z ? fmtI(0.048 + i3) : `当前 ${fmtI(i3)}`,
                status: k1z && !k2z && Math.abs(i3 - 0.012) < 0.002 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l5s3-k1',
            label: '左侧源开关 K1',
            targetId: 'k1',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接通 V1 (12V)', value: 0 },
              { label: '置零 V1 (接地)', value: 1 },
            ],
          },
          {
            id: 'qc-l5s3-k2',
            label: '右侧源开关 K2',
            targetId: 'k2',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接通 V2 (6V)', value: 0 },
              { label: '置零 V2 (接地)', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：SPDT 两路互补切换', type: 'SWITCH_SPDT', componentId: 'k1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '测得 I″ = 12.0 mA，完成叠加定理闭环验算',
          instruction: '将 K1 拨向“置零 V1”，同时恢复 K2 为“接通 V2”，实测 I3″ = 12.0 mA。',
          check: (ctx) => {
            const k1 = numProp(ctx, 'k1', 'position', 0);
            const k2 = numProp(ctx, 'k2', 'position', 0);
            const i3 = Math.abs(getTel(ctx, 'am3')?.current ?? 0);
            const ok = k1 === 1 && k2 === 0 && Math.abs(i3 - 0.012) < 0.002;
            return {
              passed: ok,
              message: ok ? `完美叠加：48.0mA + ${fmtI(i3)} = 60.0mA！` : `当前 I3 = ${fmtI(i3)}，请令 V1 置零且 V2 接通`,
            };
          },
          autoDemo: {
            buttonLabel: '一键切换：仅 V2 单独作用 (12mA)',
            description: '设 K1=1(V1置零), K2=0(V2接通) 测得 I″ = 12.0 mA',
            actions: [
              { kind: 'setProp', componentId: 'k1', key: 'position', value: 1 },
              { kind: 'setProp', componentId: 'k2', key: 'position', value: 0 },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 6 (Ch.2): 戴维南等效与最大功率传输定理
  // =========================================================================
  {
    id: 'ch2-thevenin-max-power',
    chapterId: 'ch2',
    lessonNumber: 6,
    title: '戴维南等效定理与最大功率传输',
    subtitle: '把任意复杂单口线性网络化简为 E_eq + R_eq，并求得负载何时汲取最大功率',
    textbookRef: '第2章 2.5–2.6 戴维南定理与最大功率传输',
    difficulty: '基础',
    durationMin: 12,
    prerequisites: ['ch2-bridge-and-source-models'],
    learningObjectives: [
      '掌握两步求戴维南等效参数：断开负载求开路电压 U_oc；置零独立源求入端内阻 R_eq',
      '直观对比复杂原网络与两元件戴维南等效网络的完全同态行为',
      '理解负载匹配原则 RL = Req 时功率取最大极值 P_max = U_oc² / (4·R_eq)',
    ],
    stages: [
      {
        id: 'l6-s1',
        stageNumber: 1,
        title: '第一步：端口开路测 U_oc 与入端等效内阻 R_eq',
        badge: 'Step 1 · 化简网络',
        conceptGoal: '将右侧负载开关 K_load 断开测量开路电位 U_oc = 6.00V，并算出端口内阻 Req = R1∥R2 = 50Ω。',
        explanation:
          '左半区 12V 源经 R1(100Ω) 和 R2(100Ω) 分压。当负载开关 K_load 断开时，电压表测出端口开路电压 U_oc = 6.00V；把 12V 电压源看作短路接地，从端口回看 R1 与 R2 恰好并联成 R_eq = 100∥100 = 50Ω。试闭合 K_load，端口电压立即受内阻分压拉低！',
        analogy: '就像未知黑盒插座：先拿高阻表空载量出它真实电动势 6V，再看它带重负载时掉压有多快就能反推出内部阻力 50Ω。',
        highlights: ['vm_oc', 'k_load'],
        newlyAddedIds: ['v1', 'r1', 'r2', 'vm_oc', 'k_load', 'rl'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 120, 270, 270, { voltage: 12 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 270, 150, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (100Ω)', 390, 270, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('vm_oc', 'VOLTMETER', 'PV 端口电压', 510, 270, 90, { mode: 'dc' }),
            mkComp('k_load', 'SWITCH_SPST', 'K_load', 610, 150, 0, { closed: false }),
            mkComp('rl', 'RESISTOR', 'RL (100Ω)', 710, 270, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 410, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#ef4444'],
            ['r1', 'b', 'r2', 'a', '#f59e0b'],
            ['r1', 'b', 'vm_oc', 'pos', '#a855f7'],
            ['r1', 'b', 'k_load', 'a', '#38bdf8'],
            ['k_load', 'b', 'rl', 'a', '#38bdf8'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r2', 'b', 'gnd1', 'gnd', '#475569'],
            ['vm_oc', 'neg', 'gnd1', 'gnd', '#64748b'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
          ],
          'l6s1'
        ),
        liveFormulas: [
          {
            id: 'f-thev-uoc',
            title: '戴维南参数提取',
            formula: 'U_oc = 12·R2/(R1+R2) = 6.00V ,  R_eq = R1∥R2 = 50Ω',
            evaluate: (ctx) => {
              const vp = Math.abs(getTel(ctx, 'vm_oc')?.voltageDrop ?? 0);
              const closed = boolProp(ctx, 'k_load', 'closed', false);
              return {
                expression: closed ? '带载 100Ω 后：U_out = 6×100/(50+100)' : '空载开路实测 U_oc',
                result: `端口压降 = ${fmtV(vp)}`,
                status: 'good',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l6s1-kl',
            label: '负载接通开关 K_load',
            targetId: 'k_load',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：分压电阻网络', type: 'RESISTOR', componentId: 'r2', stepIndex: 1 },
        ],
        checkpoint: {
          title: '闭合开关接通 100Ω 负载观察端口压降回落至 4.00V',
          instruction: '先确认开路电压为 6.00V，然后闭合 K_load，验证按 R_eq = 50Ω 分压后端口落为 4.00V。',
          check: (ctx) => {
            const vp = Math.abs(getTel(ctx, 'vm_oc')?.voltageDrop ?? 0);
            const closed = boolProp(ctx, 'k_load', 'closed', false);
            return {
              passed: closed && Math.abs(vp - 4.0) < 0.1,
              message:
                closed && Math.abs(vp - 4.0) < 0.1
                  ? `负载压降精确等于 4.00V (内阻 50Ω 分走 2.00V)！`
                  : `当前端口电压 ${fmtV(vp)}，请闭合 K_load`,
            };
          },
          autoDemo: {
            buttonLabel: '一键闭合 K_load 验证 U = 4.00V',
            description: '闭合负载开关使端口电压由 6V 降为 4.00V',
            actions: [{ kind: 'setProp', componentId: 'k_load', key: 'closed', value: true }],
          },
        },
      },

      {
        id: 'l6-s2',
        stageNumber: 2,
        title: '第二步：原分压网与戴维南简化电路同台比对',
        badge: 'Step 2 · 同构等价',
        conceptGoal: '一个复杂的电阻网络加在任意负载 RL 上，完全可以被 6V 串联 50Ω 两元件电路一比一替换。',
        explanation:
          '上方为原始三元件网络（12V + R1 + R2），下方为等效后仅需两个元件的戴维南模型（U_th = 6V 串联 R_eq = 50Ω）。不管接什么负载，PA_orig 与 PA_thev 读数始终分毫不差！',
        analogy: '就像把一个藏着多组水管与阀门的复杂大箱子，等效成“一根 6 米水塔加上一把 50 欧阻力阀门”极简模块。',
        highlights: ['v_th', 'r_eq', 'pa_orig', 'pa_thev'],
        newlyAddedIds: ['v_th', 'r_eq', 'pa_orig', 'pa_thev', 'rl_thev'],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            // Top original
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 120, 170, 270, { voltage: 12 }),
            mkComp('r1', 'RESISTOR', 'R1 (100Ω)', 270, 100, 0, { resistance: 100, maxPower: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (100Ω)', 390, 170, 90, { resistance: 100, maxPower: 2.0 }),
            mkComp('pa_orig', 'AMMETER', 'PA_原网络', 540, 100, 0, { mode: 'dc' }),
            mkComp('rl_orig', 'RESISTOR', 'RL1', 690, 170, 90, { resistance: 50, maxPower: 2.0 }),
            mkComp('gnd1', 'GROUND', 'GND1', 120, 250, 0),
            // Bottom Thevenin
            mkComp('v_th', 'DC_SOURCE', 'U_th (6V)', 120, 360, 270, { voltage: 6 }),
            mkComp('r_eq', 'RESISTOR', 'R_eq (50Ω)', 310, 300, 0, { resistance: 50, maxPower: 2.0 }),
            mkComp('pa_thev', 'AMMETER', 'PA_戴维南', 540, 300, 0, { mode: 'dc' }),
            mkComp('rl_thev', 'RESISTOR', 'RL2', 690, 360, 90, { resistance: 50, maxPower: 2.0 }),
            mkComp('gnd2', 'GROUND', 'GND2', 120, 440, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#ef4444'],
            ['r1', 'b', 'r2', 'a', '#f59e0b'],
            ['r1', 'b', 'pa_orig', 'pos', '#38bdf8'],
            ['pa_orig', 'neg', 'rl_orig', 'a', '#38bdf8'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r2', 'b', 'gnd1', 'gnd', '#475569'],
            ['rl_orig', 'b', 'gnd1', 'gnd', '#475569'],

            ['v_th', 'pos', 'r_eq', 'a', '#a78bfa'],
            ['r_eq', 'b', 'pa_thev', 'pos', '#34d399'],
            ['pa_thev', 'neg', 'rl_thev', 'a', '#34d399'],
            ['v_th', 'neg', 'gnd2', 'gnd', '#475569'],
            ['rl_thev', 'b', 'gnd2', 'gnd', '#475569'],
          ],
          'l6s2'
        ),
        liveFormulas: [
          {
            id: 'f-thev-cmp',
            title: '原网 vs 戴维南负载电流比较',
            formula: 'I_原 = I_Thev = U_th / (R_eq + R_L)',
            evaluate: (ctx) => {
              const i1 = Math.abs(getTel(ctx, 'pa_orig')?.current ?? 0);
              const i2 = Math.abs(getTel(ctx, 'pa_thev')?.current ?? 0);
              return {
                expression: `原网 ${fmtI(i1)} vs 等效 ${fmtI(i2)}`,
                result: Math.abs(i1 - i2) < 0.001 ? '精准全等!' : '请保持两端 RL1=RL2',
                status: Math.abs(i1 - i2) < 0.001 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l6s2-rl1',
            label: '原网络负载 RL1',
            targetId: 'rl_orig',
            propKey: 'resistance',
            kind: 'slider',
            min: 25,
            max: 200,
            step: 25,
            unit: 'Ω',
          },
          {
            id: 'qc-l6s2-rl2',
            label: '戴维南负载 RL2',
            targetId: 'rl_thev',
            propKey: 'resistance',
            kind: 'slider',
            min: 25,
            max: 200,
            step: 25,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：直流电源模型理解', type: 'DC_SOURCE', componentId: 'v_th', stepIndex: 1 },
        ],
        checkpoint: {
          title: '同步改用 100Ω 负载再次验证电流精准同值 (40 mA)',
          instruction: '把上方 RL1 与下方 RL2 都调成 100Ω，观察电流表同步落为 40.0 mA。',
          check: (ctx) => {
            const rl1 = numProp(ctx, 'rl_orig', 'resistance', 50);
            const rl2 = numProp(ctx, 'rl_thev', 'resistance', 50);
            const i1 = Math.abs(getTel(ctx, 'pa_orig')?.current ?? 0);
            const i2 = Math.abs(getTel(ctx, 'pa_thev')?.current ?? 0);
            const ok = rl1 >= 95 && rl2 >= 95 && Math.abs(i1 - i2) < 0.001;
            return {
              passed: ok,
              message: ok ? `等价性确认：${fmtI(i1)} === ${fmtI(i2)}` : `当前 I_原=${fmtI(i1)}, I_Thev=${fmtI(i2)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键同步设为 100Ω 测得 40mA',
            description: '将 RL1 与 RL2 均调到 100Ω 验证等效电流精确一致',
            actions: [
              { kind: 'setProp', componentId: 'rl_orig', key: 'resistance', value: 100 },
              { kind: 'setProp', componentId: 'rl_thev', key: 'resistance', value: 100 },
            ],
          },
        },
      },

      {
        id: 'l6-s3',
        stageNumber: 3,
        title: '最大功率传输定理：RL = R_eq 阻抗匹配',
        badge: 'Step 3 · 匹配极值',
        conceptGoal: '负载过小导致端压暴跌，负载过大导致电流太小；仅当 RL = R_eq 时汲取功率达峰值 P_max。',
        explanation:
          '在 6V / 50Ω 戴维南等效电源后调整负载电阻 RL（初始 150Ω 时功率仅 135 mW）。无论向上调大还是向下调小，只要偏离 50Ω 功率都会下滑；只有在阻抗匹配点 RL = R_eq = 50Ω，负载获得理论极限最大功率 P_max = 6²/(4×50) = 180.0 mW（此时传输效率恰为 50%）。',
        analogy: '就像骑变速自行车上坡：档位太轻脚踏飞快却用不上劲，档位太重完全踩不动，唯独阻力与人体发力内阻匹配时输出功率最大！',
        highlights: ['rl', 'r_eq'],
        newlyAddedIds: [],
        preferredAnalysisTab: 'telemetry',
        circuit: mkCircuit(
          [
            mkComp('v_th', 'DC_SOURCE', 'U_th (6V)', 140, 270, 270, { voltage: 6 }),
            mkComp('r_eq', 'RESISTOR', 'R_eq (50Ω)', 310, 150, 0, { resistance: 50, maxPower: 2.0 }),
            mkComp('pa1', 'AMMETER', 'PA1', 490, 150, 0, { mode: 'dc' }),
            mkComp('rl', 'RESISTOR', 'RL 可调负载', 620, 270, 90, { resistance: 150, maxPower: 2.0 }),
            mkComp('pv1', 'VOLTMETER', 'PV1 (UL)', 750, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 140, 410, 0),
          ],
          [
            ['v_th', 'pos', 'r_eq', 'a', '#ef4444'],
            ['r_eq', 'b', 'pa1', 'pos', '#f59e0b'],
            ['pa1', 'neg', 'rl', 'a', '#38bdf8'],
            ['rl', 'b', 'v_th', 'neg', '#475569'],
            ['v_th', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rl', 'a', 'pv1', 'pos', '#a855f7'],
            ['rl', 'b', 'pv1', 'neg', '#64748b'],
          ],
          'l6s3'
        ),
        liveFormulas: [
          {
            id: 'f-max-p',
            title: '实测功率 vs 理论最大极值',
            formula: 'P_L = I² · R_L ,  P_max = U_th² / (4·R_eq) = 180.0 mW',
            evaluate: (ctx) => {
              const p = Math.abs(getTel(ctx, 'rl')?.power ?? 0);
              const rl = numProp(ctx, 'rl', 'resistance', 150);
              return {
                expression: `RL = ${rl.toFixed(0)} Ω (内阻 R_eq = 50 Ω)`,
                result: `P_L = ${fmtP(p)} (${Math.round((p / 0.18) * 100)}% 极值)`,
                status: p >= 0.175 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l6s3-rl',
            label: '调节负载电阻 RL',
            targetId: 'rl',
            propKey: 'resistance',
            kind: 'slider',
            min: 10,
            max: 200,
            step: 10,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：功率计算 P = V²/R', type: 'RESISTOR', componentId: 'rl', stepIndex: 2 },
        ],
        checkpoint: {
          title: '搜寻阻抗匹配极值点 (RL = 50Ω → P ≥ 178mW)',
          instruction: '拖动 RL 寻找负载汲取功率峰值，调至 50Ω 实现 180.0 mW 最大功率输出。',
          check: (ctx) => {
            const p = Math.abs(getTel(ctx, 'rl')?.power ?? 0);
            const rl = numProp(ctx, 'rl', 'resistance', 150);
            return {
              passed: p >= 0.175 && Math.abs(rl - 50) <= 5,
              message:
                p >= 0.175 && Math.abs(rl - 50) <= 5
                  ? `命中匹配极大值点！RL=${rl}Ω 时 P_L = ${fmtP(p)}`
                  : `当前 RL=${rl}Ω，功率 ${fmtP(p)} < 175mW`,
            };
          },
          autoDemo: {
            buttonLabel: '一键阻抗匹配 RL = 50Ω (180mW)',
            description: '设置 RL = R_eq = 50Ω 命中最大功率传输点',
            actions: [{ kind: 'setProp', componentId: 'rl', key: 'resistance', value: 50 }],
          },
        },
      },
    ],
  },
];
