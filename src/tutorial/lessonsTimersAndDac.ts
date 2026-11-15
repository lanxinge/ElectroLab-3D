import { fmtV, getTel, mkCircuit, mkComp, numProp } from './tutorialHelpers';
import type { TutorialLesson } from './tutorialTypes';

export const LESSONS_TIMERS_DAC: TutorialLesson[] = [
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
            step: 0.1,
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
            step: 1000,
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
];
