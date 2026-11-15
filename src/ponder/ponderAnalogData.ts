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
    analogyNote: '舞台中的涡轮水泵与高度差台阶为【电势差原理类比】；真实电源内部通过化学反应或开关稳压电路建立恒定电动势。',
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
      { id: 'pump', title: '电荷泵升芯', detail: '类比电动势维持电势阶跃 ΔV', worldPos: [-0.95, 0.85, 0], color: '#38bdf8', isAnalogy: true },
      { id: 'load', title: '外部负载电阻', detail: 'I = Vdc / R', worldPos: [0.95, 0.45, 0], color: '#fbbf24' },
      { id: 'rails', title: '高/低电位轨', detail: '红正 (+V) 与黑负 (0V)', worldPos: [0, 0.25, 0.85], color: '#f87171', stepIndices: [0, 1, 2] },
    ],
    steps: [
      {
        id: 'step-1',
        title: '电势差如同高度差',
        narration: '直流电源内部建立恒定的非静电力，把电荷从负极（0V 参考面）抬升至正极高电位平台，为全电路提供驱动“水压”。',
        renderNarration: (p) => {
          const v = p.voltage ?? 5;
          return `直流电源内部非静电力把正负极电位差锁定在 ${v.toFixed(1)}V（相当于抬高 ${v.toFixed(1)}m 的水头落差），为全电路持续提供恒定驱动“水压”。`;
        },
        camera: { position: [4.2, 3.1, 4.3], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '电压恒定，电流随负载而变',
        narration: '调节右侧滑块升高 Vdc，水位落差增大，流经外部负载的电荷粒子加速流动；无论电流如何变化，理想电源端电压始终不变。',
        renderNarration: (p) => {
          const v = p.voltage ?? 5;
          const iMa = (v / 220) * 1000;
          return `当前设定输出电压 Vdc = ${v.toFixed(1)}V，驱动标准 220Ω 负载产生的电流为 ${iMa.toFixed(1)}mA；调节滑块改变 Vdc 时，理想电源端电压按设定锁死，粒子流速率随压差同步变化。`;
        },
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
    analogyNote: '舞台上的定量水轮泵、压力液柱与机械闸门均属于【流体定量类比】；实际恒流源多由晶体管镜像偏置或负反馈运放构成。',
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
      { id: 'wheel', title: '恒速定量水车', detail: '类比恒定每秒输送电荷量 Is', worldPos: [-1.0, 0.85, 0], color: '#10b981', isAnalogy: true },
      { id: 'pressure', title: '自适应压力柱', detail: '类比端电压 V = Is · R 随负载升高', worldPos: [0.05, 1.05, -0.35], color: '#f59e0b', isAnalogy: true },
      { id: 'valve', title: '可调阻力负载', detail: '类比增大 R 会抬升端压而非减小电流', worldPos: [1.05, 0.5, 0], color: '#38bdf8', isAnalogy: true },
    ],
    steps: [
      {
        id: 'step-1',
        title: '定量推送的“机械水车”',
        narration: '恒流源就像一台恒定转速的定量柱塞泵：无论前方管道阻力多大，每秒钟输出的电荷颗粒数恒定为 Is。',
        renderNarration: (p) => {
          const r = p.loadRatio ?? 1.0;
          return `恒流源被类比为恒速定量柱塞泵：无论前方负载倍数调到多少（当前 R = ${r.toFixed(1)}×），输出支路电流始终维持恒定。`;
        },
        camera: { position: [4.1, 3.1, 4.3], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '负载变大，端电压自动抬升',
        narration: '拖动滑块增大负载 R，观察中央压力柱 V=Is·R 迅速拔高，而管道内流过的小球间距与速度保持恒定！',
        renderNarration: (p) => {
          const r = p.loadRatio ?? 1.0;
          return `当前负载比例设为 ${r.toFixed(1)}×，依据 V = Is · R 推算出端压 ${(2.5 * r).toFixed(2)}V（中央液柱高度），而颗粒流速保持恒定。`;
        },
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
    analogyNote: '高度标尺柱将抽象电位差可视化为“海拔高度”，属于【空间电位类比】。',
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
      { id: 'plane', title: '零电位基准铜排', detail: '类比 V = 0V 海平面', worldPos: [0, 0.18, 0], color: '#34d399', isAnalogy: true },
      { id: 'towers', title: '各节点高度标尺', detail: '类比电压即相对地面的高度差', worldPos: [-0.95, 1.05, 0], color: '#38bdf8', isAnalogy: true },
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
        renderNarration: (p) => {
          const ok = (p.connected ?? 1) >= 0.5;
          return ok
            ? '当前电路已接 0V 参考地：各节点电位标尺平稳扎根在铜排零电位面上；可尝试切换为“浮空未接地”观察电位整体漂移现象。'
            : '当前处于“浮空未接地”态！失去 0V 参考锚点后，尽管相对压差还在，各点对地绝对电位剧烈漂移晃动，MNA 矩阵奇异。';
        },
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
      { key: 'ohms', label: '阻值 R', kind: 'slider', min: 10, max: 5000, step: 10, unit: 'Ω', defaultValue: 220 },
      { key: 'voltage', label: '两端压降 V', kind: 'slider', min: 0, max: 24, step: 0.5, unit: 'V', defaultValue: 5 },
    ],
    callouts: [
      { id: 'bands', title: 'IEC 四色环编码', detail: '随阻值实时动态变色', worldPos: [0, 0.85, 0.25], color: '#fbbf24' },
      { id: 'lattice', title: '内部晶格障碍柱', detail: '电子不断碰撞损失定向动能', worldPos: [0, 0.55, -0.35], color: '#38bdf8' },
      { id: 'heat', title: '焦耳热辐射', detail: 'P = V² / R（功耗超限红光告警）', worldPos: [0.85, 0.75, 0], color: '#f87171' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从色环读取阻值密码',
        narration: '陶瓷骨架上的四条色环精确编码了标称阻值。拖动滑块改变 R，3D 电阻体的前两环数字与倍率环会按 IEC 标准实时切换。',
        renderNarration: (p) => {
          const r = Math.max(1, p.ohms ?? 220);
          const rStr = r >= 1000 ? `${(r / 1000).toFixed(r % 1000 === 0 ? 1 : 2)} kΩ` : `${r} Ω`;
          return `陶瓷骨架上的 IEC 四条色环实时反映当前设定阻值 R = ${rStr}；改动 R 后，前两位有效数字环与第 3 位倍率环会同步重新着色。`;
        },
        camera: { position: [3.8, 2.7, 3.8], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '微观晶格碰撞与限流作用',
        narration: '透视电阻内部：电子流穿梭密集的晶格原子阵列，阻值 R 越大，碰撞阻碍越强，单位时间通过的电流 I = V/R 就越小。',
        renderNarration: (p) => {
          const r = Math.max(1, p.ohms ?? 220);
          const v = Math.max(0, p.voltage ?? 5);
          const i = v / r;
          const iStr =
            i >= 1 ? `${i.toFixed(2)} A` : i >= 1e-3 ? `${(i * 1000).toFixed(2)} mA` : `${(i * 1e6).toFixed(1)} µA`;
          const rStr = r >= 1000 ? `${(r / 1000).toFixed(r % 1000 === 0 ? 1 : 2)} kΩ` : `${r} Ω`;
          return `在当前两端压降 ${v.toFixed(2)} V、阻值 R = ${rStr} 下，晶格碰撞将定向电流准确限制在 I = V / R = ${iStr}；R 越高或电压越低，电荷流速度越慢。`;
        },
        camera: { position: [0.2, 2.0, 4.0], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '能量去哪儿了？焦耳定律 P = I²R',
        narration: '当把阻值拉到很小（如 50Ω）而外加电压不变时，大电流碰撞剧烈生热，电阻中段呈现赤热红光警示！',
        renderNarration: (p) => {
          const r = Math.max(1, p.ohms ?? 220);
          const v = Math.max(0, p.voltage ?? 5);
          const powerW = (v * v) / r;
          const pStr = powerW >= 1 ? `${powerW.toFixed(2)} W` : `${(powerW * 1000).toFixed(1)} mW`;
          return `电子与晶格碰撞损耗的电能转化为焦耳热 P = V²/R = ${pStr}${
            powerW > 0.25 ? '（注意：已显著高于常规 0.25W 色环电阻额定散热量，热芯红光剧烈预警！）' : '（处于安全温和散热区间）'
          }。`;
        },
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
    analogyNote: '右侧立体柱状电平表为【分压输出数值可视化指示】。',
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
        renderNarration: (p) => {
          const a = Math.max(0.05, Math.min(0.95, p.wiper ?? 0.5));
          const pct = Math.round(a * 100);
          return `当前旋钮位于 α=${a.toFixed(2)}（${pct}%）：滑片将总电阻分成上段 ${100 - pct}% 与下段 ${pct}% 串联，空载时抽头分压输出 V_W = ${pct}% · V_in。`;
        },
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
        renderNarration: (p) => {
          const isAc = (p.acMode ?? 0) >= 0.5;
          return isAc
            ? '当前处于【交流激励】模式：电压正负交替翻转，极板不停反复充放电，外电路持续出现交变位移电流！'
            : '当前处于【直流脉冲】模式：刚开始外电路向极板搬运电荷，当 Vc 追平电源电压后，直流电流降为零，电容对外等效断路（隔直）。';
        },
        camera: { position: [0.3, 2.1, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '为什么又能“通交流”？',
        narration: '切换至交流模式！由于外电压不停往复反转，极板周而复始地充、放电，外电路的电荷粒子来回往返，如同电流顺利穿过了电容！',
        renderNarration: (p) => {
          const isAc = (p.acMode ?? 0) >= 0.5;
          return isAc
            ? '此时正是交流模式：外电压反复反转极性，电荷粒子在外部导线来回奔跑，容抗 Xc = 1/(2πfC) 随频率升高而下降！'
            : '点击上方开关切换至【交流激励 (通交)】即可观察：外电压交替反转时，电容虽然没有电子穿越绝缘层，外部导线却保持持续交变电流。';
        },
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
    analogyNote: '舞台中“机械大飞轮惯性”为【电感磁通惯性原理类比】，对应法拉第/楞次定律 v = L·di/dt 阻止电流突变的电学特性。',
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
      { id: 'lenz', title: '楞次反电动势指示', detail: '变化越快，反抗阻力越强（类比飞轮惯性）', worldPos: [1.1, 0.65, 0], color: '#f43f5e', isAnalogy: true },
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
        renderNarration: (p) => {
          const isHf = (p.highFreq ?? 0) >= 0.5;
          return isHf
            ? '当前处于【高频交流】模式：信号频率极高、电流变化率 di/dt 剧增，感抗 X_L = 2πfL 大幅升高，电感强烈抑制电流波动。'
            : '当前处于【低频/直流】模式：稳态下 di/dt → 0，磁场稳定不再反抗，理想电感对直流几乎等价于零阻导线（通直）。';
        },
        camera: { position: [0.3, 2.2, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '高频冲击激起强烈反抗',
        narration: '切换至高频模式：电流试图每秒反复换向，巨大的楞次感应反电动势 v=L·di/dt 拼命阻挡，使高频分量被严重衰减（扼流圈滤波）。',
        renderNarration: (p) => {
          const isHf = (p.highFreq ?? 0) >= 0.5;
          return isHf
            ? '此时已切换到高频交流：电流试图每秒高速换向，激起巨大的楞次反电动势 v = L·di/dt，把高频纹波狠狠拦在门外（阻交）。'
            : '点击上方信号模式切到【高频交流 (受阻)】即可观察：高频换向时，磁飞轮般的感应反电动势立刻拉红告警并抑制交流幅值。';
        },
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
        renderNarration: (p) => {
          const closed = (p.closed ?? 1) >= 0.5;
          return closed
            ? '当前刀闸【已闭合导通 (ON)】：金属接触闭合，开关两端压降 ΔV ≈ 0V，电流畅通流向负载灯泡。'
            : '当前刀闸【已分闸断开 (OFF)】：空气气隙彻底切断电流（I = 0A），负载熄灭，电源全部压差此刻全部落在断开气隙两端。';
        },
        camera: { position: [0.3, 2.2, 4.2], target: [0.1, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '分闸切断：空气绝缘挡住电流',
        narration: '点击下方按钮断开开关！空气是非常优良的绝缘体，电子流撞到间隙前被迫停滞，开关自身两端出现全额电源压差。',
        renderNarration: (p) => {
          const closed = (p.closed ?? 1) >= 0.5;
          return closed
            ? '尝试点击上方按钮切换到【分闸断开 (OFF)】：金属刀片抬起后，电子流撞到绝缘气隙停滞，开关两端将出现全额开路压差。'
            : '此刻正处于【分闸断开 (OFF)】：绝缘空气阻断了所有电子通过，尽管没有电流做功，但断开的两触点间承受着完整开路电压！';
        },
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
    analogyNote: '铁路道岔指示为【开关选通原理类比】，对应内部金属动触片的二选一拨动换向。',
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
      { id: 'com', title: 'COM 公共动触点', detail: '类比铁路扳道岔入口', worldPos: [-1.1, 0.55, 0], color: '#fbbf24', isAnalogy: true },
      { id: 'branchA', title: '通道 A 支路', detail: '主照明/常闭路径', worldPos: [0.95, 0.75, -0.75], color: '#f59e0b' },
      { id: 'branchB', title: '通道 B 支路', detail: '备用/指示切换路径', worldPos: [0.95, 0.75, 0.75], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '铁路道岔般的电学换向器',
        narration: 'COM 公共端永远只能倒向 A 触点或 B 触点其中之一，就像铁轨上的扳道岔，决定能量列车驶向哪条支路。',
        renderNarration: (p) => {
          const isB = (p.throwB ?? 0) >= 0.5;
          return `COM 公共端就像铁路道岔开关，当前倒向 ${isB ? 'B 路（蓝灯支路导通，A 路隔离）' : 'A 路（琥珀灯支路导通，B 路隔离）'}。`;
        },
        camera: { position: [4.1, 3.3, 4.1], target: [0.1, 0.5, 0] },
      },
      {
        id: 'step-2',
        title: '切换支路，点亮另一侧负载',
        narration: '拨动控制开关将动刀片切向 B 路，原 A 路电流立即归零熄灭，B 路电子流瞬间打通点亮蓝色指示灯！',
        renderNarration: (p) => {
          const isB = (p.throwB ?? 0) >= 0.5;
          return isB
            ? '当前已切至 B 路：原 A 路电流彻底归零，B 路蓝灯顺畅点亮。点击上方开关可切回 A 路对比。'
            : '当前接通 A 路：琥珀色分支保持畅通，B 路支路完全隔离无漏流。点击上方开关切换至 B 路。';
        },
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
        renderNarration: (p) => {
          const fwd = (p.forward ?? 1) >= 0.5;
          return fwd
            ? '当前处于【正向偏置 (+A → -K)】：外电场推动空穴与电子跨过 0.7V 门槛汇合，中央耗尽层压缩变薄，电路单向导通。'
            : '当前处于【反向偏置 (-A ← +K)】：外电场把两侧载流子硬生生拉开，中间耗尽层加厚封路，二极管几乎完全截止不导电。';
        },
        camera: { position: [0.2, 2.2, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '反向偏置：耗尽层急剧加宽封路',
        narration: '切换至反向偏置！外电场把两种载流子硬生生拉开，中间耗尽层瞬间扩张变成一堵厚实的绝缘墙，电流彻彻底底归零。',
        renderNarration: (p) => {
          const fwd = (p.forward ?? 1) >= 0.5;
          return fwd
            ? '点击上方按钮切向【反向偏置 (-A ← +K)】试试：你会亲眼看到中央白色绝缘耗尽层瞬间拉宽，封堵反向电流。'
            : '现在已是【反向偏置】：中间绝缘耗尽层显著拉宽筑起高墙，反向电流趋近于零，这正是整流与防反接保护的秘密。';
        },
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
        renderNarration: (p) => {
          const iMa = p.currentMa ?? 15;
          if (iMa < 1) return `当前驱动电流仅 ${iMa.toFixed(1)} mA：不足以激发可见光量子，LED 基本熄灭。`;
          if (iMa > 25) return `告警！当前驱动电流达 ${iMa.toFixed(1)} mA（超出 25mA 安全线）：亮度极高但管芯严重发热，必须增大串联限流电阻！`;
          return `当前驱动电流 I_f = ${iMa.toFixed(1)} mA：处于 5~25mA 安全高效率发光区间，管芯亮度均匀且不过载。`;
        },
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
    analogyNote: '舞台中的比例水闸与细控水柱为【以小博大机械/液压类比】，用来直观演示 NPN 晶体管基区载流子注入调控主沟道的机理。',
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
      { id: 'base', title: 'Base 基极控制阀', detail: '类比微弱 μA 电流拨动比例阀芯', worldPos: [-1.1, 0.65, 0], color: '#fbbf24', isAnalogy: true },
      { id: 'gate', title: '比例放大水闸核心', detail: '类比 β=100 倍主电流控制机制', worldPos: [0, 0.85, 0], color: '#38bdf8', isAnalogy: true },
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
        renderNarration: (p) => {
          const ib = p.ib ?? 40;
          const icMa = Math.min(10, (ib * 100) / 1000);
          const region = ib <= 2 ? '截止区（闸门紧闭，Ic=0）' : ib >= 95 ? '饱和区（开关全开，V_CE≈0.2V）' : '线性放大区（Ic ≈ β·Ib）';
          return `当前基极电流 Ib = ${ib} μA ⇒ 晶体管正处于【${region}】，估算集电极电流 Ic ≈ ${icMa.toFixed(2)} mA；试着在 0 / 40 / 110 μA 间拖动体会三区跃迁。`;
        },
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
    analogyNote: '误差零平衡天平属于【负反馈闭环稳态类比】，真实器件由数十只差分及推挽放大晶体管集成实现。',
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
      { id: 'balance', title: '误差零平衡天平', detail: '类比负反馈迫使 V- 追平 V+', worldPos: [0, 1.05, 0], color: '#fbbf24', isAnalogy: true },
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
        renderNarration: (p) => {
          const vin = p.vin ?? 1.5;
          const vout = Math.max(-12, Math.min(12, -3 * vin));
          return `当前输入 Vin = ${vin.toFixed(1)} V，经 Rf/Rin = 3 倍反相比例放大后，输出严格反向为 Vout = ${vout.toFixed(1)} V（正负倒映关系）。`;
        },
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
    analogyNote: '水压差旁观测量为【流体压强类比】；真实数字万用表依托 10MΩ 精密分压链与 ADC 采样。',
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
        renderNarration: (p) => {
          const ok = (p.parallelOk ?? 1) >= 0.5;
          return ok
            ? '当前处于正确【并联测量】状态：10MΩ 高阻使电流绝大部分流经下方负载，测得真实端压。点切换开关可演示“误串联”后果。'
            : '当前正在演示【错误强行串联】！10MΩ 高内阻彻底卡死回路，负载熄灭，全额电源电压全吊在了电压表两端！';
        },
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
    analogyNote: '舞台旋转叶轮属于【电荷流速机械类比】，现实数字电流表通过串联毫欧级分流电阻测量微弱压降 I = V/R_shunt。',
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
      { id: 'turbine', title: '低阻叶轮流量计', detail: '类比串联毫欧内阻计数电荷流速', worldPos: [0, 0.75, 0], color: '#fbbf24', isAnalogy: true },
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
        renderNarration: (p) => {
          const r = p.loadOhms ?? 200;
          const iMa = (5 / r) * 1000;
          return `当前串联负载阻值 R = ${r} Ω（按 5V 电源测算），支路电流实测 I = ${iMa.toFixed(1)} mA；降低阻值可见叶轮转速与表盘指针同比上升。`;
        },
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
