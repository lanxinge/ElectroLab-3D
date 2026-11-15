import type {
  CircuitComponent,
  ComponentCategory,
  ComponentType,
  PinDefinition,
} from '../../shared/types';
import {
  buildDipPinLayout,
  getCustomIcPins,
  getDefaultTruthChipConfig,
  getTruthChipPins,
} from './customIcEngine';

export interface ComponentSpec {
  type: ComponentType;
  category: ComponentCategory;
  name: string;
  shortName: string;
  labelPrefix: string;
  description: string;
  defaultProps: Record<string, number | string | boolean>;
  maxPower: number; // default rated power in Watts
  pins: PinDefinition[];
}

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  power: '电源与接地',
  passive: '无源器件与开关',
  semiconductor: '半导体与运放',
  instrument: '测量仪表',
  digital: '数字逻辑器件',
  custom: '特殊与自定义芯片',
};

export const WIRE_COLORS = [
  { name: '红 (VCC/正)', value: '#ef4444' },
  { name: '蓝 (信号)', value: '#38bdf8' },
  { name: '黑 (GND/负)', value: '#475569' },
  { name: '绿 (输出)', value: '#22c55e' },
  { name: '黄 (时钟/控制)', value: '#eab308' },
  { name: '紫 (总线)', value: '#a855f7' },
];

