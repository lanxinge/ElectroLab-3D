import { boolProp, fmtI, fmtV, getTel, mkCircuit, mkComp, numProp } from './tutorialHelpers';
import type { TutorialLesson } from './tutorialTypes';

export const LESSONS_VOL2_POWER: TutorialLesson[] = [
  // Lesson 19 (Ch.10): 串联负反馈稳压电源综合设计
  // =========================================================================
  {
    id: 'ch10-linear-series-regulator',
    chapterId: 'ch10',
    lessonNumber: 19,
    title: '直流稳压电源系统：扩流串联型稳压器综合设计',
    subtitle: '把稳压二极管、射极跟随器与运放负反馈串联组合，亲手搭出可调输出且大负载不掉压的完整 AC→DC 稳压电源',
    textbookRef: '第10章 10.1–10.3 串联型稳压电路（射极扩流、运放取样与系统集成）',
    difficulty: '综合',
    durationMin: 18,
    prerequisites: ['ch7-diodes-and-rectifiers', 'ch9-opamp-negative-feedback'],
    learningObjectives: [
      '理解仅靠稳压管无力直接供给大电流，需串接调整三极管射极扩流 β 倍的原理',
      '会精确推导由运放+参考源+分压取样组成的串联可调稳压公式 Vo = (1 + Rtop/Rbot)·Vref',
      '验证整套从 220V/交流→整流→滤波→精密反馈稳压的系统应对负载突变的稳定性',
    ],
    stages: [
      {
        id: 'l19-s1',
        stageNumber: 1,
        title: 'NPN 调整管射极跟随扩流稳压',
        badge: 'Step 1 · 射极扩流',
        conceptGoal: '稳压二极管只需在基极提供不到 1mA 的小基准电流，即能凭借调整管 β=100 的放大倍支撑起上百毫安负载！',
        explanation:
          '前面第 13 课的单纯齐纳电路面对重负载一接就塌电压，因为大电流全走限流电阻把压降拽垮了。现在我们在稳压管（Vz=5.6V）后面接上一颗大功率调整三极管：集电极直接从 12V 电源取大电流，基极只吃不到 0.5mA 微流，射极稳定流出 Vz - Vbe ≈ 5.0V。闭合重负载开关 K_load 验证压降几乎纹丝不动！',
        analogy: '就像特种部队前线观察哨：精准小基准只管轻轻标示海拔 5.6 米高线（V_Z），后面上百毫安搬运工重活全由功率大管（调整管）扛下！',
        highlights: ['dz', 'q_pass', 'k_load', 'vm_out'],
        newlyAddedIds: ['q_pass', 'k_load'],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin (12V)', 90, 240, 270, { voltage: 12 }),
            mkComp('rz', 'RESISTOR', 'Rz (1kΩ)', 210, 120, 0, { resistance: 1000 }),
            mkComp('dz', 'ZENER_DIODE', 'Dz (Vz=5.6V)', 280, 290, 270, { vz: 5.6 }),
            mkComp('q_pass', 'BJT_NPN', 'Q_pass 调整管', 420, 180, 0, { beta: 100, maxPower: 2 }),
            mkComp('rl_bleed', 'RESISTOR', '基础假负载 (2kΩ)', 530, 320, 90, { resistance: 2000 }),
            mkComp('k_load', 'SWITCH_SPST', 'K_Load 重负载开关', 600, 180, 0, { closed: false }),
            mkComp('am_load', 'AMMETER', 'PA 负载电流', 700, 180, 0, { mode: 'dc' }),
            mkComp('rl_heavy', 'RESISTOR', '重负载 (100Ω)', 750, 310, 90, { resistance: 100 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 输出', 620, 340, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 380, 430, 0),
          ],
          [
            ['vin', 'pos', 'rz', 'a', '#ef4444'],
            ['vin', 'pos', 'q_pass', 'c', '#ef4444'],
            ['rz', 'b', 'dz', 'k', '#f59e0b'],
            ['dz', 'k', 'q_pass', 'b', '#38bdf8'],
            ['dz', 'a', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'rl_bleed', 'a', '#22c55e'],
            ['rl_bleed', 'b', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'k_load', 'a', '#22c55e'],
            ['k_load', 'b', 'am_load', 'pos', '#22c55e'],
            ['am_load', 'neg', 'rl_heavy', 'a', '#22c55e'],
            ['rl_heavy', 'b', 'gnd1', 'gnd', '#475569'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l19s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l19-s1-f1',
            title: '扩流稳压输出电流与管压保持',
            formula: 'Vo = Vz - Vbe ≈ 5.0V ；驱动电流高达几十毫安而不塌陷',
            evaluate: (ctx) => {
              const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const iLoad = getTel(ctx, 'am_load')?.current ?? 0;
              return {
                expression: `重负载电流 I_L = ${fmtI(iLoad)}`,
                result: `稳压输出 Vo = ${fmtV(vOut)}`,
                status: iLoad >= 0.04 && vOut >= 4.7 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l19-kl',
            label: '接入 100Ω 重负载开关 K_Load',
            targetId: 'k_load',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [{ label: '思索：射极跟随电流缓冲机制', type: 'BJT_NPN', componentId: 'q_pass', stepIndex: 2 }],
        checkpoint: {
          title: '抗住 100Ω 重负载保持 ~5V 稳压',
          instruction: '闭合开关 K_Load 接入 ~50mA 负载电流，检验输出端仍挺立在 ≥ 4.7V。',
          check: (ctx) => {
            const closed = boolProp(ctx, 'k_load', 'closed');
            const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const iLoad = getTel(ctx, 'am_load')?.current ?? 0;
            const ok = closed && iLoad >= 0.04 && vOut >= 4.7;
            return {
              passed: ok,
              message: ok
                ? `扩流成功扛住负载！I_L = ${fmtI(iLoad)}，Vo 坚挺维持在 ${vOut.toFixed(2)}V`
                : `当前 K_Load=${closed ? '闭合' : '断开'}，I_L=${fmtI(iLoad)}，Vo=${vOut.toFixed(2)}V`,
            };
          },
          autoDemo: {
            buttonLabel: '接入重负载 K_Load',
            description: '闭合开关接通 100Ω 负载检验扩流稳压性能',
            actions: [{ kind: 'setProp', componentId: 'k_load', key: 'closed', value: true }],
          },
        },
      },
      {
        id: 'l19-s2',
        stageNumber: 2,
        title: '运放取样负反馈可调串联稳压器 (LM78xx 核心架构)',
        badge: 'Step 2 · 闭环可调稳压',
        conceptGoal: '用集成运放精确对比取样分压 V_fb 与齐纳基准 V_ref，从而动态压榨调整管输出精准 Vo = (1 + R_top/R_bot)·Vref。',
        explanation:
          '光靠三极管开环跟随时 Vbe 随温度和电流变化会导致约 0.1~0.2V 误差；工业级串联稳压电源核心（如图）在调整管前加了一颗集成运放！由 2.5V 精密基准源入（+），输出端经 R_top / R_bot 取样分压送入（-）。负反馈强制 V_fb = 2.5V，完全自动补偿掉三极管一切压降！把 R_top 调至 26kΩ，立即精准输出 +9.0V！',
        analogy: '就像电子巡航系统：车速传感器（取样分压）与目标值（2.5V基准）时刻交由大脑（运放）精密比对后实时调节油门（调整管基极），连上坡或载重变化都被全数抵消！',
        highlights: ['u1', 'r_top', 'r_bot', 'vm_out'],
        newlyAddedIds: ['u1', 'r_top', 'r_bot'],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin 未稳高压 (14V)', 80, 230, 270, { voltage: 14 }),
            mkComp('rz', 'RESISTOR', 'Rz (1kΩ)', 180, 150, 90, { resistance: 1000 }),
            mkComp('dz', 'ZENER_DIODE', '基准源 (2.5V)', 180, 300, 270, { vz: 2.5 }),
            mkComp('u1', 'OPAMP', '比较放大器', 350, 220, 0, { railPos: 13.5, railNeg: 0, gain: 100000 }),
            mkComp('q_pass', 'BJT_NPN', 'Q_pass 调整管', 520, 140, 0, { beta: 120, maxPower: 3 }),
            mkComp('r_top', 'RESISTOR', 'R_top 取样上阻', 560, 250, 90, { resistance: 10000 }),
            mkComp('r_bot', 'RESISTOR', 'R_bot (10kΩ)', 560, 360, 90, { resistance: 10000 }),
            mkComp('rl', 'RESISTOR', 'RL (200Ω)', 690, 270, 90, { resistance: 200 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 稳压出力', 790, 270, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 360, 440, 0),
          ],
          [
            ['vin', 'pos', 'q_pass', 'c', '#ef4444'],
            ['vin', 'pos', 'rz', 'a', '#ef4444'],
            ['rz', 'b', 'dz', 'k', '#f59e0b'],
            ['dz', 'k', 'u1', 'inp', '#38bdf8'],
            ['dz', 'a', 'gnd1', 'gnd', '#475569'],
            ['u1', 'out', 'q_pass', 'b', '#22c55e'],
            ['q_pass', 'e', 'rl', 'a', '#f59e0b'],
            ['q_pass', 'e', 'r_top', 'a', '#a855f7'],
            ['r_top', 'b', 'r_bot', 'a', '#a855f7'],
            ['r_top', 'b', 'u1', 'inm', '#22d3ee'],
            ['r_bot', 'b', 'gnd1', 'gnd', '#475569'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'vm_out', 'pos', '#ec4899'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l19s2'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l19-s2-f1',
            title: '串联取样反馈输出方程',
            formula: 'Vo = (1 + R_top / 10kΩ) × Vref(≈2.55V)',
            evaluate: (ctx) => {
              const rtop = numProp(ctx, 'r_top', 'resistance', 10000);
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `目标调压倍数 = ${(1 + rtop / 10000).toFixed(2)}× (Rtop=${(rtop / 1000).toFixed(0)}kΩ)`,
                result: `实测输出 Vo = ${fmtV(vout)}`,
                status: vout >= 8.7 && vout <= 9.5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l19-rtop',
            label: '调整取样电阻 R_top (Ω)',
            targetId: 'r_top',
            propKey: 'resistance',
            kind: 'slider',
            min: 10000,
            max: 34000,
            step: 2000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：运放高精度闭环跟随', type: 'OPAMP', componentId: 'u1', stepIndex: 1 }],
        checkpoint: {
          title: '无级程控稳压输出至 +9.0V',
          instruction: '调整上拉取样电阻 R_top 至 26kΩ 左右，验证精密闭环将稳压输出设定在 8.7V~9.5V。',
          check: (ctx) => {
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = vout >= 8.7 && vout <= 9.5;
            return {
              passed: ok,
              message: ok
                ? `闭环可调稳压输出精准停在 ${vout.toFixed(2)}V（彻底消除了 BJT 自身 Vbe 压降温漂！）`
                : `当前稳压输出 Vo = ${vout.toFixed(2)}V（调高 R_top 使输出达 8.7~9.5V）`,
            };
          },
          autoDemo: {
            buttonLabel: '调至 26kΩ 设定 9V 输出',
            description: '将 R_top 设为 26kΩ 使闭环稳压稳定输出约 9.1V',
            actions: [{ kind: 'setProp', componentId: 'r_top', key: 'resistance', value: 26000 }],
          },
        },
      },
      {
        id: 'l19-s3',
        stageNumber: 3,
        title: '全栈 AC→DC 线性稳压系统重载突变实战',
        badge: 'Step 3 · 模电大成系统',
        conceptGoal: '打通工频交流、全波整流桥、大电容储能滤波与运放串联闭环稳压四大子系统，迎接 10 倍负载阶跃大考！',
        explanation:
          '这是一套完整工作台级 AC→DC +5V 直流稳压电源！前级由 16V 50Hz 正弦波经全波桥式整流与 1000µF 滤波后提供带纹波直流原液（约 14V），后级串联闭环运放+调整管负责精准削平一切波动并死锁 +5.1V 输出！请闭合突加负载开关 K_load 瞬间叠入 +85mA 重负载（总电流达 95mA），观察闭环出力能稳如磐石！',
        analogy: '就像从澎湃变幻的原水河谷引水经过沉沙池（滤波）与自动定压净水总阀（运放调整管），就算城市用水量突然暴增十倍，龙头流出的压差仍旧恒稳无波澜！',
        highlights: ['ac1', 'c_filt', 'u1', 'q_pass', 'k_load', 'vm_out'],
        newlyAddedIds: ['d1', 'd2', 'd3', 'd4', 'c_filt'],
        defaultTimeScale: 0.2,
        prewarmSeconds: 0.25,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['c_filt', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '交流 16V 50Hz', 60, 220, 270, {
              amplitude: 16,
              frequency: 50,
              phase: 0,
              dcOffset: 0,
              waveform: 'sine',
            }),
            mkComp('d1', 'DIODE', 'D1', 160, 110, 0, {}),
            mkComp('d2', 'DIODE', 'D2', 160, 190, 0, {}),
            mkComp('d3', 'DIODE', 'D3', 160, 270, 180, {}),
            mkComp('d4', 'DIODE', 'D4', 160, 350, 180, {}),
            mkComp('c_filt', 'CAPACITOR', '滤波 1000µF', 270, 230, 90, { capacitance: 1000 }),
            mkComp('rz', 'RESISTOR', 'Rz (1kΩ)', 360, 140, 90, { resistance: 1000 }),
            mkComp('dz', 'ZENER_DIODE', 'Dz (2.5V)', 360, 300, 270, { vz: 2.5 }),
            mkComp('u1', 'OPAMP', '稳压误差放大器', 470, 220, 0, { railPos: 14, railNeg: 0, gain: 100000 }),
            mkComp('q_pass', 'BJT_NPN', 'Q_pass (β=150)', 600, 120, 0, { beta: 150, maxPower: 4 }),
            mkComp('r_top', 'RESISTOR', 'R_top (10kΩ)', 610, 250, 90, { resistance: 10000 }),
            mkComp('r_bot', 'RESISTOR', 'R_bot (10kΩ)', 610, 350, 90, { resistance: 10000 }),
            mkComp('rl1', 'RESISTOR', '常驻负载 (500Ω)', 690, 280, 90, { resistance: 500 }),
            mkComp('k_load', 'SWITCH_SPST', 'K_Load 重载冲击', 690, 100, 0, { closed: false }),
            mkComp('am_load', 'AMMETER', 'PA_总重载电流', 770, 140, 90, { mode: 'dc' }),
            mkComp('rl2', 'RESISTOR', '突加负载 (60Ω)', 770, 280, 90, { resistance: 60 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out (稳5V)', 850, 280, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 360, 440, 0),
          ],
          [
            ['ac1', 'pos', 'd1', 'anode', '#ef4444'],
            ['ac1', 'pos', 'd3', 'cathode', '#ef4444'],
            ['ac1', 'neg', 'd2', 'anode', '#38bdf8'],
            ['ac1', 'neg', 'd4', 'cathode', '#38bdf8'],
            ['d1', 'cathode', 'c_filt', 'pos', '#f59e0b'],
            ['d2', 'cathode', 'c_filt', 'pos', '#f59e0b'],
            ['d3', 'anode', 'gnd1', 'gnd', '#475569'],
            ['d4', 'anode', 'gnd1', 'gnd', '#475569'],
            ['c_filt', 'neg', 'gnd1', 'gnd', '#475569'],
            ['c_filt', 'pos', 'q_pass', 'c', '#ef4444'],
            ['c_filt', 'pos', 'rz', 'a', '#ef4444'],
            ['rz', 'b', 'dz', 'k', '#f59e0b'],
            ['dz', 'k', 'u1', 'inp', '#38bdf8'],
            ['dz', 'a', 'gnd1', 'gnd', '#475569'],
            ['u1', 'out', 'q_pass', 'b', '#22c55e'],
            ['q_pass', 'e', 'rl1', 'a', '#22c55e'],
            ['rl1', 'b', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'r_top', 'a', '#a855f7'],
            ['r_top', 'b', 'r_bot', 'a', '#a855f7'],
            ['r_top', 'b', 'u1', 'inm', '#22d3ee'],
            ['r_bot', 'b', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'k_load', 'a', '#22c55e'],
            ['k_load', 'b', 'am_load', 'pos', '#22c55e'],
            ['am_load', 'neg', 'rl2', 'a', '#22c55e'],
            ['rl2', 'b', 'gnd1', 'gnd', '#475569'],
            ['q_pass', 'e', 'vm_out', 'pos', '#ec4899'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l19s3'
        ),
        liveFormulas: [
          {
            id: 'l19-s3-f1',
            title: '整机抗纹波与负载突变稳定表现',
            formula: '滤后脉动电压 V_raw(≈14V) → 闭环精准稳压 Vo ≈ 5.10V',
            evaluate: (ctx) => {
              const vRaw = getTel(ctx, 'c_filt')?.voltageDrop ?? 0;
              const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const iHeavy = getTel(ctx, 'am_load')?.current ?? 0;
              return {
                expression: `前级滤波脉压=${fmtV(vRaw)} | 冲击负载=${fmtI(iHeavy)}`,
                result: `稳压直流输出 Vo = ${fmtV(vOut)}`,
                status: iHeavy >= 0.075 && vOut >= 4.8 && vOut <= 5.3 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l19-kheavy',
            label: '突加 60Ω 冲击负载开关 K_Load',
            targetId: 'k_load',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：整流滤波总控链', type: 'CAPACITOR', componentId: 'c_filt', stepIndex: 0 },
          { label: '思索：误差运放串联调整级', type: 'OPAMP', componentId: 'u1', stepIndex: 1 },
        ],
        checkpoint: {
          title: '完成重载冲击下的 +5V 稳压系统验证',
          instruction: '闭合 K_Load 叠入 > 75mA 冲击负载电流，验证完整稳压系统依然保持 4.8V ≤ Vo ≤ 5.3V。',
          check: (ctx) => {
            const closed = boolProp(ctx, 'k_load', 'closed');
            const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const iHeavy = getTel(ctx, 'am_load')?.current ?? 0;
            const ok = closed && iHeavy >= 0.075 && vOut >= 4.8 && vOut <= 5.3;
            return {
              passed: ok,
              message: ok
                ? `AC→DC 线性电源大考通过！冲击 ${fmtI(iHeavy)} 下输出牢控在 ${vOut.toFixed(2)}V！`
                : `当前 K_Load=${closed ? '闭合' : '断开'}，冲击电流 ${fmtI(iHeavy)}，输出 ${vOut.toFixed(2)}V`,
            };
          },
          autoDemo: {
            buttonLabel: '闭合 K_Load 进行重载冲击测试',
            description: '闭合开关加挂 60Ω 重负载考验全栈稳压电源',
            actions: [{ kind: 'setProp', componentId: 'k_load', key: 'closed', value: true }],
          },
        },
      },
    ],
  },
];
