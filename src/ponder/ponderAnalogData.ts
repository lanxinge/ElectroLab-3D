import type { PonderModuleSpec } from './ponderTypes';

export const PONDER_ANALOG_SPECS: Record<
  | 'DC_SOURCE'
  | 'AC_SOURCE'
  | 'CURRENT_SOURCE'
  | 'GROUND'
  | 'RESISTOR'
  | 'POTENTIOMETER'
  | 'CAPACITOR'
  | 'INDUCTOR'
  | 'SWITCH_SPST'
  | 'SWITCH_SPDT'
  | 'DIODE'
  | 'LED'
  | 'BJT_NPN'
  | 'OPAMP'
  | 'VOLTMETER'
  | 'AMMETER',
  PonderModuleSpec
> = {
  DC_SOURCE: {
    type: 'DC_SOURCE',
    title: '直流稳压源',
    englishTitle: 'DC Voltage Source',
    badge: '电源模块 · 电压激励',
    summary: '在电路两端维持恒定的电势差（电动势 E），如同水泵将电荷不断从低电位泵升到高电位。',
    formulas: [
      { expr: 'V_ab = E (理想稳压源)', note: '端电压恒定，输出电流 I 由外电路负载决定' },
      { expr: 'P_out = E · I', note: '当电流从正极流出时向外电路提供电功率' },
    ],
    keyTakeaways: [
      '理想电压源严禁直接短接正负极（I → ∞ 会触发过流告警）。',
      '关联参考方向下，电源功率为负值代表正在向外部释放能量。',
      '可作为稳态分压、偏置电路以及运放电源轨基准。',
    ],
    controls: [
      { key: 'voltage', label: '输出电压 Vdc', kind: 'slider', min: 1.5, max: 12, step: 0.5, unit: 'V', defaultValue: 5 },
    ],
    callouts: [
      { id: 'pump', title: '电荷泵升芯', detail: '维持固定电势阶跃 ΔV', worldPos: [-0.95, 0.85, 0], color: '#38bdf8' },
      { id: 'load', title: '外部负载电阻', detail: 'I = Vdc / R', worldPos: [0.95, 0.45, 0], color: '#fbbf24' },
      { id: 'rails', title: '高/低电位轨', detail: '红正 (+V) 与黑负 (0V)', worldPos: [0, 0.25, 0.85], color: '#f87171', stepIndices: [0, 1, 2] },
    ],
    steps: [
      {
        id: 'step-1',
        title: '电势差如同高度差',
        narration: '直流电源内部建立恒定的非静电力，把电荷从负极（0V 参考面）抬升至正极高电位平台，为全电路提供驱动“水压”。',
        camera: { position: [4.2, 3.1, 4.3], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '电压恒定，电流随负载而变',
        narration: '调节右侧滑块升高 Vdc，水位落差增大，流经外部负载的电荷粒子加速流动；无论电流如何变化，理想电源端电压始终不变。',
        camera: { position: [0.4, 2.3, 4.4], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '正极流出、负极回流的闭环',
        narration: '电子（或习惯正电流）必须从正极出发经过负载再回到负极形成闭合回路；若断开回路，电压依然存在但电流归零。',
        camera: { position: [-3.5, 2.8, 3.6], target: [0, 0.5, 0] },
      },
    ],
  },

  AC_SOURCE: {
    type: 'AC_SOURCE',
    title: '交流信号源',
    englishTitle: 'AC Sinusoidal Source',
    badge: '电源模块 · 时变激励',
    summary: '输出按正弦规律周期性改变大小和方向的电压信号，是交流稳态与频率响应分析的基础。',
    formulas: [
      { expr: 'v(t) = V_m · sin(2πft + φ)', note: 'V_m 为峰值，f 为频率，T = 1/f 为周期' },
      { expr: 'V_rms = V_m / √2 ≈ 0.707 V_m', note: '正弦交流有效值（均方根值）' },
    ],
    keyTakeaways: [
      '我国工频电网为 220Vrms（峰值约 311V）、50Hz。',
      '正半周与负半周电流方向相反，导致纯交流电路存在往复振荡。',
      '面对线性电路，可用相量法 V̇ = V∠φ 简化微分方程求解。',
    ],
    controls: [
      { key: 'freq', label: '动画频率 f', kind: 'slider', min: 0.4, max: 2.5, step: 0.1, unit: 'Hz', defaultValue: 1.0 },
    ],
    callouts: [
      { id: 'rotor', title: '旋转相量臂', detail: '匀速圆周投影即为正弦波', worldPos: [-1.05, 0.9, 0], color: '#38bdf8' },
      { id: 'wave', title: '3D 实时示波波束', detail: '正半周红 / 负半周蓝', worldPos: [0.95, 0.85, 0], color: '#a78bfa' },
      { id: 'polarity', title: '往复电流指示', detail: '每半个周期换向一次', worldPos: [0, 0.25, 0.9], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '旋转相量生成正弦波',
        narration: '左侧机械旋转臂以角速度 ω=2πf 转动，它在纵轴上的投影高度恰好绘出标准正弦电压曲线。',
        camera: { position: [4.2, 3.0, 4.4], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '交变方向与往复振荡',
        narration: '当波形处于正半周时电荷正向推进；进入负半周后极性反转，电荷倒流，平均直流分量为零。',
        camera: { position: [0.3, 2.2, 4.4], target: [0.1, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '频率与波形压缩',
        narration: '调高频率 f，旋转相量加速，相同时间内完成更多个周期变化，波形条纹变得更加密集；电容和电感的阻抗也会随之剧变。',
        camera: { position: [-3.4, 2.7, 3.8], target: [0, 0.6, 0] },
      },
    ],
  },

  CURRENT_SOURCE: {
    type: 'CURRENT_SOURCE',
    title: '恒流源',
    englishTitle: 'Constant Current Source',
    badge: '电源模块 · 恒流激励',
    summary: '无论外接负载电阻如何变化（只要未开路），始终强迫输出大小与方向恒定的电流 Is。',
    formulas: [
      { expr: 'I = I_s (与负载 R 无关)', note: '端电压 V = I_s · R 随负载自适应变化' },
      { expr: 'R_out → ∞', note: '理想恒流源等效内阻为无穷大，置零分析时视作开路' },
    ],
    keyTakeaways: [
      '恒流源严禁开路（若强行断开，V = Is·∞ 将趋于无穷大高压）。',
      '与电压源并联可化简为该电压源；与负载并联常可经戴维南/诺顿互换。',
      '常用于 BJT 镜像恒流偏置、LED 恒流驱动及电容线性充电。',
    ],
    controls: [
      { key: 'loadRatio', label: '负载阻值比例 R', kind: 'slider', min: 0.3, max: 2.0, step: 0.1, unit: '×', defaultValue: 1.0 },
    ],
    callouts: [
      { id: 'wheel', title: '恒速定量水车', detail: '每单位时间推送固定电荷量', worldPos: [-1.0, 0.85, 0], color: '#10b981' },
      { id: 'pressure', title: '自适应压力柱', detail: 'V = Is · R 随负载升高', worldPos: [0.05, 1.05, -0.35], color: '#f59e0b' },
      { id: 'valve', title: '可调阻力负载', detail: '增大 R 会抬升端电压而非减小电流', worldPos: [1.05, 0.5, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '定量推送的“机械水车”',
        narration: '恒流源就像一台恒定转速的定量柱塞泵：无论前方管道阻力多大，每秒钟输出的电荷颗粒数恒定为 Is。',
        camera: { position: [4.1, 3.1, 4.3], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '负载变大，端电压自动抬升',
        narration: '拖动滑块增大负载 R，观察中央压力柱 V=Is·R 迅速拔高，而管道内流过的小球间距与速度保持恒定！',
        camera: { position: [0.2, 2.3, 4.3], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '为什么恒流源不能开路？',
        narration: '如果把外回路彻底断开（R→∞），恒流泵仍拼命推入电荷，端电压 V 将瞬间飙升并击穿绝缘，因此恒流源短路安全、开路危险。',
        camera: { position: [-3.4, 2.6, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  GROUND: {
    type: 'GROUND',
    title: '参考地 (GND)',
    englishTitle: 'Reference Ground Node',
    badge: '基准节点 · 零电位点',
    summary: '全电路节点电压分析的统一 0V 参考零点，也是单端信号回流的公共基准平面。',
    formulas: [
      { expr: 'V_GND ≡ 0.000 V', note: '被接地节点的电位固定定义为零伏' },
      { expr: 'V_A = φ_A - φ_GND = φ_A', note: '所有标称“某点电压”均默认为相对 GND 的电势差' },
    ],
    keyTakeaways: [
      '每一个连通电路子网至少应放置一个参考地，否则节点电压矩阵奇异（悬空报错）。',
      '地线并不是真的只通向地球，而是代表所有电源负极与参考信号共享的低阻汇流排。',
      '所有标注同一个 GND 符号的引脚在拓扑上互连。',
    ],
    controls: [
      { key: 'connected', label: '接地参考连接', kind: 'toggle', defaultValue: 1, trueLabel: '已接 0V 参考地', falseLabel: '浮空未接地' },
    ],
    callouts: [
      { id: 'plane', title: '零电位基准铜排', detail: 'V = 0V 海平面', worldPos: [0, 0.18, 0], color: '#34d399' },
      { id: 'towers', title: '各节点高度标尺', detail: '电压即相对于地面的高度差', worldPos: [-0.95, 1.05, 0], color: '#38bdf8' },
      { id: 'drain', title: '公共回流通道', detail: '各支路回流汇聚处', worldPos: [0.95, 0.55, 0], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '电路世界里的“海平面”',
        narration: '电势就像海拔高度——没有海平面就无法测量山峰有多高。GND 就是全电路统一的 0 米海平面基准。',
        camera: { position: [4.1, 3.1, 4.3], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '节点电压 = 相对地面的高度',
        narration: '只要指定参考地，电路中 +5V、+3.3V、-5V 等节点电位立刻获得唯一确定的数值。',
        camera: { position: [0.3, 2.2, 4.4], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '如果电路完全悬空（浮地）会怎样？',
        narration: '切换下方开关断开参考地后，整个电路就像悬浮在半空的电梯，各节点相对电位差虽在，但绝对电位整体漂移，仿真求解器将提示参考点缺失。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  RESISTOR: {
    type: 'RESISTOR',
    title: '色环电阻器',
    englishTitle: 'Resistor (IEC Color Coded)',
    badge: '无源器件 · 限流分压',
    summary: '利用材料电阻率阻碍电荷移动，将电能以焦耳热形式耗散，严格遵守线性欧姆定律。',
    formulas: [
      { expr: 'V = I · R', note: '欧姆定律：两端压降与流过电流成正比' },
      { expr: 'P = I²R = V²/R = V·I', note: '额定功耗上限决定体积，超限会发红烧毁' },
    ],
    keyTakeaways: [
      '四环电阻读法：前两位有效数字 × 第三环倍率（10ⁿ），第四环金/银为误差。',
      '串联分压：总电阻 R_eq = R1 + R2；并联分流：1/R_eq = 1/R1 + 1/R2。',
      '功率远超额定值（如 0.25W）时电阻温度急剧上升并产生焦耳热损伤。',
    ],
    controls: [
      { key: 'ohms', label: '阻值 R', kind: 'slider', min: 50, max: 1000, step: 50, unit: 'Ω', defaultValue: 220 },
    ],
    callouts: [
      { id: 'bands', title: 'IEC 四色环编码', detail: '随阻值实时动态变色', worldPos: [0, 0.85, 0.25], color: '#fbbf24' },
      { id: 'lattice', title: '内部晶格障碍柱', detail: '电子不断碰撞损失定向动能', worldPos: [0, 0.55, -0.35], color: '#38bdf8' },
      { id: 'heat', title: '焦耳热辐射', detail: 'P = V² / R（小阻值发热更剧烈）', worldPos: [0.85, 0.75, 0], color: '#f87171' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从色环读取阻值密码',
        narration: '陶瓷骨架上的四条色环精确编码了标称阻值。拖动滑块改变 R，3D 电阻体的前两环数字与倍率环会按 IEC 标准实时切换。',
        camera: { position: [3.8, 2.7, 3.8], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '微观晶格碰撞与限流作用',
        narration: '透视电阻内部：电子流穿梭密集的晶格原子阵列，阻值 R 越大，碰撞阻碍越强，单位时间通过的电流 I = V/R 就越小。',
        camera: { position: [0.2, 2.0, 4.0], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '能量去哪儿了？焦耳定律 P = I²R',
        narration: '当把阻值拉到很小（如 50Ω）而外加电压不变时，大电流碰撞剧烈生热，电阻中段呈现赤热红光警示！',
        camera: { position: [-3.4, 2.5, 3.5], target: [0, 0.55, 0] },
      },
    ],
  },

  POTENTIOMETER: {
    type: 'POTENTIOMETER',
    title: '旋转电位器',
    englishTitle: 'Rotary Potentiometer',
    badge: '可变电阻 · 连续分压',
    summary: '由环形碳膜轨道与可旋转电刷（Wiper）组成的三端元件，可将总电压连续分割为任意比例输出。',
    formulas: [
      { expr: 'R_1W = α · R_total ,  R_W2 = (1 - α) · R_total', note: 'α ∈ [0, 1] 为机械旋转比例' },
      { expr: 'V_out = V_in · (1 - α) (空载分压)', note: '构成天然的可调串联分压器' },
    ],
    keyTakeaways: [
      '仅使用一侧端脚 + 中间抽头 W 时，等效为一个连续可调的变阻器。',
      '接于正极与 GND 之间时，中间抽头输出随旋钮线性变化的参考电压。',
      '注意带负载效应：若 W 端接了重负载电阻，输出分压会被拉低。',
    ],
    controls: [
      { key: 'wiper', label: '旋钮位置 α', kind: 'slider', min: 0.05, max: 0.95, step: 0.05, unit: '', defaultValue: 0.5 },
    ],
    callouts: [
      { id: 'arc', title: 'C形碳膜电阻轨道', detail: '总阻值 R_total 沿圆弧均匀分布', worldPos: [-0.7, 0.55, -0.35], color: '#94a3b8' },
      { id: 'wiperArm', title: '铜质旋转滑片 (W)', detail: '实时截取上下两段电阻比例', worldPos: [0, 1.0, 0], color: '#fbbf24' },
      { id: 'meter', title: '分压输出指示柱', detail: 'V_W 随转角连续平滑升降', worldPos: [1.3, 0.8, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '一段碳膜拆分成两个串联电阻',
        narration: '电位器外壳内是一段半圆形电阻轨道，中间旋转的铜滑片将其分成 R1 和 R2 两截串联电阻。',
        camera: { position: [3.9, 3.3, 3.9], target: [0.1, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '转动滑片改变分压比',
        narration: '拖动滑块旋转铜指针，一侧电阻长度变短而另一侧变长，两侧阻值之和始终保持等于标称总阻值。',
        camera: { position: [0.2, 3.8, 2.8], target: [0.1, 0.45, 0] },
      },
      {
        id: 'step-3',
        title: '音量调节与偏置调零的核心',
        narration: '右侧柱状表指示出抽头对地电压 V_W：通过平滑调节比例 α，就能给运放、比较器或晶体管提供精密模拟电压基准。',
        camera: { position: [-3.2, 2.7, 3.6], target: [0.1, 0.55, 0] },
      },
    ],
  },

  CAPACITOR: {
    type: 'CAPACITOR',
    title: '电容器',
    englishTitle: 'Capacitor (Dielectric Plates)',
    badge: '储能器件 · 隔直通交',
    summary: '两片相互绝缘的导体极板在电场中储存正负电荷，两端电压不能突变，具有“隔直流、通交流”的核心特性。',
    formulas: [
      { expr: 'i(t) = C · dv(t)/dt', note: '电流正比于电压变化率；直流稳态下 i = 0（开路）' },
      { expr: 'τ = R · C ,  E_c = ½ · C · V²', note: '时间常数 τ 决定充放电快慢' },
    ],
    keyTakeaways: [
      '直流电路充饱后相当于断路，常用于电源去耦（稳定电压毛刺）。',
      '容抗 X_C = 1 / (2πfC)：频率越高，电容对交流信号的阻碍越小。',
      '电容电压 Vc 不能瞬间跳变，否则需要无穷大瞬时电流。',
    ],
    controls: [
      { key: 'acMode', label: '激励类型', kind: 'toggle', defaultValue: 0, trueLabel: '交流激励 (通交)', falseLabel: '直流脉冲 (隔直)' },
    ],
    callouts: [
      { id: 'plates', title: '上下平行金属极板', detail: '正极聚正电荷，负极聚等量负电荷', worldPos: [0, 0.85, 0], color: '#38bdf8' },
      { id: 'field', title: '极板间电场箭头', detail: '电场强度 E = V/d 储存在介质中', worldPos: [0.65, 0.65, 0.45], color: '#fbbf24' },
      { id: 'loop', title: '外电路充放电电荷', detail: '电压变化时有位移电流流过外回路', worldPos: [-1.25, 0.45, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '绝不直接连通的平行极板',
        narration: '电容内部极板之间夹着绝缘介质，电荷绝对无法真正飞越中间间隙——真正传导的是极板上的电荷聚集与感应！',
        camera: { position: [4.1, 3.0, 4.3], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '为什么它“隔直流”？',
        narration: '在直流模式下，刚开始外电路向极板搬运电荷，电场迅速建立；当 Vc 追平电源电压后，电荷停止流动，电路变为开路。',
        camera: { position: [0.3, 2.1, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '为什么又能“通交流”？',
        narration: '切换至交流模式！由于外电压不停往复反转，极板周而复始地充、放电，外电路的电荷粒子来回往返，如同电流顺利穿过了电容！',
        camera: { position: [-3.4, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  INDUCTOR: {
    type: 'INDUCTOR',
    title: '电感线圈',
    englishTitle: 'Inductor (Magnetic Coil)',
    badge: '储能器件 · 通直阻交',
    summary: '电流流过螺旋绕线产生磁场并储存磁能，电流不能突变，表现出“通直流、阻高频”的对偶特性。',
    formulas: [
      { expr: 'v(t) = L · di(t)/dt', note: '感应电动势永远试图阻止当前电流的变化' },
      { expr: 'X_L = 2πfL ,  E_L = ½ · L · I²', note: '频率越高，感抗 X_L 越大，阻碍高频交流' },
    ],
    keyTakeaways: [
      '直流稳态下理想电感仅相当于一段零电阻导线（短路）。',
      '断开感性负载（如继电器线圈）时必须并接续流二极管，否则 di/dt 极大引发高压拉弧。',
      '电感电流不能跃变，在开关电源 Buck/Boost 变换器中承担核心能量搬运。',
    ],
    controls: [
      { key: 'highFreq', label: '信号模式', kind: 'toggle', defaultValue: 0, trueLabel: '高频交流 (受阻)', falseLabel: '低频/直流 (畅通)' },
    ],
    callouts: [
      { id: 'coil', title: '漆包铜螺旋线圈', detail: 'N 匝绕线集中磁通量 Φ', worldPos: [0, 0.65, 0], color: '#f59e0b' },
      { id: 'flux', title: '贯穿铁芯的磁感线环', detail: '电能转换为磁场能储存', worldPos: [0, 1.25, 0], color: '#38bdf8' },
      { id: 'lenz', title: '楞次反电动势指示', detail: '变化越快，反抗阻力越强', worldPos: [1.1, 0.65, 0], color: '#f43f5e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '电流绕圈生出“磁飞轮”',
        narration: '电流螺旋穿过铜线圈时，在铁芯周围激励出闭合磁场环。你可以把电感看作一个质量很大的机械飞轮：它讨厌速度变化。',
        camera: { position: [4.1, 3.0, 4.3], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '直流稳态如履平地',
        narration: '在恒定直流或极低频下，磁场不再变化（di/dt=0），飞轮保持匀速旋转，线圈除了微小的铜线电阻外几乎零阻碍。',
        camera: { position: [0.3, 2.2, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '高频冲击激起强烈反抗',
        narration: '切换至高频模式：电流试图每秒反复换向，巨大的楞次感应反电动势 v=L·di/dt 拼命阻挡，使高频分量被严重衰减（扼流圈滤波）。',
        camera: { position: [-3.4, 2.8, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  SWITCH_SPST: {
    type: 'SWITCH_SPST',
    title: '单刀单掷开关',
    englishTitle: 'SPST Mechanical Switch',
    badge: '通断控制 · 两态器件',
    summary: '通过机械刀片物理合闸或分闸，在导通态（R≈0）与截止态（R→∞）之间切换支路连接。',
    formulas: [
      { expr: '闭合 (ON): V_switch ≈ 0 V, I 由外回路决定', note: '接触电阻极小，不消耗明显功率' },
      { expr: '断开 (OFF): I = 0 A, V_switch = E_gap', note: '所有电源电压几乎都降落在断开气隙两端' },
    ],
    keyTakeaways: [
      '断开时开关本身两端是有高压的（即电源电压），但电流为零所以负载不工作。',
      '闭合瞬间容性负载可能产生浪涌电流，断开感性负载可能产生电弧。',
      '在 3D/2D 工作台可直接单击该元件实时拉闸合闸。',
    ],
    controls: [
      { key: 'closed', label: '刀闸状态', kind: 'toggle', defaultValue: 1, trueLabel: '合闸导通 (ON)', falseLabel: '分闸断开 (OFF)' },
    ],
    callouts: [
      { id: 'blade', title: '铜质机械动触刀', detail: '围绕左侧枢轴上下摆动', worldPos: [-0.2, 0.85, 0], color: '#fbbf24' },
      { id: 'gap', title: '绝缘空气间隙', detail: '断开时承受全部开路压降', worldPos: [0.45, 0.55, 0], color: '#38bdf8' },
      { id: 'lamp', title: '回路负载指示灯', detail: '导通后形成完整回路点亮', worldPos: [1.35, 0.75, 0], color: '#fde047' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '最直观的金属搭桥开关',
        narration: '单刀单掷（Single Pole Single Throw）只有一对进出线。合上铜质刀闸时，两端金属直接对接，电子畅通无阻。',
        camera: { position: [4.0, 3.0, 4.1], target: [0.1, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '合闸导通：电压几乎为零，电流涌流',
        narration: '闭合状态下，开关两端等电位（ΔV≈0V），电源全部电压都送到负载灯泡上，驱动负载正常工作。',
        camera: { position: [0.3, 2.2, 4.2], target: [0.1, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '分闸切断：空气绝缘挡住电流',
        narration: '点击下方按钮断开开关！空气是非常优良的绝缘体，电子流撞到间隙前被迫停滞，开关自身两端出现全额电源压差。',
        camera: { position: [-3.2, 2.6, 3.6], target: [0.1, 0.55, 0] },
      },
    ],
  },

  SWITCH_SPDT: {
    type: 'SWITCH_SPDT',
    title: '单刀双掷开关',
    englishTitle: 'SPDT Selector Switch',
    badge: '多路切换 · 选择控制',
    summary: '一个公共端（COM）在 A、B 两个独立触点之间切换，用于双路切换、电源选通与互补逻辑控制。',
    formulas: [
      { expr: 'COM → NO_A  ∨  COM → NO_B', note: '先断后通 (Break-before-Make) 防止 A/B 短接' },
    ],
    keyTakeaways: [
      '两枚 SPDT 开关串联即可搭出经典“楼梯双控照明电路”（本质即异或逻辑）。',
      '可在正负基准之间切换输入给运放、触发器或 H 桥。',
      '切忌误把两个不同的电压源分别直接连上 A 和 B 的同时未做先断后通。',
    ],
    controls: [
      { key: 'throwB', label: '拨向通道', kind: 'toggle', defaultValue: 0, trueLabel: '接通 B 路 (蓝灯)', falseLabel: '接通 A 路 (琥珀灯)' },
    ],
    callouts: [
      { id: 'com', title: 'COM 公共动触点', detail: '总电流输入端', worldPos: [-1.1, 0.55, 0], color: '#fbbf24' },
      { id: 'branchA', title: '通道 A 支路', detail: '主照明/常闭路径', worldPos: [0.95, 0.75, -0.75], color: '#f59e0b' },
      { id: 'branchB', title: '通道 B 支路', detail: '备用/指示切换路径', worldPos: [0.95, 0.75, 0.75], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '铁路道岔般的电学换向器',
        narration: 'COM 公共端永远只能倒向 A 触点或 B 触点其中之一，就像铁轨上的扳道岔，决定能量列车驶向哪条支路。',
        camera: { position: [4.1, 3.3, 4.1], target: [0.1, 0.5, 0] },
      },
      {
        id: 'step-2',
        title: '切换支路，点亮另一侧负载',
        narration: '拨动控制开关将动刀片切向 B 路，原 A 路电流立即归零熄灭，B 路电子流瞬间打通点亮蓝色指示灯！',
        camera: { position: [0.2, 3.5, 3.0], target: [0.1, 0.5, 0] },
      },
      {
        id: 'step-3',
        title: '双路切换与楼梯双控秘诀',
        narration: '若把两个单刀双掷开关面对面连接，楼上与楼下任意拨动其中任一开关都能反转灯的亮灭状态——这正是硬件版异或门。',
        camera: { position: [-3.3, 2.8, 3.6], target: [0, 0.5, 0] },
      },
    ],
  },

  DIODE: {
    type: 'DIODE',
    title: '半导体二极管',
    englishTitle: 'PN Junction Diode',
    badge: '半导体器件 · 单向导电',
    summary: '由 P 型与 N 型半导体结合而成的 PN 结，仅允许电流从阳极（A）流向阴极（K），正向开启约 0.7V。',
    formulas: [
      { expr: 'I_D = I_s · (e^(V_D / nV_T) - 1)', note: '肖克莱二极管伏安特性方程' },
      { expr: '硅管正向开启压降 V_F ≈ 0.7 V', note: 'V_A - V_K ≥ 0.7V 时指数级导通' },
    ],
    keyTakeaways: [
      '外壳上的银色色环始终标示阴极（Cathode / 负极 / 出电流端）。',
      '反接时内部耗尽层急剧变宽，将电流彻底封堵，仅存在纳安级漏电流。',
      '核心用途：桥式整流、续流保护、钳位限幅与防反接保护。',
    ],
    controls: [
      { key: 'forward', label: '外加偏置极性', kind: 'toggle', defaultValue: 1, trueLabel: '正向偏置 (+A → -K)', falseLabel: '反向偏置 (-A ← +K)' },
    ],
    callouts: [
      { id: 'pzone', title: 'P 区（空穴多数载流子）', detail: '阳极 Anode 红色半导体块', worldPos: [-0.7, 0.75, 0], color: '#f87171' },
      { id: 'depletion', title: 'PN 结耗尽层屏障', detail: '正偏变薄通过，反偏加厚封锁', worldPos: [0, 0.85, 0], color: '#fbbf24' },
      { id: 'nzone', title: 'N 区（电子多数载流子）', detail: '阴极 Cathode 对应银环端', worldPos: [0.7, 0.75, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: 'P 型与 N 型半导体牵手造墙',
        narration: '将富含正电荷“空穴”的 P 区与富含自由“电子”的 N 区拼接，交界处载流子扩散中和，形成一道具有内建势垒的“耗尽层门闸”。',
        camera: { position: [4.1, 3.0, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '正向偏置：压薄势垒、顺畅导通',
        narration: '阳极接高电位且达到约 0.7V 门槛时，外部电场推着空穴与电子涌向交界面，中央耗尽层薄至几近消失，单向闸门大开！',
        camera: { position: [0.2, 2.2, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '反向偏置：耗尽层急剧加宽封路',
        narration: '切换至反向偏置！外电场把两种载流子硬生生拉开，中间耗尽层瞬间扩张变成一堵厚实的绝缘墙，电流彻彻底底归零。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  LED: {
    type: 'LED',
    title: '发光二极管 (LED)',
    englishTitle: 'Light Emitting Diode',
    badge: '光电器件 · 电致发光',
    summary: '正向电流流过特殊化合物半导体 PN 结时，电子与空穴复合释放出特定波长的可见光子。',
    formulas: [
      { expr: 'R_limit = (V_cc - V_f) / I_f', note: '必须串联限流电阻！红/黄 Vf≈2.0V，蓝/白 Vf≈3.0V' },
      { expr: 'E_photon = hν ≈ E_g (禁带宽度)', note: '半导体禁带宽度决定发光颜色' },
    ],
    keyTakeaways: [
      '切勿将 LED 直接并联到 5V/12V 恒压源上：由于伏安曲线极陡，微弱超压即导致电流爆炸烧毁。',
      '典型工作电流为 5mA~20mA；电路中长脚/平面相对侧多为正极（+）。',
      '亮度近似正比于流过的正向电流，而非直接由电压决定。',
    ],
    controls: [
      { key: 'currentMa', label: '驱动电流 If', kind: 'slider', min: 0, max: 35, step: 2.5, unit: 'mA', defaultValue: 15 },
    ],
    callouts: [
      { id: 'dome', title: '环氧聚光透镜罩', detail: '将点光源芯片发光聚焦射出', worldPos: [0, 1.35, 0], color: '#f87171' },
      { id: 'die', title: '复合发光芯片杯', detail: '电子-空穴跃迁辐射光子脉冲', worldPos: [0, 0.85, 0], color: '#fbbf24' },
      { id: 'res', title: '串联限流保护电阻', detail: '防止过流击穿芯片（If ≤ 25mA）', worldPos: [-1.15, 0.4, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '电能直接跃迁为光量子',
        narration: 'LED 同样具有单向导电性；当正向电流流经碗杯状的半导体芯片时，电子从导带跃迁回价带与空穴复合，把多余能量化作光子喷薄而出。',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.7, 0] },
      },
      {
        id: 'step-2',
        title: '为什么必须配一个限流电阻？',
        narration: '超过开启压降 Vf（约 2V）后，电压每多 0.1V 电流就会翻倍暴涨！因此前方必须串联小电阻稳住工作点电流在 10~20mA。',
        camera: { position: [0.3, 2.2, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '调节电流观察发光与过载警告',
        narration: '尝试把电流推高至 30mA 以上：虽然光子颗粒暴增、光晕耀眼，但芯片温度告警亮起，长期过流将使荧光粉和 PN 结永久光衰烧毁。',
        camera: { position: [-3.3, 2.6, 3.6], target: [0, 0.65, 0] },
      },
    ],
  },

  BJT_NPN: {
    type: 'BJT_NPN',
    title: 'NPN 双极型晶体管',
    englishTitle: 'NPN Bipolar Junction Transistor',
    badge: '半导体有源 · 电流放大',
    summary: '以微小的基极电流 Ib 精确比例控制庞大的集电极电流 Ic，实现电流线性放大与高速电子开关。',
    formulas: [
      { expr: 'I_C = β · I_B  (放大区, 通常 β ≈ 100)', note: '核心控流机制：以小博大' },
      { expr: 'I_E = I_B + I_C = (β + 1) · I_B', note: '发射极汇集总电流' },
    ],
    keyTakeaways: [
      '截止区：V_BE < 0.7V，无基极输入，C-E 间断开。',
      '放大区：发射结正偏（≈0.7V）且集电结反偏，I_C 严格线性跟随 β·I_B。',
      '饱和区：I_B 太大导致负载压降顶满，I_C 不再随 I_B 增长，V_CE ≈ 0.2V，常用作电子开关导通态。',
    ],
    controls: [
      { key: 'ib', label: '基极输入电流 Ib', kind: 'slider', min: 0, max: 120, step: 10, unit: 'μA', defaultValue: 40 },
    ],
    callouts: [
      { id: 'base', title: 'Base 基极控制阀', detail: '微弱 μA 级水流拨动比例阀芯', worldPos: [-1.1, 0.65, 0], color: '#fbbf24' },
      { id: 'gate', title: '比例放大水闸核心', detail: '将 Ib 放大 β=100 倍开启主阀', worldPos: [0, 0.85, 0], color: '#38bdf8' },
      { id: 'collector', title: 'Collector 集电极主干道', detail: 'Ic 受控奔流至 Emitter 发射极', worldPos: [0.85, 1.15, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '微弱信号掌控大电流“液压阀”',
        narration: '想象一根极细的基极控制水柱（Ib）去顶开一道带有杠杆的巨大集电极主闸门（C→E）：小小拨动就能放出百倍流量！',
        camera: { position: [4.2, 3.1, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '工作区切换：截止、放大与饱和',
        narration: '向右拖动 Ib：0μA 时闸门紧闭（截止）；10~80μA 时集电极水流呈 β 倍线性增粗（放大）；打到 100μA 以上闸门全开卡住，进入饱和导通开关态。',
        camera: { position: [0.3, 2.3, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '发射极必须汇集总电流 Ie = Ib + Ic',
        narration: '下方发射极管道承接了来自主通道的 Ic 以及来自基极的微小 Ib，共同构成了发射极总流出电流。',
        camera: { position: [-3.4, 2.7, 3.7], target: [0, 0.6, 0] },
      },
    ],
  },

  OPAMP: {
    type: 'OPAMP',
    title: '理想运算放大器',
    englishTitle: 'Ideal Operational Amplifier',
    badge: '模拟核心 · 虚短虚断',
    summary: '极高开环增益的差分放大器，一旦构成负反馈网络，即遵循“虚短”与“虚断”两大黄金分析法则。',
    formulas: [
      { expr: '虚短: V_+ ≈ V_- ,  虚断: I_+ ≈ I_- ≈ 0', note: '深度负反馈成立时，两输入端等电位且无电流流入' },
      { expr: '反相放大: V_out = -(R_f / R_in) · V_in', note: '闭环增益仅由外部两枚精密电阻比值决定' },
    ],
    keyTakeaways: [
      '没有负反馈或反馈接在同相端时，输出会直接撞向正负电源供电轨（比较器/施密特触发器）。',
      '反相端（-）电位虽紧跟同相端（通常接 0V，称“虚地”），但并未真正与地短接！',
      '输出电压绝对值永远受限于电源供电轨 ±V_rail（默认 ±15V），超出会发生平顶削波饱和。',
    ],
    controls: [
      { key: 'vin', label: '输入信号 Vin', kind: 'slider', min: -3, max: 3, step: 0.5, unit: 'V', defaultValue: 1.5 },
    ],
    callouts: [
      { id: 'balance', title: '误差零平衡天平', detail: '负反馈不断迫使 V- 追平 V+', worldPos: [0, 1.05, 0], color: '#fbbf24' },
      { id: 'feedback', title: '负反馈电阻环路 Rf', detail: '把 Vout 拉回反相端维持平衡', worldPos: [0.1, 1.55, -0.35], color: '#38bdf8' },
      { id: 'vout', title: '反相输出标尺 Vout', detail: 'G = -Rf/Rin，极性与输入相反', worldPos: [1.35, 0.75, 0], color: '#f47171' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '十万倍放大器如何变得温顺可控？',
        narration: '裸运放开环增益 A_ol 高达 100,000，只要引入一根跨接在输出端与反相端（-）之间的反馈电阻 Rf，天平就会自动寻求精妙平衡！',
        camera: { position: [4.2, 3.2, 4.4], target: [0, 0.7, 0] },
      },
      {
        id: 'step-2',
        title: '虚短（V- = V+）与虚断（I- = 0）',
        narration: '为了不让输出爆表，运放会主动拉动 Vout 使反相端电位严格等于同相端（若同相端接地，此处即为 0V“虚地”）；输入级极高阻抗几乎不取电流。',
        camera: { position: [0.3, 2.3, 4.3], target: [0, 0.75, 0] },
      },
      {
        id: 'step-3',
        title: '反相比例放大与输入极性测试',
        narration: '左右拖动 Vin：正输入被倒映为更大幅度的负输出（柱条向下/红），负输入则翻转为高正输出（柱条向上/绿），像跷跷板一样精确遵循比例 -Rf/Rin！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.7, 0] },
      },
    ],
  },

  VOLTMETER: {
    type: 'VOLTMETER',
    title: '理想数字电压表',
    englishTitle: 'Digital Voltmeter',
    badge: '测量仪表 · 并联高阻',
    summary: '跨接在待测元件或两点之间读取电势差，理想情况下具有无穷大内阻，不对原电路产生分流干扰。',
    formulas: [
      { expr: 'V_read = V_+ - V_- ,  R_in → ∞ (典型 ≥ 10 MΩ)', note: '流入表头的分流电流 I_meter ≈ 0' },
    ],
    keyTakeaways: [
      '口诀：“电压表要并联”——红色正表笔接高电位侧，黑色负表笔接低电位侧。',
      '反接表笔不会损坏数字表，只会显示带负号的值（如 -5.00 V）。',
      '若错误地把电压表串联在回路中，由于内阻极高，整个回路电流瞬间被掐断趋近于零！',
    ],
    controls: [
      { key: 'parallelOk', label: '接线方式演示', kind: 'toggle', defaultValue: 1, trueLabel: '正确：跨接并联', falseLabel: '错误：强行串联对比' },
    ],
    callouts: [
      { id: 'meter', title: '高阻数字表头', detail: '内阻 10MΩ 几乎不吸取电流', worldPos: [0, 1.25, -0.3], color: '#38bdf8' },
      { id: 'probes', title: '红/黑测量表笔', detail: 'Vread = φ(红) - φ(黑)', worldPos: [0, 0.45, 0.7], color: '#f87171' },
      { id: 'circuit', title: '被测主回路负载', detail: '并联测量时主电流完全不受扰动', worldPos: [0.85, 0.35, 0.45], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '像“旁观的水压计”一样跨接测量',
        narration: '电压表并联在电阻两端，就像在管道前后各伸出一根细探管只感受两端气压差，几乎不让水流钻进表头内部。',
        camera: { position: [4.1, 3.1, 4.3], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '内阻极高的真实用意',
        narration: '正因为表内阻抗高达数十兆欧，绝大多数电流老老实实从下方主电阻流过，从而保证测出的电压就是元件真实工作的压降。',
        camera: { position: [0.3, 2.2, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '反面教材：万一误串联进回路会怎样？',
        narration: '点击切换开关体验误串联！高阻表头瞬间像一块巨石堵死主水管，下方的负载灯泡熄灭，电源全部电压都吊在表笔两端！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  AMMETER: {
    type: 'AMMETER',
    title: '理想数字电流表',
    englishTitle: 'Digital Ammeter',
    badge: '测量仪表 · 串联低阻',
    summary: '串联接入被测支路内部计数电荷流速，理想情况下内阻趋近于零，不额外消耗压降。',
    formulas: [
      { expr: 'I_read = I_in→out ,  R_shunt → 0 (典型 ≈ mΩ 级)', note: '表头自身压降 V_meter ≈ 0' },
    ],
    keyTakeaways: [
      '口诀：“电流表要串联”——必须先剪断原支路再把表头串入缺口中。',
      '严禁将电流表直接并联在电源正负极或低阻节点两端：极低内阻会引发致命短路！',
      '电流从 + 端流入、- 端流出时读数为正；反向流过时读数为负。',
    ],
    controls: [
      { key: 'loadOhms', label: '主回路负载 R', kind: 'slider', min: 100, max: 500, step: 50, unit: 'Ω', defaultValue: 200 },
    ],
    callouts: [
      { id: 'turbine', title: '低阻叶轮流量计', detail: '内阻 ≈ 0Ω 几乎无摩擦阻尼', worldPos: [0, 0.75, 0], color: '#fbbf24' },
      { id: 'needle', title: '实时电流指针表盘', detail: '叶轮转速与电流 I = V/R 成正比', worldPos: [0, 1.3, -0.35], color: '#38bdf8' },
      { id: 'load', title: '同支路串联负载', detail: '串联支路各处电流处处相等', worldPos: [1.1, 0.5, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '串在主管道里的“轻量化水轮”',
        narration: '想数清每秒钟穿过水管多少颗电荷粒子，最准确的办法就是断开管道，把一具阻力几乎为零的轻质叶轮串插进流水正中间！',
        camera: { position: [4.1, 3.1, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '阻值变化实时改变叶轮转速',
        narration: '拖动下方负载滑块降低 R，整条支路电流同步上涨，叶轮呼呼加速旋转，上方指针与数显同步飙升。',
        camera: { position: [0.3, 2.2, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '记住铁律：电流表绝对不能直接并联电源',
        narration: '因为内部几乎等效于一根超粗铜导线（R≈0），一旦直接跨接电源正负极就会瞬间制造短路火花并烧毁保险丝！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.65, 0] },
      },
    ],
  },
};