export const COMPONENT_CATALOG: Record<ComponentType, ComponentSpec> = {
  DC_SOURCE: {
    type: 'DC_SOURCE',
    category: 'power',
    name: '直流稳压电源',
    shortName: '直流电源',
    labelPrefix: 'V',
    description: '理想直流电压源（内阻 0.01 Ω，支持防短路保护计算）',
    defaultProps: { voltage: 5 },
    maxPower: 50,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
    ],
  },
  AC_SOURCE: {
    type: 'AC_SOURCE',
    category: 'power',
    name: '交流信号发生器',
    shortName: '交流源',
    labelPrefix: 'Vs',
    description: '正弦/方波交流信号源，可调幅值、频率、初相角与直流偏置',
    defaultProps: { amplitude: 5, frequency: 2, phase: 0, dcOffset: 0, waveform: 'sine' },
    maxPower: 50,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
    ],
  },
  CURRENT_SOURCE: {
    type: 'CURRENT_SOURCE',
    category: 'power',
    name: '恒流源',
    shortName: '恒流源',
    labelPrefix: 'Is',
    description: '直流恒定电流激励源',
    defaultProps: { current: 0.02 },
    maxPower: 25,
    pins: [
      { id: 'pos', label: 'Out+', role: 'pos', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
      { id: 'neg', label: 'In-', role: 'neg', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
    ],
  },
  GROUND: {
    type: 'GROUND',
    category: 'power',
    name: '参考地 (GND)',
    shortName: 'GND',
    labelPrefix: 'GND',
    description: '0V 基准参考电位点',
    defaultProps: {},
    maxPower: 999,
    pins: [
      { id: 'gnd', label: 'GND', role: 'neg', offset3d: [0, 0.35, 0], offset2d: { x: 0, y: -25 } },
    ],
  },
  RESISTOR: {
    type: 'RESISTOR',
    category: 'passive',
    name: '色环电阻',
    shortName: '电阻',
    labelPrefix: 'R',
    description: '标准 4 色环碳膜/金属膜电阻，自动渲染对应 IEC 色环',
    defaultProps: { resistance: 220, maxPower: 0.5 },
    maxPower: 0.5,
    pins: [
      { id: 'a', label: '1', role: 'passive', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'b', label: '2', role: 'passive', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  POTENTIOMETER: {
    type: 'POTENTIOMETER',
    category: 'passive',
    name: '旋转电位器',
    shortName: '电位器',
    labelPrefix: 'RV',
    description: '三端可调分压电阻，支持滑臂比例 0%~100% 实时调节',
    defaultProps: { resistance: 1000, ratio: 0.5, maxPower: 1.0 },
    maxPower: 1.0,
    pins: [
      { id: 'a', label: 'A', role: 'passive', offset3d: [-0.85, 0.12, 0.45], offset2d: { x: -40, y: 0 } },
      { id: 'wiper', label: 'W', role: 'passive', offset3d: [0, 0.12, -0.65], offset2d: { x: 0, y: -30 } },
      { id: 'b', label: 'B', role: 'passive', offset3d: [0.85, 0.12, 0.45], offset2d: { x: 40, y: 0 } },
    ],
  },
  CAPACITOR: {
    type: 'CAPACITOR',
    category: 'passive',
    name: '电解/薄膜电容',
    shortName: '电容',
    labelPrefix: 'C',
    description: '储能与滤波电容（支持一阶/高阶 RC/RLC 暂态充放电与交流容抗仿真，额定耐压 450V）',
    defaultProps: { capacitance: 100, maxVoltage: 450 }, // uF, V
    maxPower: 5,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [-0.75, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [0.75, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  INDUCTOR: {
    type: 'INDUCTOR',
    category: 'passive',
    name: '漆包线电感',
    shortName: '电感',
    labelPrefix: 'L',
    description: '磁通储能线圈（mH 级，含 0.02Ω 线圈铜阻，支持 RL/RLC 暂态与交流感抗仿真，额定载流 8A）',
    defaultProps: { inductance: 100, maxCurrent: 8 }, // mH, A
    maxPower: 5,
    pins: [
      { id: 'a', label: '1', role: 'passive', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'b', label: '2', role: 'passive', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  SWITCH_SPST: {
    type: 'SWITCH_SPST',
    category: 'passive',
    name: '单刀单掷开关',
    shortName: '单刀开关',
    labelPrefix: 'K',
    description: '点击 3D 拨杆或 2D 开关即可实时通断电路',
    defaultProps: { closed: true },
    maxPower: 50,
    pins: [
      { id: 'a', label: '1', role: 'passive', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'b', label: '2', role: 'passive', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  SWITCH_SPDT: {
    type: 'SWITCH_SPDT',
    category: 'passive',
    name: '单刀双掷开关',
    shortName: '双掷开关',
    labelPrefix: 'S',
    description: '点击可在 NO(常开) 与 NC(常闭) 支路间切换，适合充放电切换实验',
    defaultProps: { position: 0 }, // 0 -> nc, 1 -> no
    maxPower: 50,
    pins: [
      { id: 'com', label: 'COM', role: 'passive', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'nc', label: 'A', role: 'passive', offset3d: [0.85, 0.12, -0.45], offset2d: { x: 40, y: -20 } },
      { id: 'no', label: 'B', role: 'passive', offset3d: [0.85, 0.12, 0.45], offset2d: { x: 40, y: 20 } },
    ],
  },
  DIODE: {
    type: 'DIODE',
    category: 'semiconductor',
    name: '硅整流二极管',
    shortName: '二极管',
    labelPrefix: 'D',
    description: '单向导电非线性 PN 结（正向导通压降约 0.7V）',
    defaultProps: { maxPower: 1.0 },
    maxPower: 1.0,
    pins: [
      { id: 'anode', label: 'A', role: 'pos', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'cathode', label: 'K', role: 'neg', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  LED: {
    type: 'LED',
    category: 'semiconductor',
    name: '发光二极管 (LED)',
    shortName: 'LED',
    labelPrefix: 'LED',
    description: '电流驱动发光二极管，亮度随流过电流实时变化，过流自动告警',
    defaultProps: { color: 'red', maxPower: 0.15 },
    maxPower: 0.15,
    pins: [
      { id: 'anode', label: '+', role: 'pos', offset3d: [-0.65, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'cathode', label: '-', role: 'neg', offset3d: [0.65, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  BJT_NPN: {
    type: 'BJT_NPN',
    category: 'semiconductor',
    name: 'NPN 三极管',
    shortName: 'NPN管',
    labelPrefix: 'Q',
    description: '双极型晶体管 (B/C/E)，自动辨识截止区、放大区与饱和区',
    defaultProps: { beta: 100, maxPower: 0.625 },
    maxPower: 0.625,
    pins: [
      { id: 'b', label: 'B', role: 'passive', offset3d: [-0.75, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'c', label: 'C', role: 'pos', offset3d: [0.65, 0.12, -0.55], offset2d: { x: 30, y: -30 } },
      { id: 'e', label: 'E', role: 'neg', offset3d: [0.65, 0.12, 0.55], offset2d: { x: 30, y: 30 } },
    ],
  },
  OPAMP: {
    type: 'OPAMP',
    category: 'semiconductor',
    name: '集成运算放大器',
    shortName: '运放',
    labelPrefix: 'U',
    description: 'uA741/LM358 通用运放模型，含虚短虚断特性与轨对轨输出限幅',
    defaultProps: { railPos: 12, railNeg: -12, gain: 100000 },
    maxPower: 1.0,
    pins: [
      { id: 'inp', label: '+', role: 'pos', offset3d: [-0.95, 0.12, -0.45], offset2d: { x: -45, y: -20 } },
      { id: 'inm', label: '-', role: 'neg', offset3d: [-0.95, 0.12, 0.45], offset2d: { x: -45, y: 20 } },
      { id: 'out', label: 'OUT', role: 'passive', offset3d: [0.95, 0.12, 0], offset2d: { x: 45, y: 0 } },
    ],
  },
  TIMER_555: {
    type: 'TIMER_555',
    category: 'semiconductor',
    name: 'NE555 时基定时器',
    shortName: '555定时器',
    labelPrefix: 'U555',
    description: '经典 8 脚时基芯片简化模型（含内部 3×5kΩ 分压、双比较器、RS 触发器、放电端 DIS 与推挽输出 OUT）',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'vcc', label: 'VCC', role: 'pos', offset3d: [-0.9, 0.14, -0.4], offset2d: { x: -45, y: -20 } },
      { id: 'trig', label: 'TRIG', role: 'passive', offset3d: [-0.9, 0.14, 0], offset2d: { x: -45, y: 0 } },
      { id: 'thres', label: 'THRES', role: 'passive', offset3d: [-0.9, 0.14, 0.4], offset2d: { x: -45, y: 20 } },
      { id: 'dis', label: 'DIS', role: 'passive', offset3d: [0.9, 0.14, -0.4], offset2d: { x: 45, y: -20 } },
      { id: 'out', label: 'OUT', role: 'logic_out', offset3d: [0.9, 0.14, 0], offset2d: { x: 45, y: 0 } },
      { id: 'gnd', label: 'GND', role: 'neg', offset3d: [0.9, 0.14, 0.4], offset2d: { x: 45, y: 20 } },
    ],
  },
  VOLTMETER: {
    type: 'VOLTMETER',
    category: 'instrument',
    name: '数字电压表',
    shortName: '电压表',
    labelPrefix: 'PV',
    description: '高内阻 (10 MΩ) 直流/交流有效值双挡电压表，3D 屏幕实时刷新读数',
    defaultProps: { mode: 'dc' },
    maxPower: 10,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  AMMETER: {
    type: 'AMMETER',
    category: 'instrument',
    name: '数字电流表',
    shortName: '电流表',
    labelPrefix: 'PA',
    description: '低内阻 (0.005 Ω) 直流/交流有效值双挡电流表，3D 屏幕实时显示 mA/A',
    defaultProps: { mode: 'dc' },
    maxPower: 50,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  LOGIC_IN: {
    type: 'LOGIC_IN',
    category: 'digital',
    name: '逻辑电平开关 (0/1)',
    shortName: '逻辑输入',
    labelPrefix: 'IN',
    description: '数电输入变量开关（可设为 A/B/C/D），用于真值表与卡诺图分析',
    defaultProps: { state: 0, varName: 'A' },
    maxPower: 2,
    pins: [
      { id: 'out', label: 'Q', role: 'logic_out', offset3d: [0.8, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  CLOCK: {
    type: 'CLOCK',
    category: 'digital',
    name: '方波时钟脉冲',
    shortName: '时钟CLK',
    labelPrefix: 'CLK',
    description: '0V / 5V 周期方波发生器，驱动 D 触发器等时序逻辑电路',
    defaultProps: { frequency: 1 },
    maxPower: 2,
    pins: [
      { id: 'out', label: 'CLK', role: 'logic_out', offset3d: [0.8, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  LOGIC_OUT: {
    type: 'LOGIC_OUT',
    category: 'digital',
    name: '逻辑探针指示灯',
    shortName: '逻辑探针',
    labelPrefix: 'Y',
    description: '高电平 (>2.5V) 点亮显示 1，低电平熄灭显示 0，自动关联卡诺图输出',
    defaultProps: { outName: 'Y' },
    maxPower: 1,
    pins: [
      { id: 'in', label: 'IN', role: 'logic_in', offset3d: [-0.8, 0.12, 0], offset2d: { x: -40, y: 0 } },
    ],
  },
  HEX_DISPLAY: {
    type: 'HEX_DISPLAY',
    category: 'digital',
    name: '七段十六进制数码管',
    shortName: '数码管',
    labelPrefix: 'HEX',
    description: '4 位二进制 (D3..D0) 转 0~F 七段显示译码数码管',
    defaultProps: {},
    maxPower: 2,
    pins: [
      { id: 'd3', label: 'D3', role: 'logic_in', offset3d: [-0.9, 0.12, -0.6], offset2d: { x: -45, y: -30 } },
      { id: 'd2', label: 'D2', role: 'logic_in', offset3d: [-0.9, 0.12, -0.2], offset2d: { x: -45, y: -10 } },
      { id: 'd1', label: 'D1', role: 'logic_in', offset3d: [-0.9, 0.12, 0.2], offset2d: { x: -45, y: 10 } },
      { id: 'd0', label: 'D0', role: 'logic_in', offset3d: [-0.9, 0.12, 0.6], offset2d: { x: -45, y: 30 } },
    ],
  },
  AND: {
    type: 'AND',
    category: 'digital',
    name: '与门 (AND)',
    shortName: 'AND门',
    labelPrefix: 'U',
    description: 'Y = A · B 逻辑与门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  OR: {
    type: 'OR',
    category: 'digital',
    name: '或门 (OR)',
    shortName: 'OR门',
    labelPrefix: 'U',
    description: 'Y = A + B 逻辑或门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  NOT: {
    type: 'NOT',
    category: 'digital',
    name: '非门 / 反相器 (NOT)',
    shortName: 'NOT门',
    labelPrefix: 'U',
    description: 'Y = A\' 逻辑反相器 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  NAND: {
    type: 'NAND',
    category: 'digital',
    name: '与非门 (NAND)',
    shortName: 'NAND门',
    labelPrefix: 'U',
    description: 'Y = (A · B)\' 与非门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  NOR: {
    type: 'NOR',
    category: 'digital',
    name: '或非门 (NOR)',
    shortName: 'NOR门',
    labelPrefix: 'U',
    description: 'Y = (A + B)\' 或非门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  XOR: {
    type: 'XOR',
    category: 'digital',
    name: '异或门 (XOR)',
    shortName: 'XOR门',
    labelPrefix: 'U',
    description: 'Y = A ⊕ B 异或门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  XNOR: {
    type: 'XNOR',
    category: 'digital',
    name: '同或门 (XNOR)',
    shortName: 'XNOR门',
    labelPrefix: 'U',
    description: 'Y = (A ⊕ B)\' 同或门 IC',
    defaultProps: {},
    maxPower: 1,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.85, 0.12, -0.35], offset2d: { x: -40, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.85, 0.12, 0.35], offset2d: { x: -40, y: 15 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  HALF_ADDER: {
    type: 'HALF_ADDER',
    category: 'digital',
    name: '半加器模块',
    shortName: '半加器',
    labelPrefix: 'HA',
    description: 'S = A ⊕ B, C = A · B',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.9, 0.12, -0.35], offset2d: { x: -45, y: -15 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.9, 0.12, 0.35], offset2d: { x: -45, y: 15 } },
      { id: 's', label: 'S', role: 'logic_out', offset3d: [0.9, 0.12, -0.35], offset2d: { x: 45, y: -15 } },
      { id: 'c', label: 'C', role: 'logic_out', offset3d: [0.9, 0.12, 0.35], offset2d: { x: 45, y: 15 } },
    ],
  },
  FULL_ADDER: {
    type: 'FULL_ADDER',
    category: 'digital',
    name: '全加器模块',
    shortName: '全加器',
    labelPrefix: 'FA',
    description: '带进位输入的一位二进制全加器 (A, B, Cin -> S, Cout)',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'a', label: 'A', role: 'logic_in', offset3d: [-0.95, 0.12, -0.45], offset2d: { x: -45, y: -20 } },
      { id: 'b', label: 'B', role: 'logic_in', offset3d: [-0.95, 0.12, 0], offset2d: { x: -45, y: 0 } },
      { id: 'cin', label: 'Cin', role: 'logic_in', offset3d: [-0.95, 0.12, 0.45], offset2d: { x: -45, y: 20 } },
      { id: 's', label: 'S', role: 'logic_out', offset3d: [0.95, 0.12, -0.3], offset2d: { x: 45, y: -15 } },
      { id: 'cout', label: 'Cout', role: 'logic_out', offset3d: [0.95, 0.12, 0.3], offset2d: { x: 45, y: 15 } },
    ],
  },
  D_FF: {
    type: 'D_FF',
    category: 'digital',
    name: 'D 触发器 (上升沿)',
    shortName: 'D触发器',
    labelPrefix: 'DFF',
    description: '上升沿触发 D 型锁存器，输出 Q 与反相输出 Q\'',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'd', label: 'D', role: 'logic_in', offset3d: [-0.9, 0.12, -0.35], offset2d: { x: -45, y: -15 } },
      { id: 'clk', label: 'CLK', role: 'logic_in', offset3d: [-0.9, 0.12, 0.35], offset2d: { x: -45, y: 15 } },
      { id: 'q', label: 'Q', role: 'logic_out', offset3d: [0.9, 0.12, -0.35], offset2d: { x: 45, y: -15 } },
      { id: 'qn', label: "Q'", role: 'logic_out', offset3d: [0.9, 0.12, 0.35], offset2d: { x: 45, y: 15 } },
    ],
  },
  MUX_2_1: {
    type: 'MUX_2_1',
    category: 'digital',
    name: '二选一数据选择器 (MUX)',
    shortName: 'MUX2选1',
    labelPrefix: 'MUX',
    description: 'SEL=0 选通 D0，SEL=1 选通 D1 输出至 Y',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'd0', label: 'D0', role: 'logic_in', offset3d: [-0.95, 0.12, -0.42], offset2d: { x: -45, y: -20 } },
      { id: 'd1', label: 'D1', role: 'logic_in', offset3d: [-0.95, 0.12, 0], offset2d: { x: -45, y: 0 } },
      { id: 'sel', label: 'SEL', role: 'logic_in', offset3d: [-0.95, 0.12, 0.42], offset2d: { x: -45, y: 20 } },
      { id: 'y', label: 'Y', role: 'logic_out', offset3d: [0.95, 0.12, 0], offset2d: { x: 45, y: 0 } },
    ],
  },
  JK_FF: {
    type: 'JK_FF',
    category: 'digital',
    name: 'JK 触发器 (上升沿)',
    shortName: 'JK触发器',
    labelPrefix: 'JK',
    description: 'J=K=1 在 CLK 上升沿翻转，10 置位，01 复位，00 保持',
    defaultProps: {},
    maxPower: 1.5,
    pins: [
      { id: 'j', label: 'J', role: 'logic_in', offset3d: [-0.95, 0.12, -0.42], offset2d: { x: -45, y: -20 } },
      { id: 'clk', label: 'CLK', role: 'logic_in', offset3d: [-0.95, 0.12, 0], offset2d: { x: -45, y: 0 } },
      { id: 'k', label: 'K', role: 'logic_in', offset3d: [-0.95, 0.12, 0.42], offset2d: { x: -45, y: 20 } },
      { id: 'q', label: 'Q', role: 'logic_out', offset3d: [0.95, 0.12, -0.35], offset2d: { x: 45, y: -15 } },
      { id: 'qn', label: "Q'", role: 'logic_out', offset3d: [0.95, 0.12, 0.35], offset2d: { x: 45, y: 15 } },
    ],
  },
  COUNTER_4BIT: {
    type: 'COUNTER_4BIT',
    category: 'digital',
    name: '4位二进制计数器',
    shortName: '4位计数器',
    labelPrefix: 'CNT',
    description: 'CLK 上升沿递增 (0000~1111)，RST 高电平清零',
    defaultProps: {},
    maxPower: 2,
    pins: [
      { id: 'clk', label: 'CLK', role: 'logic_in', offset3d: [-1.05, 0.12, -0.35], offset2d: { x: -50, y: -15 } },
      { id: 'rst', label: 'RST', role: 'logic_in', offset3d: [-1.05, 0.12, 0.35], offset2d: { x: -50, y: 15 } },
      { id: 'q3', label: 'Q3', role: 'logic_out', offset3d: [1.05, 0.12, -0.54], offset2d: { x: 50, y: -30 } },
      { id: 'q2', label: 'Q2', role: 'logic_out', offset3d: [1.05, 0.12, -0.18], offset2d: { x: 50, y: -10 } },
      { id: 'q1', label: 'Q1', role: 'logic_out', offset3d: [1.05, 0.12, 0.18], offset2d: { x: 50, y: 10 } },
      { id: 'q0', label: 'Q0', role: 'logic_out', offset3d: [1.05, 0.12, 0.54], offset2d: { x: 50, y: 30 } },
    ],
  },
  ZENER_DIODE: {
    type: 'ZENER_DIODE',
    category: 'semiconductor',
    name: '齐纳稳压二极管',
    shortName: '稳压管',
    labelPrefix: 'DZ',
    description: '反向击穿区具有恒压特性 Vz，广泛用于直流基准稳压与限幅',
    defaultProps: { vz: 5.1 },
    maxPower: 2.0,
    pins: [
      { id: 'a', label: 'A(+)', role: 'pos', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'k', label: 'K(-)', role: 'neg', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  NMOS: {
    type: 'NMOS',
    category: 'semiconductor',
    name: 'N沟道增强型 MOSFET',
    shortName: 'NMOS管',
    labelPrefix: 'M',
    description: '电压控制型场效应管：Vgs > Vth 导通（栅极输入近乎零电流）',
    defaultProps: { vth: 2.0, kp: 0.08 },
    maxPower: 8.0,
    pins: [
      { id: 'g', label: 'G', role: 'passive', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'd', label: 'D', role: 'passive', offset3d: [0.6, 0.12, -0.45], offset2d: { x: 30, y: -25 } },
      { id: 's', label: 'S', role: 'passive', offset3d: [0.6, 0.12, 0.45], offset2d: { x: 30, y: 25 } },
    ],
  },
  TRANSFORMER: {
    type: 'TRANSFORMER',
    category: 'passive',
    name: '理想耦合变压器',
    shortName: '变压器',
    labelPrefix: 'T',
    description: '原副边按变比 N = Ns/Np 磁耦合（Vs = N·Vp，Ip = -N·Is）',
    defaultProps: { ratio: 2.0, maxCurrent: 15 },
    maxPower: 50,
    pins: [
      { id: 'p1', label: 'P1*', role: 'pos', offset3d: [-1.0, 0.12, -0.35], offset2d: { x: -45, y: -20 } },
      { id: 'p2', label: 'P2', role: 'neg', offset3d: [-1.0, 0.12, 0.35], offset2d: { x: -45, y: 20 } },
      { id: 's1', label: 'S1*', role: 'pos', offset3d: [1.0, 0.12, -0.35], offset2d: { x: 45, y: -20 } },
      { id: 's2', label: 'S2', role: 'neg', offset3d: [1.0, 0.12, 0.35], offset2d: { x: 45, y: 20 } },
    ],
  },
  LAMP: {
    type: 'LAMP',
    category: 'passive',
    name: '白炽指示灯泡',
    shortName: '灯泡',
    labelPrefix: 'LP',
    description: '钨丝热辐射负载，发光亮度随实际功耗与额定功率比值连续变化',
    defaultProps: { ratedVoltage: 5, ratedPower: 1.5 },
    maxPower: 3.75,
    pins: [
      { id: 'p1', label: 'L1', role: 'passive', offset3d: [-0.85, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'p2', label: 'L2', role: 'passive', offset3d: [0.85, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  FUSE: {
    type: 'FUSE',
    category: 'passive',
    name: '可复位保险丝',
    shortName: '保险丝',
    labelPrefix: 'F',
    description: '电流超过熔断阈值时自动切断回路；点击元件或属性面板可一键复位',
    defaultProps: { tripCurrent: 0.5, blown: false },
    maxPower: 2.0,
    pins: [
      { id: 'p1', label: '1', role: 'passive', offset3d: [-0.9, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'p2', label: '2', role: 'passive', offset3d: [0.9, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  INF_SOURCE: {
    type: 'INF_SOURCE',
    category: 'custom',
    name: '无限理想电源 (无上限)',
    shortName: '无限电源',
    labelPrefix: 'V∞',
    description: '无功率与过载限制的超级理想电压源，支持直流/交流及任意自定义高压输出',
    defaultProps: { voltage: 12, frequency: 2, waveform: 'dc' },
    maxPower: Number.POSITIVE_INFINITY,
    pins: [
      { id: 'pos', label: '+', role: 'pos', offset3d: [0.95, 0.12, 0], offset2d: { x: 40, y: 0 } },
      { id: 'neg', label: '-', role: 'neg', offset3d: [-0.95, 0.12, 0], offset2d: { x: -40, y: 0 } },
    ],
  },
  INF_RESISTOR: {
    type: 'INF_RESISTOR',
    category: 'custom',
    name: '无限电阻 / 理想断路',
    shortName: '无限电阻',
    labelPrefix: 'R∞',
    description: '默认理想无穷大阻抗 (R=∞, G=0, I=0)，永不烧毁；也可切为超高自定义阻值',
    defaultProps: { idealInfinite: true, resistance: 1e12 },
    maxPower: Number.POSITIVE_INFINITY,
    pins: [
      { id: 'p1', label: '1', role: 'passive', offset3d: [-0.95, 0.12, 0], offset2d: { x: -40, y: 0 } },
      { id: 'p2', label: '2', role: 'passive', offset3d: [0.95, 0.12, 0], offset2d: { x: 40, y: 0 } },
    ],
  },
  CUSTOM_TRUTH_8: {
    type: 'CUSTOM_TRUTH_8',
    category: 'custom',
    name: '8槽自定义真值芯片',
    shortName: '8槽真值芯',
    labelPrefix: 'LUT8',
    description: '8个可自由命名与定义 IN/OUT/NC 方向的引脚，支持真值表编辑与布尔表达式编程',
    defaultProps: {
      truthConfigJson: JSON.stringify(getDefaultTruthChipConfig(8)),
    },
    maxPower: 2.0,
    pins: buildDipPinLayout(
      getDefaultTruthChipConfig(8).slots.map((s) => ({
        id: s.pinId,
        label: s.name,
        role: s.role === 'IN' ? 'logic_in' : s.role === 'OUT' ? 'logic_out' : 'passive',
      }))
    ),
  },
  CUSTOM_TRUTH_16: {
    type: 'CUSTOM_TRUTH_16',
    category: 'custom',
    name: '16槽自定义真值芯片',
    shortName: '16槽真值芯',
    labelPrefix: 'LUT16',
    description: '16个可自由配置的输入/输出引脚槽位，支持大规模真值表查找与多输出逻辑公式',
    defaultProps: {
      truthConfigJson: JSON.stringify(getDefaultTruthChipConfig(16)),
    },
    maxPower: 3.0,
    pins: buildDipPinLayout(
      getDefaultTruthChipConfig(16).slots.map((s) => ({
        id: s.pinId,
        label: s.name,
        role: s.role === 'IN' ? 'logic_in' : s.role === 'OUT' ? 'logic_out' : 'passive',
      }))
    ),
  },
  IC_PORT_IN: {
    type: 'IC_PORT_IN',
    category: 'custom',
    name: 'IC 封装输入端口',
    shortName: 'IC输入端',
    labelPrefix: 'IN_P',
    description: '用于标记待封装子电路的外部输入引脚（顶层调试时可点击切换 0/1 测试电平）',
    defaultProps: { state: 0 },
    maxPower: 2.0,
    pins: [
      { id: 'io', label: 'IO', role: 'logic_out', offset3d: [0.75, 0.12, 0], offset2d: { x: 35, y: 0 } },
    ],
  },
  IC_PORT_OUT: {
    type: 'IC_PORT_OUT',
    category: 'custom',
    name: 'IC 封装输出端口',
    shortName: 'IC输出端',
    labelPrefix: 'OUT_P',
    description: '用于标记待封装子电路的外部输出引脚，封装后自动映射为集成芯片输出管脚',
    defaultProps: {},
    maxPower: 2.0,
    pins: [
      { id: 'io', label: 'IO', role: 'logic_in', offset3d: [-0.75, 0.12, 0], offset2d: { x: -35, y: 0 } },
    ],
  },
  CUSTOM_IC: {
    type: 'CUSTOM_IC',
    category: 'custom',
    name: '自定义封装集成芯片',
    shortName: '集成芯片',
    labelPrefix: 'U',
    description: '由工作台电路一键封装而成的层次化集成芯片模块，支持保存至云端账号与嵌套复用',
    defaultProps: {},
    maxPower: 10.0,
    pins: [
      { id: 'p1', label: 'IN1', role: 'logic_in', offset3d: [-0.95, 0.12, -0.22], offset2d: { x: -48, y: -14 } },
      { id: 'p2', label: 'IN2', role: 'logic_in', offset3d: [-0.95, 0.12, 0.22], offset2d: { x: -48, y: 14 } },
      { id: 'p3', label: 'OUT', role: 'logic_out', offset3d: [0.95, 0.12, 0], offset2d: { x: 48, y: 0 } },
    ],
  },
};

export function getComponentPins(comp: CircuitComponent): PinDefinition[] {
  if (comp.type === 'CUSTOM_TRUTH_8' || comp.type === 'CUSTOM_TRUTH_16') {
    return getTruthChipPins(comp);
  }
  if (comp.type === 'CUSTOM_IC') {
    return getCustomIcPins(comp);
  }
  return COMPONENT_CATALOG[comp.type]?.pins ?? [];
}

export function getComponentMeshSignature(comp: CircuitComponent): string {
  if (comp.type === 'CUSTOM_TRUTH_8' || comp.type === 'CUSTOM_TRUTH_16') {
    return `${comp.type}|${comp.label}|${String(comp.props.truthConfigJson ?? '')}`;
  }
  if (comp.type === 'CUSTOM_IC') {
    return `${comp.type}|${comp.label}|${String(comp.props.icJson ?? '')}`;
  }
  return `${comp.type}|${comp.label}`;
}

export function world3dTo2d(pos3d: [number, number, number]): { x: number; y: number } {
  return {
    x: Math.round((pos3d[0] * 45 + 380) / 10) * 10,
    y: Math.round((pos3d[2] * 45 + 260) / 10) * 10,
  };
}

export function world2dTo3d(pos2d: { x: number; y: number }): [number, number, number] {
  return [
    Number(((pos2d.x - 380) / 45).toFixed(2)),
    0,
    Number(((pos2d.y - 260) / 45).toFixed(2)),
  ];
}

export function getPinWorld3D(
  comp: CircuitComponent,
  pinId: string
): [number, number, number] {
  const pins = getComponentPins(comp);
  const pin = pins.find((p) => p.id === pinId);
  if (!pin) return [...comp.pos3d];
  const [ox, oy, oz] = pin.offset3d;
  const c = Math.cos(comp.rotationY);
  const s = Math.sin(comp.rotationY);
  const rx = ox * c + oz * s;
  const rz = -ox * s + oz * c;
  return [comp.pos3d[0] + rx, comp.pos3d[1] + oy, comp.pos3d[2] + rz];
}

export function getPinWorld2D(
  comp: CircuitComponent,
  pinId: string
): { x: number; y: number } {
  const pins = getComponentPins(comp);
  const pin = pins.find((p) => p.id === pinId);
  if (!pin) return { ...comp.pos2d };
  const rad = (comp.rot2d * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const rx = pin.offset2d.x * c - pin.offset2d.y * s;
  const ry = pin.offset2d.x * s + pin.offset2d.y * c;
  return {
    x: Math.round(comp.pos2d.x + rx),
    y: Math.round(comp.pos2d.y + ry),
  };
}

export function formatEngineeringValue(val: number, unit: string): string {
  const abs = Math.abs(val);
  if (abs === 0) return `0.00 ${unit}`;
  if (abs >= 1e6) return `${(val / 1e6).toFixed(2)} M${unit}`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(2)} k${unit}`;
  if (abs >= 1) return `${val.toFixed(2)} ${unit}`;
  if (abs >= 1e-3) return `${(val * 1e3).toFixed(2)} m${unit}`;
  if (abs >= 1e-6) return `${(val * 1e6).toFixed(1)} µ${unit}`;
  return `${val.toExponential(2)} ${unit}`;
}
