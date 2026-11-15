import { LESSONS_VOL2_POWER } from './lessonsVol2Power';
import { getDefaultTruthChipConfig } from '../engine/customIcEngine';
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

void getDefaultTruthChipConfig;

export const LESSONS_VOL2_ANALOG: TutorialLesson[] = [
  // =========================================================================
  // Lesson 13 (Ch.7): 半导体PN结、桥式整流与齐纳稳压
  // =========================================================================
  {
    id: 'ch7-diodes-and-rectifiers',
    chapterId: 'ch7',
    lessonNumber: 13,
    title: 'PN 结单向导电、桥式整流与齐纳稳压',
    subtitle: '理解半导体非线性伏安特性，亲手组装交流变直流桥式整流器并验证稳压管反向击穿钳位',
    textbookRef: '第7章 7.1–7.3 半导体二极管、整流滤波电路与稳压二极管',
    difficulty: '基础',
    durationMin: 14,
    prerequisites: ['ch6-transformer-rectifier'],
    learningObjectives: [
      '掌握二极管正偏导通（硅管约 0.7V）、反偏截止与死区压降的物理规律',
      '理解四只二极管全波桥式整流的工作电流路径及电容滤波对纹波的平波作用',
      '会运用齐纳稳压二极管的反向击穿特性搭建稳压输出级与过压限幅保护',
    ],
    stages: [
      {
        id: 'l13-s1',
        stageNumber: 1,
        title: 'PN 结的单向导电与死区门槛',
        badge: 'Step 1 · PN结开关',
        conceptGoal: '正向电压越过约 0.6~0.7V 开启电压后电流呈指数剧增；反向加压则耗尽层加宽近似断路。',
        explanation:
          '当前直流源 Vs 处于 -5V 反偏状态，二极管 D1 内部势垒区变宽，回路电流几乎为 0 mA，全部 -5V 电压都落在 D1 两端。试把 Vs 调高至 +5V（正偏），当外加电场抵消内部内建电场（硅管约 0.65~0.72V）后，电流沿阳极 A→阴极 K 顺畅流通！',
        analogy: '就像装在水管里的单向止回阀：正向水压要先顶开一根约 0.7V 的轻弹簧才能放行，反向水压则会把阀芯死死压紧在阀座上。',
        highlights: ['d1', 'am1', 'vm_d'],
        newlyAddedIds: ['vs', 'r1', 'd1', 'am1', 'vm_d'],
        circuit: mkCircuit(
          [
            mkComp('vs', 'DC_SOURCE', 'Vs 输入源', 110, 230, 270, { voltage: -5 }),
            mkComp('r1', 'RESISTOR', 'R1 (470Ω)', 270, 140, 0, { resistance: 470, maxPower: 1 }),
            mkComp('am1', 'AMMETER', 'PA 回路电流', 430, 140, 0, { mode: 'dc' }),
            mkComp('d1', 'DIODE', 'D1 硅二极管', 590, 230, 90, {}),
            mkComp('vm_d', 'VOLTMETER', 'PV_D 管压降', 720, 230, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 360, 0),
          ],
          [
            ['vs', 'pos', 'r1', 'a', '#ef4444'],
            ['r1', 'b', 'am1', 'pos', '#f59e0b'],
            ['am1', 'neg', 'd1', 'anode', '#38bdf8'],
            ['d1', 'cathode', 'gnd1', 'gnd', '#475569'],
            ['vs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['d1', 'anode', 'vm_d', 'pos', '#a855f7'],
            ['d1', 'cathode', 'vm_d', 'neg', '#475569'],
          ],
          'l13s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l13-s1-f1',
            title: '二极管实测管压降与电流',
            formula: 'I_D = (Vs - V_D) / R1 （正偏 V_D ≈ 0.7V；反偏 I_D ≈ 0）',
            evaluate: (ctx) => {
              const vs = numProp(ctx, 'vs', 'voltage', -5);
              const vd = getTel(ctx, 'vm_d')?.voltageDrop ?? 0;
              const id = getTel(ctx, 'am1')?.current ?? 0;
              return {
                expression: `Vs=${vs.toFixed(1)}V, V_D=${fmtV(vd)}`,
                result: `I_D = ${fmtI(id)}`,
                status: id > 0.005 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l13-vs',
            label: '调节输入电压 Vs',
            targetId: 'vs',
            propKey: 'voltage',
            kind: 'slider',
            min: -6,
            max: 9,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：PN 结耗尽层与伏安曲线', type: 'DIODE', componentId: 'd1', stepIndex: 0 }],
        checkpoint: {
          title: '克服 PN 结死区正向导通',
          instruction: '将输入电压 Vs 调至 +5V 及以上，使二极管正向导通并建立约 0.6~0.8V 管压降、回路电流超过 6 mA。',
          hint: '拖动滑块令 Vs ≥ 5V 即可看到硅管开启导通。',
          check: (ctx) => {
            const vd = getTel(ctx, 'vm_d')?.voltageDrop ?? 0;
            const id = getTel(ctx, 'am1')?.current ?? 0;
            const ok = vd >= 0.55 && vd <= 0.85 && id >= 0.006;
            return {
              passed: ok,
              message: ok
                ? `正向导通验证成功：V_D = ${vd.toFixed(2)}V，I_D = ${fmtI(id)}！`
                : `当前 V_D = ${vd.toFixed(2)}V，I_D = ${fmtI(id)}（需正偏且 I ≥ 6mA）`,
            };
          },
          autoDemo: {
            buttonLabel: '自动正偏至 +5V',
            description: '设置 Vs = +5V 使硅二极管正偏导通',
            actions: [{ kind: 'setProp', componentId: 'vs', key: 'voltage', value: 5 }],
          },
        },
      },
      {
        id: 'l13-s2',
        stageNumber: 2,
        title: '全波桥式整流与电容平滑滤波',
        badge: 'Step 2 · 桥式整流滤波',
        conceptGoal: '四只二极管交替导通把正负交流电全部翻折到正半周，并联大电容储存峰值并填充谷底。',
        explanation:
          '半波整流会白白丢掉负半周能量；全波整流桥让正半周经 D1→负载→D4 返回，负半周经 D2→负载→D3 返回，负载电流始终同向！当前滤波开关 Kf 断开，示波器上呈现 20Hz 的馒头波脉冲。闭合 Kf 并入 470µF 大电容后，输出将被平波为平稳直流。',
        analogy: '就像两队轮班的搬运工交替把正反向水流都泵入同一座高位蓄水塔，水塔（电容）则在交接间隙靠蓄水稳住出口水压。',
        highlights: ['d1', 'd2', 'k_f', 'cf', 'vm_out'],
        newlyAddedIds: ['d2', 'd3', 'd4', 'k_f', 'cf'],
        defaultTimeScale: 0.4,
        prewarmSeconds: 0.2,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['ac1', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', 'AC 10V 10Hz', 100, 240, 270, {
              amplitude: 10,
              frequency: 10,
              phase: 0,
              dcOffset: 0,
              waveform: 'sine',
            }),
            mkComp('d1', 'DIODE', 'D1', 260, 140, 0, {}),
            mkComp('d2', 'DIODE', 'D2', 260, 230, 0, {}),
            mkComp('d3', 'DIODE', 'D3', 260, 320, 180, {}),
            mkComp('d4', 'DIODE', 'D4', 260, 410, 180, {}),
            mkComp('k_f', 'SWITCH_SPST', 'Kf 滤波开关', 470, 130, 0, { closed: false }),
            mkComp('cf', 'CAPACITOR', 'Cf (470µF)', 580, 240, 90, { capacitance: 470 }),
            mkComp('rl', 'RESISTOR', 'RL (1kΩ)', 460, 280, 90, { resistance: 1000, maxPower: 2 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_DC 输出', 710, 240, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND (-)', 260, 490, 0),
          ],
          [
            ['ac1', 'pos', 'd1', 'anode', '#ef4444'],
            ['ac1', 'pos', 'd3', 'cathode', '#ef4444'],
            ['ac1', 'neg', 'd2', 'anode', '#38bdf8'],
            ['ac1', 'neg', 'd4', 'cathode', '#38bdf8'],
            ['d1', 'cathode', 'rl', 'a', '#f59e0b'],
            ['d2', 'cathode', 'rl', 'a', '#f59e0b'],
            ['d3', 'anode', 'gnd1', 'gnd', '#475569'],
            ['d4', 'anode', 'gnd1', 'gnd', '#475569'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['rl', 'a', 'k_f', 'a', '#22c55e'],
            ['k_f', 'b', 'cf', 'pos', '#22c55e'],
            ['cf', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rl', 'a', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l13s2'
        ),
        liveFormulas: [
          {
            id: 'l13-s2-f1',
            title: '整流直流峰值与电容滤波',
            formula: 'V_DC_peak = V_m - 2·V_D ≈ 8.6V，时间常数 τ = RL·Cf = 0.47s',
            evaluate: (ctx) => {
              const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const filtered = boolProp(ctx, 'k_f', 'closed');
              return {
                expression: `滤波电容 ${filtered ? '已并入 (470µF)' : '未投入'}`,
                result: `当前输出 Vo = ${fmtV(vOut)}`,
                status: filtered && vOut > 7.2 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l13-kf',
            label: '滤波电容开关 Kf',
            targetId: 'k_f',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：二极管桥向单向导出', type: 'DIODE', componentId: 'd1', stepIndex: 1 },
          { label: '思索：电容蓄能平波机制', type: 'CAPACITOR', componentId: 'cf', stepIndex: 0 },
        ],
        checkpoint: {
          title: '投入滤波电容平抑纹波',
          instruction: '闭合滤波开关 Kf 接入 470µF 电容，使直流输出电压稳定保持在 7.2V 以上。',
          check: (ctx) => {
            const closed = boolProp(ctx, 'k_f', 'closed');
            const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = closed && vOut > 7.2;
            return {
              passed: ok,
              message: ok
                ? `全波整流 + 电容滤波稳住直流输出 Vo = ${vOut.toFixed(2)}V！`
                : `当前 Kf=${closed ? '闭合' : '断开'}，输出 Vo=${vOut.toFixed(2)}V（需闭合并使 Vo > 7.2V）`,
            };
          },
          autoDemo: {
            buttonLabel: '投入滤波电容 Kf',
            description: '闭合开关 Kf 将 470µF 滤波电容接入整流输出端',
            actions: [{ kind: 'setProp', componentId: 'k_f', key: 'closed', value: true }],
          },
        },
      },
      {
        id: 'l13-s3',
        stageNumber: 3,
        title: '齐纳二极管反向击穿与稳压钳位',
        badge: 'Step 3 · Zener 稳压',
        conceptGoal: '稳压管专门工作在可控反向击穿区：哪怕输入大幅升至 12V，输出仍被死死钳在 Vz ≈ 5.1V。',
        explanation:
          '普通二极管怕反向击穿，而齐纳二极管（稳压管）刻意反向安装（阴极 K 接正电、阳极 A 接地）。当输入 Vin = 3V 时分压仅 2.5V < Vz，稳压管截止；把 Vin 升至 12V 时，一旦反压超过 5.1V 稳压值，多余的电流立刻被稳压管经限流电阻 Rz 泄流吸收，牢牢保住负载 5.1V。',
        analogy: '就像大坝高程 5.1 米处开的溢流闸门：水库水位低于 5.1 米时滴水不漏，洪水来袭涨过门槛后立刻全速泄洪，使下游水位恒定。',
        highlights: ['dz', 'am_z', 'vm_out'],
        newlyAddedIds: ['dz', 'rz', 'am_z'],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin 波动源', 110, 240, 270, { voltage: 3 }),
            mkComp('rz', 'RESISTOR', 'Rz 限流 (200Ω)', 270, 140, 0, { resistance: 200, maxPower: 2 }),
            mkComp('dz', 'ZENER_DIODE', 'Dz (Vz=5.1V)', 440, 220, 270, { vz: 5.1 }),
            mkComp('am_z', 'AMMETER', 'PA_Z 稳压电流', 440, 340, 90, { mode: 'dc' }),
            mkComp('rl', 'RESISTOR', 'RL (1kΩ)', 600, 250, 90, { resistance: 1000, maxPower: 1 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 稳压输出', 740, 250, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 420, 0),
          ],
          [
            ['vin', 'pos', 'rz', 'a', '#ef4444'],
            ['rz', 'b', 'dz', 'k', '#f59e0b'],
            ['dz', 'k', 'rl', 'a', '#22c55e'],
            ['dz', 'a', 'am_z', 'pos', '#38bdf8'],
            ['am_z', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rl', 'a', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l13s3'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l13-s3-f1',
            title: '串联限流与齐纳泄流平衡',
            formula: 'I_R = (Vin - Vout) / Rz = I_Z + I_L',
            evaluate: (ctx) => {
              const vin = numProp(ctx, 'vin', 'voltage', 3);
              const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const iz = Math.abs(getTel(ctx, 'am_z')?.current ?? 0);
              return {
                expression: `Vin=${vin.toFixed(1)}V → Vout=${fmtV(vOut)}`,
                result: `稳压管电流 |Iz| = ${fmtI(iz)}`,
                status: vOut >= 4.9 && vOut <= 5.45 && iz > 0.01 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l13-vin',
            label: '输入直流电压 Vin',
            targetId: 'vin',
            propKey: 'voltage',
            kind: 'slider',
            min: 2,
            max: 15,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：齐纳击穿稳压机制', type: 'ZENER_DIODE', componentId: 'dz', stepIndex: 1 }],
        checkpoint: {
          title: '触发反向击穿完成 5.1V 稳压',
          instruction: '升高输入电压 Vin ≥ 10V（建议 12V），观察稳压管电流显著增大并将输出钳位在 4.9V~5.45V。',
          check: (ctx) => {
            const vin = numProp(ctx, 'vin', 'voltage', 3);
            const vOut = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const iz = Math.abs(getTel(ctx, 'am_z')?.current ?? 0);
            const ok = vin >= 10 && vOut >= 4.9 && vOut <= 5.45 && iz >= 0.01;
            return {
              passed: ok,
              message: ok
                ? `稳压生效！即便输入高至 ${vin.toFixed(1)}V，输出也被钳在 ${vOut.toFixed(2)}V（泄流 ${fmtI(iz)}）`
                : `当前 Vin=${vin.toFixed(1)}V，Vo=${vOut.toFixed(2)}V，|Iz|=${fmtI(iz)}`,
            };
          },
          autoDemo: {
            buttonLabel: '升高 Vin 至 12V 看稳压',
            description: '将输入拉高到 12V 演示稳压钳位',
            actions: [{ kind: 'setProp', componentId: 'vin', key: 'voltage', value: 12 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 14 (Ch.7): 发光二极管 (LED) 伏安特性与限流设计
  // =========================================================================
  {
    id: 'ch7-led-and-opto-drive',
    chapterId: 'ch7',
    lessonNumber: 14,
    title: '发光二极管 (LED) 与安全限流驱动设计',
    subtitle: '探索不同禁带宽度 LED 的导通压降差异、计算限流保护电阻并搭建双色交流指示器',
    textbookRef: '第7章 7.4 光电半导体器件与 LED 限流电路设计',
    difficulty: '入门',
    durationMin: 12,
    prerequisites: ['ch7-diodes-and-rectifiers'],
    learningObjectives: [
      '知道红光 LED（~1.7V）与蓝/白光 LED（~2.8V）因材料禁带不同导致正向压降差异',
      '学会利用 R = (Vcc - V_F) / I_F 精确选取限流电阻，避免过流烧毁',
      '掌握反并联双色 LED 实现交流极性双向指示及相互反向保护的原理',
    ],
    stages: [
      {
        id: 'l14-s1',
        stageNumber: 1,
        title: '不同波长 LED 的正向开启电压对比',
        badge: 'Step 1 · 红蓝对比',
        conceptGoal: '波长越短（光子能量越高），所需开启正向压降 V_F 越大：蓝光 LED 压降明显高于红光。',
        explanation:
          '5V 电源经过 220Ω 公共限流电阻由 SPDT 开关切换供电给红光 LED 或蓝光 LED。红光开启压降约 1.6~1.8V，电流较大；把开关切到 NO 路点亮蓝光 LED，可对比观察蓝光更高的正向导通压降（约 2.7~3.0V）。',
        analogy: '发射高能短波长的“蓝光火箭”比低能长波长的“红光火箭”需要越过更高的发射台台阶。',
        highlights: ['sw_color', 'led_r', 'led_b', 'vm_b'],
        newlyAddedIds: ['sw_color', 'led_r', 'led_b', 'vm_r', 'vm_b'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'VCC (5V)', 100, 240, 270, { voltage: 5 }),
            mkComp('r_lim', 'RESISTOR', 'R限流 (220Ω)', 230, 160, 0, { resistance: 220, maxPower: 0.5 }),
            mkComp('sw_color', 'SWITCH_SPDT', '颜色切换开关', 380, 160, 0, { position: 0 }),
            mkComp('led_r', 'LED', '红光 LED', 530, 120, 0, { color: 'red', maxPower: 0.2 }),
            mkComp('led_b', 'LED', '蓝光 LED', 530, 260, 0, { color: 'blue', maxPower: 0.2 }),
            mkComp('vm_r', 'VOLTMETER', 'PV_红 Vf', 680, 120, 90, { mode: 'dc' }),
            mkComp('vm_b', 'VOLTMETER', 'PV_蓝 Vf', 680, 260, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 100, 380, 0),
          ],
          [
            ['vcc', 'pos', 'r_lim', 'a', '#ef4444'],
            ['r_lim', 'b', 'sw_color', 'com', '#f59e0b'],
            ['sw_color', 'nc', 'led_r', 'anode', '#f43f5e'],
            ['sw_color', 'no', 'led_b', 'anode', '#38bdf8'],
            ['led_r', 'cathode', 'gnd1', 'gnd', '#475569'],
            ['led_b', 'cathode', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['led_r', 'anode', 'vm_r', 'pos', '#f43f5e'],
            ['led_r', 'cathode', 'vm_r', 'neg', '#475569'],
            ['led_b', 'anode', 'vm_b', 'pos', '#38bdf8'],
            ['led_b', 'cathode', 'vm_b', 'neg', '#475569'],
          ],
          'l14s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l14-s1-f1',
            title: 'LED 正向导通压降对比',
            formula: '红光 Vf ≈ 1.65V ｜ 蓝光 Vf ≈ 2.75V （受半导体禁带宽度决定）',
            evaluate: (ctx) => {
              const pos = numProp(ctx, 'sw_color', 'position', 0);
              const vr = getTel(ctx, 'vm_r')?.voltageDrop ?? 0;
              const vb = getTel(ctx, 'vm_b')?.voltageDrop ?? 0;
              return {
                expression: pos ? '当前接通蓝光支路' : '当前接通红光支路',
                result: pos ? `蓝光 Vf = ${fmtV(vb)}` : `红光 Vf = ${fmtV(vr)}`,
                status: pos && vb > 2.3 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l14-sw',
            label: '切换红/蓝 LED 支路',
            targetId: 'sw_color',
            propKey: 'position',
            kind: 'spdt-toggle',
          },
        ],
        ponderLinks: [{ label: '思索：LED 电致发光能带跃迁', type: 'LED', componentId: 'led_b', stepIndex: 0 }],
        checkpoint: {
          title: '实测蓝光 LED 高压降导通',
          instruction: '将单刀双掷开关切到 NO 档（蓝光支路），观测蓝光正向压降 Vf > 2.3V。',
          check: (ctx) => {
            const vb = getTel(ctx, 'led_b')?.voltageDrop ?? 0;
            const ib = getTel(ctx, 'led_b')?.current ?? 0;
            const ok = vb > 2.3 && ib > 0.005;
            return {
              passed: ok,
              message: ok
                ? `蓝光 LED 成功点亮！实测 Vf = ${vb.toFixed(2)}V（高于红光门槛），I = ${fmtI(ib)}`
                : `当前蓝光支路 Vf = ${vb.toFixed(2)}V，I = ${fmtI(ib)}`,
            };
          },
          autoDemo: {
            buttonLabel: '切换点亮蓝光 LED',
            description: '将开关切到 NO 路测量蓝光压降',
            actions: [{ kind: 'setProp', componentId: 'sw_color', key: 'position', value: 1 }],
          },
        },
      },
      {
        id: 'l14-s2',
        stageNumber: 2,
        title: '12V 电源下 LED 限流电阻抗烧毁设计',
        badge: 'Step 2 · 限流设计',
        conceptGoal: '切忌直接把 LED 接入高压电源！需满足 R = (Vcc - Vf) / I_target 将电流控在 10~20mA 安全区。',
        explanation:
          '当前 12V 电源通过仅 50Ω 的过小电阻接入绿光 LED，超过 180mA 的狂暴电流直接触发绿光 LED 过流过载红环警告！利用公式估算：若希望安全工作在 ~17mA，应取 R ≈ (12 - 2.2) / 0.017 ≈ 560Ω。请调大限流电阻 R_lim 拯救这颗 LED。',
        analogy: '就像在高压自来水管道后给精密水表前串一只“孔径节流阀”，必须算准压差泄掉多余压力。',
        highlights: ['r_lim', 'led1', 'am1'],
        newlyAddedIds: ['r_lim', 'led1'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'VCC (12V)', 110, 230, 270, { voltage: 12 }),
            mkComp('r_lim', 'RESISTOR', 'R_lim 限流', 270, 150, 0, { resistance: 50, maxPower: 2 }),
            mkComp('am1', 'AMMETER', 'PA 电流', 430, 150, 0, { mode: 'dc' }),
            mkComp('led1', 'LED', '绿光 LED (限额0.2W)', 580, 230, 90, { color: 'green', maxPower: 0.2 }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 360, 0),
          ],
          [
            ['vcc', 'pos', 'r_lim', 'a', '#ef4444'],
            ['r_lim', 'b', 'am1', 'pos', '#f59e0b'],
            ['am1', 'neg', 'led1', 'anode', '#22c55e'],
            ['led1', 'cathode', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l14s2'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l14-s2-f1',
            title: 'LED 安全限流设计方程',
            formula: 'I_F = (VCC - Vf) / R_lim ，目标 8mA ≤ I_F ≤ 25mA',
            evaluate: (ctx) => {
              const r = numProp(ctx, 'r_lim', 'resistance', 50);
              const tel = getTel(ctx, 'led1');
              const id = tel?.current ?? 0;
              return {
                expression: `R_lim=${r.toFixed(0)}Ω，LED功耗 ${fmtP(tel?.power ?? 0)}`,
                result: `I_F = ${fmtI(id)} ${tel?.overloaded ? '【过载危险】' : '【安全】'}`,
                status: !tel?.overloaded && id >= 0.008 && id <= 0.025 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l14-rlim',
            label: '限流电阻 R_lim (Ω)',
            targetId: 'r_lim',
            propKey: 'resistance',
            kind: 'slider',
            min: 50,
            max: 1200,
            step: 30,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：LED 电流功率安全限额', type: 'LED', componentId: 'led1', stepIndex: 1 }],
        checkpoint: {
          title: '调整限流电阻解除过载',
          instruction: '将 R_lim 调至 470Ω~1000Ω（推荐 560Ω），使 LED 解除过载且工作电流落在 8mA~25mA 最佳亮度区。',
          check: (ctx) => {
            const tel = getTel(ctx, 'led1');
            const id = tel?.current ?? 0;
            const ok = Boolean(tel && !tel.overloaded && id >= 0.008 && id <= 0.025);
            return {
              passed: ok,
              message: ok
                ? `限流设计达标！I_F = ${fmtI(id)}，功耗 ${fmtP(tel!.power)}（安全常亮）`
                : `当前 I_F = ${fmtI(id)}（目标 8~25mA 且无过载告警）`,
            };
          },
          autoDemo: {
            buttonLabel: '应用 560Ω 标准限流电阻',
            description: '将 R_lim 设为 560Ω 让 12V 下 LED 稳定在约 17.5mA',
            actions: [{ kind: 'setProp', componentId: 'r_lim', key: 'resistance', value: 560 }],
          },
        },
      },
      {
        id: 'l14-s3',
        stageNumber: 3,
        title: '双色反并联 LED 交流极性检测器',
        badge: 'Step 3 · 双向交流指示',
        conceptGoal: '两只 LED 头尾反并联可各自导通半个交流周期，同时天然替对方分流钳位，防止高反压击穿。',
        explanation:
          '普通 LED 反向耐压通常只有 5V 左右。若直接把单个 LED 接在交流上很容易反向击穿损毁；而把红光与绿光反并联后，正半周红灯导通同时把绿灯的反向压降安全锁死在区区 1.7V；负半周绿灯导通同时保护红灯！把交流源幅值升到 5V 以上即可看两者交替闪耀。',
        analogy: '就像两位互相掩护的哨兵：东边来流红兵放行、绿兵受护；西边来流绿兵放行、红兵受护，各守半边天。',
        highlights: ['led_pos', 'led_neg', 'am1'],
        newlyAddedIds: ['led_pos', 'led_neg', 'ac1'],
        defaultTimeScale: 0.4,
        prewarmSeconds: 0.2,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['ac1', 'am1'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', 'AC 激励源', 110, 230, 270, {
              amplitude: 1.2,
              frequency: 2,
              phase: 0,
              dcOffset: 0,
              waveform: 'sine',
            }),
            mkComp('r1', 'RESISTOR', 'R1 (330Ω)', 280, 140, 0, { resistance: 330, maxPower: 1 }),
            mkComp('am1', 'AMMETER', 'PA_RMS', 440, 140, 0, { mode: 'rms' }),
            mkComp('led_pos', 'LED', '正向红灯', 570, 190, 90, { color: 'red', maxPower: 0.25 }),
            mkComp('led_neg', 'LED', '反向绿灯', 680, 190, 270, { color: 'green', maxPower: 0.25 }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 360, 0),
          ],
          [
            ['ac1', 'pos', 'r1', 'a', '#f59e0b'],
            ['r1', 'b', 'am1', 'pos', '#38bdf8'],
            ['am1', 'neg', 'led_pos', 'anode', '#38bdf8'],
            ['am1', 'neg', 'led_neg', 'cathode', '#22c55e'],
            ['led_pos', 'cathode', 'gnd1', 'gnd', '#475569'],
            ['led_neg', 'anode', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l14s3'
        ),
        liveFormulas: [
          {
            id: 'l14-s3-f1',
            title: '交流双向指示有效值电流',
            formula: '正半周红灯亮 (V_clamp≈1.7V)，负半周绿灯亮 (V_clamp≈2.0V)',
            evaluate: (ctx) => {
              const amp = numProp(ctx, 'ac1', 'amplitude', 1.2);
              const irms = getTel(ctx, 'am1')?.iRms ?? 0;
              return {
                expression: `AC幅值=${amp.toFixed(1)}V`,
                result: `回路电流有效值 Irms = ${fmtI(irms)}`,
                status: amp >= 5 && irms > 0.005 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l14-amp',
            label: '交流信号幅值 (V)',
            targetId: 'ac1',
            propKey: 'amplitude',
            kind: 'slider',
            min: 1,
            max: 9,
            step: 0.1,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：二极管反向钳位互保', type: 'LED', componentId: 'led_pos', stepIndex: 2 }],
        checkpoint: {
          title: '越过死区点亮双色交流指示器',
          instruction: '增大交流源幅值至 5V 以上，使回路有效值电流大于 5mA 且两灯互保不过载。',
          check: (ctx) => {
            const amp = numProp(ctx, 'ac1', 'amplitude', 1.2);
            const irms = getTel(ctx, 'am1')?.iRms ?? 0;
            const redOk = !(getTel(ctx, 'led_pos')?.overloaded);
            const greenOk = !(getTel(ctx, 'led_neg')?.overloaded);
            const ok = amp >= 5 && irms >= 0.005 && redOk && greenOk;
            return {
              passed: ok,
              message: ok
                ? `双色反并联工作完美！幅值 ${amp.toFixed(1)}V，Irms = ${fmtI(irms)}`
                : `当前幅值 ${amp.toFixed(1)}V，Irms = ${fmtI(irms)}（需幅值 ≥ 5V 且 Irms ≥ 5mA）`,
            };
          },
          autoDemo: {
            buttonLabel: '提升 AC 幅值至 6V',
            description: '设置 AC 信号幅值到 6V 观察正负交替点亮',
            actions: [{ kind: 'setProp', componentId: 'ac1', key: 'amplitude', value: 6 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 15 (Ch.8): 双极型三极管 (BJT) 三区工作状态与共射放大器
  // =========================================================================
  {
    id: 'ch8-bjt-amplifiers',
    chapterId: 'ch8',
    lessonNumber: 15,
    title: '三极管放大区控制、静态工作点与共射放大',
    subtitle: '实证 I_C = β·I_B 电流分配规律，调校固定偏置静态 Q 点消除饱和失真并观察 CE 旁路电容增益飞跃',
    textbookRef: '第8章 8.1–8.4 双极型晶体管特性与共射极基本放大电路',
    difficulty: '进阶',
    durationMin: 18,
    prerequisites: ['ch7-diodes-and-rectifiers'],
    learningObjectives: [
      '定量验证三极管线性放大条件（发射结正偏、集电结反偏）及电流放大规律 Ic = β·Ib',
      '认识 Q 点过高引起饱和失真、Q 点过低引起截止失真的工程意义',
      '理解分压式射极稳定偏置与射极旁路电容 C_E 对直流稳压与交流高增益的兼顾折中',
    ],
    stages: [
      {
        id: 'l15-s1',
        stageNumber: 1,
        title: 'NPN 三极管三区切换：截止、线性放大与饱和',
        badge: 'Step 1 · Ic = β·Ib',
        conceptGoal: '仅需微安级基极电流 I_B 就能线性控制毫安级集电极电流 I_C（β = 100 倍）。',
        explanation:
          '当前基极电源 Vbb = 0V，发射结未开启，三极管处于截止区（Ic≈0，Uce≈12V）。逐步拉高 Vbb：当 Vbb ≈ 2.5~4.0V 时，BJT 进入放大区，集电极电流精确等于 100×Ib，同时压降 Uce 稳居电源中段（4~8V）准备随输入信号上下摆动！',
        analogy: '就像水坝小手轮控制主闸门：手轮转出一股几十微安的细水花（I_B），就能按 100 倍比例撬动奔腾数毫安的集电极主干流（I_C）。',
        highlights: ['q1', 'am_b', 'am_c', 'vm_ce'],
        newlyAddedIds: ['q1', 'vbb', 'rb', 'rc', 'am_b', 'am_c', 'vm_ce'],
        circuit: mkCircuit(
          [
            mkComp('vbb', 'DC_SOURCE', 'Vbb 基极激励', 90, 260, 270, { voltage: 0 }),
            mkComp('rb', 'RESISTOR', 'Rb (100kΩ)', 210, 200, 0, { resistance: 100000 }),
            mkComp('am_b', 'AMMETER', 'PA_B (Ib)', 330, 200, 0, { mode: 'dc' }),
            mkComp('q1', 'BJT_NPN', 'NPN (β=100)', 480, 210, 0, { beta: 100 }),
            mkComp('vcc', 'DC_SOURCE', 'VCC (12V)', 660, 260, 270, { voltage: 12 }),
            mkComp('rc', 'RESISTOR', 'Rc (2kΩ)', 580, 120, 0, { resistance: 2000 }),
            mkComp('am_c', 'AMMETER', 'PA_C (Ic)', 470, 120, 180, { mode: 'dc' }),
            mkComp('vm_ce', 'VOLTMETER', 'PV_CE (Uce)', 610, 290, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 480, 390, 0),
          ],
          [
            ['vbb', 'pos', 'rb', 'a', '#38bdf8'],
            ['rb', 'b', 'am_b', 'pos', '#38bdf8'],
            ['am_b', 'neg', 'q1', 'b', '#38bdf8'],
            ['vcc', 'pos', 'rc', 'b', '#ef4444'],
            ['rc', 'a', 'am_c', 'pos', '#f59e0b'],
            ['am_c', 'neg', 'q1', 'c', '#f59e0b'],
            ['q1', 'e', 'gnd1', 'gnd', '#475569'],
            ['vbb', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['q1', 'c', 'vm_ce', 'pos', '#a855f7'],
            ['q1', 'e', 'vm_ce', 'neg', '#475569'],
          ],
          'l15s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l15-s1-f1',
            title: '电流放大倍数与管压降',
            formula: 'Ic = β·Ib （放大区），U_CE = VCC - Ic·Rc',
            evaluate: (ctx) => {
              const ib = getTel(ctx, 'am_b')?.current ?? 0;
              const ic = getTel(ctx, 'am_c')?.current ?? 0;
              const uce = getTel(ctx, 'vm_ce')?.voltageDrop ?? 0;
              const zone = ic < 0.0001 ? '截止区' : uce < 0.5 ? '饱和区' : '线性放大区';
              return {
                expression: `Ib=${fmtI(ib)}, Ic=${fmtI(ic)} → [${zone}]`,
                result: `U_CE = ${fmtV(uce)}`,
                status: uce >= 4.0 && uce <= 8.5 && ic >= 0.0015 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l15-vbb',
            label: '调节基极偏置 Vbb',
            targetId: 'vbb',
            propKey: 'voltage',
            kind: 'slider',
            min: 0,
            max: 8,
            step: 0.4,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：BJT 微安控毫安放大', type: 'BJT_NPN', componentId: 'q1', stepIndex: 0 }],
        checkpoint: {
          title: '建立居中静态线性放大区',
          instruction: '调整 Vbb（约 2.8~3.6V），使三极管处于放大区中间位置（4.0V ≤ U_CE ≤ 8.5V，Ic ≥ 1.5mA）。',
          check: (ctx) => {
            const ic = getTel(ctx, 'am_c')?.current ?? 0;
            const uce = getTel(ctx, 'vm_ce')?.voltageDrop ?? 0;
            const ok = uce >= 4.0 && uce <= 8.5 && ic >= 0.0015;
            return {
              passed: ok,
              message: ok
                ? `Q 点处于放大区正中！Ic = ${fmtI(ic)}，U_CE = ${uce.toFixed(2)}V`
                : `当前 Ic = ${fmtI(ic)}，U_CE = ${uce.toFixed(2)}V（需 U_CE 在 4.0~8.5V）`,
            };
          },
          autoDemo: {
            buttonLabel: '设为 3.2V 进入放大区',
            description: '将 Vbb 设至 3.2V，使 Ic≈2.6mA，Uce≈6.7V',
            actions: [{ kind: 'setProp', componentId: 'vbb', key: 'voltage', value: 3.2 }],
          },
        },
      },
      {
        id: 'l15-s2',
        stageNumber: 2,
        title: '固定偏置共射放大器 Q 点纠偏与高倍电压放大',
        badge: 'Step 2 · 消除饱和失真',
        conceptGoal: 'Q 点决定动态范围：当 Rb 偏小导致三极管深陷饱和区时交流增益崩塌，调大 Rb 回归 VCC/2 即可释放数十倍不失真交流增益。',
        explanation:
          '当前基极偏置电阻 Rb 只有 150kΩ，灌入过大的基极电流将三极管死死按在饱和区（U_CE < 0.5V），15mV 微弱交流输入根本无法有效放大！试着把 Rb 增大至约 560kΩ，把静态 U_CE 拉回到电源电压一半（约 5.8V）附近，立刻观察输出端交流有效值飙升至 1V 以上！',
        analogy: '就像在弹簧中间挂重物才能上下弹跳：如果重物一直顶在底板上，再怎么轻拨也弹不起来（饱和失真）。',
        highlights: ['rb', 'q1', 'vm_ce', 'vm_out'],
        newlyAddedIds: ['c1', 'c2', 'rl', 'vs', 'vm_out'],
        defaultTimeScale: 0.2,
        prewarmSeconds: 0.25,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vs', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'VCC (12V)', 390, 60, 0, { voltage: 12 }),
            mkComp('vs', 'AC_SOURCE', 'Vs (15mV 20Hz)', 70, 240, 270, {
              amplitude: 0.015,
              frequency: 20,
              phase: 0,
              dcOffset: 0,
              waveform: 'sine',
            }),
            mkComp('c1', 'CAPACITOR', 'C1 耦合 (22µF)', 200, 220, 0, { capacitance: 22 }),
            mkComp('rb', 'RESISTOR', 'Rb 偏置电阻', 310, 140, 90, { resistance: 150000 }),
            mkComp('rc', 'RESISTOR', 'Rc (3kΩ)', 470, 140, 90, { resistance: 3000 }),
            mkComp('q1', 'BJT_NPN', 'Q1 (β=100)', 440, 230, 0, { beta: 100 }),
            mkComp('c2', 'CAPACITOR', 'C2 耦合 (22µF)', 560, 210, 0, { capacitance: 22 }),
            mkComp('rl', 'RESISTOR', 'RL (6kΩ)', 660, 290, 90, { resistance: 6000 }),
            mkComp('vm_ce', 'VOLTMETER', 'PV_Q (Uce)', 500, 320, 90, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out (~)', 760, 290, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 390, 410, 0),
          ],
          [
            ['vcc', 'pos', 'rb', 'a', '#ef4444'],
            ['vcc', 'pos', 'rc', 'a', '#ef4444'],
            ['rb', 'b', 'q1', 'b', '#38bdf8'],
            ['vs', 'pos', 'c1', 'pos', '#22c55e'],
            ['c1', 'neg', 'q1', 'b', '#22c55e'],
            ['rc', 'b', 'q1', 'c', '#f59e0b'],
            ['q1', 'c', 'c2', 'pos', '#f59e0b'],
            ['c2', 'neg', 'rl', 'a', '#a855f7'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['q1', 'e', 'gnd1', 'gnd', '#475569'],
            ['vs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['q1', 'c', 'vm_ce', 'pos', '#38bdf8'],
            ['q1', 'e', 'vm_ce', 'neg', '#475569'],
            ['rl', 'a', 'vm_out', 'pos', '#ec4899'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l15s2'
        ),
        liveFormulas: [
          {
            id: 'l15-s2-f1',
            title: '静态 U_CE 与交流放大输出有效值',
            formula: 'Q点居中 ≈ 6V；电压放大倍数 |Av| = (Vo_rms / 10.6mV)',
            evaluate: (ctx) => {
              const rb = numProp(ctx, 'rb', 'resistance', 150000);
              const uce = getTel(ctx, 'vm_ce')?.voltageDrop ?? 0;
              const vOutRms = getTel(ctx, 'vm_out')?.vRms ?? 0;
              const av = vOutRms / (0.015 * Math.SQRT1_2);
              return {
                expression: `Rb=${(rb / 1000).toFixed(0)}kΩ，Uce=${fmtV(uce)}`,
                result: `Vo_rms = ${fmtV(vOutRms)} (|Av| ≈ ${av.toFixed(0)}×)`,
                status: uce >= 4.2 && uce <= 8.0 && vOutRms >= 0.8 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l15-rb',
            label: '偏置电阻 Rb (kΩ)',
            targetId: 'rb',
            propKey: 'resistance',
            kind: 'slider',
            min: 100000,
            max: 1000000,
            step: 10000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：共射 Q 点与动态失真', type: 'BJT_NPN', componentId: 'q1', stepIndex: 1 }],
        checkpoint: {
          title: '调整 Rb 脱离饱和并获取高倍线性放大',
          instruction: '将偏置电阻 Rb 调至 480kΩ~720kΩ（推荐 560kΩ），使 U_CE 稳定在 4.2~8.0V 且交流输出 Vo_rms ≥ 0.8V。',
          check: (ctx) => {
            const uce = getTel(ctx, 'vm_ce')?.voltageDrop ?? 0;
            const vOutRms = getTel(ctx, 'vm_out')?.vRms ?? 0;
            const ok = uce >= 4.2 && uce <= 8.0 && vOutRms >= 0.8;
            return {
              passed: ok,
              message: ok
                ? `饱和失真已消除！U_CE = ${uce.toFixed(2)}V，交流输出 Vo_rms = ${vOutRms.toFixed(2)}V`
                : `当前 U_CE = ${uce.toFixed(2)}V，Vo_rms = ${vOutRms.toFixed(2)}V（需脱离饱和且 Vo_rms ≥ 0.8V）`,
            };
          },
          autoDemo: {
            buttonLabel: '设为 560kΩ 最佳实践',
            description: '设置 Rb = 560kΩ 建立中点静态工作点',
            actions: [{ kind: 'setProp', componentId: 'rb', key: 'resistance', value: 560000 }],
          },
        },
      },
      {
        id: 'l15-s3',
        stageNumber: 3,
        title: '分压偏置电路与射极旁路电容 CE 的增益跃升',
        badge: 'Step 3 · 偏置稳压+旁路',
        conceptGoal: 'Re 对直流提供负反馈稳住温漂，而并接旁路电容 C_E 为交流信号搭起直通地线的“低阻快捷通道”，瞬间释放十倍级增益！',
        explanation:
          '工业级分压式放大电路用 Rb1/Rb2 锁死基极电位，并用 Re 狠狠稳住温度漂移——但未旁路的 Re 也会对交流形成强负反馈，目前电路增益只有约 2 倍（Vo_rms 仅约 20mV）。试闭合开关 K_ce 将 220µF 旁路电容跨接在 Re 两端：直流工作点纹丝不动，交流放大倍数却原地爆涨 15 倍以上！',
        analogy: '就像建在收费高速（Re）旁的免费公交专道（C_E）：大货车（直流偏置）被乖乖限速稳流，但急送快件的交流小电波一路绿灯飞驰而过。',
        highlights: ['re', 'k_ce', 'ce', 'vm_out'],
        newlyAddedIds: ['rb1', 'rb2', 're', 'k_ce', 'ce'],
        defaultTimeScale: 0.2,
        prewarmSeconds: 0.25,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['vs', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('vcc', 'DC_SOURCE', 'VCC (12V)', 390, 50, 0, { voltage: 12 }),
            mkComp('vs', 'AC_SOURCE', 'Vs (15mV 25Hz)', 60, 230, 270, {
              amplitude: 0.015,
              frequency: 25,
              phase: 0,
              dcOffset: 0,
              waveform: 'sine',
            }),
            mkComp('c1', 'CAPACITOR', 'C1 (22µF)', 180, 220, 0, { capacitance: 22 }),
            mkComp('rb1', 'RESISTOR', 'Rb1 (33kΩ)', 300, 120, 90, { resistance: 33000 }),
            mkComp('rb2', 'RESISTOR', 'Rb2 (10kΩ)', 300, 320, 90, { resistance: 10000 }),
            mkComp('rc', 'RESISTOR', 'Rc (3kΩ)', 460, 120, 90, { resistance: 3000 }),
            mkComp('q1', 'BJT_NPN', 'Q1 (β=100)', 430, 220, 0, { beta: 100 }),
            mkComp('re', 'RESISTOR', 'Re (1kΩ)', 460, 320, 90, { resistance: 1000 }),
            mkComp('k_ce', 'SWITCH_SPST', 'K_CE 旁路开关', 540, 280, 90, { closed: false }),
            mkComp('ce', 'CAPACITOR', 'CE (220µF)', 540, 360, 90, { capacitance: 220 }),
            mkComp('c2', 'CAPACITOR', 'C2 (22µF)', 580, 200, 0, { capacitance: 22 }),
            mkComp('rl', 'RESISTOR', 'RL (6kΩ)', 670, 290, 90, { resistance: 6000 }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out (~)', 760, 290, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 390, 440, 0),
          ],
          [
            ['vcc', 'pos', 'rb1', 'a', '#ef4444'],
            ['vcc', 'pos', 'rc', 'a', '#ef4444'],
            ['rb1', 'b', 'q1', 'b', '#38bdf8'],
            ['rb2', 'a', 'q1', 'b', '#38bdf8'],
            ['rb2', 'b', 'gnd1', 'gnd', '#475569'],
            ['vs', 'pos', 'c1', 'pos', '#22c55e'],
            ['c1', 'neg', 'q1', 'b', '#22c55e'],
            ['rc', 'b', 'q1', 'c', '#f59e0b'],
            ['q1', 'e', 're', 'a', '#f59e0b'],
            ['re', 'b', 'gnd1', 'gnd', '#475569'],
            ['q1', 'e', 'k_ce', 'a', '#22d3ee'],
            ['k_ce', 'b', 'ce', 'pos', '#22d3ee'],
            ['ce', 'neg', 'gnd1', 'gnd', '#475569'],
            ['q1', 'c', 'c2', 'pos', '#f59e0b'],
            ['c2', 'neg', 'rl', 'a', '#a855f7'],
            ['rl', 'b', 'gnd1', 'gnd', '#475569'],
            ['vs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vcc', 'neg', 'gnd1', 'gnd', '#475569'],
            ['rl', 'a', 'vm_out', 'pos', '#ec4899'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l15s3'
        ),
        liveFormulas: [
          {
            id: 'l15-s3-f1',
            title: '旁路前后交流电压增益对比',
            formula: '无CE: |Av| ≈ Rc||RL / Re ≈ 2× ；有CE: |Av| ≈ gm·(Rc||RL)',
            evaluate: (ctx) => {
              const bypassed = boolProp(ctx, 'k_ce', 'closed');
              const vOutRms = getTel(ctx, 'vm_out')?.vRms ?? 0;
              const av = vOutRms / (0.015 * Math.SQRT1_2);
              return {
                expression: `旁路电容 CE ${bypassed ? '已投入' : '已断开'}`,
                result: `Vo_rms = ${fmtV(vOutRms)} (|Av| ≈ ${av.toFixed(1)}×)`,
                status: bypassed && vOutRms >= 0.3 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l15-kce',
            label: '射极旁路开关 K_CE',
            targetId: 'k_ce',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
        ],
        ponderLinks: [
          { label: '思索：分压稳定偏置', type: 'BJT_NPN', componentId: 'q1', stepIndex: 2 },
          { label: '思索：旁路电容交流短路效应', type: 'CAPACITOR', componentId: 'ce', stepIndex: 1 },
        ],
        checkpoint: {
          title: '闭合旁路电容释放高增益',
          instruction: '闭合 K_CE 投入 220µF 射极旁路电容，使交流输出有效值 Vo_rms 从 ~20mV 暴涨至 0.30V 以上。',
          check: (ctx) => {
            const closed = boolProp(ctx, 'k_ce', 'closed');
            const vOutRms = getTel(ctx, 'vm_out')?.vRms ?? 0;
            const ok = closed && vOutRms >= 0.3;
            return {
              passed: ok,
              message: ok
                ? `CE 旁路飞跃成功！输出飙升至 ${vOutRms.toFixed(2)}V rms（增益 ${(vOutRms / 0.0106).toFixed(0)}×）`
                : `当前 K_CE=${closed ? '闭合' : '断开'}，Vo_rms = ${vOutRms.toFixed(3)}V（目标 ≥ 0.30V）`,
            };
          },
          autoDemo: {
            buttonLabel: '闭合 K_CE 投入旁路电容',
            description: '接通 C_E 旁路电容绕开射极交流负反馈',
            actions: [{ kind: 'setProp', componentId: 'k_ce', key: 'closed', value: true }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 16 (Ch.8): 场效应管 (NMOS) 电压控制与功率开关
  // =========================================================================
  {
    id: 'ch8-nmos-and-cmos-switch',
    chapterId: 'ch8',
    lessonNumber: 16,
    title: 'MOS 场效应管 (NMOS) 压控机制与功率开关',
    subtitle: '实证绝缘栅极零电流开启、可变电阻区/恒流区平方律，并构建数字引脚直接驱动大功率灯泡的低边开关',
    textbookRef: '第8章 8.5–8.6 金属氧化物半导体场效应晶体管与电子开关',
    difficulty: '基础',
    durationMin: 14,
    prerequisites: ['ch8-bjt-amplifiers'],
    learningObjectives: [
      '与 BJT 对比：MOS 管属于电压控制型器件，栅极绝缘致使稳态栅流 IG ≈ 0',
      '掌握开启电压 V_GS(th) 以及跨过夹断线后的饱和恒流平方律 ID = ½·kp·(V_GS - V_th)²',
      '会设计低导通压降的 NMOS 低边驱动电路供单片机或逻辑门控大电流负载',
    ],
    stages: [
      {
        id: 'l16-s1',
        stageNumber: 1,
        title: '绝缘栅零直流输入电流与阈值电压 V_th',
        badge: 'Step 1 · 零栅流压控',
        conceptGoal: '栅极被二氧化硅薄膜绝缘，即使输出几十上百毫安漏极电流，栅极索取电流仍几乎严格为零。',
        explanation:
          '当前栅源电压 Vgs = 1.0V，小于该管开启阈值 Vth = 2.0V，P 型衬底表面还未感应出反型导电沟道，漏极电流为 0。缓慢升高 Vgs 越过 2.0V 后看两只电流表：漏极电流表从零急速飙升，而栅极电流表依然指向 0.0 mA！',
        analogy: '就像隔着玻璃用静电吸力控制门闩：哪怕只花极微弱的静电场吸开大水闸放出激流，手指（栅极）根本碰不到一丝水漏。',
        highlights: ['m1', 'am_g', 'am_d'],
        newlyAddedIds: ['m1', 'vgs', 'am_g', 'am_d', 'rd'],
        circuit: mkCircuit(
          [
            mkComp('vgs', 'DC_SOURCE', 'Vgs 栅极电压', 100, 260, 270, { voltage: 1.0 }),
            mkComp('am_g', 'AMMETER', 'PA_G 栅流', 260, 210, 0, { mode: 'dc' }),
            mkComp('m1', 'NMOS', 'NMOS (Vth=2V)', 440, 220, 0, { vth: 2.0, kp: 0.08 }),
            mkComp('vdd', 'DC_SOURCE', 'VDD (10V)', 660, 260, 270, { voltage: 10 }),
            mkComp('rd', 'RESISTOR', 'Rd (100Ω)', 570, 120, 0, { resistance: 100, maxPower: 2 }),
            mkComp('am_d', 'AMMETER', 'PA_D 漏极电流', 440, 120, 180, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 440, 380, 0),
          ],
          [
            ['vgs', 'pos', 'am_g', 'pos', '#38bdf8'],
            ['am_g', 'neg', 'm1', 'g', '#38bdf8'],
            ['vdd', 'pos', 'rd', 'b', '#ef4444'],
            ['rd', 'a', 'am_d', 'pos', '#f59e0b'],
            ['am_d', 'neg', 'm1', 'd', '#f59e0b'],
            ['m1', 's', 'gnd1', 'gnd', '#475569'],
            ['vgs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vdd', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l16s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l16-s1-f1',
            title: '栅极零电流对比',
            formula: 'I_G = 0 A （电压控制），I_D 仅在 V_GS > V_th 时开启',
            evaluate: (ctx) => {
              const vgs = numProp(ctx, 'vgs', 'voltage', 1.0);
              const ig = getTel(ctx, 'am_g')?.current ?? 0;
              const id = getTel(ctx, 'am_d')?.current ?? 0;
              return {
                expression: `Vgs=${vgs.toFixed(1)}V (Vth=2.0V) | Ig=${fmtI(ig)}`,
                result: `漏极电流 Id = ${fmtI(id)}`,
                status: id >= 0.05 && Math.abs(ig) < 1e-4 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l16-vgs',
            label: '栅源电压 Vgs (V)',
            targetId: 'vgs',
            propKey: 'voltage',
            kind: 'slider',
            min: 0,
            max: 6,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：NMOS 绝缘栅感应导电沟道', type: 'NMOS', componentId: 'm1', stepIndex: 0 }],
        checkpoint: {
          title: '栅控大电流而栅极近零损耗',
          instruction: '将 Vgs 调高至 4.0V 及以上开启导电沟道，使 I_D ≥ 50mA 且同时观测 I_G ≈ 0。',
          check: (ctx) => {
            const ig = Math.abs(getTel(ctx, 'am_g')?.current ?? 0);
            const id = getTel(ctx, 'am_d')?.current ?? 0;
            const ok = id >= 0.05 && ig < 1e-4;
            return {
              passed: ok,
              message: ok
                ? `压控威力显现：零栅流 (${fmtI(ig)}) 成功撬动 I_D = ${fmtI(id)}！`
                : `当前 I_D = ${fmtI(id)}，|I_G| = ${fmtI(ig)}（需 Vgs 越过阈值使 I_D ≥ 50mA）`,
            };
          },
          autoDemo: {
            buttonLabel: '加压 Vgs = 4V 开启沟道',
            description: '将 Vgs 升至 4V，在零栅流下导通 75mA 漏极电流',
            actions: [{ kind: 'setProp', componentId: 'vgs', key: 'voltage', value: 4 }],
          },
        },
      },
      {
        id: 'l16-s2',
        stageNumber: 2,
        title: '可变电阻区与恒流饱和区平方律特征',
        badge: 'Step 2 · 恒流饱和区',
        conceptGoal: 'V_DS 较小（< V_GS - V_th）时像一根受控压敏电阻；V_DS 跨越夹断点进入饱和后 I_D 仅随 V_GS 平方关系几乎恒流。',
        explanation:
          '固定 Vgs = 3.5V（有效过驱动压差 V_ov = V_GS - V_th = 1.5V）。起初 Vdd = 0.5V < 1.5V，沟道全线贯通处于可变电阻区；把 Vdd 拉升至 4V 以上，漏端附近沟道“预夹断”，进入近似与 V_DS 无关的恒流饱和区，I_D 稳定在 ½×0.08×1.5² ≈ 90~100mA！',
        analogy: '就像可调开度的小堰坝：下游水位很高时水位差决定流速（电阻区），下游水位跌穿堰底线后过水量就只听上面闸口高度指挥了（饱和区）。',
        highlights: ['m1', 'vm_ds', 'am_d'],
        newlyAddedIds: ['vm_ds'],
        circuit: mkCircuit(
          [
            mkComp('vgs', 'DC_SOURCE', 'Vgs (3.5V恒定)', 110, 260, 270, { voltage: 3.5 }),
            mkComp('m1', 'NMOS', 'NMOS (kp=0.08)', 380, 230, 0, { vth: 2.0, kp: 0.08 }),
            mkComp('vdd', 'DC_SOURCE', 'VDD 漏极扫压', 640, 260, 270, { voltage: 0.5 }),
            mkComp('am_d', 'AMMETER', 'PA_D (Id)', 500, 140, 180, { mode: 'dc' }),
            mkComp('vm_ds', 'VOLTMETER', 'PV_DS', 520, 300, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 380, 400, 0),
          ],
          [
            ['vgs', 'pos', 'm1', 'g', '#38bdf8'],
            ['vdd', 'pos', 'am_d', 'pos', '#ef4444'],
            ['am_d', 'neg', 'm1', 'd', '#f59e0b'],
            ['m1', 's', 'gnd1', 'gnd', '#475569'],
            ['vgs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vdd', 'neg', 'gnd1', 'gnd', '#475569'],
            ['m1', 'd', 'vm_ds', 'pos', '#a855f7'],
            ['m1', 's', 'vm_ds', 'neg', '#475569'],
          ],
          'l16s2'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l16-s2-f1',
            title: '饱和判据与平方律估算电流',
            formula: 'V_ov = Vgs - Vth = 1.5V；饱和区 I_D ≈ ½·kp·V_ov² ≈ 90mA',
            evaluate: (ctx) => {
              const vds = getTel(ctx, 'vm_ds')?.voltageDrop ?? 0;
              const id = getTel(ctx, 'am_d')?.current ?? 0;
              const region = vds >= 1.5 ? '恒流饱和区 (夹断)' : '可变电阻线性区';
              return {
                expression: `V_DS=${fmtV(vds)} → [${region}]`,
                result: `实测 I_D = ${fmtI(id)}`,
                status: vds >= 4.0 && id >= 0.085 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l16-vdd',
            label: '调节漏源电压 VDD',
            targetId: 'vdd',
            propKey: 'voltage',
            kind: 'slider',
            min: 0.5,
            max: 10,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：可变电阻区 vs 预夹断饱和', type: 'NMOS', componentId: 'm1', stepIndex: 1 }],
        checkpoint: {
          title: '推动沟道进入恒流饱和区',
          instruction: '升压 VDD 至 4.0V 及以上越过夹断点，观测漏极进入恒流饱和区（I_D ≥ 85mA）。',
          check: (ctx) => {
            const vds = getTel(ctx, 'vm_ds')?.voltageDrop ?? 0;
            const id = getTel(ctx, 'am_d')?.current ?? 0;
            const ok = vds >= 4.0 && id >= 0.085;
            return {
              passed: ok,
              message: ok
                ? `夹断饱和成立！V_DS = ${vds.toFixed(2)}V，饱和 I_D = ${fmtI(id)}`
                : `当前 V_DS = ${vds.toFixed(2)}V，I_D = ${fmtI(id)}（需 V_DS ≥ 4V 进入饱和）`,
            };
          },
          autoDemo: {
            buttonLabel: '升高 VDD 至 5V 进入饱和区',
            description: '将 VDD 设为 5.0V 跨越 1.5V 夹断电压',
            actions: [{ kind: 'setProp', componentId: 'vdd', key: 'voltage', value: 5 }],
          },
        },
      },
      {
        id: 'l16-s3',
        stageNumber: 3,
        title: '逻辑电平低边开关直驱 12V/6W 功率灯泡',
        badge: 'Step 3 · 功率开关',
        conceptGoal: '强跨导功率 MOSFET 在深度导通（强反型低内阻三极管区）下自身压降微乎其微，适合微控制器低边驱动高压负载。',
        explanation:
          '逻辑引脚输出仅有 5V 且不适合承受大电流，而负载需要 12V 6W（0.5A）能量！这里使用高跨导 NMOS（kp=0.8）作“低边开关”串在灯泡下侧与 GND 之间。点击切换控制位为 HIGH (1)，5V 信号立刻让 MOS 管深导通（自身压降 Vds < 0.3V，热损极低），灯泡全功率闪亮！',
        analogy: '就像用 5V 弱电指头轻轻拨下低压大油门液压阀，让 12V 主力干线直接点亮整盏探照灯。',
        highlights: ['ctrl', 'm1', 'lamp1'],
        newlyAddedIds: ['ctrl', 'lamp1', 'rg'],
        circuit: mkCircuit(
          [
            mkComp('ctrl', 'LOGIC_IN', 'MCU 控制引脚', 100, 260, 0, { state: 0, varName: 'EN' }),
            mkComp('rg', 'RESISTOR', 'Rg (100Ω)', 250, 260, 0, { resistance: 100 }),
            mkComp('vdd', 'DC_SOURCE', '12V 功率主电', 620, 240, 270, { voltage: 12 }),
            mkComp('lamp1', 'LAMP', '12V/6W 主灯', 460, 120, 0, { ratedVoltage: 12, ratedPower: 6 }),
            mkComp('m1', 'NMOS', '功率 NMOS (kp=0.8)', 460, 260, 0, { vth: 2.0, kp: 0.8, maxPower: 5 }),
            mkComp('gnd1', 'GROUND', 'GND', 460, 400, 0),
          ],
          [
            ['ctrl', 'out', 'rg', 'a', '#38bdf8'],
            ['rg', 'b', 'm1', 'g', '#38bdf8'],
            ['vdd', 'pos', 'lamp1', 'p1', '#ef4444'],
            ['lamp1', 'p2', 'm1', 'd', '#f59e0b'],
            ['m1', 's', 'gnd1', 'gnd', '#475569'],
            ['vdd', 'neg', 'gnd1', 'gnd', '#475569'],
          ],
          'l16s3'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l16-s3-f1',
            title: '低边开关能效与导通压降',
            formula: 'MOS 损耗 P_mos = I_D·V_DS ，灯泡功率 P_lamp ≈ 6W',
            evaluate: (ctx) => {
              const pLamp = getTel(ctx, 'lamp1')?.power ?? 0;
              const telMos = getTel(ctx, 'm1');
              const vds = telMos?.voltageDrop ?? 0;
              return {
                expression: `开关压降 V_DS=${fmtV(vds)} (MOS热损 ${fmtP(telMos?.power ?? 0)})`,
                result: `灯泡功率 P_lamp = ${fmtP(pLamp)}`,
                status: pLamp >= 5.0 && vds <= 0.6 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l16-ctrl',
            label: 'MCU 驱动信号 EN (0/1)',
            targetId: 'ctrl',
            propKey: 'state',
            kind: 'select-option',
            options: [
              { label: '0 (关闭 · 0V)', value: 0 },
              { label: '1 (开启 · 5V)', value: 1 },
            ],
          },
        ],
        ponderLinks: [{ label: '思索：NMOS 功率电子开关原理', type: 'NMOS', componentId: 'm1', stepIndex: 2 }],
        checkpoint: {
          title: '5V 数字信号高效撬动 6W 负载',
          instruction: '将控制输入 EN 切换至 1 (5V)，使功率灯泡亮起达 5.0W 以上且 MOS 管饱和压降 ≤ 0.6V。',
          check: (ctx) => {
            const pLamp = getTel(ctx, 'lamp1')?.power ?? 0;
            const vds = getTel(ctx, 'm1')?.voltageDrop ?? 99;
            const ok = pLamp >= 5.0 && vds <= 0.6;
            return {
              passed: ok,
              message: ok
                ? `高效开关成功！灯功率 ${pLamp.toFixed(2)}W，开关仅分走 ${vds.toFixed(2)}V 极低管压降`
                : `当前灯功率 ${pLamp.toFixed(2)}W，开关 V_DS=${vds.toFixed(2)}V`,
            };
          },
          autoDemo: {
            buttonLabel: '发出 5V 开启脉冲点亮大灯',
            description: '将 LOGIC_IN 置为 1 使功率 NMOS 进入深导通',
            actions: [{ kind: 'setProp', componentId: 'ctrl', key: 'state', value: 1 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 17 (Ch.9): 集成运放负反馈：虚短与虚断
  // =========================================================================
  {
    id: 'ch9-opamp-negative-feedback',
    chapterId: 'ch9',
    lessonNumber: 17,
    title: '集成运算放大器负反馈：虚短、虚断与比例放大',
    subtitle: '深入理解十万倍开环增益经负反馈稳定后的反相/同相比例公式，以及电压跟随器消除前后级负载效应的魔力',
    textbookRef: '第9章 9.1–9.2 集成运放特性、理想模型与线性比例放大电路',
    difficulty: '基础',
    durationMin: 15,
    prerequisites: ['ch8-bjt-amplifiers'],
    learningObjectives: [
      '牢记线性区两大黄金公理：虚短（V_+ ≈ V_-）和虚断（i_+ = i_- ≈ 0）',
      '会精确推导与配置反相比例 Au = -Rf/R1 与同相比例 Au = 1 + Rf/R1 放大倍',
      '理解电压跟随器 1 倍缓冲如何以极大输入阻抗和极小输出阻抗挽救高内阻信号源',
    ],
    stages: [
      {
        id: 'l17-s1',
        stageNumber: 1,
        title: '反相比例放大器与“虚地”现象',
        badge: 'Step 1 · 反相比例',
        conceptGoal: '同相端直接接地，受负反馈牵引反相输入端 V_- 也被牢牢死盯在 0.00V（虚地），进而决出 Au = -Rf/R1。',
        explanation:
          '集成运放开环增益高达 100,000 倍！为了防止输出摆满电源轨，反馈电阻 Rf 把输出引回反相输入端（-）自发调节，使 V_- 时时刻刻贴近同相端的地电位 0.00V（虚地），且两输入端近乎不吃电流（虚断）。因此全部输入电流 Vin/R1 只能绕道穿过 Rf，令 Vout = -Vin·(Rf/R1)。试将 Rf 调至 30kΩ 验证 -3.0V！',
        analogy: '就像一把支点在圆心的精密跷跷板：支点被负反馈定在零点，“左臂压 1V（力臂 R1），右臂 Rf 调长 3 倍，右端就要反翘到 -3V”才能平！',
        highlights: ['u1', 'rf', 'vm_n', 'vm_out'],
        newlyAddedIds: ['u1', 'r1', 'rf', 'vm_n'],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin (+1.0V)', 90, 220, 270, { voltage: 1.0 }),
            mkComp('r1', 'RESISTOR', 'R1 (10kΩ)', 230, 180, 0, { resistance: 10000 }),
            mkComp('rf', 'RESISTOR', 'Rf 反馈电阻', 440, 100, 0, { resistance: 10000 }),
            mkComp('u1', 'OPAMP', 'OPAMP (±15V)', 440, 220, 0, {
              railPos: 15,
              railNeg: -15,
              gain: 100000,
            }),
            mkComp('vm_n', 'VOLTMETER', 'PV_虚地 (V-)', 310, 320, 90, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 输出', 680, 220, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 90, 380, 0),
          ],
          [
            ['vin', 'pos', 'r1', 'a', '#38bdf8'],
            ['r1', 'b', 'u1', 'inm', '#38bdf8'],
            ['u1', 'inm', 'rf', 'a', '#f59e0b'],
            ['rf', 'b', 'u1', 'out', '#f59e0b'],
            ['u1', 'inp', 'gnd1', 'gnd', '#475569'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u1', 'inm', 'vm_n', 'pos', '#22d3ee'],
            ['gnd1', 'gnd', 'vm_n', 'neg', '#475569'],
            ['u1', 'out', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l17s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l17-s1-f1',
            title: '反相比例放大定律与虚地验证',
            formula: 'Vo = -(Rf / R1)·Vin ；理想虚地 V_- ≈ 0.00V',
            evaluate: (ctx) => {
              const rf = numProp(ctx, 'rf', 'resistance', 10000);
              const vn = getTel(ctx, 'vm_n')?.voltageDrop ?? 0;
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `增益 -Rf/R1 = -${(rf / 10000).toFixed(1)}×，虚地 V- = ${vn.toFixed(4)}V`,
                result: `实测 Vo = ${fmtV(vout)}`,
                status: vout >= -3.15 && vout <= -2.85 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l17-rf',
            label: '反馈电阻 Rf (kΩ)',
            targetId: 'rf',
            propKey: 'resistance',
            kind: 'slider',
            min: 5000,
            max: 60000,
            step: 5000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：运放虚短与虚地机理', type: 'OPAMP', componentId: 'u1', stepIndex: 0 }],
        checkpoint: {
          title: '精准设定 -3× 反相比例增益',
          instruction: '调整反馈电阻 Rf = 30kΩ（目标 -3×），验证输出稳定在 -2.85V ~ -3.15V 且 V_- 接近 0V。',
          check: (ctx) => {
            const vn = Math.abs(getTel(ctx, 'vm_n')?.voltageDrop ?? 9);
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = vn < 0.02 && vout >= -3.15 && vout <= -2.85;
            return {
              passed: ok,
              message: ok
                ? `精确反相 -3× 达成！Vo = ${vout.toFixed(2)}V，虚地偏差仅 ${(vn * 1000).toFixed(2)}mV`
                : `当前 Vo = ${vout.toFixed(2)}V，虚地 V- = ${vn.toFixed(3)}V（目标 -3.0V）`,
            };
          },
          autoDemo: {
            buttonLabel: '调至 Rf = 30kΩ (-3×)',
            description: '将 Rf 调为 30kΩ 验证 Vout = -3.0V',
            actions: [{ kind: 'setProp', componentId: 'rf', key: 'resistance', value: 30000 }],
          },
        },
      },
      {
        id: 'l17-s2',
        stageNumber: 2,
        title: '同相比例放大器：Au = 1 + Rf / R1',
        badge: 'Step 2 · 同相比例',
        conceptGoal: '把信号从同相端 (+) 送入，V_- 贴合 V_+ 令电阻分压反推得到恒 ≥ 1 的同相放大倍，且极高输入阻抗不拖垮前级。',
        explanation:
          '这回将 +1.5V 输入送进运放同相端（+），由反相端的 Rf 与接地电阻 R1 分压反馈给（-）脚。由于虚短条件要求 V_- = V_+ = +1.50V，而电阻分压比 V_- = Vo·R1/(R1+Rf)，立即解出 Vo = (1 + Rf/R1)·Vin。试调大 Rf 到 30kΩ，验证同相四倍放大 +6.0V！',
        analogy: '就像升降电梯：你把传感器稳稳放在 1.5 米高基准点（V_+），配重钢索通过滑轮组（Rf/R1）按 1 + Rf/R1 比例拉出 6.0 米输出高台！',
        highlights: ['u1', 'rf', 'vm_n', 'vm_out'],
        newlyAddedIds: [],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin (+1.5V)', 110, 190, 270, { voltage: 1.5 }),
            mkComp('u1', 'OPAMP', 'OPAMP (±15V)', 400, 210, 0, {
              railPos: 15,
              railNeg: -15,
              gain: 100000,
            }),
            mkComp('r1', 'RESISTOR', 'R1 (10kΩ)', 270, 320, 90, { resistance: 10000 }),
            mkComp('rf', 'RESISTOR', 'Rf 反馈电阻', 420, 100, 0, { resistance: 10000 }),
            mkComp('vm_n', 'VOLTMETER', 'PV_虚短 (V-)', 220, 260, 90, { mode: 'dc' }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 输出', 640, 210, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 110, 410, 0),
          ],
          [
            ['vin', 'pos', 'u1', 'inp', '#38bdf8'],
            ['r1', 'a', 'u1', 'inm', '#f59e0b'],
            ['r1', 'b', 'gnd1', 'gnd', '#475569'],
            ['u1', 'inm', 'rf', 'a', '#f59e0b'],
            ['rf', 'b', 'u1', 'out', '#f59e0b'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u1', 'inm', 'vm_n', 'pos', '#22d3ee'],
            ['gnd1', 'gnd', 'vm_n', 'neg', '#475569'],
            ['u1', 'out', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l17s2'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l17-s2-f1',
            title: '同相比例放大与虚短追踪',
            formula: 'Vo = (1 + Rf / R1)·Vin ；V_- 紧咬 Vin = 1.50V',
            evaluate: (ctx) => {
              const rf = numProp(ctx, 'rf', 'resistance', 10000);
              const vn = getTel(ctx, 'vm_n')?.voltageDrop ?? 0;
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              const theoretical = (1 + rf / 10000) * 1.5;
              return {
                expression: `理论倍数 (1+${(rf / 10000).toFixed(1)})×1.5 = ${fmtV(theoretical)} | V-=${fmtV(vn)}`,
                result: `实测输出 Vo = ${fmtV(vout)}`,
                status: vout >= 5.8 && vout <= 6.2 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l17-rf2',
            label: '反馈电阻 Rf (kΩ)',
            targetId: 'rf',
            propKey: 'resistance',
            kind: 'slider',
            min: 5000,
            max: 60000,
            step: 5000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：同相放大虚短追踪', type: 'OPAMP', componentId: 'u1', stepIndex: 1 }],
        checkpoint: {
          title: '配置 +4× 同相比例放大',
          instruction: '调整 Rf = 30kΩ，验证同相比例公式 Vo = (1 + 30k/10k)×1.5V = 6.0V 且 V_- ≈ 1.50V。',
          check: (ctx) => {
            const vn = getTel(ctx, 'vm_n')?.voltageDrop ?? 0;
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = Math.abs(vn - 1.5) < 0.05 && vout >= 5.8 && vout <= 6.2;
            return {
              passed: ok,
              message: ok
                ? `同相 +4× 稳稳成立！V- = ${vn.toFixed(3)}V 紧跟 Vin，输出 ${vout.toFixed(2)}V`
                : `当前 Vo = ${vout.toFixed(2)}V，V- = ${vn.toFixed(2)}V（需 Vo 在 5.8~6.2V）`,
            };
          },
          autoDemo: {
            buttonLabel: '调至 Rf = 30kΩ (+4×)',
            description: '设置 Rf = 30kΩ 验证 6.0V 同相输出',
            actions: [{ kind: 'setProp', componentId: 'rf', key: 'resistance', value: 30000 }],
          },
        },
      },
      {
        id: 'l17-s3',
        stageNumber: 3,
        title: '电压跟随器：零失真阻抗隔离缓冲',
        badge: 'Step 3 · 阻抗隔离缓冲',
        conceptGoal: '增益虽只有 1 倍（Rf=0 相当于全反馈），却将输入端 100kΩ 脆弱分压信号与 1kΩ 重负载彻底隔离开来！',
        explanation:
          '设想一个内阻高达 100kΩ 的精密电极传感器（空载 5.0V），一旦直接挂进 1kΩ 后端负载（K_buf 在 NC 档直连），负载端电压瞬间腰斩坍缩至区区 0.05V！现在将开关拨到 NO 档，让传感器接入几乎不抽电流的运放同相端，由强驱动能力的电压跟随器替它向 1kΩ 负载输送满格 5.00V！',
        analogy: '就像珍贵脆弱的指挥家不必亲自跑去拉纤，只需在玻璃音室里轻轻举起指挥棒（虚断不费一兵一卒），扩音大功率功放（跟随器输出级）替它撼动全场音响！',
        highlights: ['sw_buf', 'u1', 'vm_load'],
        newlyAddedIds: ['r_src', 'sw_buf', 'r_load', 'vm_load'],
        circuit: mkCircuit(
          [
            mkComp('vs', 'DC_SOURCE', '精密信号源 5V', 90, 230, 270, { voltage: 5 }),
            mkComp('r_src', 'RESISTOR', '极高内阻 (100kΩ)', 230, 150, 0, { resistance: 100000 }),
            mkComp('u1', 'OPAMP', '电压跟随器 (±12V)', 410, 230, 0, {
              railPos: 12,
              railNeg: -12,
              gain: 100000,
            }),
            mkComp('sw_buf', 'SWITCH_SPDT', '直连/缓冲切换', 540, 150, 0, { position: 0 }),
            mkComp('r_load', 'RESISTOR', '重负载 RL (1kΩ)', 660, 250, 90, { resistance: 1000 }),
            mkComp('vm_load', 'VOLTMETER', 'PV_Load 负载压降', 770, 250, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 90, 390, 0),
          ],
          [
            ['vs', 'pos', 'r_src', 'a', '#ef4444'],
            ['r_src', 'b', 'u1', 'inp', '#38bdf8'],
            ['r_src', 'b', 'sw_buf', 'nc', '#f59e0b'],
            ['u1', 'out', 'u1', 'inm', '#22c55e'],
            ['u1', 'out', 'sw_buf', 'no', '#22c55e'],
            ['sw_buf', 'com', 'r_load', 'a', '#a855f7'],
            ['r_load', 'b', 'gnd1', 'gnd', '#475569'],
            ['vs', 'neg', 'gnd1', 'gnd', '#475569'],
            ['r_load', 'a', 'vm_load', 'pos', '#ec4899'],
            ['gnd1', 'gnd', 'vm_load', 'neg', '#475569'],
          ],
          'l17s3'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l17-s3-f1',
            title: '跟随器隔离前后带载能力对比',
            formula: '直连坍缩 V_L = 5V × 1k / (100k+1k) = 0.05V ｜ 跟随隔离 = 5.00V',
            evaluate: (ctx) => {
              const pos = numProp(ctx, 'sw_buf', 'position', 0);
              const vLoad = getTel(ctx, 'vm_load')?.voltageDrop ?? 0;
              return {
                expression: pos ? '接入运放电压跟随器 (NO)' : '直连重负载 (NC·未隔离)',
                result: `重负载实测 V_L = ${fmtV(vLoad)}`,
                status: pos === 1 && vLoad >= 4.9 ? 'good' : 'warn',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l17-sw',
            label: '切换直连 vs 跟随器缓冲',
            targetId: 'sw_buf',
            propKey: 'position',
            kind: 'spdt-toggle',
          },
        ],
        ponderLinks: [{ label: '思索：深度负反馈隔离效应', type: 'OPAMP', componentId: 'u1', stepIndex: 2 }],
        checkpoint: {
          title: '投入电压跟随器挽救负载电压',
          instruction: '拨动开关切到 NO 档接入电压跟随器，使 1kΩ 重负载两端电压从 0.05V 满血恢复至 ≥ 4.9V。',
          check: (ctx) => {
            const pos = numProp(ctx, 'sw_buf', 'position', 0);
            const vLoad = getTel(ctx, 'vm_load')?.voltageDrop ?? 0;
            const ok = pos === 1 && vLoad >= 4.9;
            return {
              passed: ok,
              message: ok
                ? `隔离成功！负载恢复满额 ${vLoad.toFixed(3)}V（直连时仅 0.05V）`
                : `当前负载电压仅 ${vLoad.toFixed(2)}V（切换至 NO 跟随缓冲即可满血恢复）`,
            };
          },
          autoDemo: {
            buttonLabel: '接入电压跟随器隔离 (NO)',
            description: '切到 NO 挡用电压跟随器隔离重负载',
            actions: [{ kind: 'setProp', componentId: 'sw_buf', key: 'position', value: 1 }],
          },
        },
      },
    ],
  },

  // =========================================================================
  // Lesson 18 (Ch.9): 运放模拟运算电路与迟滞电压比较器
  // =========================================================================
  {
    id: 'ch9-opamp-math-and-comparators',
    chapterId: 'ch9',
    lessonNumber: 18,
    title: '模拟加法、有源积分与施密特迟滞比较器',
    subtitle: '用运放实现硬件实时模拟加法和微积分运算，并用正反馈构造抗噪声翻转门限的施密特窗口比较器',
    textbookRef: '第9章 9.3–9.4 模拟运算电路（加减/积分）与电压比较器',
    difficulty: '进阶',
    durationMin: 16,
    prerequisites: ['ch9-opamp-negative-feedback'],
    learningObjectives: [
      '掌握虚地节点按基尔霍夫电流直接汇合实现反相加法器：Vo = -Rf(V1/R1 + V2/R2)',
      '认识把反馈电阻 Rf 换成电容 Cf 后得到的微积分波形变换电路：方波积分变线性三角波',
      '区分单限比较器易受毛刺抖动与施密特滞回比较器（正反馈双阈值）抗干扰能力',
    ],
    stages: [
      {
        id: 'l18-s1',
        stageNumber: 1,
        title: '双路模拟信号反相加法器（模拟混音核心）',
        badge: 'Step 1 · 模拟加法',
        conceptGoal: '虚地点互不串扰：来自 R1、R2 的两路电流在虚地处直接按 KCL 线性求和，全部流入反馈电阻 Rf 实现无串音叠加。',
        explanation:
          '因为反相输入点被钳在 0V 虚地，输入源 V1(1V) 和 V2(2V) 完全互相“看不见”对方（彼此孤立互不倒灌！），各自按 I1 = V1/R1 与 I2 = V2/R2 产生独立支路电流后一起在虚地会师，总输出 Vo = -Rf·(V1/R1 + V2/R2)。当前 Rf=10kΩ 得 -3.0V，试将 Rf 倍增至 20kΩ，看线性按比例放大至 -6.0V！',
        analogy: '就像两位分别往同一台无滞后电子秤倒水的工人：左边倒 100µA、右边倒 200µA，出口反馈管道瞬间给出负 300µA×Rf 读数，左右水管谁也顶不到谁。',
        highlights: ['r1', 'r2', 'rf', 'vm_out'],
        newlyAddedIds: ['v2', 'r2'],
        circuit: mkCircuit(
          [
            mkComp('v1', 'DC_SOURCE', 'V1 (1.0V)', 90, 140, 270, { voltage: 1.0 }),
            mkComp('r1', 'RESISTOR', 'R1 (10kΩ)', 230, 140, 0, { resistance: 10000 }),
            mkComp('v2', 'DC_SOURCE', 'V2 (2.0V)', 90, 290, 270, { voltage: 2.0 }),
            mkComp('r2', 'RESISTOR', 'R2 (10kΩ)', 230, 260, 0, { resistance: 10000 }),
            mkComp('rf', 'RESISTOR', 'Rf 求和反馈', 470, 90, 0, { resistance: 10000 }),
            mkComp('u1', 'OPAMP', 'OPAMP (±15V)', 470, 210, 0, {
              railPos: 15,
              railNeg: -15,
              gain: 100000,
            }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out', 690, 210, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 90, 410, 0),
          ],
          [
            ['v1', 'pos', 'r1', 'a', '#38bdf8'],
            ['v2', 'pos', 'r2', 'a', '#22c55e'],
            ['r1', 'b', 'u1', 'inm', '#f59e0b'],
            ['r2', 'b', 'u1', 'inm', '#f59e0b'],
            ['u1', 'inm', 'rf', 'a', '#f59e0b'],
            ['rf', 'b', 'u1', 'out', '#f59e0b'],
            ['u1', 'inp', 'gnd1', 'gnd', '#475569'],
            ['v1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['v2', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u1', 'out', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l18s1'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l18-s1-f1',
            title: '加权反相求和定理',
            formula: 'Vo = -Rf · (V1/R1 + V2/R2) = -Rf/10k · (1.0 + 2.0)V',
            evaluate: (ctx) => {
              const rf = numProp(ctx, 'rf', 'resistance', 10000);
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `增益倍数 = ${(rf / 10000).toFixed(1)}×`,
                result: `实测求和输出 Vo = ${fmtV(vout)}`,
                status: vout >= -6.2 && vout <= -5.8 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l18-rf',
            label: '求和反馈 Rf (kΩ)',
            targetId: 'rf',
            propKey: 'resistance',
            kind: 'slider',
            min: 5000,
            max: 30000,
            step: 5000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：反相汇流节点加权定律', type: 'OPAMP', componentId: 'u1', stepIndex: 0 }],
        checkpoint: {
          title: '设置倍增比例完成模拟混音输出',
          instruction: '将 Rf 调至 20kΩ，使输出精确求和并放大为 -6.0V (-5.8V ~ -6.2V)。',
          check: (ctx) => {
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = vout >= -6.2 && vout <= -5.8;
            return {
              passed: ok,
              message: ok
                ? `混音求和精准生效！Vo = -(20k/10k)·(1V+2V) = ${vout.toFixed(2)}V`
                : `当前求和输出 Vo = ${vout.toFixed(2)}V（调整 Rf 使输出达到 -6.0V）`,
            };
          },
          autoDemo: {
            buttonLabel: '将 Rf 调为 20kΩ 得 -6.0V',
            description: '调整求和反馈比例获得 -6.0V 输出',
            actions: [{ kind: 'setProp', componentId: 'rf', key: 'resistance', value: 20000 }],
          },
        },
      },
      {
        id: 'l18-s2',
        stageNumber: 2,
        title: 'RC 有源积分器：方波实时积分变线性三角波',
        badge: 'Step 2 · 模拟积分器',
        conceptGoal: '恒定方波电压经 R_in 向虚地注入恒定电流给电容 Cf 充电，令输出电压呈绝对直线式斜坡上升与下降！',
        explanation:
          '把反相放大器的反馈电阻 Rf 替换成储能电容 Cf（并接一只大电阻 R_bleed 避免微弱失调把输出拖到饱和），电路立即变成硬件模拟微积分单元：u_o(t) = -(1 / R·C)·∫ u_in dt。打开下方示波器可以看到输入是平顶方波，输出完美变成斜坡直线三角波！将 R_in 减小一半到 5kΩ，积分速率加倍！',
        analogy: '就像拿恒定流速的水龙头往量筒（电容）灌水：水龙头虽是一开一关的阶梯方波动作，筒内水位却是匀速均匀升高的直线斜坡！',
        highlights: ['r_in', 'cf', 'vm_out'],
        newlyAddedIds: ['r_in', 'cf', 'r_bleed'],
        defaultTimeScale: 0.4,
        prewarmSeconds: 0.35,
        preferredAnalysisTab: 'ac',
        scopeChannels: ['ac1', 'vm_out'],
        circuit: mkCircuit(
          [
            mkComp('ac1', 'AC_SOURCE', '方波输入 ±2V 5Hz', 90, 220, 270, {
              amplitude: 2.0,
              frequency: 5,
              phase: 0,
              dcOffset: 0,
              waveform: 'square',
            }),
            mkComp('r_in', 'RESISTOR', 'R_in 积分电阻', 230, 180, 0, { resistance: 10000 }),
            mkComp('cf', 'CAPACITOR', 'Cf 积分电容 (10µF)', 430, 100, 0, { capacitance: 10 }),
            mkComp('r_bleed', 'RESISTOR', 'R_bleed (220kΩ)', 430, 40, 0, { resistance: 220000 }),
            mkComp('u1', 'OPAMP', 'OPAMP (±15V)', 440, 220, 0, {
              railPos: 15,
              railNeg: -15,
              gain: 100000,
            }),
            mkComp('vm_out', 'VOLTMETER', 'PV_三角波有效值', 660, 220, 90, { mode: 'rms' }),
            mkComp('gnd1', 'GROUND', 'GND', 90, 370, 0),
          ],
          [
            ['ac1', 'pos', 'r_in', 'a', '#38bdf8'],
            ['r_in', 'b', 'u1', 'inm', '#38bdf8'],
            ['u1', 'inm', 'cf', 'pos', '#f59e0b'],
            ['cf', 'neg', 'u1', 'out', '#f59e0b'],
            ['u1', 'inm', 'r_bleed', 'a', '#64748b'],
            ['r_bleed', 'b', 'u1', 'out', '#64748b'],
            ['u1', 'inp', 'gnd1', 'gnd', '#475569'],
            ['ac1', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u1', 'out', 'vm_out', 'pos', '#22c55e'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l18s2'
        ),
        liveFormulas: [
          {
            id: 'l18-s2-f1',
            title: '三角波峰峰值斜率与时间常数',
            formula: 'τ = R_in · Cf ；减小 R_in 加快斜率成倍推高三角波幅值',
            evaluate: (ctx) => {
              const rin = numProp(ctx, 'r_in', 'resistance', 10000);
              const vrms = getTel(ctx, 'vm_out')?.vRms ?? 0;
              return {
                expression: `τ = ${(rin * 10e-6 * 1000).toFixed(0)} ms`,
                result: `输出三角波有效值 Vo_rms = ${fmtV(vrms)}`,
                status: vrms >= 0.9 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l18-rin',
            label: '积分输入电阻 R_in (Ω)',
            targetId: 'r_in',
            propKey: 'resistance',
            kind: 'slider',
            min: 3000,
            max: 15000,
            step: 1000,
            unit: 'Ω',
          },
        ],
        ponderLinks: [{ label: '思索：电容积分与斜坡变换', type: 'CAPACITOR', componentId: 'cf', stepIndex: 1 }],
        checkpoint: {
          title: '调快积分速率使三角波有效值 ≥ 0.9V',
          instruction: '减小积分输入电阻 R_in 至 5kΩ 左右加速电容电流充放，使输出三角波有效值跃升至 ≥ 0.9V。',
          check: (ctx) => {
            const vrms = getTel(ctx, 'vm_out')?.vRms ?? 0;
            const ok = vrms >= 0.9;
            return {
              passed: ok,
              message: ok
                ? `有源积分波形翻倍！三角波有效值 Vo_rms = ${vrms.toFixed(2)}V`
                : `当前三角波 Vo_rms = ${vrms.toFixed(2)}V（需减小 R_in 至 5kΩ 左右提高摆幅至 ≥ 0.9V）`,
            };
          },
          autoDemo: {
            buttonLabel: '减小 R_in 至 5kΩ 加速积分',
            description: '将 R_in 设为 5kΩ 观察积分幅度倍增',
            actions: [{ kind: 'setProp', componentId: 'r_in', key: 'resistance', value: 5000 }],
          },
        },
      },
      {
        id: 'l18-s3',
        stageNumber: 3,
        title: '单电源电压比较器与正反馈施密特迟滞门限',
        badge: 'Step 3 · 迟滞抗抖',
        conceptGoal: '正反馈故意制造“回差窗口”（上行门槛高于下行门槛），一旦翻转后哪怕信号在门限边沿颤动也不再误跳！',
        explanation:
          '当运放不加负反馈、反而通过 K_hys 从输出向同相端（+）引入正反馈电阻 Rf_pos 时，运放变成“非0即5V”的电子断路开关！单电源设为 +5V/0V，参考门限 Vref = 2.5V：先闭合正反馈开关 K_hys（此时上跳门槛抬高到约 3.13V），再将 Vin 调至 3.5V 及以上，看输出果断锁紧 +5.0V 高电平！',
        analogy: '就像带磁铁卡扣的家用温控开关：26℃ 以上吸合启动空调后，会等室温凉到 22℃ 以下才松开，绝不因 25.9~26.1℃ 的微小风吹抖动疯狂啪嗒开关！',
        highlights: ['k_hys', 'r_pos', 'u1', 'vm_out'],
        newlyAddedIds: ['vref', 'k_hys', 'r_pos'],
        circuit: mkCircuit(
          [
            mkComp('vin', 'DC_SOURCE', 'Vin 传感输入', 90, 170, 270, { voltage: 2.0 }),
            mkComp('r_in_p', 'RESISTOR', 'R_in (10kΩ)', 230, 160, 0, { resistance: 10000 }),
            mkComp('k_hys', 'SWITCH_SPST', 'K_hys 正反馈', 410, 90, 0, { closed: false }),
            mkComp('r_pos', 'RESISTOR', 'R_pos (40kΩ)', 530, 90, 0, { resistance: 40000 }),
            mkComp('vref', 'DC_SOURCE', 'Vref (2.5V)', 90, 320, 270, { voltage: 2.5 }),
            mkComp('u1', 'OPAMP', '单电源比较器 (0..5V)', 440, 220, 0, {
              railPos: 5,
              railNeg: 0,
              gain: 100000,
            }),
            mkComp('vm_out', 'VOLTMETER', 'PV_Out 逻辑输出', 690, 220, 90, { mode: 'dc' }),
            mkComp('gnd1', 'GROUND', 'GND', 90, 440, 0),
          ],
          [
            ['vin', 'pos', 'r_in_p', 'a', '#38bdf8'],
            ['r_in_p', 'b', 'u1', 'inp', '#38bdf8'],
            ['vref', 'pos', 'u1', 'inm', '#f59e0b'],
            ['u1', 'inp', 'k_hys', 'a', '#22c55e'],
            ['k_hys', 'b', 'r_pos', 'a', '#22c55e'],
            ['r_pos', 'b', 'u1', 'out', '#22c55e'],
            ['vin', 'neg', 'gnd1', 'gnd', '#475569'],
            ['vref', 'neg', 'gnd1', 'gnd', '#475569'],
            ['u1', 'out', 'vm_out', 'pos', '#a855f7'],
            ['gnd1', 'gnd', 'vm_out', 'neg', '#475569'],
          ],
          'l18s3'
        ),
        preferredAnalysisTab: 'telemetry',
        liveFormulas: [
          {
            id: 'l18-s3-f1',
            title: '施密特上/下迟滞翻转门槛',
            formula: '滞回开启后：V_TL ≈ 1.88V，V_TH ≈ 3.13V（回差 ΔV = 1.25V）',
            evaluate: (ctx) => {
              const vin = numProp(ctx, 'vin', 'voltage', 2.0);
              const hys = boolProp(ctx, 'k_hys', 'closed');
              const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
              return {
                expression: `Vin=${vin.toFixed(1)}V | ${hys ? '滞回窗口 [1.88, 3.13]V' : '单限 2.50V'}`,
                result: `比较输出 Vo = ${fmtV(vout)} (${vout >= 2.5 ? 'HIGH 5V' : 'LOW 0V'})`,
                status: hys && vout >= 4.5 ? 'good' : 'normal',
              };
            },
          },
        ],
        quickControls: [
          {
            id: 'qc-l18-khys',
            label: '正反馈迟滞开关 K_hys',
            targetId: 'k_hys',
            propKey: 'closed',
            kind: 'toggle-switch',
          },
          {
            id: 'qc-l18-vin',
            label: '输入传感电压 Vin',
            targetId: 'vin',
            propKey: 'voltage',
            kind: 'slider',
            min: 0.5,
            max: 4.5,
            step: 0.5,
            unit: 'V',
          },
        ],
        ponderLinks: [{ label: '思索：运放正饱和压摆比较特性', type: 'OPAMP', componentId: 'u1', stepIndex: 2 }],
        checkpoint: {
          title: '闭合正反馈跨过上行滞回门槛',
          instruction: '闭合 K_hys 启用正反馈窗口，并将 Vin 升过上行阈值 3.13V（如 3.5V），使输出跃迁锁定至 ≥ 4.5V。',
          check: (ctx) => {
            const hys = boolProp(ctx, 'k_hys', 'closed');
            const vout = getTel(ctx, 'vm_out')?.voltageDrop ?? 0;
            const ok = hys && vout >= 4.5;
            return {
              passed: ok,
              message: ok
                ? `施密特迟滞翻越完成！Vo 果断拉满至 ${vout.toFixed(2)}V（此后降回到 2.0V 仍能保持高电平防抖！）`
                : `当前 K_hys=${hys ? '闭合' : '断开'}，输出 Vo=${vout.toFixed(2)}V（需闭合并使 Vo ≥ 4.5V）`,
            };
          },
          autoDemo: {
            buttonLabel: '启滞回并跨过 3.5V 上阈值',
            description: '闭合正反馈开关并将 Vin 升至 3.5V 触发高电平锁存',
            actions: [
              { kind: 'setProp', componentId: 'k_hys', key: 'closed', value: true },
              { kind: 'setProp', componentId: 'vin', key: 'voltage', value: 3.5 },
            ],
          },
        },
      },
    ],
  },

  // =========================================================================
  ...LESSONS_VOL2_POWER,
];
