import {
  boolProp,
  fmtI,
  fmtP,
  fmtV,
  getTel,
  mkCircuit,
  mkComp,
  numProp,
} from './tutorialHelpers';
import type { TutorialLesson } from './tutorialTypes';

export const LESSONS_CH3_TO_CH6: TutorialLesson[] = [
  // =========================================================================
  // Lesson 7 (Ch.3): RC 一阶暂态与三要素法
  // =========================================================================
  {
    id: 'ch3-rc-transient',
    chapterId: 'ch3',
    lessonNumber: 7,
    title: 'RC 充放电暂态与三要素法',
    subtitle: '直观观测电容电压连续变化与电流指数衰减过程，掌握 τ = R·C 与全响应三要素公式',
    textbookRef: '第3章 3.1–3.4 一阶 RC 电路的零状态、零输入与全响应',
    difficulty: '进阶',
    durationMin: 15,
    prerequisites: ['ch1-kirchhoff-laws'],
    learningObjectives: [
      '理解换路定则：电容电压 u_C(0_+) = u_C(0_-) 不能跃变',
      '认识时间常数 τ = R·C：经过 1τ 达到终值约 63.2%，经过 3τ~5τ 进入稳态',
      '统一应用三要素法 f(t) = f(∞) + [f(0_+) - f(∞)]·e^(-t/τ)',
    ],
    stages: [
      {
        id: 'l7-s1',
        stageNumber: 1,
        title: '零状态充电响应：Vc 从 0 指数上升，Ic 指数衰减',
        badge: 'Step 1 · 零状态充电',
        conceptGoal: '初始无储能电容接入 10V 直流源后，经过一个时间常数 τ = R·C = 0.20s，端压充到 6.32V。',
        explanation:
          'SPDT 开关 K1 当前打在地面位（NO），电容处于 0V 完全放电状态。把 K1 切换到“充电 (+10V)”（NC）后，因为初始压差最大，瞬间出现 I(0_+)=10mA 充电电流；随着 Vc 升高，压差缩小，电流按 i(t)=10·e^(-t/0.2) mA 衰减，而 Vc(t)=10(1-e^(-t/0.2)) V 单调升至 10V。',
        analogy: '向一只空弹性蓄水囊灌水：一开始囊内毫无背压水流最快；囊越胀满水压顶着进水口越紧，水流便越慢。',
        highlights: ['k1', 'c1', 'vm_c', 'am_c'],
        newlyAddedIds: ['v1', 'k1', 'r1', 'c1', 'vm_c', 'am_c'],
        defaultTimeScale: 0.4,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_c', 'am_c'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (10V)', 110, 260, 270, { voltage: 10 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 充/放切', 240, 150, 0, { position: 1 }),
            mkComp('r1', 'RESISTOR', 'R1 (1kΩ)', 380, 150, 0, { resistance: 1000, maxPower: 1.0 }),
            mkComp('am_c', 'AMMETER', 'PA_C 电流', 530, 150, 0, { mode: 'dc' }),
            mkComp('c1', 'CAPACITOR', 'C1 (200µF)', 580, 280, 90, { capacitance: 200 }),
            mkComp('vm_c', 'VOLTMETER', 'PV_C (Vc)', 710, 280, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 410, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'nc', '#ef4444'],
            ['k1', 'no', 'gnd1', 'gnd', '#475569'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am_c', 'pos', '#38bdf8'],
            ['am_c', 'neg', 'c1', 'pos', '#38bdf8'],
            ['c1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['c1', 'pos', 'vm_c', 'pos', '#a855f7'],
            ['c1', 'neg', 'vm_c', 'neg', '#64748b'],
          ],
          'l7s1'
        ),
        liveFormulas: [
          {
            id: 'f-rc-tau',
            title: '时间常数 τ 与充电进度',
            formula: 'τ = R · C ,  u_C(Δt) = E + (u_C(0_+) - E)·e^(-Δt/τ)',
            evaluate: (ctx) => {
              const r = numProp(ctx, 'r1', 'resistance', 1000);
              const cUf = numProp(ctx, 'c1', 'capacitance', 200);
              const tau = r * cUf * 1e-6;
              const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 0;
              const v0 = ctx.initialCapVoltages?.['c1'] ?? vc;
              const timingText = ctx.hasSwitched
                ? `本次充电已进行 Δt=${(ctx.elapsedSinceSwitch ?? 0).toFixed(2)}s · 初值 ${fmtV(v0)}`
                : `待切换 K1 开始计时 (总耗时 t=${ctx.simTime.toFixed(2)}s)`;
              return {
                expression: `τ = ${tau.toFixed(2)} s · ${timingText}`,
                result: `Vc = ${fmtV(vc)}`,
                status: vc >= 6.3 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l7s1-k1',
            label: '充/放切换开关 K1',
            targetId: 'k1',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接入 +10V 充电', value: 0 },
              { label: '接地排空 (0V)', value: 1 },
            ],
          },
          {
            id: 'qc-l7s1-c1',
            label: '电容容量 C1',
            targetId: 'c1',
            propKey: 'capacitance',
            kind: 'slider',
            min: 50,
            max: 400,
            step: 50,
            unit: 'µF',
          },
        ],
        ponderLinks: [
          { label: '思索：电容如何隔直储荷', type: 'CAPACITOR', componentId: 'c1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '切至充电档，使电容充电超过 1τ（Vc ≥ 6.3V）',
          instruction: '将 K1 拨到“接入 +10V 充电”，在下方示波器观察指数充电曲线直到 Vc ≥ 6.3V。',
          check: (ctx) => {
            const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 0;
            return {
              passed: vc >= 6.3,
              message: vc >= 6.3 ? `已跨越 1τ 阈值：Vc = ${fmtV(vc)}` : `当前 Vc = ${fmtV(vc)} < 6.30V`,
            };
          },
          autoDemo: {
            buttonLabel: '一键合向 +10V 充电演示',
            description: '将 K1 切入 10V 充电端并推进暂态充电过程越过 6.3V',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'position', value: 0 }],
          },
        },
      },

      {
        id: 'l7-s2',
        stageNumber: 2,
        title: '零输入放电：Vc 保持不变前提下电流反向流出',
        badge: 'Step 2 · 零输入放电',
        conceptGoal: '充满 10V 的电容断开电源经电阻接地，电压指数跌落、电荷反向流出产生负电流。',
        explanation:
          '系统预先已把 200µF 电容充饱至 10.0V。当你把 K1 拨向“接地放电”（NO）瞬间，电容充当临时电源将正极电荷推向 R1，故 PA_C 电流立即跳变为 -10.0mA 并随电量释放指数衰减，经过 1τ 电压下降到 36.8%（3.68V）。',
        analogy: '就像撤掉水泵直接拔开蓄水囊接口让其自行排水：水位连续降低，而出水管水流立即朝相反方向流出。',
        highlights: ['c1', 'r1', 'am_c'],
        newlyAddedIds: [],
        defaultTimeScale: 0.4,
        prewarmSeconds: 1.2,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_c', 'am_c'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (10V)', 110, 260, 270, { voltage: 10 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 充/放切', 240, 150, 0, { position: 0 }),
            mkComp('r1', 'RESISTOR', 'R1 (1kΩ)', 380, 150, 0, { resistance: 1000, maxPower: 1.0 }),
            mkComp('am_c', 'AMMETER', 'PA_C 电流', 530, 150, 0, { mode: 'dc' }),
            mkComp('c1', 'CAPACITOR', 'C1 (200µF)', 580, 280, 90, { capacitance: 200 }),
            mkComp('vm_c', 'VOLTMETER', 'PV_C (Vc)', 710, 280, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 410, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'nc', '#ef4444'],
            ['k1', 'no', 'gnd1', 'gnd', '#475569'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am_c', 'pos', '#38bdf8'],
            ['am_c', 'neg', 'c1', 'pos', '#38bdf8'],
            ['c1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['c1', 'pos', 'vm_c', 'pos', '#a855f7'],
            ['c1', 'neg', 'vm_c', 'neg', '#64748b'],
          ],
          'l7s2'
        ),
        liveFormulas: [
          {
            id: 'f-rc-dis',
            title: '零输入放电方程',
            formula: 'u_C(Δt) = U_0·e^(-Δt/τ) ,  i_C(Δt) = -(U_0/R)·e^(-Δt/τ)',
            evaluate: (ctx) => {
              const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 0;
              const ic = getTel(ctx, 'am_c')?.current ?? 0;
              const u0 = ctx.initialCapVoltages?.['c1'] ?? vc;
              const timingText = ctx.hasSwitched
                ? `本次放电 Δt=${(ctx.elapsedSinceSwitch ?? 0).toFixed(2)}s · U_0=${fmtV(u0)}`
                : '待切至接地开始放电计时';
              const signText =
                ic < -1e-4 ? '负(向外放电)' : Math.abs(ic) < 1e-4 ? '稳态零流' : '正(充电中)';
              return {
                expression: `${timingText} · ${signText}`,
                result: `Vc = ${fmtV(vc)} · Ic = ${fmtI(ic)}`,
                status: vc <= 3.7 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l7s2-k1',
            label: '切至放电接地',
            targetId: 'k1',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '接入 +10V (已充饱)', value: 0 },
              { label: '接地放电 (零输入)', value: 1 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：放电负电流物理意义', type: 'CAPACITOR', componentId: 'c1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '触发零输入放电至残余电压 ≤ 3.7V',
          instruction: '将 K1 拨到“接地放电 (零输入)”，待 Vc 降落至 3.7V 以下（1τ 之后）。',
          check: (ctx) => {
            const k1 = numProp(ctx, 'k1', 'position', 0);
            const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 10;
            return {
              passed: k1 === 1 && vc <= 3.7,
              message: k1 === 1 && vc <= 3.7 ? `零输入衰减达标：Vc = ${fmtV(vc)}` : `当前 Vc = ${fmtV(vc)}，请切至接地放电`,
            };
          },
          autoDemo: {
            buttonLabel: '一键切换接地零输入放电',
            description: '拨动 K1=1 断开外源直接经 1kΩ 放电直到 Vc ≤ 3.7V',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'position', value: 1 }],
          },
        },
      },

      {
        id: 'l7-s3',
        stageNumber: 3,
        title: '全响应三要素法：非零初值跃迁至新稳态',
        badge: 'Step 3 · 三要素法',
        conceptGoal: 'u_C(0_+) = 2V 切换向新稳态 u_C(∞) = 10V，完整代入三要素通用公式。',
        explanation:
          '工程实际开关切换往往是两个非零电压之间跃迁。现在电容预先停留在 V_low = 2.0V 稳态；一旦 K1 拨至 V_high = 10.0V，按三要素公式 u_C(t) = 10 + (2 - 10)e^(-t/τ)，电容从 2V 出发平滑攀升到 10V，减小容量 C1 可直接加快跃迁速度！',
        analogy: '就像在电梯里从 2 楼起跳坐向 10 楼：不用先回 0 楼清零，直接以 8 层落差作指数平滑爬升。',
        highlights: ['v_low', 'v_high', 'c1'],
        newlyAddedIds: ['v_low', 'v_high'],
        defaultTimeScale: 0.4,
        prewarmSeconds: 1.2,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_c', 'am_c'],
        circuit: mkCircuit(
          [
            mkComp('v_low', 'DC_SOURCE', 'V_low (2V)', 110, 170, 270, { voltage: 2 }),
            mkComp('v_high', 'DC_SOURCE', 'V_high (10V)', 110, 320, 270, { voltage: 10 }),
            mkComp('k1', 'SWITCH_SPDT', 'K1 阶跃切换', 240, 150, 0, { position: 0 }),
            mkComp('r1', 'RESISTOR', 'R1 (1kΩ)', 380, 150, 0, { resistance: 1000, maxPower: 1.0 }),
            mkComp('am_c', 'AMMETER', 'PA_C', 530, 150, 0, { mode: 'dc' }),
            mkComp('c1', 'CAPACITOR', 'C1', 580, 280, 90, { capacitance: 200 }),
            mkComp('vm_c', 'VOLTMETER', 'PV_C', 710, 280, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 420, 0),
          ],
          [
            ['v_low', 'pos', 'k1', 'nc', '#38bdf8'],
            ['v_high', 'pos', 'k1', 'no', '#ef4444'],
            ['k1', 'com', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am_c', 'pos', '#38bdf8'],
            ['am_c', 'neg', 'c1', 'pos', '#38bdf8'],
            ['c1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v_low', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v_high', 'neg', 'gnd1', 'gnd', '#475569'],
            ['c1', 'pos', 'vm_c', 'pos', '#a855f7'],
            ['c1', 'neg', 'vm_c', 'neg', '#64748b'],
          ],
          'l7s3'
        ),
        liveFormulas: [
          {
            id: 'f-3elem',
            title: '全响应三要素公式',
            formula: 'f(Δt) = f(∞) + [f(0_+) - f(∞)]·e^(-Δt/τ) ,  τ = R1·C1',
            evaluate: (ctx) => {
              const r = numProp(ctx, 'r1', 'resistance', 1000);
              const cUf = numProp(ctx, 'c1', 'capacitance', 200);
              const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 0;
              const u0 = ctx.initialCapVoltages?.['c1'] ?? vc;
              const timingText = ctx.hasSwitched
                ? `本次换路 Δt=${(ctx.elapsedSinceSwitch ?? 0).toFixed(2)}s · u_C(0_+)=${fmtV(u0)}`
                : '待拨动 K1 切入 10V 阶跃';
              return {
                expression: `τ = ${(r * cUf * 1e-6).toFixed(2)}s · ${timingText}`,
                result: `Vc = ${fmtV(vc)}`,
                status: vc >= 9.2 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l7s3-k1',
            label: '电源阶跃切换 K1',
            targetId: 'k1',
            propKey: 'position',
            kind: 'spdt-toggle',
            options: [
              { label: '稳态基准 2V', value: 0 },
              { label: '阶跃升至 10V', value: 1 },
            ],
          },
          {
            id: 'qc-l7s3-c1',
            label: '调整容量 C1',
            targetId: 'c1',
            propKey: 'capacitance',
            kind: 'slider',
            min: 50,
            max: 400,
            step: 50,
            unit: 'µF',
          },
        ],
        ponderLinks: [
          { label: '思索：电压不能跃变物理本质', type: 'CAPACITOR', componentId: 'c1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '加速时间常数 (C1 ≤ 100µF) 并完成 2V → 10V 全响应',
          instruction: '将 C1 设为 ≤ 100 µF 缩短 τ，然后切至 10V，等待电容接近新稳态（Vc ≥ 9.2V）。',
          check: (ctx) => {
            const k1 = numProp(ctx, 'k1', 'position', 0);
            const c = numProp(ctx, 'c1', 'capacitance', 200);
            const vc = getTel(ctx, 'vm_c')?.voltageDrop ?? 0;
            const ok = k1 === 1 && c <= 105 && vc >= 9.2;
            return {
              passed: ok,
              message: ok ? `三要素跃迁达稳态：Vc = ${fmtV(vc)}` : `当前 C1=${c}µF, Vc=${fmtV(vc)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键设 C1=100µF 并跃迁至 10V',
            description: '将 C1 改为 100µF 并将 K1 切入 10V 快速到达 9.2V 以上',
            actions: [
              { kind: 'setProp', componentId: 'c1', key: 'capacitance', value: 100 },
              { kind: 'setProp', componentId: 'k1', key: 'position', value: 1 },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 8 (Ch.3): RL 暂态、感应反电势冲击与续流二极管保护
  // =========================================================================
  {
    id: 'ch3-rl-transient-freewheel',
    chapterId: 'ch3',
    lessonNumber: 8,
    title: 'RL 磁能暂态与续流二极管保护',
    subtitle: '掌握电感电流连续性 τ = L/R、感性开关拉弧击穿原因以及并联续流二极管的钳位保护',
    textbookRef: '第3章 3.5 一阶 RL 电路暂态及电感断路过压防护',
    difficulty: '进阶',
    durationMin: 15,
    prerequisites: ['ch3-rc-transient'],
    learningObjectives: [
      '理解换路对偶：电感电流 i_L(0_+) = i_L(0_-) 不能跃变，时间常数 τ = L / R',
      '认识突然切断载流电感电流时极高的 di/dt 会产生剧烈反向感应高压 u_L = L·di/dt',
      '掌握工业常用防护电路：给电感/继电器线圈反向并联续流二极管',
    ],
    stages: [
      {
        id: 'l8-s1',
        stageNumber: 1,
        title: 'RL 合闸通电：电流从 0 爬升，电感两端电压逐渐归零',
        badge: 'Step 1 · RL 通电',
        conceptGoal: '与电容相反，电感在合闸初瞬如同断路承受全额 12V 压差，稳态后沦为近乎零压降短路。',
        explanation:
          '当开关 K1 闭合瞬时，电感 L1 内部电流原本是 0 且绝不允许瞬间跳变，因此感应出全额反向压差 u_L ≈ 12V；随后电流按 τ = L/R = 0.5H/20Ω = 25ms 逐步爬升至稳态 0.60A，此时 di/dt → 0，L1 端压回落接近 0V。',
        analogy: '推一只沉重的铁制大飞轮：刚一推时反抗阻力最大、速度从 0 缓缓加快；转速稳态后惯性不再抗拒，轻松匀速运转。',
        highlights: ['l1', 'am_l', 'vm_l'],
        newlyAddedIds: ['v1', 'k1', 'r_coil', 'l1', 'am_l', 'vm_l'],
        defaultTimeScale: 0.1,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['am_l', 'vm_l'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 120, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPST', 'K1 合闸', 260, 150, 0, { closed: false }),
            mkComp('am_l', 'AMMETER', 'PA_L (iL)', 410, 150, 0, { mode: 'dc' }),
            mkComp('r_coil', 'RESISTOR', 'R_coil (20Ω)', 560, 150, 0, { resistance: 20, maxPower: 20 }),
            mkComp('l1', 'INDUCTOR', 'L1 (500mH)', 640, 280, 90, { inductance: 500 }),
            mkComp('vm_l', 'VOLTMETER', 'PV_L (uL)', 770, 280, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 410, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'a', '#ef4444'],
            ['k1', 'b', 'am_l', 'pos', '#f59e0b'],
            ['am_l', 'neg', 'r_coil', 'a', '#38bdf8'],
            ['r_coil', 'b', 'l1', 'a', '#38bdf8'],
            ['l1', 'b', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['l1', 'a', 'vm_l', 'pos', '#a855f7'],
            ['l1', 'b', 'vm_l', 'neg', '#64748b'],
          ],
          'l8s1'
        ),
        liveFormulas: [
          {
            id: 'f-rl-charge',
            title: 'RL 阶跃时间常数与稳态值',
            formula: 'τ = L / R = 25 ms ,  I_稳态 = 12V / 20Ω = 0.60 A',
            evaluate: (ctx) => {
              const il = Math.abs(getTel(ctx, 'am_l')?.current ?? 0);
              const ul = Math.abs(getTel(ctx, 'vm_l')?.voltageDrop ?? 0);
              const i0 = Math.abs(ctx.initialIndCurrents?.['l1'] ?? 0);
              const timingText = ctx.hasSwitched
                ? `本次通电 Δt=${((ctx.elapsedSinceSwitch ?? 0) * 1000).toFixed(1)}ms · i_L(0_+)=${fmtI(i0)}`
                : '待闭合 K1 启动 RL 通电计时';
              return {
                expression: `${timingText} · 感应端压 |u_L| = ${fmtV(ul)}`,
                result: `i_L = ${fmtI(il)}`,
                status: il >= 0.55 && ul < 0.5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l8s1-k1',
            label: '闭合通电开关 K1',
            targetId: 'k1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：电感磁飞轮惯性', type: 'INDUCTOR', componentId: 'l1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '合闸激发磁通并观测电流渐升至稳态 (≥ 0.55 A)',
          instruction: '闭合开关 K1，观察示波器上电感电流升向 0.60A 的同时感应端压落回 0.5V 以下。',
          check: (ctx) => {
            const il = Math.abs(getTel(ctx, 'am_l')?.current ?? 0);
            const ul = Math.abs(getTel(ctx, 'vm_l')?.voltageDrop ?? 0);
            return {
              passed: il >= 0.55 && ul < 0.5,
              message:
                il >= 0.55 && ul < 0.5
                  ? `直流稳态成立：i_L = ${fmtI(il)}, u_L = ${fmtV(ul)}`
                  : `当前 i_L=${fmtI(il)}, |u_L|=${fmtV(ul)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键合闸 K1 进入 RL 稳态',
            description: '闭合 K1 将电感激励至 0.60A 稳态',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'closed', value: true }],
          },
        },
      },

      {
        id: 'l8-s2',
        stageNumber: 2,
        title: '高危实验：无保护断开电感，反电动势脉冲烧毁邻近器件',
        badge: 'Step 2 · 拉弧危害',
        conceptGoal: '0.60A 载流线圈被强行断闸后，电感翻转极性产生极高负压尖峰，反向冲穿敏感保护分支的熔丝！',
        explanation:
          '线圈已稳定承载 0.60A 电流（此时监测分支中的二极管 D_sense 处于反偏截止，0.20A 精密保护熔丝 F_victim 安然无恙）。一旦断开 K1，电感磁通剧烈崩塌激起巨大负电动势把节点 SW 拽向深负电位，高压迫使涌流冲过检测支路直接烧断 F_victim！',
        analogy: '高速旋转的重飞轮突然遭遇铁闸死锁切断主路，巨大惯性冲量会把旁边脆弱的密封阀门冲爆！',
        highlights: ['k1', 'f_victim', 'vm_sw'],
        newlyAddedIds: ['d_sense', 'f_victim', 'r_victim', 'vm_sw'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.25,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_sw'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 100, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPST', 'K1 断开测试', 230, 140, 0, { closed: true }),
            mkComp('r_coil', 'RESISTOR', 'R_coil (20Ω)', 370, 210, 90, { resistance: 20, maxPower: 20 }),
            mkComp('l1', 'INDUCTOR', 'L1 (500mH)', 370, 330, 90, { inductance: 500 }),
            mkComp('r_victim', 'RESISTOR', 'R_监测 (30Ω)', 530, 200, 90, { resistance: 30, maxPower: 50 }),
            mkComp('f_victim', 'FUSE', 'F_victim (0.2A)', 530, 290, 90, { tripCurrent: 0.2, blown: false }),
            mkComp('d_sense', 'DIODE', 'D_感测', 530, 370, 270),
            mkComp('vm_sw', 'VOLTMETER', 'PV_SW 节点压', 680, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 100, 430, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'a', '#ef4444'],
            ['k1', 'b', 'r_coil', 'a', '#f59e0b'],
            ['r_coil', 'b', 'l1', 'a', '#38bdf8'],
            ['l1', 'b', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],

            ['k1', 'b', 'r_victim', 'a', '#fb7185'],
            ['r_victim', 'b', 'f_victim', 'p2', '#fb7185'],
            ['f_victim', 'p1', 'd_sense', 'cathode', '#fb7185'],
            ['d_sense', 'anode', 'gnd1', 'gnd', '#475569'],

            ['k1', 'b', 'vm_sw', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_sw', 'neg', '#64748b'],
          ],
          'l8s2'
        ),
        liveFormulas: [
          {
            id: 'f-kickback',
            title: '反电动势冲击与受损监测',
            formula: 'u_L = L·(di/dt) < 0 ,  反向冲击击穿监测熔丝',
            evaluate: (ctx) => {
              const blown = boolProp(ctx, 'f_victim', 'blown', false);
              const vsw = getTel(ctx, 'vm_sw')?.voltageDrop ?? 0;
              return {
                expression: `节点 SW 电压 = ${fmtV(vsw)}`,
                result: blown ? '警告：F_victim 已被反电动势冲断!' : '闭合通流待测 (0.60A)',
                status: blown ? 'warn' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l8s2-k1',
            label: '切断开关 K1 (观察冲击)',
            targetId: 'k1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：楞次反向反电动势', type: 'INDUCTOR', componentId: 'l1', stepIndex: 2 },
          { label: '思索：敏感元件过流熔断', type: 'FUSE', componentId: 'f_victim', stepIndex: 1 },
        ],
        checkpoint: {
          title: '断开 K1 亲眼见证感性反电动势冲断 F_victim',
          instruction: '点击开关将 K1 断开（OFF），感性反冲将瞬间击断监测分支的 0.2A 熔丝。',
          check: (ctx) => {
            const k1Closed = boolProp(ctx, 'k1', 'closed', true);
            const blown = boolProp(ctx, 'f_victim', 'blown', false);
            return {
              passed: !k1Closed && blown,
              message: !k1Closed && blown ? '已证实危害：无保护分闸时反电动势击断了后级熔丝！' : '请先断开 K1 测试感性拉弧冲击',
            };
          },
          autoDemo: {
            buttonLabel: '一键拉开 K1 验证反电势破坏力',
            description: '切断 0.6A 载流电感观察反电动势冲击导致 F_victim 熔断',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'closed', value: false }],
          },
        },
      },

      {
        id: 'l8-s3',
        stageNumber: 3,
        title: '工程标准解：反向并联续流二极管 D_fly 安全钳位',
        badge: 'Step 3 · 续流保护',
        conceptGoal: '并联专用低阻续流二极管 D_fly，把断闸时的过压尖峰温和钳位在 -0.7V 并释放全部磁能。',
        explanation:
          '现在我们紧贴线圈反向并入了低阻续流二极管 D_fly（阳极接地，阴极接 SW）。正常工作时它反偏隐身；当 K1 拉开瞬间，D_fly 在 -0.7V 率先导通接管全部 0.60A 衰减电流形成自闭合环流泄能，从而让 SW 电压锁死安全、监测熔丝 F_victim 毫发无损！',
        analogy: '为高惯性飞轮加装一套单向旁通泄荷循环阀：主阀一关，飞轮动能立即通过单向回路温和泄放空转，不再猛撞脆弱门锁。',
        highlights: ['d_fly', 'f_victim'],
        newlyAddedIds: ['d_fly'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.25,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_sw'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (12V)', 100, 270, 270, { voltage: 12 }),
            mkComp('k1', 'SWITCH_SPST', 'K1 安全断闸', 230, 140, 0, { closed: true }),
            mkComp('r_coil', 'RESISTOR', 'R_coil (20Ω)', 350, 210, 90, { resistance: 20, maxPower: 20 }),
            mkComp('l1', 'INDUCTOR', 'L1 (500mH)', 350, 330, 90, { inductance: 500 }),
            mkComp('d_fly', 'DIODE', 'D_fly 续流保护', 450, 270, 270),
            mkComp('r_victim', 'RESISTOR', 'R_监测 (30Ω)', 560, 200, 90, { resistance: 30, maxPower: 50 }),
            mkComp('f_victim', 'FUSE', 'F_victim (0.2A)', 560, 290, 90, { tripCurrent: 0.2, blown: false }),
            mkComp('d_sense', 'DIODE', 'D_感测', 560, 370, 270),
            mkComp('vm_sw', 'VOLTMETER', 'PV_SW 钳位压', 700, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 100, 430, 0),
          ],
          [
            ['v1', 'pos', 'k1', 'a', '#ef4444'],
            ['k1', 'b', 'r_coil', 'a', '#f59e0b'],
            ['r_coil', 'b', 'l1', 'a', '#38bdf8'],
            ['l1', 'b', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],

            ['d_fly', 'cathode', 'k1', 'b', '#10b981'],
            ['d_fly', 'anode', 'gnd1', 'gnd', '#10b981'],

            ['k1', 'b', 'r_victim', 'a', '#fb7185'],
            ['r_victim', 'b', 'f_victim', 'p2', '#fb7185'],
            ['f_victim', 'p1', 'd_sense', 'cathode', '#fb7185'],
            ['d_sense', 'anode', 'gnd1', 'gnd', '#475569'],

            ['k1', 'b', 'vm_sw', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_sw', 'neg', '#64748b'],
          ],
          'l8s3'
        ),
        liveFormulas: [
          {
            id: 'f-flywheel-ok',
            title: '续流保护钳位效果',
            formula: 'V_SW ≥ -0.7 V（能量由 D_fly + R_coil 耗散）',
            evaluate: (ctx) => {
              const k1Closed = boolProp(ctx, 'k1', 'closed', true);
              const blown = boolProp(ctx, 'f_victim', 'blown', false);
              const vsw = getTel(ctx, 'vm_sw')?.voltageDrop ?? 0;
              return {
                expression: `SW 端实测压降 = ${fmtV(vsw)}`,
                result: k1Closed ? '通电励磁中' : blown ? '保护失败' : '安全断开 · F_victim 完好无损!',
                status: !k1Closed && !blown ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l8s3-k1',
            label: '安全断开开关 K1',
            targetId: 'k1',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：PN 结单向钳位续流', type: 'DIODE', componentId: 'd_fly', stepIndex: 1 },
        ],
        checkpoint: {
          title: '带 D_fly 保护再次断闸，确保熔丝彻底无损',
          instruction: '点击将 K1 断开，验证由于 D_fly 及时接管续流通道，F_victim 始终完好不断！',
          check: (ctx) => {
            const k1Closed = boolProp(ctx, 'k1', 'closed', true);
            const blown = boolProp(ctx, 'f_victim', 'blown', false);
            return {
              passed: !k1Closed && !blown,
              message: !k1Closed && !blown ? '续流保护大获成功！断闸零冲击、F_victim 完好！' : '请将 K1 断开验证续流效果',
            };
          },
          autoDemo: {
            buttonLabel: '一键带续流断闸验证无损保护',
            description: '断开 K1 观察 D_fly 接管线圈磁能且 F_victim 保持完好',
            actions: [{ kind: 'setProp', componentId: 'k1', key: 'closed', value: false }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 9 (Ch.4): 正弦有效值、容抗/感抗频率特性与 50Hz RLC 串联谐振
  // =========================================================================
  {
    id: 'ch4-ac-phasor-rlc-resonance',
    chapterId: 'ch4',
    lessonNumber: 9,
    title: '正弦交流有效值、电抗与 RLC 串联谐振',
    subtitle: '理解 220V~ 有效值、感抗与容抗随频率的相反演化规律，以及谐振过压现象',
    textbookRef: '第4章 4.1–4.5 正弦稳态与 RLC 串联谐振',
    difficulty: '进阶',
    durationMin: 15,
    prerequisites: ['ch1-ohm-and-power', 'ch3-rc-transient'],
    learningObjectives: [
      '明确市电 220V 有效值对应峰值 Um = 220·√2 ≈ 311.13 V',
      '掌握感抗 X_L = 2πfL 随频率正比增大、容抗 X_C = 1/(2πfC) 随频率反比减小的规律',
      '验算 RLC 谐振点 f0 = 1/(2π√LC) 处 Z = R（纯阻性，cosφ = 1）与 Q 倍高电压',
    ],
    stages: [
      {
        id: 'l9-s1',
        stageNumber: 1,
        title: '正弦交流三要素与 220V 有效值',
        badge: 'Step 1 · 有效值',
        conceptGoal: '交流源峰值设定 311.13V 时，与它热效应等效的直流值即有效值 U = Um/√2 = 220.0 V~。',
        explanation:
          '已开启 20× 慢放时间轴方便你从示波器看清 50Hz 正弦振荡，且仪表已设为“交流有效值 (AC~)”挡与下方的“交流有效值与功率因数”分析表。220V~ 供电 220Ω 纯电阻时，电流 I = 1.00 A~、有功功率 P = 220 W、功率因数 cosφ = 1.00。',
        analogy: '峰值好比夏天的最高气温 311 度（换算比喻），而有效值好比它真正持续烧水干活的平均恒定效力 220V。',
        highlights: ['ac1', 'vm1', 'am1'],
        newlyAddedIds: ['ac1', 'vm1', 'am1'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vm1', 'am1'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', 'AC1 (220V~)', 140, 260, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('am1', 'AMMETER', 'PA1 (AC~)', 330, 150, 0, { mode: 'rms' }),
            mkComp('r1', 'RESISTOR', 'R1 负载', 520, 260, 90, { resistance: 220, maxPower: 1000 }),
            mkComp('vm1', 'VOLTMETER', 'PV1 (AC~)', 660, 260, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 140, 400, 0),
          ],
          [
            ['ac1', 'pos', 'am1', 'pos', '#ef4444'],
            ['am1', 'neg', 'r1', 'a', '#38bdf8'],
            ['r1', 'b', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r1', 'a', 'vm1', 'pos', '#a855f7'],
            ['r1', 'b', 'vm1', 'neg', '#64748b'],
          ],
          'l9s1'
        ),
        liveFormulas: [
          {
            id: 'f-ac-rms',
            title: '有效值与纯阻有功功率',
            formula: 'U_rms = Um / √2 ≈ 220 V~ ,  P = U_rms · I_rms · cosφ',
            evaluate: (ctx) => {
              const vRms = getTel(ctx, 'vm1')?.vRms ?? 0;
              const iRms = getTel(ctx, 'am1')?.iRms ?? 0;
              const p = getTel(ctx, 'r1')?.avgPower ?? 0;
              return {
                expression: `V~ = ${vRms.toFixed(1)}V, I~ = ${fmtI(iRms)}`,
                result: `P = ${fmtP(p)}`,
                status: iRms >= 1.85 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l9s1-r1',
            label: '负载电阻 R1',
            targetId: 'r1',
            propKey: 'resistance',
            kind: 'slider',
            min: 55,
            max: 440,
            step: 55,
            unit: 'Ω',
          },
        ],
        ponderLinks: [
          { label: '思索：旋转相量与正弦有效值', type: 'AC_SOURCE', componentId: 'ac1', stepIndex: 0 },
        ],
        checkpoint: {
          title: '将纯阻负载减半到 110Ω（电流倍增至 ~2.0 A~）',
          instruction: '调小 R1 至 110 Ω，观察“交流有效值表”中电流翻倍为 2.00 A~、功率翻倍至 440 W 且 cosφ 仍维持 1.00。',
          check: (ctx) => {
            const iRms = getTel(ctx, 'am1')?.iRms ?? 0;
            const pf = getTel(ctx, 'ac1')?.powerFactor ?? 0;
            return {
              passed: iRms >= 1.85 && pf >= 0.98,
              message:
                iRms >= 1.85 && pf >= 0.98
                  ? `有效值关系校验通过：I~ = ${fmtI(iRms)}, cosφ = ${pf.toFixed(2)}`
                  : `当前 I~ = ${fmtI(iRms)}, cosφ = ${pf.toFixed(2)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键切换 R1 = 110Ω 观察 2.0A~',
            description: '设置 R1 = 110Ω 使电流有效值翻倍至 2.00A~',
            actions: [{ kind: 'setProp', componentId: 'r1', key: 'resistance', value: 110 }],
          },
        },
      },

      {
        id: 'l9-s2',
        stageNumber: 2,
        title: '频率试金石：感抗 X_L 随 f 增大，容抗 X_C 随 f 减小',
        badge: 'Step 2 · 感抗 vs 容抗',
        conceptGoal: '低频 25Hz 时电感支路电流远大于电容支路；升到高频 100Hz 时局面彻底逆转！',
        explanation:
          '同一 10V~ 电源下并联着 100mH 电感支路与 100µF 电容支路。25Hz 下感抗仅 X_L≈15.7Ω（通流 ~0.64A~），而容抗高达 X_C≈63.7Ω（仅 ~0.16A~）。把电源频率拧向 100Hz，感抗涨至四倍、容抗缩为四分之一，高频彻底青睐电容通路！',
        analogy: '电感像“慢条斯理的重水车”讨厌快速变向（高频受阻）；电容像“频繁拍手的弹力膜”越快换向吞吐量越大（通高频）。',
        highlights: ['ac1', 'am_l', 'am_c'],
        newlyAddedIds: ['l1', 'c1', 'am_l', 'am_c'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.12,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['am_l', 'am_c'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', 'AC1 (10V~)', 130, 270, 270, {
              amplitude: 14.142,
              frequency: 25,
              phase: 0,
            }),
            mkComp('am_l', 'AMMETER', 'PA_L (电感流)', 340, 200, 90, { mode: 'rms' }),
            mkComp('l1', 'INDUCTOR', 'L1 (100mH)', 340, 330, 90, { inductance: 100 }),
            mkComp('am_c', 'AMMETER', 'PA_C (电容流)', 560, 170, 90, { mode: 'rms' }),
            mkComp('r_c', 'RESISTOR', 'r_damp (1Ω)', 560, 260, 90, { resistance: 1, maxPower: 20 }),
            mkComp('c1', 'CAPACITOR', 'C1 (100µF)', 560, 350, 90, { capacitance: 100 }),
            mkComp('gnd1', 'GROUND', 'GND', 130, 420, 0),
          ],
          [
            ['ac1', 'pos', 'am_l', 'pos', '#f59e0b'],
            ['ac1', 'pos', 'am_c', 'pos', '#38bdf8'],
            ['am_l', 'neg', 'l1', 'a', '#f59e0b'],
            ['l1', 'b', 'gnd1', 'gnd', '#475569'],
            ['am_c', 'neg', 'r_c', 'a', '#38bdf8'],
            ['r_c', 'b', 'c1', 'pos', '#38bdf8'],
            ['c1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l9s2'
        ),
        liveFormulas: [
          {
            id: 'f-xl-xc',
            title: '感抗与容抗随 f 反方向演化',
            formula: 'X_L = 2πfL  ↑  vs  X_C = 1/(2πfC)  ↓',
            evaluate: (ctx) => {
              const f = numProp(ctx, 'ac1', 'frequency', 25);
              const xl = 2 * Math.PI * f * 0.1;
              const xc = 1 / (2 * Math.PI * f * 100e-6);
              const il = getTel(ctx, 'am_l')?.iRms ?? 0;
              const ic = getTel(ctx, 'am_c')?.iRms ?? 0;
              return {
                expression: `f=${f}Hz: XL=${xl.toFixed(1)}Ω, XC=${xc.toFixed(1)}Ω`,
                result: `IL~=${fmtI(il)}, IC~=${fmtI(ic)}`,
                status: ic > 2 * il ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l9s2-freq',
            label: '交流源频率 f',
            targetId: 'ac1',
            propKey: 'frequency',
            kind: 'select-option',
            options: [
              { label: '25 Hz (低频感性主通)', value: 25 },
              { label: '50 Hz (交叉平衡点)', value: 50 },
              { label: '100 Hz (高频容性胜出)', value: 100 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：电感高频扼流阻交', type: 'INDUCTOR', componentId: 'l1', stepIndex: 2 },
          { label: '思索：电容通交特性', type: 'CAPACITOR', componentId: 'c1', stepIndex: 2 },
        ],
        checkpoint: {
          title: '升频至 100 Hz，实现容性电流超过感性电流 2 倍以上',
          instruction: '把交流源频率切换至 100 Hz，观察 I_C 反超并大于 2×I_L。',
          check: (ctx) => {
            const il = getTel(ctx, 'am_l')?.iRms ?? 0;
            const ic = getTel(ctx, 'am_c')?.iRms ?? 0;
            const ok = ic > 0.5 && ic > 2 * Math.max(0.01, il);
            return {
              passed: ok,
              message: ok ? `频率特性反转验证成功：IC=${fmtI(ic)} > 2·IL (${fmtI(il)})` : `当前 IL=${fmtI(il)}, IC=${fmtI(ic)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键切换频率至 100 Hz',
            description: '调频到 100 Hz 见证容抗锐减而感抗翻番',
            actions: [{ kind: 'setProp', componentId: 'ac1', key: 'frequency', value: 100 }],
          },
        },
      },

      {
        id: 'l9-s3',
        stageNumber: 3,
        title: 'RLC 串联谐振 (50Hz)：感容抵消与 Q 倍过电压奇观',
        badge: 'Step 3 · 串联谐振',
        conceptGoal: 'X_L = X_C 时感性压降与容性压降正负抵消，仅剩 R 限制总电流飙峰，且电容电压竟达电源 3.1 倍！',
        explanation:
          '串联回路 R=10Ω、L=100mH、C=100µF 的固有谐振频率 f0 = 1/(2π√LC) ≈ 50.33 Hz。25Hz 失谐状态下电流微弱；调频到 50Hz 发生串联谐振：电流跃升至约 1.0 A~、功率因数 cosφ 逼近 1.00，同时电容端出现高达 ~31 V~（超过 10V 电源 3 倍多）的品质因数过电压！',
        analogy: '就像在秋千固有周期频率上精准合拍推一把：每次微弱外推力不断累积摆幅，激发出远超推力本身的高能量荡漾！',
        highlights: ['vm_c', 'vm_l', 'am1'],
        newlyAddedIds: ['r1', 'vm_c', 'vm_l'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.16,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vm_c', 'am1'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', 'AC1 (10V~)', 110, 270, 270, {
              amplitude: 14.142,
              frequency: 25,
              phase: 0,
            }),
            mkComp('am1', 'AMMETER', 'PA1 (谐振流)', 250, 140, 0, { mode: 'rms' }),
            mkComp('r1', 'RESISTOR', 'R1 (10Ω)', 400, 140, 0, { resistance: 10, maxPower: 30 }),
            mkComp('l1', 'INDUCTOR', 'L1 (100mH)', 560, 140, 0, { inductance: 100 }),
            mkComp('c1', 'CAPACITOR', 'C1 (100µF)', 670, 270, 90, { capacitance: 100 }),
            mkComp('vm_l', 'VOLTMETER', 'PV_L (UL~)', 560, 250, 0, { mode: 'rms' }),
            mkComp('vm_c', 'VOLTMETER', 'PV_C (UC~)', 790, 270, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 410, 0),
          ],
          [
            ['ac1', 'pos', 'am1', 'pos', '#ef4444'],
            ['am1', 'neg', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'l1', 'a', '#38bdf8'],
            ['l1', 'b', 'c1', 'pos', '#38bdf8'],
            ['c1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['l1', 'a', 'vm_l', 'pos', '#a855f7'],
            ['l1', 'b', 'vm_l', 'neg', '#64748b'],
            ['c1', 'pos', 'vm_c', 'pos', '#ec4899'],
            ['c1', 'neg', 'vm_c', 'neg', '#64748b'],
          ],
          'l9s3'
        ),
        liveFormulas: [
          {
            id: 'f-res-q',
            title: '谐振频率与电容过压倍数',
            formula: 'f0 = 1/(2π√LC) ≈ 50.33 Hz ,  U_C = Q · U_S ≈ 3.16×U_S',
            evaluate: (ctx) => {
              const iRms = getTel(ctx, 'am1')?.iRms ?? 0;
              const vcRms = getTel(ctx, 'vm_c')?.vRms ?? 0;
              const pf = getTel(ctx, 'ac1')?.powerFactor ?? 0;
              return {
                expression: `I~ = ${fmtI(iRms)}, cosφ = ${pf.toFixed(2)}`,
                result: `UC~ = ${vcRms.toFixed(1)} V~ (${(vcRms / 10).toFixed(2)}×源压)`,
                status: iRms >= 0.9 && vcRms > 28 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l9s3-f',
            label: '扫描电源频率 f',
            targetId: 'ac1',
            propKey: 'frequency',
            kind: 'slider',
            min: 25,
            max: 100,
            step: 5,
            unit: 'Hz',
          },
        ],
        ponderLinks: [
          { label: '思索：旋转相量抵消概念', type: 'AC_SOURCE', componentId: 'ac1', stepIndex: 2 },
        ],
        checkpoint: {
          title: '精准命中 50Hz 串联谐振（I~ ≥ 0.90A 且 UC~ > 28V~）',
          instruction: '把频率调到 50 Hz（谐振点），激发超过 2.8 倍电源电压的高压过电压！',
          check: (ctx) => {
            const iRms = getTel(ctx, 'am1')?.iRms ?? 0;
            const vcRms = getTel(ctx, 'vm_c')?.vRms ?? 0;
            const ok = iRms >= 0.9 && vcRms > 28;
            return {
              passed: ok,
              message: ok
                ? `发生串联电压谐振！I~=${fmtI(iRms)}，UC~=${vcRms.toFixed(1)}V~！`
                : `当前 f 失谐中：I~=${fmtI(iRms)}, UC~=${vcRms.toFixed(1)}V~`,
            };
          },
          autoDemo: {
            buttonLabel: '一键调频至 50Hz 触发串联谐振',
            description: '将频率切换为 50Hz 验证电流飙峰与电容 31V~ 过压',
            actions: [{ kind: 'setProp', componentId: 'ac1', key: 'frequency', value: 50 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 10 (Ch.4): 感性负载功率因数补偿（降线损增容量）
  // =========================================================================
  {
    id: 'ch4-power-factor-correction',
    chapterId: 'ch4',
    lessonNumber: 10,
    title: '功率因数提升与电网线损下降',
    subtitle: '剖析感性电机无功电流如何占满输电线，学会通过并联补偿电容把功率因数抬回 ~1.00',
    textbookRef: '第4章 4.6 功率因数的提高',
    difficulty: '进阶',
    durationMin: 10,
    prerequisites: ['ch4-ac-phasor-rlc-resonance'],
    learningObjectives: [
      '区分有功功率 P = U·I·cosφ、视在功率 S = U·I 与功率因数 cosφ 的意义',
      '掌握提高功率因数工程方法：在感性负载两端直接并联适当电容（不改变电机本身工作电流）',
      '定量见证总输电线电流大幅削减、电网利用率成倍提升',
    ],
    stages: [
      {
        id: 'l10-s1',
        stageNumber: 1,
        title: '感性负载拉低功率因数，无功吞吐白占电网容量',
        badge: 'Step 1 · 低 cosφ 痛点',
        conceptGoal: '纯感性支路电感增大到 318 mH 时，感抗与电阻各占 100Ω，功率因数跌至 0.71。',
        explanation:
          '用 R_m (100Ω) 串联 L_m 等效一台工业异步电机定子绕组接在 220V~/50Hz 电网。加大电感 L_m 到 318 mH（X_L ≈ 100Ω）观察“交流分析表”：尽管实际做有功仅 P ≈ 242 W，视在功率却达 S ≈ 342 VA，近 30% 电网容量被往复吞吐的无功电流占用！',
        analogy: '就像卡车运啤酒：一半箱子装满实酒（有功），另一半全是往返搬来搬去的空泡沫箱（无功）。',
        highlights: ['l_m', 'am_line'],
        newlyAddedIds: ['r_m', 'l_m', 'vm_s', 'am_line'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vm_s', 'am_line'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '电网 220V~', 130, 270, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('am_line', 'AMMETER', 'PA_总输电线', 300, 150, 0, { mode: 'rms' }),
            mkComp('r_m', 'RESISTOR', 'R_m 铜耗等值 (100Ω)', 490, 210, 90, { resistance: 100, maxPower: 1000 }),
            mkComp('l_m', 'INDUCTOR', 'L_m 线圈感性', 490, 330, 90, { inductance: 100 }),
            mkComp('vm_s', 'VOLTMETER', 'PV_电网', 650, 270, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 130, 410, 0),
          ],
          [
            ['ac1', 'pos', 'am_line', 'pos', '#ef4444'],
            ['am_line', 'neg', 'r_m', 'a', '#f59e0b'],
            ['r_m', 'b', 'l_m', 'a', '#38bdf8'],
            ['l_m', 'b', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'pos', 'vm_s', 'pos', '#a855f7'],
            ['ac1', 'neg', 'vm_s', 'neg', '#64748b'],
          ],
          'l10s1'
        ),
        liveFormulas: [
          {
            id: 'f-pf-drop',
            title: '电源端口有功 / 视在功率与因数',
            formula: 'cosφ = P / S = R / √(R² + X_L²)',
            evaluate: (ctx) => {
              const p = Math.abs(getTel(ctx, 'ac1')?.avgPower ?? 0);
              const s = Math.abs(getTel(ctx, 'ac1')?.apparentPower ?? 0);
              const pf = getTel(ctx, 'ac1')?.powerFactor ?? 1;
              return {
                expression: `P=${p.toFixed(1)}W vs S=${s.toFixed(1)}VA`,
                result: `cosφ = ${pf.toFixed(2)}`,
                status: pf < 0.75 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l10s1-lm',
            label: '电机绕组电感 L_m',
            targetId: 'l_m',
            propKey: 'inductance',
            kind: 'slider',
            min: 100,
            max: 400,
            step: 50,
            unit: 'mH',
          },
        ],
        ponderLinks: [
          { label: '思索：电感电流相位滞后特性', type: 'INDUCTOR', componentId: 'l_m', stepIndex: 1 },
        ],
        checkpoint: {
          title: '加重电感负载 (≥ 300mH) 观察功率因数跌落至 < 0.75',
          instruction: '调高 L_m 至 300 mH 以上（例如 318mH），观察交流表中 cosφ 降至 0.71 左右。',
          check: (ctx) => {
            const pf = getTel(ctx, 'ac1')?.powerFactor ?? 1;
            const lm = numProp(ctx, 'l_m', 'inductance', 100);
            return {
              passed: lm >= 300 && pf < 0.75,
              message: lm >= 300 && pf < 0.75 ? `重感性低因数复现：cosφ = ${pf.toFixed(2)}` : `当前 L_m=${lm}mH, cosφ=${pf.toFixed(2)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键切换重感性 L_m = 318.31 mH',
            description: '将 L_m 设为 318.31mH (X_L=100Ω) 得典型低因数 cosφ=0.71',
            actions: [{ kind: 'setProp', componentId: 'l_m', key: 'inductance', value: 318.31 }],
          },
        },
      },

      {
        id: 'l10-s2',
        stageNumber: 2,
        title: '并联电容精准补偿：干线电流锐降 29%，电机本身丝毫不减！',
        badge: 'Step 2 · 电容就地补偿',
        conceptGoal: '合上电容开关 K_comp 让电容与线圈在本地就地交换无功，外线主干电流直降，电机电流却毫不动摇。',
        explanation:
          '现在在电机两端接入了一只经过计算的无功补偿电容 C_comp = 15.915 µF。未闭合前干线电流等于电机电流 1.56 A~；点击合上补偿开关 K_comp 后，无功在本地循环不再上电网！总干线电流立即降至 1.10 A~，功率因数飙升回 ~1.00，同时电机自己支路 PA_电机 依旧稳在 1.56 A~ 正常运行！',
        analogy: '就像在工厂本地建了一座蓄水循环罐专门替电感吞吐退水，主管道干线顿时卸下空载包袱轻松运满货！',
        highlights: ['k_comp', 'c_comp', 'am_line', 'am_motor'],
        newlyAddedIds: ['k_comp', 'c_comp', 'am_motor'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['am_line', 'am_motor'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '电网 220V~', 120, 270, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('am_line', 'AMMETER', 'PA_主干线', 280, 140, 0, { mode: 'rms' }),
            mkComp('am_motor', 'AMMETER', 'PA_电机支路', 460, 190, 90, { mode: 'rms' }),
            mkComp('r_m', 'RESISTOR', 'R_m (100Ω)', 460, 280, 90, { resistance: 100, maxPower: 1000 }),
            mkComp('l_m', 'INDUCTOR', 'L_m (318.3mH)', 460, 370, 90, { inductance: 318.31 }),
            mkComp('k_comp', 'SWITCH_SPST', 'K_comp 投切', 640, 190, 90, { closed: false }),
            mkComp('c_comp', 'CAPACITOR', 'C_comp (15.9µF)', 640, 330, 90, { capacitance: 15.915 }),
            mkComp('gnd1', 'GROUND', 'GND', 120, 420, 0),
          ],
          [
            ['ac1', 'pos', 'am_line', 'pos', '#ef4444'],
            ['am_line', 'neg', 'am_motor', 'pos', '#f59e0b'],
            ['am_motor', 'neg', 'r_m', 'a', '#38bdf8'],
            ['r_m', 'b', 'l_m', 'a', '#38bdf8'],
            ['l_m', 'b', 'gnd1', 'gnd', '#475569'],
            ['am_line', 'neg', 'k_comp', 'a', '#10b981'],
            ['k_comp', 'b', 'c_comp', 'pos', '#10b981'],
            ['c_comp', 'neg', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l10s2'
        ),
        liveFormulas: [
          {
            id: 'f-pf-comp',
            title: '补偿前后干线 vs 电机支路对比',
            formula: 'I_干线 = √(I_P² + (I_L - I_C)²) ↓  vs  I_电机 恒定不变',
            evaluate: (ctx) => {
              const iLine = getTel(ctx, 'am_line')?.iRms ?? 0;
              const iMot = getTel(ctx, 'am_motor')?.iRms ?? 0;
              const pf = getTel(ctx, 'ac1')?.powerFactor ?? 0;
              return {
                expression: `干线 ${fmtI(iLine)} · 电机 ${fmtI(iMot)}`,
                result: `cosφ = ${pf.toFixed(2)}`,
                status: pf >= 0.96 && iLine < 1.2 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l10s2-comp',
            label: '并联补偿开关 K_comp',
            targetId: 'k_comp',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：补偿电容无功交换', type: 'CAPACITOR', componentId: 'c_comp', stepIndex: 2 },
        ],
        checkpoint: {
          title: '投切并联电容将 cosφ 升至 ≥ 0.96，干线电流 < 1.20 A~',
          instruction: '闭合开关 K_comp 投入补偿电容，检查电机支路维持 ≥ 1.45 A~ 的同时主干电流降入 1.20 A~ 以内。',
          check: (ctx) => {
            const pf = getTel(ctx, 'ac1')?.powerFactor ?? 0;
            const iLine = getTel(ctx, 'am_line')?.iRms ?? 99;
            const iMot = getTel(ctx, 'am_motor')?.iRms ?? 0;
            const ok = pf >= 0.96 && iLine < 1.2 && iMot >= 1.45;
            return {
              passed: ok,
              message: ok
                ? `无功就地补偿完美：cosφ=${pf.toFixed(2)}, 干线=${fmtI(iLine)}, 电机=${fmtI(iMot)}`
                : `当前 cosφ=${pf.toFixed(2)}, 干线=${fmtI(iLine)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键闭合补偿开关 K_comp',
            description: '投入 15.915µF 电容使 cosφ 从 0.71 跃升至 ~1.00',
            actions: [{ kind: 'setProp', componentId: 'k_comp', key: 'closed', value: true }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 11 (Ch.5): 三相四线制 Y 接、断零事故抢修与 Δ 接法
  // =========================================================================
  {
    id: 'ch5-three-phase-circuits',
    chapterId: 'ch5',
    lessonNumber: 11,
    title: '三相电路：Y0 线/相压比、断零故障与 Δ 接法',
    subtitle: '掌握三相对称电源 120° 相差、220V/381V 关系、不对称断零过压事故急救以及 Δ 线电流 √3 倍规律',
    textbookRef: '第5章 5.1–5.4 三相电源与三相负载连接',
    difficulty: '综合',
    durationMin: 18,
    prerequisites: ['ch4-ac-phasor-rlc-resonance'],
    learningObjectives: [
      '验证三相 Y 形对称负载下 U_L = √3·U_P ≈ 381 V~，中线零序电流 I_N ≈ 0',
      '直观目睹民用供电最危险事故之一——不对称负载“断零”导致轻载相飙压过载烧毁',
      '验证三相三角形 Δ 接法相电压即线电压，而线电流 I_L = √3·I_P',
    ],
    stages: [
      {
        id: 'l11-s1',
        stageNumber: 1,
        title: '对称 Y0 三相四线制：线电压 381V~，中线无电流即使断开也稳如磐石',
        badge: 'Step 1 · 对称 Y0',
        conceptGoal: '三盏一模一样的 220V/100W 照明灯接在 0°/-120°/+120° 三相线上，三相电流矢量相加恰好互相抵消！',
        explanation:
          '三组 220V~/50Hz 电源互差 120° 相角供电给完全对称的三相灯泡 LA/LB/LC。观察电压表：任意两火线之间线电压 PV_AB ≈ 381 V~（等于 220·√3），单相对中性点电压 PV_AN ≈ 220 V~。由于三相对称平衡，中线电流表 PA_N 几乎为 0，即使拉断中线开关 K_N 灯泡仍稳稳工作在 220V~！',
        analogy: '就像三个人从互成 120° 的三个方向用相等力量拉住中心铁环：合力精确为零，铁环纹丝不动根本无需中心固定桩。',
        highlights: ['vm_an', 'vm_ab', 'am_n', 'k_n'],
        newlyAddedIds: ['ua', 'ub', 'uc', 'la', 'lb', 'lc', 'k_n', 'am_n', 'vm_an', 'vm_ab'],
        defaultTimeScale: 0.04,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['ua', 'ub', 'uc'],
        circuit: mkCircuit(
          [
            mkComp('ua', 'AC_SOURCE', 'Ua (0°)', 110, 130, 0, { amplitude: 311.13, frequency: 50, phase: 0 }),
            mkComp('ub', 'AC_SOURCE', 'Ub (-120°)', 110, 260, 0, { amplitude: 311.13, frequency: 50, phase: -120 }),
            mkComp('uc', 'AC_SOURCE', 'Uc (+120°)', 110, 390, 0, { amplitude: 311.13, frequency: 50, phase: 120 }),
            mkComp('la', 'LAMP', 'LA (100W)', 370, 130, 0, { ratedVoltage: 220, ratedPower: 100 }),
            mkComp('lb', 'LAMP', 'LB (100W)', 370, 260, 0, { ratedVoltage: 220, ratedPower: 100 }),
            mkComp('lc', 'LAMP', 'LC (100W)', 370, 390, 0, { ratedVoltage: 220, ratedPower: 100 }),
            mkComp('am_n', 'AMMETER', 'PA_N 中线', 550, 260, 180, { mode: 'rms' }),
            mkComp('k_n', 'SWITCH_SPST', 'K_N 中线开关', 690, 260, 0, { closed: true }),
            mkComp('vm_an', 'VOLTMETER', 'PV_AN (相)', 240, 80, 0, { mode: 'rms' }),
            mkComp('vm_ab', 'VOLTMETER', 'PV_AB (线)', 240, 200, 90, { mode: 'rms' }),
            mkComp('gnd_n', 'GROUND', 'GND (电源N)', 40, 260, 0),
          ],
          [
            ['ua', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['ub', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['uc', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['ua', 'pos', 'la', 'p1', '#f59e0b'],
            ['ub', 'pos', 'lb', 'p1', '#10b981'],
            ['uc', 'pos', 'lc', 'p1', '#ef4444'],
            ['la', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['lb', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['lc', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['am_n', 'neg', 'k_n', 'a', '#38bdf8'],
            ['k_n', 'b', 'gnd_n', 'gnd', '#475569'],

            ['ua', 'pos', 'vm_an', 'pos', '#a855f7'],
            ['la', 'p2', 'vm_an', 'neg', '#64748b'],
            ['ua', 'pos', 'vm_ab', 'pos', '#ec4899'],
            ['ub', 'pos', 'vm_ab', 'neg', '#64748b'],
          ],
          'l11s1'
        ),
        liveFormulas: [
          {
            id: 'f-3p-sym',
            title: '对称线/相电压关系与零线电流',
            formula: 'U_L = √3 · U_P ≈ 381 V~ ,  I_N(对称) ≈ 0 A',
            evaluate: (ctx) => {
              const up = getTel(ctx, 'vm_an')?.vRms ?? 0;
              const ul = getTel(ctx, 'vm_ab')?.vRms ?? 0;
              const inRms = getTel(ctx, 'am_n')?.iRms ?? 0;
              return {
                expression: `相 ${up.toFixed(1)}V~ · 线 ${ul.toFixed(1)}V~`,
                result: `中线电流 I_N = ${fmtI(inRms)}`,
                status: Math.abs(up - 220) < 6 && Math.abs(ul - 381) < 8 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l11s1-kn',
            label: '试拉中线开关 K_N',
            targetId: 'k_n',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：三相120°初相正弦源', type: 'AC_SOURCE', componentId: 'ub', stepIndex: 1 },
        ],
        checkpoint: {
          title: '试着断开 K_N，验证对称负载断零后仍稳定保持 220V~ / 381V~',
          instruction: '断开开关 K_N 移除中线，证实三相对称照明即使无零线依然各守其位（220V~）。',
          check: (ctx) => {
            const kn = boolProp(ctx, 'k_n', 'closed', true);
            const up = getTel(ctx, 'vm_an')?.vRms ?? 0;
            const ul = getTel(ctx, 'vm_ab')?.vRms ?? 0;
            const ok = !kn && up >= 214 && up <= 226 && ul >= 374 && ul <= 388;
            return {
              passed: ok,
              message: ok
                ? `对称星形验证通过：无中线时相压 ${up.toFixed(1)}V~、线压 ${ul.toFixed(1)}V~ 稳如磐石！`
                : `请断开 K_N，当前相压 ${up.toFixed(1)}V~`,
            };
          },
          autoDemo: {
            buttonLabel: '一键断开中线 K_N 验证对称自平衡',
            description: '断开 K_N 验证对称负载无中线仍稳在 220V~/381V~',
            actions: [{ kind: 'setProp', componentId: 'k_n', key: 'closed', value: false }],
          },
        },
      },

      {
        id: 'l11-s2',
        stageNumber: 2,
        title: '【重要事故重现】不对称断零导致 A 相飙压过载，合闸零线急救！',
        badge: 'Step 2 · 断零故障',
        conceptGoal: 'A 相小灯 (100W) 与 B/C 相大负载 (各400W) 同挂一柱且零线断裂时，中性点偏移让 A 相飙至 ~293V~ 烧毁！',
        explanation:
          '这正是为什么严禁在三相四线干路零线上加装单独熔丝的教科书铁例！B、C 两相功率远大于 A 相（总中线 K_N 处于故障断开状态）：中性点向大功率侧疯狂漂移，导致轻载 A 相灯泡 LA 承受接近 293 V~ 严重过压超负荷标红告警！请立即闭合 K_N 修复中性点零电位！',
        analogy: '三个力量完全不等的人拉中心铁环却撤掉了定位木桩：弱小那端（A相轻载）被两个大汉拉着拽偏中心承受加倍拉伸而断损！',
        highlights: ['la', 'k_n', 'vm_a'],
        newlyAddedIds: ['vm_a', 'vm_b'],
        defaultTimeScale: 0.04,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vm_a', 'vm_b'],
        circuit: mkCircuit(
          [
            mkComp('ua', 'AC_SOURCE', 'Ua (0°)', 110, 130, 0, { amplitude: 311.13, frequency: 50, phase: 0 }),
            mkComp('ub', 'AC_SOURCE', 'Ub (-120°)', 110, 260, 0, { amplitude: 311.13, frequency: 50, phase: -120 }),
            mkComp('uc', 'AC_SOURCE', 'Uc (+120°)', 110, 390, 0, { amplitude: 311.13, frequency: 50, phase: 120 }),
            mkComp('la', 'LAMP', 'LA 轻载 (100W)', 370, 130, 0, { ratedVoltage: 220, ratedPower: 100 }),
            mkComp('lb', 'LAMP', 'LB 重载 (400W)', 370, 260, 0, { ratedVoltage: 220, ratedPower: 400 }),
            mkComp('lc', 'LAMP', 'LC 重载 (400W)', 370, 390, 0, { ratedVoltage: 220, ratedPower: 400 }),
            mkComp('am_n', 'AMMETER', 'PA_N 零线流', 550, 260, 180, { mode: 'rms' }),
            mkComp('k_n', 'SWITCH_SPST', 'K_N 抢修开关', 690, 260, 0, { closed: false }),
            mkComp('vm_a', 'VOLTMETER', 'PV_A (LA相压)', 240, 75, 0, { mode: 'rms' }),
            mkComp('vm_b', 'VOLTMETER', 'PV_B (LB相压)', 240, 330, 0, { mode: 'rms' }),
            mkComp('gnd_n', 'GROUND', 'GND (电源N)', 40, 260, 0),
          ],
          [
            ['ua', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['ub', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['uc', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['ua', 'pos', 'la', 'p1', '#f59e0b'],
            ['ub', 'pos', 'lb', 'p1', '#10b981'],
            ['uc', 'pos', 'lc', 'p1', '#ef4444'],
            ['la', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['lb', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['lc', 'p2', 'am_n', 'pos', '#38bdf8'],
            ['am_n', 'neg', 'k_n', 'a', '#38bdf8'],
            ['k_n', 'b', 'gnd_n', 'gnd', '#475569'],

            ['ua', 'pos', 'vm_a', 'pos', '#ef4444'],
            ['la', 'p2', 'vm_a', 'neg', '#64748b'],
            ['ub', 'pos', 'vm_b', 'pos', '#10b981'],
            ['lb', 'p2', 'vm_b', 'neg', '#64748b'],
          ],
          'l11s2'
        ),
        liveFormulas: [
          {
            id: 'f-3p-fault',
            title: '中性点位移与相电压监控',
            formula: '断零时各相电压失衡分化；合上零线立即锁稳各相 = 220 V~',
            evaluate: (ctx) => {
              const va = getTel(ctx, 'vm_a')?.vRms ?? 0;
              const vb = getTel(ctx, 'vm_b')?.vRms ?? 0;
              const inRms = getTel(ctx, 'am_n')?.iRms ?? 0;
              const over = Boolean(getTel(ctx, 'la')?.overloaded);
              return {
                expression: `VA=${va.toFixed(1)}V~, VB=${vb.toFixed(1)}V~, IN=${fmtI(inRms)}`,
                result: over ? '断零过压警报: A相过载中!' : '三相相电压安全锁定 220V~',
                status: over ? 'warn' : 'good',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l11s2-kn',
            label: '闭合抢修零线开关 K_N',
            targetId: 'k_n',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：白炽灯过压烧毁与负载率', type: 'LAMP', componentId: 'la', stepIndex: 1 },
        ],
        checkpoint: {
          title: '闭合零线开关 K_N 抢修三相供电平衡（220 V~）',
          instruction: '合上 K_N 连通中性线排出不平衡零序电流，使 A、B 相迅速回归 220V~ 并消除 LA 过载。',
          check: (ctx) => {
            const kn = boolProp(ctx, 'k_n', 'closed', false);
            const va = getTel(ctx, 'vm_a')?.vRms ?? 0;
            const vb = getTel(ctx, 'vm_b')?.vRms ?? 0;
            const over = Boolean(getTel(ctx, 'la')?.overloaded);
            const ok = kn && va >= 214 && va <= 226 && vb >= 214 && vb <= 226 && !over;
            return {
              passed: ok,
              message: ok
                ? `抢修成功！A=${va.toFixed(1)}V~, B=${vb.toFixed(1)}V~, 零线导走不平衡电流`
                : `故障态：LA 过压至 ${va.toFixed(1)}V~（请闭合 K_N）`,
            };
          },
          autoDemo: {
            buttonLabel: '一键抢修闭合中线 K_N',
            description: '闭合 K_N 使中性点归零、消除 A 相 ~293V~ 过压危险',
            actions: [{ kind: 'setProp', componentId: 'k_n', key: 'closed', value: true }],
          },
        },
      },

      {
        id: 'l11-s3',
        stageNumber: 3,
        title: '三相三角形 Δ 接法：线电流 I_L = √3 · I_P',
        badge: 'Step 3 · 三角形 Δ',
        conceptGoal: '三相对称 Δ 负载直接跨接 381V~ 线电压（相电流 1.00 A~），火线总电流则由两相矢量差放大至 1.73 A~！',
        explanation:
          '将三只相同 381Ω 大电阻首尾相连构成 Δ 闭环，直接跨接在三根 381V~ 火线间（不再需要零线）。C 相火线开关 K_C 初始断开（退化为单相供电状态）；一旦闭合 K_C 恢复完整三相 Δ 供电，相电流表 PA_AB 读 1.00 A~，而 A 相干线电流表 PA_线A 读出清晰的 1.73 A~（√3 倍）！',
        analogy: '两条互成 120° 出发的分岔管流交汇：由于矢量挟角存在，主火线干道搬运的总流量变成单条负载管道的 √3 ≈ 1.732 倍！',
        highlights: ['am_la', 'am_pab', 'k_c'],
        newlyAddedIds: ['am_la', 'am_pab', 'rab', 'rbc', 'rca', 'k_c'],
        defaultTimeScale: 0.04,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['am_la', 'am_pab'],
        circuit: mkCircuit(
          [
            mkComp('ua', 'AC_SOURCE', 'Ua (0°)', 100, 120, 0, { amplitude: 311.13, frequency: 50, phase: 0 }),
            mkComp('ub', 'AC_SOURCE', 'Ub (-120°)', 100, 260, 0, { amplitude: 311.13, frequency: 50, phase: -120 }),
            mkComp('uc', 'AC_SOURCE', 'Uc (+120°)', 100, 400, 0, { amplitude: 311.13, frequency: 50, phase: 120 }),
            mkComp('am_la', 'AMMETER', 'PA_线A (IL)', 250, 120, 0, { mode: 'rms' }),
            mkComp('k_c', 'SWITCH_SPST', 'K_C 火线开关', 250, 400, 0, { closed: false }),
            mkComp('am_pab', 'AMMETER', 'PA_相AB (IP)', 430, 180, 90, { mode: 'rms' }),
            mkComp('rab', 'RESISTOR', 'R_AB (381Ω)', 430, 280, 90, { resistance: 381, maxPower: 1000 }),
            mkComp('rbc', 'RESISTOR', 'R_BC (381Ω)', 570, 340, 90, { resistance: 381, maxPower: 1000 }),
            mkComp('rca', 'RESISTOR', 'R_CA (381Ω)', 690, 230, 90, { resistance: 381, maxPower: 1000 }),
            mkComp('gnd_n', 'GROUND', 'GND', 30, 260, 0),
          ],
          [
            ['ua', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['ub', 'neg', 'gnd_n', 'gnd', '#475569'],
            ['uc', 'neg', 'gnd_n', 'gnd', '#475569'],

            // Node A = am_la.neg = am_pab.pos = rca.b
            ['ua', 'pos', 'am_la', 'pos', '#f59e0b'],
            ['am_la', 'neg', 'am_pab', 'pos', '#f59e0b'],
            ['am_la', 'neg', 'rca', 'b', '#f59e0b'],

            // Branch AB -> Node B = ub.pos = rab.b = rbc.a
            ['am_pab', 'neg', 'rab', 'a', '#38bdf8'],
            ['rab', 'b', 'ub', 'pos', '#10b981'],
            ['rbc', 'a', 'ub', 'pos', '#10b981'],

            // Branch BC -> Node C = k_c.b = rbc.b = rca.a
            ['uc', 'pos', 'k_c', 'a', '#ef4444'],
            ['rbc', 'b', 'k_c', 'b', '#ef4444'],
            ['rca', 'a', 'k_c', 'b', '#ef4444'],
          ],
          'l11s3'
        ),
        liveFormulas: [
          {
            id: 'f-delta-sqrt3',
            title: '三角形 Δ 线电流 / 相电流实测比',
            formula: 'I_L / I_P = √3 ≈ 1.732',
            evaluate: (ctx) => {
              const il = getTel(ctx, 'am_la')?.iRms ?? 0;
              const ip = getTel(ctx, 'am_pab')?.iRms ?? 0;
              const ratio = ip > 0.01 ? il / ip : 0;
              return {
                expression: `线电流 I_L = ${fmtI(il)}, 相电流 I_P = ${fmtI(ip)}`,
                result: `I_L / I_P = ${ratio.toFixed(3)}`,
                status: il >= 1.65 && Math.abs(ratio - Math.sqrt(3)) < 0.06 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l11s3-kc',
            label: '闭合 C 相火线 K_C',
            targetId: 'k_c',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：交流源初相与三相角差', type: 'AC_SOURCE', componentId: 'uc', stepIndex: 1 },
        ],
        checkpoint: {
          title: '闭合 K_C 构建完整 Δ 负载，验证 I_L ≈ √3 · I_P (1.732)',
          instruction: '闭合 K_C 接通第三相，使线电流达到 ~1.73 A~ 且 I_L / I_P 落于 1.68 ~ 1.78 区间。',
          check: (ctx) => {
            const il = getTel(ctx, 'am_la')?.iRms ?? 0;
            const ip = getTel(ctx, 'am_pab')?.iRms ?? 0;
            const ratio = ip > 0.05 ? il / ip : 0;
            const ok = il >= 1.65 && ratio >= 1.68 && ratio <= 1.78;
            return {
              passed: ok,
              message: ok
                ? `Δ 对称验证通过：I_L=${fmtI(il)}, I_P=${fmtI(ip)}, 比值=${ratio.toFixed(3)}`
                : `当前 I_L=${fmtI(il)}, I_P=${fmtI(ip)}, 比值=${ratio.toFixed(2)}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键闭合 K_C 验证 Δ 形 √3 线流关系',
            description: '闭合 C 相形成对称三角负载并验算 I_L = 1.732·I_P',
            actions: [{ kind: 'setProp', componentId: 'k_c', key: 'closed', value: true }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 12 (Ch.6): 变压器降压、整流滤波与 5V 直流稳压电源全链路
  // =========================================================================
  {
    id: 'ch6-transformer-and-control',
    chapterId: 'ch6',
    lessonNumber: 12,
    title: '变压器降压、半波整流滤波与齐纳稳压电源',
    subtitle: '把全册所学一气贯通！亲手搭出“220V~ 交流市电 → 降压 → 整流 → 电容平滑 → 5.1V 直流稳压输出”',
    textbookRef: '第6章 6.3 铁芯变压器与直流稳压电源综合实验',
    difficulty: '综合',
    durationMin: 15,
    prerequisites: ['ch4-ac-phasor-rlc-resonance'],
    learningObjectives: [
      '掌握理想变压器变压公式 U2 / U1 = Ns / Np = k 及隔离降压安全意义',
      '理解二极管半波脉动电流如何经大容量滤波电容填充平滑为准直流',
      '学会用反向击穿工作的齐纳稳压二极管将波动输入稳死在 5.1V 输出安全驱动负载',
    ],
    stages: [
      {
        id: 'l12-s1',
        stageNumber: 1,
        title: '第一级：变压器电磁耦合按匝比 k 安全降压',
        badge: 'Step 1 · 降压隔离',
        conceptGoal: '通过调节变压器匝比 k = Ns/Np = 0.05 (20:1)，把危险 220V~ 市电降为安全 11V~ 交流低压。',
        explanation:
          '右侧负载与左侧高压市电之间隔着硅钢片铁芯磁路，无任何物理导线直接碰触（安全电气隔离）。当前匝比 k = 0.10 输出 22V~，请把它下调为 k = 0.05，把副边电压安全踩降到 11.0 V~ 以备后续整流！',
        analogy: '就像一组 20:1 齿轮变速箱：高速低扭矩输入通过磁链齿轮咬合变身为温和安全低压大电流输出。',
        highlights: ['xf1', 'vm_2'],
        newlyAddedIds: ['ac1', 'xf1', 'vm_1', 'vm_2'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.08,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vm_1', 'vm_2'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '市电 220V~', 110, 270, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('vm_1', 'VOLTMETER', 'PV1 原边', 240, 270, 90, { mode: 'rms' }),
            mkComp('xf1', 'TRANSFORMER', 'XF1 变压器', 410, 270, 0, { ratio: 0.1 }),
            mkComp('r_load', 'RESISTOR', 'R_load (22Ω)', 580, 270, 90, { resistance: 22, maxPower: 100 }),
            mkComp('vm_2', 'VOLTMETER', 'PV2 副边', 700, 270, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND_高压侧', 110, 410, 0),
            mkComp('gnd2', 'GROUND', 'GND_低压侧', 580, 410, 0),
          ],
          [
            ['ac1', 'pos', 'xf1', 'p1', '#ef4444'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['xf1', 'p2', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'pos', 'vm_1', 'pos', '#a855f7'],
            ['ac1', 'neg', 'vm_1', 'neg', '#64748b'],

            ['xf1', 's1', 'r_load', 'a', '#38bdf8'],
            ['r_load', 'b', 'gnd2', 'gnd', '#475569'],
            ['xf1', 's2', 'gnd2', 'gnd', '#475569'],
            ['r_load', 'a', 'vm_2', 'pos', '#10b981'],
            ['r_load', 'b', 'vm_2', 'neg', '#64748b'],
          ],
          'l12s1'
        ),
        liveFormulas: [
          {
            id: 'f-xfmr-k',
            title: '理想变压器变比换算',
            formula: 'U2 = k · U1',
            evaluate: (ctx) => {
              const v1 = getTel(ctx, 'vm_1')?.vRms ?? 220;
              const v2 = getTel(ctx, 'vm_2')?.vRms ?? 0;
              const k = numProp(ctx, 'xf1', 'ratio', 0.1);
              return {
                expression: `${k.toFixed(2)} × ${v1.toFixed(1)} V~ = ${(k * v1).toFixed(1)} V~`,
                result: `实测 U2 = ${v2.toFixed(2)} V~`,
                status: v2 >= 10.2 && v2 <= 11.8 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l12s1-k',
            label: '变压器匝比 k (Ns/Np)',
            targetId: 'xf1',
            propKey: 'ratio',
            kind: 'select-option',
            options: [
              { label: '0.10 (220V~ → 22V~)', value: 0.1 },
              { label: '0.05 (220V~ → 11V~)', value: 0.05 },
            ],
          },
        ],
        ponderLinks: [
          { label: '思索：变压器铁芯磁链耦合', type: 'TRANSFORMER', componentId: 'xf1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '调整变比 k = 0.05，降压输出约 11V~ 安全交流',
          instruction: '选择变比 k = 0.05，使副边 PV2 稳于 10.2V~ 到 11.8V~ 区间。',
          check: (ctx) => {
            const k = numProp(ctx, 'xf1', 'ratio', 0.1);
            const v2 = getTel(ctx, 'vm_2')?.vRms ?? 0;
            const ok = Math.abs(k - 0.05) < 0.01 && v2 >= 10.2 && v2 <= 11.8;
            return {
              passed: ok,
              message: ok ? `降压隔离达标：U2 = ${v2.toFixed(2)} V~` : `当前 U2 = ${v2.toFixed(2)} V~，请将变比设为 0.05`,
            };
          },
          autoDemo: {
            buttonLabel: '一键设置匝比 k = 0.05 (输出 11V~)',
            description: '将 XF1 变比调至 0.05 输出约 11V~ 低压交流',
            actions: [{ kind: 'setProp', componentId: 'xf1', key: 'ratio', value: 0.05 }],
          },
        },
      },

      {
        id: 'l12-s2',
        stageNumber: 2,
        title: '第二级：半波二极管整流与大电容平滑滤波',
        badge: 'Step 2 · 整流与滤波',
        conceptGoal: '先用二极管砍掉负半周，再用 470µF 大电容趁着峰值储能、谷底放能将波形“抹平”成连续直流。',
        explanation:
          '现在副边接入硅二极管 D1：原本交流有正有负，D1 只放正半周冲入母线，此时示波器上只是半波大起大落的馒头波（间歇期归零！）。合上并联电容开关 K_cap 投入 470µF 水库电容后，峰值高达 ~14.5V 被锁存缓放，电压立刻拉平为持续稳定的 12~14.5V 直流母线！',
        analogy: '就像给阵雨农田（脉动半波）旁边挖一口蓄水大塘（大电容）：下大雨时蓄满水顶，没雨时水塘匀速放水浇灌告别干涸。',
        highlights: ['d1', 'k_cap', 'c_filt'],
        newlyAddedIds: ['d1', 'k_cap', 'c_filt', 'vm_dc'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.12,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_dc'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '市电 220V~', 100, 270, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('xf1', 'TRANSFORMER', 'XF1 (k=0.05)', 240, 270, 0, { ratio: 0.05 }),
            mkComp('d1', 'DIODE', 'D1 半波整流', 390, 180, 0),
            mkComp('k_cap', 'SWITCH_SPST', 'K_cap 接入滤波', 500, 210, 90, { closed: false }),
            mkComp('c_filt', 'CAPACITOR', 'C_滤波 (470µF)', 500, 330, 90, { capacitance: 470 }),
            mkComp('r_load', 'RESISTOR', 'R_load (200Ω)', 640, 270, 90, { resistance: 200, maxPower: 5 }),
            mkComp('vm_dc', 'VOLTMETER', 'PV_DC 母线压', 760, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND1', 100, 410, 0),
            mkComp('gnd2', 'GROUND', 'GND2', 640, 410, 0),
          ],
          [
            ['ac1', 'pos', 'xf1', 'p1', '#ef4444'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['xf1', 'p2', 'gnd1', 'gnd', '#475569'],

            ['xf1', 's1', 'd1', 'anode', '#f59e0b'],
            ['d1', 'cathode', 'k_cap', 'a', '#38bdf8'],
            ['k_cap', 'b', 'c_filt', 'pos', '#10b981'],
            ['c_filt', 'neg', 'gnd2', 'gnd', '#475569'],
            ['d1', 'cathode', 'r_load', 'a', '#38bdf8'],
            ['r_load', 'b', 'gnd2', 'gnd', '#475569'],
            ['xf1', 's2', 'gnd2', 'gnd', '#475569'],
            ['d1', 'cathode', 'vm_dc', 'pos', '#a855f7'],
            ['gnd2', 'gnd', 'vm_dc', 'neg', '#64748b'],
          ],
          'l12s2'
        ),
        liveFormulas: [
          {
            id: 'f-rect-filt',
            title: '电容滤波平滑直流电平',
            formula: 'U_peak ≈ 14.5 V ; 未滤波时周期归零，滤波后平直 ≥ 12 V',
            evaluate: (ctx) => {
              const vInst = getTel(ctx, 'vm_dc')?.voltageDrop ?? 0;
              const vRms = getTel(ctx, 'vm_dc')?.vRms ?? vInst;
              const kClosed = boolProp(ctx, 'k_cap', 'closed', false);
              return {
                expression: kClosed ? '470µF 水库平波已投运' : '无电容滤波 (半波归零跳变)',
                result: `当前 U_dc = ${fmtV(vInst)} (有效值 ${vRms.toFixed(1)}V)`,
                status: kClosed && vRms >= 11.5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l12s2-cap',
            label: '投入滤波电容开关 K_cap',
            targetId: 'k_cap',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：二极管单向导电斩波', type: 'DIODE', componentId: 'd1', stepIndex: 1 },
          { label: '思索：电容蓄能平波作用', type: 'CAPACITOR', componentId: 'c_filt', stepIndex: 0 },
        ],
        checkpoint: {
          title: '合上 K_cap 完成直流平滑滤波（母线稳于 ≥ 11.5V）',
          instruction: '闭合开关 K_cap 投入 470µF 电容，观察示波器原本间歇归零的脉动波形瞬间抬升抹平！',
          check: (ctx) => {
            const kClosed = boolProp(ctx, 'k_cap', 'closed', false);
            const vInst = getTel(ctx, 'vm_dc')?.voltageDrop ?? 0;
            const vRms = getTel(ctx, 'vm_dc')?.vRms ?? vInst;
            const ok = kClosed && vRms >= 11.5 && vInst >= 11.0;
            return {
              passed: ok,
              message: ok
                ? `平波直流建立！当前 ${fmtV(vInst)} (有效值 ${vRms.toFixed(1)}V)`
                : `尚未平稳滤波 (当前 ${fmtV(vInst)})，请闭合 K_cap`,
            };
          },
          autoDemo: {
            buttonLabel: '一键合上 K_cap 观察半波平滑为稳态直流',
            description: '投入 470µF 电容把脉动波转化为平滑直流母线',
            actions: [{ kind: 'setProp', componentId: 'k_cap', key: 'closed', value: true }],
          },
        },
      },

      {
        id: 'l12-s3',
        stageNumber: 3,
        title: '第三级：齐纳二极管反向钳位输出标准 5V 稳压电源！',
        badge: 'Step 3 · 终极 5V 稳压',
        conceptGoal: '未稳压前 ~9V 会把娇嫩的 5V/0.25W 指示灯推入过载红区；接入 5.1V 齐纳管即可稳压在 5.1V 拯救负载！',
        explanation:
          '这便是从墙插 220V~ 制造一台桌面 5V 直流稳压电源的完整链路！过滤后的 13V 高直流经限流电阻 Rz (47Ω) 喂给 5V 小灯泡 L_5V。由于此时开关 K_zener 断开，L_5V 被迫承受 8.8V 严重过载！闭合 K_zener 让 5.1V 齐纳管（阴极 k 朝 + 轨、阳极 a 接地）进入反向稳压击穿区，一举把输出牢牢钉在 5.1V 保护 L_5V 安全明亮！',
        analogy: '在水槽边装设一座定高 5.1 米的精密溢流坝：上游来水再高再晃荡，超出部分都会自动从齐纳溢流道旁路泄走，下游永远平稳保持 5.1 米！',
        highlights: ['dz1', 'k_zener', 'l_5v', 'vm_out'],
        newlyAddedIds: ['r_z', 'k_zener', 'dz1', 'l_5v', 'vm_out'],
        defaultTimeScale: 0.05,
        prewarmSeconds: 0.16,
        preferredAnalysisTab: 'telemetry',
        scopeChannels: ['vm_out'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '市电 220V~', 70, 270, 270, {
              amplitude: 311.13,
              frequency: 50,
              phase: 0,
            }),
            mkComp('xf1', 'TRANSFORMER', 'XF1 (k=0.05)', 190, 270, 0, { ratio: 0.05 }),
            mkComp('d1', 'DIODE', 'D1 整流', 310, 170, 0),
            mkComp('c_filt', 'CAPACITOR', 'C1 (470µF)', 380, 280, 90, { capacitance: 470 }),
            mkComp('r_z', 'RESISTOR', 'R_z (47Ω)', 480, 170, 0, { resistance: 47, maxPower: 5 }),
            mkComp('k_zener', 'SWITCH_SPST', 'K_稳压开关', 590, 220, 90, { closed: false }),
            mkComp('dz1', 'ZENER_DIODE', 'DZ1 (5.1V)', 590, 330, 90, { vz: 5.1, maxPower: 2.0 }),
            mkComp('l_5v', 'LAMP', '5V 负载灯', 710, 270, 90, { ratedVoltage: 5, ratedPower: 0.25 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_OUT (稳压输出)', 820, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND1', 70, 410, 0),
            mkComp('gnd2', 'GROUND', 'GND2', 590, 420, 0),
          ],
          [
            ['ac1', 'pos', 'xf1', 'p1', '#ef4444'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['xf1', 'p2', 'gnd1', 'gnd', '#475569'],

            ['xf1', 's1', 'd1', 'anode', '#f59e0b'],
            ['d1', 'cathode', 'c_filt', 'pos', '#38bdf8'],
            ['c_filt', 'neg', 'gnd2', 'gnd', '#475569'],
            ['xf1', 's2', 'gnd2', 'gnd', '#475569'],

            ['d1', 'cathode', 'r_z', 'a', '#38bdf8'],
            // Regulated +5V rail = r_z.b = k_zener.a = l_5v.p1 = vm_out.pos
            ['r_z', 'b', 'k_zener', 'a', '#10b981'],
            ['k_zener', 'b', 'dz1', 'k', '#10b981'],
            ['dz1', 'a', 'gnd2', 'gnd', '#475569'],

            ['r_z', 'b', 'l_5v', 'p1', '#fde047'],
            ['l_5v', 'p2', 'gnd2', 'gnd', '#475569'],
            ['r_z', 'b', 'vm_out', 'pos', '#a855f7'],
            ['gnd2', 'gnd', 'vm_out', 'neg', '#64748b'],
          ],
          'l12s3'
        ),
        liveFormulas: [
          {
            id: 'f-zener-5v',
            title: '齐纳稳压钳位与负载保护状态',
            formula: 'U_out ≈ V_Z (5.1 V) ; R_z 吸收其余压差',
            evaluate: (ctx) => {
              const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const over = Boolean(getTel(ctx, 'l_5v')?.overloaded);
              const kOn = boolProp(ctx, 'k_zener', 'closed', false);
              return {
                expression: kOn ? '5.1V 齐纳反向击穿钳位已上线' : '未接入稳压 (L_5V 过压超负荷中!)',
                result: `输出 U_out = ${fmtV(vOut)} · ${over ? '过载告警!' : '安全 5V 供电'}`,
                status: kOn && !over && vOut >= 4.7 && vOut <= 5.6 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l12s3-z',
            label: '闭合齐纳稳压开关 K_稳压',
            targetId: 'k_zener',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：齐纳管反向击穿稳压', type: 'ZENER_DIODE', componentId: 'dz1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '闭合稳压管开关使输出稳于 4.7~5.6V 且解除灯泡过载！',
          instruction: '合上 K_稳压 接入 5.1V 齐纳管，瞬间将过压输出钉在 ~5.1V，拯救 5V 负载灯并通关全部本科电工学上册课程！',
          check: (ctx) => {
            const kOn = boolProp(ctx, 'k_zener', 'closed', false);
            const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const over = Boolean(getTel(ctx, 'l_5v')?.overloaded);
            const ok = kOn && !over && vOut >= 4.7 && vOut <= 5.6;
            return {
              passed: ok,
              message: ok
                ? `恭喜通关！5V 线性稳压电源建成：U_out = ${fmtV(vOut)}，过载解除！`
                : `当前 U_out = ${fmtV(vOut)}${over ? '（负载过载，请闭合齐纳稳压）' : ''}`,
            };
          },
          autoDemo: {
            buttonLabel: '一键闭合 K_稳压 开启 5.1V 稳压输出',
            description: '接入 5.1V 齐纳管把母线钳位至 ~5.1V 并消除 5V 灯过载',
            actions: [{ kind: 'setProp', componentId: 'k_zener', key: 'closed', value: true }],
          },
        },
      },
    ],
  },
];
