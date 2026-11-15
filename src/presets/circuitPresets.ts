import type { CircuitData, ForumCategory } from '../../shared/types';
import { world2dTo3d } from '../engine/componentCatalog';

export interface CircuitPreset {
  id: string;
  title: string;
  category: ForumCategory;
  summary: string;
  description: string;
  tags: string[];
  circuit: CircuitData;
}

function comp(
  id: string,
  type: CircuitData['components'][number]['type'],
  label: string,
  x2d: number,
  y2d: number,
  rot2d = 0,
  props: Record<string, number | string | boolean> = {}
): CircuitData['components'][number] {
  const rad = (-rot2d * Math.PI) / 180;
  return {
    id,
    type,
    label,
    pos2d: { x: x2d, y: y2d },
    rot2d,
    pos3d: world2dTo3d({ x: x2d, y: y2d }),
    rotationY: rad,
    props,
  };
}

function wire(
  id: string,
  fromComp: string,
  fromPin: string,
  toComp: string,
  toPin: string,
  color = '#38bdf8'
): CircuitData['wires'][number] {
  return {
    id,
    from: { componentId: fromComp, pinId: fromPin },
    to: { componentId: toComp, pinId: toPin },
    color,
  };
}

export const CIRCUIT_PRESETS: CircuitPreset[] = [
  {
    id: 'preset-led-dimmer',
    title: 'LED 限流调光与功率负载分析',
    category: '模电基础',
    summary: '5V 直流源串联固定电阻、电位器与红色 LED，配套数字电流表与并联电压表实时观测工作点。',
    description:
      '本实验演示基尔霍夫电压定律 (KVL) 与非线性发光二极管的伏安特性。通过旋转电位器 RV1 的滑臂比例，可以实时观察支路电流、LED 压降、亮度及限流电阻功耗负载率的变化；当串联阻值过小时系统将触发过载报警。',
    tags: ['模电入门', 'LED限流', 'KVL', '功率负载'],
    circuit: {
      components: [
        comp('v1', 'DC_SOURCE', 'V1', 120, 260, 270, { voltage: 5 }),
        comp('k1', 'SWITCH_SPST', 'K1', 230, 140, 0, { closed: true }),
        comp('r1', 'RESISTOR', 'R1', 360, 140, 0, { resistance: 220, maxPower: 0.5 }),
        comp('rv1', 'POTENTIOMETER', 'RV1', 500, 140, 0, { resistance: 1000, ratio: 0.35, maxPower: 1.0 }),
        comp('pa1', 'AMMETER', 'PA1', 640, 220, 90),
        comp('led1', 'LED', 'LED1', 640, 340, 90, { color: 'red', maxPower: 0.15 }),
        comp('pv1', 'VOLTMETER', 'PV1', 760, 340, 90),
        comp('gnd1', 'GROUND', 'GND1', 120, 410, 0),
      ],
      wires: [
        wire('w1', 'v1', 'pos', 'k1', 'a', '#ef4444'),
        wire('w2', 'k1', 'b', 'r1', 'a', '#ef4444'),
        wire('w3', 'r1', 'b', 'rv1', 'a', '#eab308'),
        wire('w4', 'rv1', 'wiper', 'pa1', 'pos', '#38bdf8'),
        wire('w5', 'pa1', 'neg', 'led1', 'anode', '#38bdf8'),
        wire('w6', 'led1', 'cathode', 'v1', 'neg', '#475569'),
        wire('w7', 'v1', 'neg', 'gnd1', 'gnd', '#475569'),
        wire('w8', 'led1', 'anode', 'pv1', 'pos', '#a855f7'),
        wire('w9', 'led1', 'cathode', 'pv1', 'neg', '#475569'),
      ],
    },
  },
  {
    id: 'preset-rc-transient',
    title: '一阶 RC 暂态充放电波形观测',
    category: '暂态与滤波',
    summary: '方波激励源驱动 1kΩ 电阻与 220µF 电容 (τ = 0.22s)，在底部示波器中观测标准指数充放电曲线。',
    description:
      '一阶 RC 电路时间常数 τ = R·C = 1000Ω × 220µF = 0.22s。方波信号每 0.5s 在 0V 与 6V 之间跳变，打开底部“实时电参量与示波器”面板即可清晰观察电阻端与电容端电压的暂态指数响应。',
    tags: ['RC暂态', '时间常数', '示波器', '电路分析'],
    circuit: {
      components: [
        comp('vs1', 'AC_SOURCE', 'Vs1', 140, 260, 270, {
          amplitude: 3,
          frequency: 1,
          dcOffset: 3,
          waveform: 'square',
        }),
        comp('r1', 'RESISTOR', 'R1', 320, 160, 0, { resistance: 1000, maxPower: 1.0 }),
        comp('c1', 'CAPACITOR', 'C1', 490, 260, 90, { capacitance: 220 }),
        comp('pv1', 'VOLTMETER', 'PV1', 640, 260, 90),
        comp('gnd1', 'GROUND', 'GND1', 140, 410, 0),
      ],
      wires: [
        wire('w1', 'vs1', 'pos', 'r1', 'a', '#ef4444'),
        wire('w2', 'r1', 'b', 'c1', 'pos', '#38bdf8'),
        wire('w3', 'c1', 'neg', 'vs1', 'neg', '#475569'),
        wire('w4', 'vs1', 'neg', 'gnd1', 'gnd', '#475569'),
        wire('w5', 'c1', 'pos', 'pv1', 'pos', '#22c55e'),
        wire('w6', 'c1', 'neg', 'pv1', 'neg', '#475569'),
      ],
    },
  },
  {
    id: 'preset-majority-voter',
    title: '三人表决器与卡诺图化简 (Y = AB + BC + AC)',
    category: '数电逻辑',
    summary: '基于与门、或门搭建的 3 输入表决逻辑电路，支持实时真值表交互与卡诺图最小项 ∑m(3,5,6,7) 自动圈选。',
    description:
      '三人表决器要求当 A、B、C 三位评委中至少有两人投赞成票 (1) 时结果 Y = 1。打开底部“数电真值表与卡诺图”面板，可直观查看全部 8 组输入组合，并通过卡诺图中的 3 个绿色/蓝色相邻最小项圈得出最简与或式 Y = AB + BC + AC。电路输出同时驱动绿色 LED 实时亮灭。',
    tags: ['三人表决器', '真值表', '卡诺图', '组合逻辑'],
    circuit: {
      components: [
        comp('in_a', 'LOGIC_IN', 'A', 110, 130, 0, { state: 1, varName: 'A' }),
        comp('in_b', 'LOGIC_IN', 'B', 110, 250, 0, { state: 1, varName: 'B' }),
        comp('in_c', 'LOGIC_IN', 'C', 110, 370, 0, { state: 0, varName: 'C' }),
        comp('u1', 'AND', 'U1', 310, 140, 0),
        comp('u2', 'AND', 'U2', 310, 250, 0),
        comp('u3', 'AND', 'U3', 310, 360, 0),
        comp('u4', 'OR', 'U4', 470, 190, 0),
        comp('u5', 'OR', 'U5', 600, 250, 0),
        comp('y1', 'LOGIC_OUT', 'Y', 740, 210, 0, { outName: 'Y' }),
        comp('r_led', 'RESISTOR', 'R_LED', 600, 370, 0, { resistance: 220, maxPower: 0.5 }),
        comp('led_y', 'LED', 'LED_Y', 740, 370, 0, { color: 'green', maxPower: 0.15 }),
        comp('gnd1', 'GROUND', 'GND1', 830, 420, 0),
      ],
      wires: [
        wire('w1', 'in_a', 'out', 'u1', 'a', '#ef4444'),
        wire('w2', 'in_b', 'out', 'u1', 'b', '#38bdf8'),
        wire('w3', 'in_b', 'out', 'u2', 'a', '#38bdf8'),
        wire('w4', 'in_c', 'out', 'u2', 'b', '#eab308'),
        wire('w5', 'in_a', 'out', 'u3', 'a', '#ef4444'),
        wire('w6', 'in_c', 'out', 'u3', 'b', '#eab308'),
        wire('w7', 'u1', 'y', 'u4', 'a', '#22c55e'),
        wire('w8', 'u2', 'y', 'u4', 'b', '#22c55e'),
        wire('w9', 'u4', 'y', 'u5', 'a', '#22c55e'),
        wire('w10', 'u3', 'y', 'u5', 'b', '#22c55e'),
        wire('w11', 'u5', 'y', 'y1', 'in', '#22c55e'),
        wire('w12', 'u5', 'y', 'r_led', 'a', '#22c55e'),
        wire('w13', 'r_led', 'b', 'led_y', 'anode', '#38bdf8'),
        wire('w14', 'led_y', 'cathode', 'gnd1', 'gnd', '#475569'),
      ],
    },
  },
  {
    id: 'preset-full-adder-hex',
    title: '一位全加器与七段数码管译码实验',
    category: '数电逻辑',
    summary: '使用分立 XOR/AND/OR 门构建一位全加器，并将和 S 与进位 Cout 接入 3D 七段数码管实时译码显示。',
    description:
      '经典的 1-bit 全加器实验：输入被加数 A、加数 B 与低位进位 Cin，通过两级异或门产生本位和 S = A ⊕ B ⊕ Cin，通过与或门产生向高位的进位 Cout = AB + (A⊕B)Cin。输出 S 接数码管 D0、Cout 接数码管 D1，在 3D 实验室中直接显示二进制相加结果 (0~3)！',
    tags: ['全加器', '七段数码管', '组合逻辑', '真值表'],
    circuit: {
      components: [
        comp('in_a', 'LOGIC_IN', 'A', 100, 140, 0, { state: 1, varName: 'A' }),
        comp('in_b', 'LOGIC_IN', 'B', 100, 260, 0, { state: 0, varName: 'B' }),
        comp('in_cin', 'LOGIC_IN', 'Cin', 100, 380, 0, { state: 1, varName: 'C' }),
        comp('xor1', 'XOR', 'U1_XOR', 270, 170, 0),
        comp('xor2', 'XOR', 'U2_XOR', 450, 200, 0),
        comp('and1', 'AND', 'U3_AND', 270, 330, 0),
        comp('and2', 'AND', 'U4_AND', 450, 320, 0),
        comp('or1', 'OR', 'U5_OR', 600, 330, 0),
        comp('out_s', 'LOGIC_OUT', 'S', 740, 150, 0, { outName: 'S' }),
        comp('out_c', 'LOGIC_OUT', 'Cout', 740, 260, 0, { outName: 'Cout' }),
        comp('hex1', 'HEX_DISPLAY', 'HEX1', 740, 380, 0),
      ],
      wires: [
        wire('w1', 'in_a', 'out', 'xor1', 'a', '#ef4444'),
        wire('w2', 'in_b', 'out', 'xor1', 'b', '#38bdf8'),
        wire('w3', 'xor1', 'y', 'xor2', 'a', '#22c55e'),
        wire('w4', 'in_cin', 'out', 'xor2', 'b', '#eab308'),
        wire('w5', 'in_a', 'out', 'and1', 'a', '#ef4444'),
        wire('w6', 'in_b', 'out', 'and1', 'b', '#38bdf8'),
        wire('w7', 'xor1', 'y', 'and2', 'a', '#22c55e'),
        wire('w8', 'in_cin', 'out', 'and2', 'b', '#eab308'),
        wire('w9', 'and2', 'y', 'or1', 'a', '#a855f7'),
        wire('w10', 'and1', 'y', 'or1', 'b', '#a855f7'),
        wire('w11', 'xor2', 'y', 'out_s', 'in', '#22c55e'),
        wire('w12', 'or1', 'y', 'out_c', 'in', '#ef4444'),
        wire('w13', 'xor2', 'y', 'hex1', 'd0', '#22c55e'),
        wire('w14', 'or1', 'y', 'hex1', 'd1', '#ef4444'),
      ],
    },
  },
  {
    id: 'preset-opamp-inverting',
    title: '集成运放反相比例放大器 (Au = -3)',
    category: '运算放大',
    summary: '输入 2V 正弦波，Rin = 1kΩ、反馈电阻 Rf = 3kΩ，验证“虚短/虚断”与反相 3 倍线性放大波形。',
    description:
      '集成运算放大器典型负反馈实验。根据理想运放“虚短”(U+ ≈ U- = 0V) 与“虚断”(I- ≈ 0)，闭环电压增益 Au = -Rf / Rin = -3kΩ / 1kΩ = -3。将示波器通道分别挂载到 Vs1 与 PV_out 即可观察严格的 180° 反相且幅值放大为 6V 的正弦波！',
    tags: ['运算放大器', '负反馈', '反相放大', '模电核心'],
    circuit: {
      components: [
        comp('vs1', 'AC_SOURCE', 'Vs1', 120, 290, 270, {
          amplitude: 2,
          frequency: 1,
          dcOffset: 0,
          waveform: 'sine',
        }),
        comp('rin', 'RESISTOR', 'Rin', 260, 250, 0, { resistance: 1000, maxPower: 0.5 }),
        comp('rf', 'RESISTOR', 'Rf', 440, 140, 0, { resistance: 3000, maxPower: 0.5 }),
        comp('u1', 'OPAMP', 'U1', 440, 270, 0, { railPos: 12, railNeg: -12, gain: 50000 }),
        comp('rl', 'RESISTOR', 'RL', 610, 310, 90, { resistance: 2000, maxPower: 0.5 }),
        comp('pv1', 'VOLTMETER', 'PV_out', 720, 310, 90),
        comp('gnd1', 'GROUND', 'GND1', 120, 420, 0),
      ],
      wires: [
        wire('w1', 'vs1', 'pos', 'rin', 'a', '#ef4444'),
        wire('w2', 'rin', 'b', 'u1', 'inm', '#38bdf8'),
        wire('w3', 'u1', 'inm', 'rf', 'a', '#eab308'),
        wire('w4', 'rf', 'b', 'u1', 'out', '#eab308'),
        wire('w5', 'u1', 'out', 'rl', 'a', '#22c55e'),
        wire('w6', 'u1', 'out', 'pv1', 'pos', '#22c55e'),
        wire('w7', 'vs1', 'neg', 'gnd1', 'gnd', '#475569'),
        wire('w8', 'u1', 'inp', 'gnd1', 'gnd', '#475569'),
        wire('w9', 'rl', 'b', 'gnd1', 'gnd', '#475569'),
        wire('w10', 'pv1', 'neg', 'gnd1', 'gnd', '#475569'),
      ],
    },
  },
];
