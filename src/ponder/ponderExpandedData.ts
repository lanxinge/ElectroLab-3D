import type { PonderModuleSpec } from './ponderTypes';

export type ExpandedPonderType =
  | 'INF_SOURCE'
  | 'INF_RESISTOR'
  | 'ZENER_DIODE'
  | 'NMOS'
  | 'TRANSFORMER'
  | 'LAMP'
  | 'FUSE'
  | 'MUX_2_1'
  | 'JK_FF'
  | 'COUNTER_4BIT'
  | 'CUSTOM_TRUTH_8'
  | 'CUSTOM_TRUTH_16'
  | 'IC_PORT_IN'
  | 'IC_PORT_OUT'
  | 'CUSTOM_IC'
  | 'TIMER_555'
  | 'NIXIE_TUBE'
  | 'ENCODER_4_2'
  | 'DECODER_2_4'
  | 'MUX_4BIT'
  | 'REGISTER_4BIT'
  | 'ALU_4BIT'
  | 'RAM_16X4';

export const PONDER_EXPANDED_SPECS: Record<ExpandedPonderType, PonderModuleSpec> = {
  INF_SOURCE: {
    type: 'INF_SOURCE',
    title: '无限电源 (理想高压/无上限电源)',
    englishTitle: 'Infinite Voltage & Power Source',
    badge: '无限能量 · 理论激励源',
    summary: '在电路仿真中突破物理电源的电压上限与过流保护限制，可在任意伏特乃至兆伏级别强行维持两端电势差 V = V∞。',
    formulas: [
      { expr: 'V(+) - V(-) = V_set  (0 V ≤ V_set ≤ +∞)', note: '内阻近似为零 (R_int ≈ 0)，功率无过载熔断约束' },
      { expr: 'I_out = (V_set - V_node) / R_load', note: '负载再重也不跌落端电压' },
    ],
    keyTakeaways: [
      '常规稳压源存在电压调节范围与额定功率上限，而无限电源专用于极限耐压测试与戴维南理想建模。',
      '当与普通导线短接或接入超小电阻时，可观察到无穷量级趋势的超大电流，须搭配限流元件保护脆弱器件。',
      '可在属性面板自由输入科学计数法或百万伏特级设定值，无过载报警弹窗阻断。',
    ],
    controls: [
      { key: 'voltage', label: '无限电压倍率', kind: 'slider', min: 10, max: 10000, step: 10, unit: 'V', defaultValue: 1200 },
      { key: 'loadR', label: '测试负载 R', kind: 'slider', min: 10, max: 500, step: 10, unit: 'Ω', defaultValue: 100 },
    ],
    callouts: [
      { id: 'core', title: '超导量子核心环', detail: '维持恒定电动势且内阻为零的理想能源体', worldPos: [-0.85, 0.9, 0], color: '#f43f5e' },
      { id: 'stream', title: '无损耗能流束', detail: '无论负载怎么增大，端电压始终坚如磐石', worldPos: [0.35, 0.72, 0], color: '#38bdf8' },
      { id: 'gauge', title: '稳压零跌落指示柱', detail: '电压表头稳定锁定在设定值', worldPos: [1.35, 0.9, 0], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '理想无穷电压源的物理抽象',
        narration: '在电磁场与电路理论课程中，理想电压源的伏安特性是一条垂直于电压轴的直线：无论汲取多大的电流，输出电位差永远等于设定值。',
        camera: { position: [4.2, 3.1, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '无限功率输出的极限工况',
        narration: '尝试把右侧测试负载调小或把设定电压调至上万伏，粒子束流速剧增但中央超导芯环的光度与端电压读数丝毫不见衰减。',
        renderNarration: (p) => {
          const v = p.voltage ?? 1200;
          const r = Math.max(1, p.loadR ?? 100);
          const i = v / r;
          return `当前理想电压 V_set = ${v.toFixed(0)} V、测试负载 R_load = ${r.toFixed(0)} Ω：输出电流 I = ${(i).toFixed(2)} A（功耗 ${(v * i).toFixed(0)} W），理想内阻为零故端电压纹丝不动！`;
        },
        camera: { position: [0.4, 2.3, 4.3], target: [0.2, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '工程仿真中的使用警示',
        narration: '切勿将两个不同电压值的无限电源直接并联，这在矩阵拓扑上会造成矛盾方程，MNA 求解器将检测到零阻环路奇异。',
        camera: { position: [-3.4, 2.7, 3.7], target: [0, 0.65, 0] },
      },
    ],
  },

  INF_RESISTOR: {
    type: 'INF_RESISTOR',
    title: '无限电阻 (理想开路 / 超高阻器)',
    englishTitle: 'Infinite Impedance / Ultra-High Resistor',
    badge: '无极阻尼 · 理想开路',
    summary: '既可以作为趋于无穷大的理想开路隔离器 (R → ∞)，也能支持 10¹²Ω 以上超高兆欧级绝缘阻抗测试。',
    formulas: [
      { expr: 'I = lim(R→∞) V / R = 0 A', note: '理想开路状态下支路电流严格为零' },
      { expr: 'R_eq = R_base × 10ⁿ  (最高 10¹⁵ Ω)', note: '支持微弱漏电流与理想开路双模式' },
    ],
    keyTakeaways: [
      '与普通 0Ω 超导短接线恰好相反，无限电阻代表两节点之间电荷几乎无法跨越的绝对势垒。',
      '用于观察分压电路开路端电位、高阻态三态门悬空效应以及绝缘击穿极限测试。',
      '即使承受极高电压，功率 P = V²/R 也因 R 趋于无穷而几乎为零，永不过热烧毁。',
    ],
    controls: [
      { key: 'infiniteMode', label: '工作模式', kind: 'toggle', defaultValue: 1, trueLabel: '∞ 理想断路', falseLabel: 'GΩ 超高阻泄漏' },
      { key: 'vin', label: '左侧施压 V', kind: 'slider', min: 10, max: 500, step: 10, unit: 'V', defaultValue: 220 },
    ],
    callouts: [
      { id: 'leftP', title: '高压积聚侧', detail: '电荷推挤至极高电势却难以跨越屏障', worldPos: [-1.2, 0.72, 0], color: '#f97316' },
      { id: 'barrier', title: '绝对陶瓷量子势垒', detail: '等效阻力达 10¹⁵ Ω，阻断宏观载流子', worldPos: [0, 0.9, 0], color: '#a855f7' },
      { id: 'rightP', title: '零电流隔离输出侧', detail: '右侧电流柱接近于零，彻底电气隔离', worldPos: [1.25, 0.65, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '高阻态与开路的等效模型',
        narration: '在 MNA 节点导纳矩阵里，无限电阻对应极微弱导纳 G ≈ 10⁻¹² S。载流子在晶界处被完全拦截反弹。',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '断路势垒 vs 微弱泄漏电流',
        narration: '切换到超高阻泄漏模式，可以看到极其稀疏的电荷微粒勉强渗透势垒；切换回 ∞ 模式则彻底零电流静止。',
        renderNarration: (p) => {
          const inf = (p.infiniteMode ?? 1) >= 0.5;
          const vin = p.vin ?? 220;
          return inf
            ? `当前为【∞ 理想断路模式】（外施压 ${vin.toFixed(0)} V）：导纳趋近于零，势垒彻底隔离两侧节点，宏观支路电流严格 I = 0 A。`
            : `当前为【GΩ 超高阻泄漏模式】（外施压 ${vin.toFixed(0)} V）：极少量电荷粒子渗过超高势垒形成微安/皮安级漏电流。`;
        },
        camera: { position: [0.1, 2.2, 4.0], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '高阻节点检测与戴维南开路测试',
        narration: '在多端网络端口挂接无限电阻相当于测量纯净的开路电压 Voc，不受负载效应分压干扰。',
        camera: { position: [-3.4, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  ZENER_DIODE: {
    type: 'ZENER_DIODE',
    title: '齐纳稳压二极管',
    englishTitle: 'Zener Voltage Regulator Diode',
    badge: '反向雪崩 · 基准钳位',
    summary: '巧妙工作在“反向击穿区”的特种二极管：反向偏置达到稳压值 Vz 后，电流剧增而两端电压几乎纹丝不动。',
    analogyNote: '舞台“溢流减压泄流阀”为【稳压钳位原理类比】，对应齐纳管反向击穿后动态电阻极小的物理机制。',
    formulas: [
      { expr: '正向导通: V_ak ≈ 0.7 V', note: '与普通二极管一致' },
      { expr: '反向稳压: V_ka ≥ Vz ⇒ V_ka ≈ Vz', note: '利用齐纳击穿效应稳定输出基准电压' },
    ],
    keyTakeaways: [
      '接线极其讲究方向：阳极 A 接低电位（如 GND），阴极 K 经限流电阻接高电位，使其工作在反向区！',
      '必须串联限流电阻 R，否则击穿后电流无限制飙升会瞬间热击穿器件。',
      '广泛用于电源基准源、电平钳位过压保护与低成本稳压模块。',
    ],
    controls: [
      { key: 'vin', label: '输入电压 Vin', kind: 'slider', min: 1, max: 15, step: 0.5, unit: 'V', defaultValue: 9.0 },
      { key: 'vz', label: '击穿稳压值 Vz', kind: 'slider', min: 3.3, max: 9.1, step: 0.3, unit: 'V', defaultValue: 5.1 },
    ],
    callouts: [
      { id: 'rLimit', title: '限流电阻保护塔', detail: '吸收多余压降 (Vin - Vz)，限制击穿电流', worldPos: [-1.3, 0.75, 0], color: '#38bdf8' },
      { id: 'zener', title: '齐纳稳压闸门 [类比]', detail: '类比溢流阀：超出 Vz 的过剩电压经泄流通道排走', worldPos: [0, 0.85, 0], color: '#f59e0b', isAnalogy: true },
      { id: 'vout', title: '稳压输出监测柱', detail: '输入波动时，输出稳稳咬住 Vz', worldPos: [1.35, 0.85, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '逆向思考的二极管设计',
        narration: '普通二极管害怕反向击穿，齐纳二极管则特意掺杂，把反向击穿电压精确控制在 Vz（如 5.1V），且击穿后只要电流不过载就能无损恢复。',
        camera: { position: [4.1, 3.0, 4.1], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '溢流阀般的电压钳位过程',
        narration: '尝试把输入电压从 4V 拉高到 12V：当低于 Vz 时稳压管截止；一旦超过 5.1V，旁路泄流阀门敞开，输出柱死死锚定在 5.1V。',
        renderNarration: (p) => {
          const vin = p.vin ?? 9.0;
          const vz = p.vz ?? 5.1;
          const clamping = vin >= vz;
          const vout = Math.min(vin, vz);
          return clamping
            ? `当前 Vin=${vin.toFixed(1)}V ≥ Vz=${vz.toFixed(1)}V：进入齐纳反向稳压击穿区，多余压差由限流电阻承受，输出被牢固钳位在 ${vout.toFixed(2)}V。`
            : `当前 Vin=${vin.toFixed(1)}V < Vz=${vz.toFixed(1)}V：尚未达到反向击穿门槛，稳压管截止不导通，输出几乎等于输入电压 ${vout.toFixed(2)}V。`;
        },
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '限流电阻与最小维持电流设计原则',
        narration: '工程上需确保串联限流电阻承受多余电压 (Vin - Vz)，在稳压管不过热的同时保障最小稳定工作电流。',
        camera: { position: [-3.2, 2.6, 3.7], target: [0, 0.6, 0] },
      },
    ],
  },

  NMOS: {
    type: 'NMOS',
    title: 'N 沟道增强型 MOSFET',
    englishTitle: 'N-Channel Enhancement MOSFET',
    badge: '电压控流 · 零栅流场效应',
    summary: '利用栅极电场感生反型导电沟道的场效应晶体管，以近乎零栅极电流实现高速、大功率的无触点电子开关。',
    formulas: [
      { expr: '截止区 (V_GS < V_th): I_D = 0', note: '沟道未形成，漏源断路' },
      { expr: '饱和/可变区: I_D ≈ k·[(V_GS - V_th)V_DS - ½V_DS²]', note: 'V_GS 越高，导电沟道越宽厚' },
    ],
    keyTakeaways: [
      '三极管 BJT 是“电流控制电流”，而 MOSFET 是“电压控制电流”，静态栅极电流几乎为零。',
      '当 V_GS 跨过开启阈值 V_th（如 2.0V）后，蓝色的反型电子沟道在漏极 D 与源极 S 间导通。',
      'CMOS 数字集成电路与开关电源 DC-DC 的核心基石。',
    ],
    controls: [
      { key: 'vgs', label: '栅源控制电压 V_GS', kind: 'slider', min: 0, max: 6, step: 0.2, unit: 'V', defaultValue: 3.8 },
      { key: 'vth', label: '开启阈值 V_th', kind: 'slider', min: 1.0, max: 3.5, step: 0.2, unit: 'V', defaultValue: 2.0 },
    ],
    callouts: [
      { id: 'gate', title: '绝缘金属栅极 (G)', detail: '隔着 SiO₂ 绝缘层施加静电场，无直流流入', worldPos: [0, 1.32, 0.7], color: '#a855f7' },
      { id: 'channel', title: '感生 N 型导电沟道', detail: 'V_GS > V_th 时由狭窄渐宽，决定导通电阻 R_ds(on)', worldPos: [0, 0.55, 0], color: '#38bdf8' },
      { id: 'drainLamp', title: '漏极负载灯塔 (D)', detail: '沟道畅通后驱动大电流负荷', worldPos: [1.35, 0.88, -0.35], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '隔空电场操控导通的神奇阀门',
        narration: '栅极下方是一层超薄二氧化硅绝缘体，电流无法流过栅极本身，但栅极上的正电荷会向硅衬底吸引大量自由电子。',
        camera: { position: [4.2, 3.1, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '跨越阈值形成低阻沟道',
        narration: '调节 V_GS 滑块：低于 2V 时蓝色反型沟道彻底断裂；一旦超过阈值，漏源之间搭起宽阔电子桥，右侧负载瞬间明亮。',
        renderNarration: (p) => {
          const vgs = p.vgs ?? 3.8;
          const vth = p.vth ?? 2.0;
          const on = vgs > vth;
          return on
            ? `当前 V_GS=${vgs.toFixed(1)}V > 开启阈值 V_th=${vth.toFixed(1)}V（超驱动 ${(vgs - vth).toFixed(1)}V）：硅衬底感生反型电子沟道导通，漏极负载亮起。`
            : `当前 V_GS=${vgs.toFixed(1)}V ≤ 阈值 V_th=${vth.toFixed(1)}V：尚不足以形成反型层沟道，MOS 管处于截止断开态。`;
        },
        camera: { position: [0.3, 2.2, 4.0], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '零栅极直流功耗与高速数字开关',
        narration: '由于栅极被 SiO₂ 彻底绝缘，直流驱动几乎不吸取前级电流，使数亿颗晶体管在芯片上高密度共存成为可能。',
        camera: { position: [-3.3, 2.7, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  TRANSFORMER: {
    type: 'TRANSFORMER',
    title: '理想工频隔离变压器',
    englishTitle: 'Ideal Coupled Winding Transformer',
    badge: '电磁耦合 · 变压隔离',
    summary: '绕在同一闭合高导磁铁芯上的原边 (Primary) 与副边 (Secondary) 线圈，利用法拉第互感实现交流电压按匝数比缩放与电气隔离。',
    formulas: [
      { expr: 'V₂ / V₁ = N₂ / N₁ = k', note: '升压 (k>1) 或降压 (k<1) 比例仅由匝数比决定' },
      { expr: 'I₂ / I₁ = N₁ / N₂  (P₁ ≈ P₂)', note: '能量守恒：高压小电流 ↔ 低压大电流' },
    ],
    keyTakeaways: [
      '变压器只能传输交流或脉动变化电压，稳恒直流通过原边时磁通变化率 dΦ/dt = 0，副边无法感应电压！',
      '电气上原副边完全绝缘，提供了宝贵的安全隔离与共模抗干扰能力。',
      '在 3D 台面中可调整变比 k，观察右侧副边线圈波形幅度的同比例放缩。',
    ],
    controls: [
      { key: 'turnsRatio', label: '变比 N₂ : N₁', kind: 'slider', min: 0.25, max: 3.0, step: 0.25, unit: '×', defaultValue: 0.5 },
      { key: 'acAmp', label: '原边交流幅值 V₁', kind: 'slider', min: 5, max: 30, step: 1, unit: 'V', defaultValue: 12 },
    ],
    callouts: [
      { id: 'primary', title: '原边励磁绕组 (P1/P2)', detail: '交变电流激发出正弦交变磁通', worldPos: [-0.95, 0.78, 0], color: '#38bdf8' },
      { id: 'core', title: '闭合高导磁铁芯', detail: '将交变磁感线几乎无损耗地束缚并传至副边', worldPos: [0, 1.08, 0], color: '#fbbf24' },
      { id: 'secondary', title: '副边感应绕组 (S1/S2)', detail: '输出 V₂ = k·V₁ 交流电动势', worldPos: [0.95, 0.78, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“电→磁→电”的隔空能量传递',
        narration: '原边交流电在硅钢叠片铁芯内部绕出脉动的闭合磁感线环流，磁力线穿过右侧副边线圈时根据法拉第定律感生新电压。',
        camera: { position: [4.2, 3.1, 4.2], target: [0, 0.7, 0] },
      },
      {
        id: 'step-2',
        title: '调整匝数比改变电压幅值',
        narration: '拖动变比滑块：当 N₂:N₁ < 1 时实现降压；大于 1 时实现升压，但根据功率守恒，升压时副边最大输出电流会成反比减小。',
        renderNarration: (p) => {
          const k = p.turnsRatio ?? 0.5;
          const v1 = p.acAmp ?? 12;
          const v2 = v1 * k;
          return `当前匝数比 N₂:N₁ = ${k.toFixed(2)}（${k > 1 ? '升压' : k < 1 ? '降压' : '1:1 隔离'}模式），原边 V₁=${v1.toFixed(1)}V 时副边感应输出 V₂ = k·V₁ = ${v2.toFixed(1)}V。`;
        },
        camera: { position: [0.1, 2.4, 4.1], target: [0, 0.7, 0] },
      },
      {
        id: 'step-3',
        title: '隔离安全与纯直流屏蔽特性',
        narration: '原副边无金属直连却能高效馈送交变能量；若通入纯恒定直流电，铁芯磁通停止变化，副边感应电动势归零。',
        camera: { position: [-3.4, 2.7, 3.8], target: [0, 0.7, 0] },
      },
    ],
  },

  LAMP: {
    type: 'LAMP',
    title: '可视化白炽指示灯泡',
    englishTitle: 'Incandescent Indicator Lamp',
    badge: '热阻负载 · 光功率指示',
    summary: '拥有等效灯丝内阻与额定工作功率的可视化电负载，电流流过钨丝产生焦耳热并实时映射到发光亮度与电功率指示。',
    formulas: [
      { expr: 'P = V² / R_bulb = I² · R_bulb', note: '发光亮度正比于实际耗散功率与额定功率之比' },
    ],
    keyTakeaways: [
      '比纯粹的数字电压读数更直观：串联或并联电路中的分压差异一眼就能从灯泡明暗分辨出来。',
      '当功率远低于额定功率时仅泛起微弱暖黄灯丝光；功率过载过高则会发刺眼白光并亮起热警示。',
    ],
    controls: [
      { key: 'voltage', label: '加载电压 V', kind: 'slider', min: 0, max: 16, step: 0.5, unit: 'V', defaultValue: 9 },
      { key: 'resistance', label: '灯丝电阻 R', kind: 'slider', min: 10, max: 120, step: 5, unit: 'Ω', defaultValue: 30 },
    ],
    callouts: [
      { id: 'filament', title: '螺旋高温钨丝', detail: '电能转换为热能与光辐射的核心电阻体', worldPos: [0, 1.0, 0], color: '#fbbf24' },
      { id: 'glass', title: '真空惰性玻璃泡壳', detail: '防止钨丝高温氧化熔断', worldPos: [0.48, 1.12, 0.25], color: '#bae6fd' },
      { id: 'powerBar', title: '实耗电功率灯柱', detail: '衡量真实负载做功功率 P = V·I', worldPos: [1.3, 0.85, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '把抽象瓦特数变成看得见的光强',
        narration: '电流迫使电子在螺旋钨丝晶格中频繁碰撞散射产生高温辐射，实耗功率越大，灯泡中心温度越高、光晕越饱满。',
        camera: { position: [3.9, 2.9, 3.9], target: [0, 0.75, 0] },
      },
      {
        id: 'step-2',
        title: '电压平方反比规律的直观验证',
        narration: '因为 P = V² / R，电压微调翻倍时消耗功率会暴涨四倍，光柱也随之成倍飙升。',
        renderNarration: (p) => {
          const v = p.voltage ?? 9;
          const r = Math.max(1, p.resistance ?? 30);
          const power = (v * v) / r;
          return `当前灯丝电压 V = ${v.toFixed(1)} V、冷热态等效电阻 R = ${r.toFixed(0)} Ω，实耗电功率 P = V²/R = ${power.toFixed(2)} W。`;
        },
        camera: { position: [0.2, 2.3, 3.8], target: [0, 0.75, 0] },
      },
      {
        id: 'step-3',
        title: '串并联电路亮度的经典实验判据',
        narration: '将两只额定参数相同的灯泡分别接在串联和并联支路里，光亮对比即是最生动的分压分流演示。',
        camera: { position: [-3.1, 2.6, 3.6], target: [0, 0.75, 0] },
      },
    ],
  },

  FUSE: {
    type: 'FUSE',
    title: '快速熔断保险丝 (可恢复)',
    englishTitle: 'Fast-Blow Protection Fuse',
    badge: '过流熔断 · 安全防线',
    summary: '串联在供电干路上的安全守卫：正常电流下等效为极低内阻通道；一旦持续超过额定电流 I_max，内部低熔点合金丝发热熔断并彻底切断后级电路。',
    formulas: [
      { expr: 'I < I_rated ⇒ R ≈ 0.05 Ω (导通)', note: '正常状态压降极小' },
      { expr: 'I ≥ I_rated ⇒ 熔断断路 (R → ∞)', note: '阻断危险短路大电流，点击器件可一键更换新丝' },
    ],
    keyTakeaways: [
      '保险丝保护的不是它自己，而是后方昂贵的芯片、变压器与电源线路免于起火或炸裂。',
      '本实验台支持在保险丝熔断后直接点击器件或点击属性面板按钮更换恢复，无需重新接线！',
    ],
    controls: [
      { key: 'current', label: '实测负载电流 I', kind: 'slider', min: 0.2, max: 3.5, step: 0.1, unit: 'A', defaultValue: 0.9 },
      { key: 'rated', label: '额定熔断电流 I_max', kind: 'slider', min: 0.5, max: 2.5, step: 0.25, unit: 'A', defaultValue: 1.5 },
    ],
    callouts: [
      { id: 'tube', title: '透明玻璃防爆管', detail: '内部易熔合金丝状态一目了然', worldPos: [0, 0.78, 0], color: '#f87171' },
      { id: 'wire', title: '校准低熔点熔丝', detail: '焦耳热 I²Rt 达到临界点即瞬间汽化断开', worldPos: [-0.2, 0.62, 0.25], color: '#fbbf24' },
      { id: 'status', title: '通道畅通/熔断灯塔', detail: '绿光正常流通，红光警报切断', worldPos: [1.3, 0.85, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '以自我牺牲换取整套系统安全',
        narration: '试着把负载电流拉过额定阈值：熔丝中段因焦耳热率先发红熔断，断口产生电气绝缘间隙，立刻救下右侧后级负载。',
        renderNarration: (p) => {
          const cur = p.current ?? 0.9;
          const rated = p.rated ?? 1.5;
          const blown = cur >= rated;
          return blown
            ? `过流熔断告警！当前电流 I=${cur.toFixed(2)}A ≥ 额定门限 I_max=${rated.toFixed(2)}A，低熔点熔丝发热断裂彻底隔离后级电路。`
            : `安全导通运行中：当前电流 I=${cur.toFixed(2)}A < 额定门限 I_max=${rated.toFixed(2)}A，熔丝仅呈现几十毫欧极低阻抗。`;
        },
        camera: { position: [4.0, 2.9, 4.0], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '正常态的近乎零损耗导通',
        narration: '只要流经电流小于 I_trip 门槛，保险丝等效电阻仅数十毫欧，几乎不消耗额外压降或功率。',
        camera: { position: [0.1, 2.2, 3.9], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '故障排查后的一键复位恢复',
        narration: '实际排查消除短路负载故障后，在工作台点击已断开的保险丝或“恢复”按钮即可更换新熔丝重新通电。',
        camera: { position: [-3.2, 2.6, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  MUX_2_1: {
    type: 'MUX_2_1',
    title: '二选一数据选择器 (2:1 MUX)',
    englishTitle: '2-to-1 Digital Multiplexer',
    badge: '组合逻辑 · 数据路由',
    summary: '由选择控制线 SEL 决定把输入端口 A 还是输入端口 B 的二进制信号路由接通到公共输出端 Y 的开关枢纽。',
    analogyNote: '舞台“机械道岔路由臂”为【二选一数字通道切换原理类比】，等效于由与非门构成的组合数据选择器。',
    formulas: [
      { expr: 'Y = (¬SEL · A) + (SEL · B)', note: 'SEL=0 时 Y=A；SEL=1 时 Y=B' },
    ],
    keyTakeaways: [
      'MUX 是“通用组合逻辑实现器”：任何组合布尔函数都可以配合接常量 0/1 的多路选择器实现。',
      '广泛用于处理器总线多源切换、ALU 运算结果挑选以及并串转换。',
    ],
    controls: [
      { key: 'sel', label: '选择端 SEL', kind: 'toggle', defaultValue: 0, trueLabel: '1 (选通道 B)', falseLabel: '0 (选通道 A)' },
      { key: 'a', label: '通道 A 电平', kind: 'toggle', defaultValue: 1, trueLabel: '1', falseLabel: '0' },
      { key: 'b', label: '通道 B 电平', kind: 'toggle', defaultValue: 0, trueLabel: '1', falseLabel: '0' },
    ],
    callouts: [
      { id: 'inAB', title: '双路数据源 A / B', detail: '独立承载各自输入的数字信号', worldPos: [-1.25, 0.72, 0], color: '#38bdf8' },
      { id: 'switchArm', title: '道岔路由核心臂 [类比]', detail: '类比铁路道岔：依据 SEL 在 A/B 两条数据轨间转接', worldPos: [0, 0.88, 0], color: '#fbbf24', isAnalogy: true },
      { id: 'outY', title: '唯一复用输出端 Y', detail: '输出当前被选中的通路数据', worldPos: [1.3, 0.78, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '数字世界里的铁路道岔',
        narration: 'SEL 就像道岔扳手：扳向 0 位时只有 A 轨车流能驶向输出端 Y，B 轨被优雅屏蔽；扳向 1 位则立刻切通 B 轨。',
        renderNarration: (p) => {
          const sel = (p.sel ?? 0) >= 0.5 ? 1 : 0;
          const a = (p.a ?? 1) >= 0.5 ? 1 : 0;
          const b = (p.b ?? 0) >= 0.5 ? 1 : 0;
          const y = sel === 0 ? a : b;
          return `当前 SEL=${sel}（选通通道 ${sel === 0 ? 'A' : 'B'}）：A=${a}、B=${b}，故输出端 Y = ${y}。切换 SEL 可在两条输入数据轨间秒级换道。`;
        },
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '纯组合电路与与或非标准分解',
        narration: '内部由两路与门、一个反相器和输出或门组成，响应速度快且没有任何时序存储记忆。',
        camera: { position: [0.2, 2.3, 4.0], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '用多路选择器搭建任意布尔函数',
        narration: '把固定 0/1 接在 D0/D1 或将低位变量连入数据口，单个二选一芯片便可化身通用可编程逻辑单元。',
        camera: { position: [-3.3, 2.6, 3.7], target: [0, 0.65, 0] },
      },
    ],
  },

  JK_FF: {
    type: 'JK_FF',
    title: '全功能上升沿 JK 触发器',
    englishTitle: 'Positive-Edge Triggered JK Flip-Flop',
    badge: '时序存储 · 置位/复位/翻转',
    summary: '消除了 RS 触发器“禁止态”的终极万能触发器：当 J=K=1 时在每个时钟上升沿执行完美的状态翻转 (Toggle)，天然具备二分频能力！',
    formulas: [
      { expr: 'Q_next = J·¬Q + ¬K·Q  (于 CLK ↑ 沿采样)', note: '特征方程完整描述 4 种工作模式' },
      { expr: 'J=0,K=0 保持 | 0,1 置0 | 1,0 置1 | 1,1 翻转', note: '无禁态，二分频首选器件' },
    ],
    keyTakeaways: [
      '将 J 和 K 同时绑接高电平 1 时，输入频率为 f 的时钟将在输出 Q 端变成频率严格减半的 f/2 方波。',
      '几个 JK 触发器首尾相接即可直接组成异步二进制计数器或移位寄存器。',
    ],
    controls: [
      { key: 'j', label: '置位端 J', kind: 'toggle', defaultValue: 1, trueLabel: 'J = 1', falseLabel: 'J = 0' },
      { key: 'k', label: '复位端 K', kind: 'toggle', defaultValue: 1, trueLabel: 'K = 1', falseLabel: 'K = 0' },
      { key: 'clkRate', label: '时钟脉冲速度', kind: 'slider', min: 0.4, max: 2.0, step: 0.2, unit: 'Hz', defaultValue: 1.0 },
    ],
    callouts: [
      { id: 'jkIn', title: 'J / K 激励控制端口', detail: '共同决定下一个时钟沿的动作法则', worldPos: [-1.25, 0.72, 0], color: '#a855f7' },
      { id: 'latch', title: '时钟边缘采样门锁', detail: '仅在 0→1 上升瞬间开启写入窗口', worldPos: [0, 0.9, 0], color: '#fbbf24' },
      { id: 'qOut', title: '互补输出 Q / ¬Q', detail: 'J=K=1 时伴随节拍规律翻转', worldPos: [1.3, 0.85, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '消除禁态的优雅翻转模式',
        narration: '保持 J=1 与 K=1，观察 3D 台面左侧高速奔跑的时钟脉冲：每当上升沿抵达中央触发门，Q 与反相端 ¬Q 便铿锵互换角色！',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '置 1 / 清 0 / 保持全覆盖动作表',
        narration: '改变上方控制面板里的 J/K 电平开关，体会 J=1,K=0 强制置一、J=0,K=1 清零、全零保持锁存的完备功能。',
        renderNarration: (p) => {
          const j = (p.j ?? 1) >= 0.5 ? 1 : 0;
          const k = (p.k ?? 1) >= 0.5 ? 1 : 0;
          const mode =
            j === 1 && k === 1
              ? '翻转模式 (Q ← ¬Q，二分频)'
              : j === 1 && k === 0
              ? '强制置一模式 (Q ← 1)'
              : j === 0 && k === 1
              ? '强制复位模式 (Q ← 0)'
              : '保持记忆模式 (Q 不变)';
          return `当前输入 J=${j}, K=${k} → 工作在【${mode}】，时钟节奏为 ${(p.clkRate ?? 1.0).toFixed(1)} Hz。`;
        },
        camera: { position: [0.2, 2.3, 4.0], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '分频器与异步二进制计数器积木',
        narration: '将上一级输出 ¬Q 接入下一级时钟端，几个 JK 触发器串联就能轻而易举搭建出 2ⁿ 分频计数器。',
        camera: { position: [-3.3, 2.7, 3.7], target: [0, 0.65, 0] },
      },
    ],
  },

  COUNTER_4BIT: {
    type: 'COUNTER_4BIT',
    title: '四位二进制同步加法计数器',
    englishTitle: '4-Bit Binary Up Counter (0–15)',
    badge: '时序计数 · 二进制递增',
    summary: '内部集联四个触发器的 4 位同步时序芯片，在每个时钟上升沿累加步进 1，于 Q0–Q3 输出 0000 到 1111 的二进制编码（可配同步清零 CLR）。',
    formulas: [
      { expr: 'Count_next = (Count + 1) mod 16  (CLR=0, ↑CLK)', note: 'Q0 最低位频率=f/2，Q3 最高位频率=f/16' },
    ],
    keyTakeaways: [
      '四位输出恰好能够直接连接到本平台的 HEX_DISPLAY 七段数码管展示 0~F！',
      '低位每翻转两次引发高位进位一次，体现了二进制加权计数器的本质规律。',
    ],
    controls: [
      { key: 'speed', label: '计数时钟频率', kind: 'slider', min: 0.5, max: 3.0, step: 0.25, unit: 'Hz', defaultValue: 1.25 },
      { key: 'clr', label: '异步清零 CLR', kind: 'toggle', defaultValue: 0, trueLabel: 'CLR=1 归零锁定', falseLabel: 'CLR=0 正常计数' },
    ],
    callouts: [
      { id: 'clkRing', title: '同步时钟分配网', detail: '同时驱动 4 级触发器步调一致', worldPos: [-1.1, 0.72, 0], color: '#38bdf8' },
      { id: 'bits', title: '4 位二进制 LED 排柱', detail: '直观展示 Q3 Q2 Q1 Q0 二进制权重进位', worldPos: [0, 0.92, 0], color: '#a855f7' },
      { id: 'hexView', title: '伴随七段十六进制读数', detail: '实时译码出当前十/十六进制计数值', worldPos: [1.3, 0.95, 0], color: '#f43f5e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从方波节拍到有序二进制数列',
        narration: '观察中央 4 根二进制状态灯柱如何从 0000 有条不紊地逢二进一直至 1111，并可切换清零杆感受硬件复位瞬间归零。',
        renderNarration: (p) => {
          const clr = (p.clr ?? 0) >= 0.5 ? 1 : 0;
          const spd = p.speed ?? 1.25;
          return clr === 1
            ? '当前异步清零 CLR=1：计数器被强制复位归零，Q3..Q0 锁定在 0000（即使时钟继续跳变也不累加）。'
            : `当前处于正常递增计数态（CLR=0，时钟 ${spd.toFixed(2)} Hz）：每个上升沿将 4 位二进制值加 1（0000 → 1111 循环）。`;
        },
        camera: { position: [4.2, 3.1, 4.2], target: [0, 0.72, 0] },
      },
      {
        id: 'step-2',
        title: '各比特位的倍频周期规律',
        narration: 'Q0 每个节拍都翻转，而高位 Q3 需要等前三位全部归零才进位一次，相当于实现十六分频时序。',
        camera: { position: [0.2, 2.4, 4.1], target: [0, 0.72, 0] },
      },
      {
        id: 'step-3',
        title: '直连 HEX 七段数码管展示 0–F',
        narration: '在工作台把 Q3..Q0 分别连至 HEX_DISPLAY 四个数据端，即可搭建电子秒表或状态机步进指示。',
        camera: { position: [-3.4, 2.7, 3.8], target: [0, 0.72, 0] },
      },
    ],
  },

  CUSTOM_TRUTH_8: {
    type: 'CUSTOM_TRUTH_8',
    title: '8 槽自定义真值/逻辑芯片',
    englishTitle: '8-Pin Programmable Logic & Truth-Table IC',
    badge: '可编程阵列 · 8槽 DIP',
    summary: '拥有 8 个完全自由可编程槽位的 DIP-8 定制数字芯片：每个槽位均可独立指定功能方向 (IN / OUT / NC)、别名，并用真值表或布尔公式编程核心逻辑！',
    formulas: [
      { expr: 'OUT_k = F_bool(IN_0, IN_1, ... ) 或查真值表 LUT[addr]', note: '支持布尔运算符 AND(*), OR(+), XOR(^), NOT(!)' },
    ],
    keyTakeaways: [
      '相当于一块微型可编程逻辑器件 (PLD/GAL)：不需要拼接一大堆基础逻辑门也能快速搭建任意多输入组合功能块。',
      '支持在属性面板打开“真值芯片编程器”逐引脚调整方向并编写输出逻辑公式，修改即时生效！',
    ],
    controls: [
      { key: 'inA', label: '输入槽 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'inB', label: '输入槽 B', kind: 'toggle', defaultValue: 1, trueLabel: 'B = 1', falseLabel: 'B = 0' },
      { key: 'inC', label: '输入槽 C', kind: 'toggle', defaultValue: 0, trueLabel: 'C = 1', falseLabel: 'C = 0' },
    ],
    callouts: [
      { id: 'leftPins', title: '可编程引脚阵 (1-4)', detail: '可随时指派为输入端 IN、输出端 OUT 或空置 NC', worldPos: [-0.9, 0.48, 0], color: '#38bdf8' },
      { id: 'lutCore', title: '可编程真值查找矩阵', detail: '根据你编写的真值表或布尔公式秒级译码', worldPos: [0, 0.92, 0], color: '#a855f7' },
      { id: 'rightPins', title: '动态输出映射阵 (5-8)', detail: '即时以 5V/0V 电平对外驱动下级电路', worldPos: [0.95, 0.48, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '双列直插 8 槽自由定义',
        narration: '不同于功能死板的 74 系列固定芯片，你可以自由定义哪些引脚是接收信号、哪些是吐出真值结果的接口。',
        renderNarration: (p) => {
          const a = (p.inA ?? 1) >= 0.5 ? 1 : 0;
          const b = (p.inB ?? 1) >= 0.5 ? 1 : 0;
          const c = (p.inC ?? 0) >= 0.5 ? 1 : 0;
          return `当前可编程查找表输入状态：A=${a}, B=${b}, C=${c}；DIP-8 芯片根据所配置的布尔公式或 LUT 真值表即时映射输出电平。`;
        },
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '真值表 LUT 查表与公式双模式',
        narration: '既可以逐行翻转 0/1 勾选理想真值输出，也可以直接用括号与 ! * + ^ 运算符书写布尔表达式。',
        camera: { position: [0.2, 2.3, 4.0], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '动态网格与丝印实时重塑',
        narration: '在真值芯片编程器点击保存后，工作台中的 3D 双列封装体和 2D 原理图引脚都会立即重构并加入MNA混合求解。',
        camera: { position: [-3.2, 2.6, 3.7], target: [0, 0.6, 0] },
      },
    ],
  },

  CUSTOM_TRUTH_16: {
    type: 'CUSTOM_TRUTH_16',
    title: '16 槽自定义真值/译码芯片',
    englishTitle: '16-Pin Programmable Logic & Decoder IC',
    badge: '可编程阵列 · 16槽 DIP',
    summary: '拥有 16 个灵活槽位的大容量 DIP-16 可编程真值器件，轻松胜任 3-8 译码器、七段显示译码驱动器、四位比较器或复合多输出算术逻辑单元。',
    formulas: [
      { expr: 'OUT[m] = Evaluate(LUT / Expr, IN[0..n])  (共 16 引脚)', note: '支持多路输出并行映射与真值表自动补全' },
    ],
    keyTakeaways: [
      '最多支持多达十几路输入/输出自由分配，是简化复杂实验线路的超级压缩砖块。',
      '顶部与底部真值引擎协同工作：若无悬空未接线引脚，系统仍能为顶层电路导出精确真值表与卡诺图。',
    ],
    controls: [
      { key: 'inA', label: '输入 D2 (MSB)', kind: 'toggle', defaultValue: 1, trueLabel: '1', falseLabel: '0' },
      { key: 'inB', label: '输入 D1', kind: 'toggle', defaultValue: 0, trueLabel: '1', falseLabel: '0' },
      { key: 'inC', label: '输入 D0 (LSB)', kind: 'toggle', defaultValue: 1, trueLabel: '1', falseLabel: '0' },
    ],
    callouts: [
      { id: 'busIn', title: '多比特输入槽组', detail: '自由命名如 SEL0, D0..D3 等专业引脚名', worldPos: [-1.0, 0.55, 0], color: '#38bdf8' },
      { id: 'array16', title: '16 槽大规模交叉逻辑阵', detail: '内置多公式并行求解器', worldPos: [0, 0.95, 0], color: '#f59e0b' },
      { id: 'busOut', title: '多通道译码输出组', detail: '可同时点亮多个 LED 或七段显示器', worldPos: [1.05, 0.55, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '高密度多路输出封装',
        narration: '拨动输入位组时，内部的 16 通道交叉点阵列瞬间将地址译码到右侧输出引脚阵列，实现单颗芯片顶十颗分立门。',
        renderNarration: (p) => {
          const a = (p.inA ?? 1) >= 0.5 ? 1 : 0;
          const b = (p.inB ?? 0) >= 0.5 ? 1 : 0;
          const c = (p.inC ?? 1) >= 0.5 ? 1 : 0;
          const addr = (a << 2) | (b << 1) | c;
          return `当前输入地址编码 {D2,D1,D0} = ${a}${b}${c}₂（十进制 ${addr}）：交叉矩阵按此地址选通对应输出槽位。`;
        },
        camera: { position: [4.2, 3.1, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '内置 3-8 译码与总线选择预设',
        narration: '16 槽版本特别适合实现多路地址译码器、七段显示码表驱动以及带校验位的多路编码电路。',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '休眠 NC 空脚节省连线杂波',
        narration: '暂时不使用的引脚可标记为 NC，工作台将隐藏多余端口接脚，使原理图布线简洁整洁。',
        camera: { position: [-3.3, 2.7, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  IC_PORT_IN: {
    type: 'IC_PORT_IN',
    title: 'IC 封装输入接口端 (Port IN)',
    englishTitle: 'Custom IC Boundary Input Port',
    badge: '模块封装 · 外部引脚边界',
    summary: '专门用于在工作台中标记子电路的外部输入端口。当你执行“打包为集成电路芯片”时，每一个 IC_PORT_IN 都会化作芯片左侧一根对外引脚！',
    formulas: [
      { expr: 'V_internal(io) = V_external(pin_k)', note: '层次化展开引擎在仿真时将该接口与顶层外接线等效缝合' },
    ],
    keyTakeaways: [
      '独立运行子电路调试时，可点击该端口当作 0/1 激励源进行单步测试；一旦封装进云端芯片，它便成为真正的物理接插件接口。',
      '建议在属性面板为其取一个语义化的英文短名（如 CLK, A0, EN），封装出的芯片丝印会完美显示该名字！',
    ],
    controls: [
      { key: 'state', label: '独立调试电平', kind: 'toggle', defaultValue: 1, trueLabel: '注入 1 (+5V)', falseLabel: '注入 0 (0V)' },
    ],
    callouts: [
      { id: 'extFlange', title: '外部芯片金属接插脚', detail: '暴露在最终 IC 封装边缘的对外引脚', worldPos: [-1.05, 0.68, 0], color: '#38bdf8' },
      { id: 'portal', title: '层次化边界透传闸', detail: '仿真扁平化阶段实现内外电位零压差穿透', worldPos: [0, 0.78, 0], color: '#a855f7' },
      { id: 'inNode', title: '内部电路馈电点', detail: '接入子电路内部第一级模块', worldPos: [1.05, 0.68, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '划分“芯片内部”与“外部世界”',
        narration: '在画一条复杂加法器或译码器时，放入几个 IC 输入端口接在最前方，你就正式声明了未来的芯片需要几个对外输入针脚。',
        camera: { position: [3.9, 2.9, 3.9], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '未打包前的独立自检激励模式',
        narration: '封装之前不必额外接临时电源开关——直接点击该输入接口就能切换 0/1 测试电平调试子电路。',
        renderNarration: (p) => {
          const st = (p.state ?? 1) >= 0.5 ? 1 : 0;
          return `当前调试激励状态：${st === 1 ? 'LOGIC 1 (+5V 注入子电路)' : 'LOGIC 0 (0V 注入子电路)'}；打包封装后，此端口将转为芯片外部引脚。`;
        },
        camera: { position: [0.1, 2.2, 3.9], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '跨层级零压降电位无缝耦合',
        narration: '被打包进云端 Custom IC 后，每个输入接口都会变成外部顶层连线与内部支路直通的无缝边界锚点。',
        camera: { position: [-3.1, 2.6, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  IC_PORT_OUT: {
    type: 'IC_PORT_OUT',
    title: 'IC 封装输出接口端 (Port OUT)',
    englishTitle: 'Custom IC Boundary Output Port',
    badge: '模块封装 · 结果导出引脚',
    summary: '专门用于在子电路内部末端标记对外输出结果。执行“打包封装为集成电路”时，每枚 IC_PORT_OUT 都会变成新建自定义 IC 右侧的正式输出引脚。',
    formulas: [
      { expr: 'V_external(out_k) = V_internal(io)', note: '支持模拟电压与数字布尔逻辑的双向连续透传' },
    ],
    keyTakeaways: [
      '在开发调试阶段兼任状态指示灯功能，让你不必打包就能验证子电路末尾波形是否准确。',
      '如果你尚未放置专用端口，打包向导也会贴心地自动识别并转换工作台上的普通 LOGIC_IN / LOGIC_OUT。',
    ],
    controls: [
      { key: 'drive', label: '内部驱动信号', kind: 'toggle', defaultValue: 1, trueLabel: '高电平输出 (5V)', falseLabel: '低电平输出 (0V)' },
    ],
    callouts: [
      { id: 'coreIn', title: '子电路结果汇流端', detail: '接收封装内部运算的最终电气状态', worldPos: [-1.05, 0.68, 0], color: '#fbbf24' },
      { id: 'beacon', title: '封装透传指示灯', detail: '可视化实时指示引脚输出活性', worldPos: [0, 0.9, 0], color: '#22c55e' },
      { id: 'icPin', title: '芯片右侧输出金手指', detail: '供顶层其它集成块继续级联引线', worldPos: [1.1, 0.68, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '把局部作品导出成标准积木',
        narration: '经过边界封装端口的包装，内部再庞杂的十几个元器件也会凝聚成一颗整洁有序的芯片右侧引出针。',
        camera: { position: [3.9, 2.9, 3.9], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '内部调试时的输出指示探针',
        narration: '单板开发时顶部绿光灯柱直观映射当前端口逻辑电平与节点电压，便于逐点排障验收。',
        renderNarration: (p) => {
          const d = (p.drive ?? 1) >= 0.5 ? 1 : 0;
          return `当前内部子电路驱动信号为 ${d === 1 ? 'HIGH (5.0V)' : 'LOW (0.0V)'}，芯片外围对应的镀金输出脚随之输出同等电位。`;
        },
        camera: { position: [0.1, 2.2, 3.9], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '支持模数混合节点电位无损穿透',
        narration: '不仅传递数字 0/1 状态，连接放大器、稳压管或纯电阻网络时的精确模拟电压亦能穿过引脚向外部传送。',
        camera: { position: [-3.1, 2.6, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  CUSTOM_IC: {
    type: 'CUSTOM_IC',
    title: '自定义云端集成电路 (Custom IC)',
    englishTitle: 'Hierarchical User-Packaged Integrated Circuit',
    badge: '模块化封装 · 云端资产',
    summary: '将你亲手搭建的任意模电或数电工作台拓扑压缩为一颗独立可复用的集成块！不仅内部真实子电路参与 MNA 与真值表求解，还可永久存入你的云端账号随时调用。',
    formulas: [
      { expr: 'TopCircuit ∪ Flatten(IC_subcircuit) ⇒ MNA_Matrix', note: '真正物理级层次展开仿真，非虚假黑盒查表' },
    ],
    keyTakeaways: [
      '芯片与芯片之间还能继续嵌套封装——就像真实 CPU 也是由门电路→加法器→ALU→核心层层模块化堆叠而成！',
      '登录个人账号后点击“打包为云端 IC”，哪怕换一台浏览器登录也能直接在元件库召回你收藏的黄金芯片模块。',
    ],
    controls: [
      { key: 'inspectLayer', label: '透视芯片内部拓扑', kind: 'toggle', defaultValue: 1, trueLabel: '透视半透明封装内部', falseLabel: '黑盒环氧树脂外壳' },
      { key: 'clockPulse', label: '芯片内部工作心跳', kind: 'slider', min: 0.4, max: 2.5, step: 0.1, unit: 'Hz', defaultValue: 1.2 },
    ],
    callouts: [
      { id: 'shell', title: '云端可透视环氧封装', detail: '内部完整保留子电路器件列表与内部连线网表', worldPos: [0, 1.1, 0], color: '#38bdf8' },
      { id: 'subGates', title: '晶圆级子拓扑内核', detail: '支持嵌套调用 4 层深度的微缩实体网表', worldPos: [0, 0.48, 0], color: '#f59e0b' },
      { id: 'goldPins', title: '自动排版镀金 DIP 针脚', detail: '精准映射你定义的输入与输出端口名称', worldPos: [1.15, 0.42, 0], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“封装与抽象”是现代工程的核心魔法',
        narration: '透视外壳内部可以看到缩微的一组子元器件。每次仿真都会在内存中自动将其无损展开并与顶层线路联合求解。',
        camera: { position: [4.2, 3.2, 4.2], target: [0, 0.72, 0] },
      },
      {
        id: 'step-2',
        title: '永久保存至云端个人芯片库',
        narration: '打包好的集成块会同步到你的云端数据库账号中，在侧边元件库的“自定义”分类里随时拖出无限颗相同芯片拼装超级系统！',
        camera: { position: [0.3, 2.3, 4.2], target: [0, 0.72, 0] },
      },
      {
        id: 'step-3',
        title: '支持 4 层深度模块化套娃级联',
        narration: '你可以用自己封装的半加器芯片搭出全加器芯片，再封装成 4 位加法器与 ALU——真实还原现代芯片工程设计流。',
        camera: { position: [-3.4, 2.8, 3.9], target: [0, 0.72, 0] },
      },
    ],
  },

  TIMER_555: {
    type: 'TIMER_555',
    title: 'NE555 时基集成定时器',
    englishTitle: '555 Precision Timer (Window Comparators + RS Latch)',
    badge: '模数混合经典 · 多谐/单稳/施密特',
    summary: '芯片内部用三颗精确 5kΩ 电阻把 VCC 分为 1/3 和 2/3 两档基准门限，驱动上下双比较器与 RS 触发器，从而用外部一只电容与两枚电阻自发振荡出精准方波脉冲！',
    formulas: [
      { expr: 'V_hi = (2/3)·Vcc ，当 THRES > V_hi 时复位 Q = 0（OUT=0，DIS 导通放电）', note: '上限比较器决定充电何时截断' },
      { expr: 'V_lo = (1/3)·Vcc ，当 TRIG < V_lo 时置位 Q = 1（OUT=VCC，DIS 截止充电）', note: '下限比较器决定放电何时反转' },
      { expr: '多谐振荡频率 f ≈ 1.44 / [(R₁ + 2R₂)·C]，周期 T ≈ 0.693(R₁ + 2R₂)C', note: '充电耗时 tH=0.693(R1+R2)C，放电耗时 tL=0.693R2·C' },
    ],
    keyTakeaways: [
      '把 TRIG 与 THRES 并联后接外电容：当电压在 1/3 Vcc 与 2/3 Vcc 之间来回摆动，无需外部时钟就能自激产生连续方波脉冲！',
      '因为门限精确跟踪 VCC 的比例（1/3 与 2/3），只要电源在同一范围线性缩放，RC 充放电定时周期几乎与 VCC 无关，抗电源波动能力极强。',
      '若令 R₁ = 10kΩ、R₂ = 10kΩ、C = 10μF，则周期间隔约 208ms（约 4.8Hz，占空比约 66.7%）。',
    ],
    controls: [
      { key: 'vcc', label: '供电电压 VCC', kind: 'slider', min: 3, max: 15, step: 0.5, unit: 'V', defaultValue: 5 },
      { key: 'rKohm', label: '定时电阻 (R₁=R₂)', kind: 'slider', min: 1, max: 50, step: 1, unit: 'kΩ', defaultValue: 10 },
      { key: 'cUf', label: '定时电容 C', kind: 'slider', min: 1, max: 100, step: 1, unit: 'μF', defaultValue: 10 },
    ],
    callouts: [
      { id: 'ladder', title: '内部 3×5kΩ 分压梯', detail: '将 VCC 精准切成 1/3 Vcc 与 2/3 Vcc 两档参考电平', worldPos: [-1.1, 0.72, -0.35], color: '#f59e0b' },
      { id: 'rsCore', title: 'RS 触发器与双比较器核', detail: '电容触及上下限窗口边界时瞬时翻转锁存状态', worldPos: [0, 0.75, 0], color: '#38bdf8' },
      { id: 'disStage', title: '集电极开路放电管 DIS', detail: 'Q=0 时对地导通泄放电容电荷，Q=1 时高阻关断', worldPos: [0.35, 0.48, -0.65], color: '#fb7185' },
      { id: 'outPin', title: '推挽方波输出级 OUT', detail: '直接驱动 LED、扬声器或四位计数器时钟', worldPos: [1.35, 0.9, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '三颗 5kΩ 电阻奠定“双门限窗口”',
        narration: '内部 5kΩ+5kΩ+5kΩ 串联分压梯为双比较器建立绝对比例基准，电容电压只需在中间窗口往返跑圈即可。',
        renderNarration: (p) => {
          const vcc = p.vcc ?? 5;
          return `当前 VCC = ${vcc.toFixed(1)} V 时，内部三个 5kΩ 电阻立即可得下限 V_lo = 1/3 VCC = ${(vcc / 3).toFixed(2)} V、上限 V_hi = 2/3 VCC = ${((2 * vcc) / 3).toFixed(2)} V。`;
        },
        camera: { position: [4.1, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '充到 2/3 Vcc 就放气，放到 1/3 Vcc 又充气',
        narration: '观察左侧电容水位柱在两根黄铜门限环之间锯齿状起伏，每次撞线瞬间触发器立刻变色切换！',
        renderNarration: (p) => {
          const r = (p.rKohm ?? 10) * 1e3;
          const c = (p.cUf ?? 10) * 1e-6;
          const tMs = 0.693 * 3 * r * c * 1000;
          const freq = 1000 / Math.max(0.1, tMs);
          return `取 R₁ = R₂ = ${(r / 1000).toFixed(0)} kΩ、C = ${(c * 1e6).toFixed(0)} μF：单周期 T = 0.693×(R₁+2R₂)C ≈ ${tMs.toFixed(1)} ms，振荡频率 f ≈ ${freq.toFixed(2)} Hz（高电平占空比 66.7%）。`;
        },
        camera: { position: [0.1, 2.3, 4.4], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '从模拟定时桥接到数字计数体系',
        narration: 'OUT 端干脆利落的 0V/VCC 脉冲可以直接接入 D 触发器或四位计数器 CLK 脚，打通模拟时钟与数字时序电路！',
        camera: { position: [-3.5, 2.8, 3.9], target: [0, 0.65, 0] },
      },
    ],
  },

  NIXIE_TUBE: {
    type: 'NIXIE_TUBE',
    title: '复古辉光数码管 (IN-14 Nixie Tube)',
    englishTitle: 'Cold-Cathode Neon Nixie Display Tube',
    badge: '辉光放电显示 · 0–9/A–F',
    summary: '在低压惰性氖氩混气玻璃泡内层叠 10~16 片独立金属丝字符阴极，利用辉光放电让当前选通字符泛出温暖明亮的霓虹橙光，不依赖分段拼接！',
    formulas: [
      { expr: 'Val = 8·D₃ + 4·D₂ + 2·D₁ + D₀  (0 ~ 15)', note: '四位二进制加权输入直接译码选通对应发光字符' },
      { expr: '辉光启辉压降 V_glow ≈ 140V~170V（本平台集成内置升压驱动）', note: '只有选中阴极产生橙红电离辉光鞘层' },
    ],
    keyTakeaways: [
      '与七段数码管“拼凑笔画”不同，辉光管每层阴极都是完整冲压成形的独立立体金属丝字形。',
      '因为数字片在管内有前后景深排序，数字跳变时会呈现出独特的空间纵深悬浮感。',
      '开启“十进制 BCD 消隐”后，输入 10~15 会自动熄灯保护或作为溢出空白提示。',
    ],
    controls: [
      { key: 'digit', label: '显示数字码 D₃..D₀', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 8 },
      { key: 'bcdBlank', label: 'BCD >9 消隐', kind: 'toggle', defaultValue: 0 },
    ],
    callouts: [
      { id: 'cathodes', title: '层叠数字阴极丝阵', detail: '深度方向依次排列的独立金属字形阴极，选中层激发橙红等离子辉光', worldPos: [0, 0.95, 0.15], color: '#ff7b24' },
      { id: 'anode', title: '蜂巢金属阳极笼', detail: '透明蜂巢网栅包围阴极形成均匀电场，保障视觉通透性', worldPos: [-0.55, 1.05, 0], color: '#f59e0b' },
      { id: 'socket', title: '瓷座与 4 线驱动基座', detail: '集成二进制译码逻辑，直接以 5V TTL 电平点亮对应字极', worldPos: [0, 0.25, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '层叠独立的冷阴极金属字模',
        narration: '透过玻壳与黄铜蜂巢网栅，你可以看到前后排列的 10 个数字阴极丝：每一次只需给其中一个字符供电即可整字发光。',
        renderNarration: (p) => {
          const val = Math.round(p.digit ?? 8) & 15;
          const blank = (p.bcdBlank ?? 0) >= 0.5 && val > 9;
          return `当前输入二进制 0b${val.toString(2).padStart(4, '0')}（十进制 ${val}）：${
            blank ? '已开启 BCD 消隐，数值 >9 时阴极断电熄灭。' : `第 “${val.toString(16).toUpperCase()}” 号金属阴极丝包裹满暖橙色氖气辉光鞘层！`
          }`;
        },
        camera: { position: [0.3, 2.35, 3.8], target: [0, 0.9, 0] },
      },
      {
        id: 'step-2',
        title: '内置译码驱动：无缝接入 4 位总线',
        narration: '工作台里的辉光数码管内置高压阴极驱动矩阵，直接把计数器、编码器、寄存器或 RAM 的 Q3..Q0 接上来即可即时显像。',
        camera: { position: [3.9, 2.6, 3.6], target: [0, 0.85, 0] },
      },
      {
        id: 'step-3',
        title: '与编码器、CPU 累加器的实战联调',
        narration: '搭配两枚辉光管分别监视存储器指令内容 (NIX_MEM) 与累加器结果 (NIX_ACC)，就能亲手点亮一台硬核蒸汽朋克 4 位计算机！',
        camera: { position: [-3.6, 2.5, 3.5], target: [0, 0.85, 0] },
      },
    ],
  },

  ENCODER_4_2: {
    type: 'ENCODER_4_2',
    title: '4线-2线优先编码器 (Priority Encoder)',
    englishTitle: '4-to-2 Line Priority Binary Encoder',
    badge: '组合压缩 · 仲裁优先级',
    summary: '将 4 路互斥或同时到达的高电平请求 (I₃..I₀) 实时压缩为 2 位二进制索引 (Y₁Y₀)，当多路同时按下时仅响应优先级最高的有效位！',
    formulas: [
      { expr: 'Y₁ = I₃ + I₂ ， Y₀ = I₃ + I₂\'·I₁', note: '优先级顺序：I₃ > I₂ > I₁ > I₀（高位遮蔽低位）' },
      { expr: 'GS = I₃ + I₂ + I₁ + I₀', note: '群选/有效信号：区分“真正按下了 I₀(00)”与“毫无按键(00)”' },
    ],
    keyTakeaways: [
      '普通编码器在两个按键同时按下时会输出错误码字，而优先编码器通过门控“屏蔽链”保证高位必胜。',
      'GS (Group Select) 标志位极其关键：GS=0 表示全部输入空闲，此时 Y₁Y₀=00 不可当成有效按键 0 号。',
      '广泛用于键盘扫描编码、微处理器中断优先级仲裁 (IRQ0~IRQ3) 等场合。',
    ],
    controls: [
      { key: 'i3', label: '最高优先 I₃ (11)', kind: 'toggle', defaultValue: 0 },
      { key: 'i2', label: '次高优先 I₂ (10)', kind: 'toggle', defaultValue: 1 },
      { key: 'i1', label: '第三优先 I₁ (01)', kind: 'toggle', defaultValue: 0 },
      { key: 'i0', label: '最低优先 I₀ (00)', kind: 'toggle', defaultValue: 1 },
    ],
    callouts: [
      { id: 'lanes', title: '4 路请求轨道 I₃..I₀', detail: '高位激活时会物理抬起优先级挡板阻断低位通道', worldPos: [-1.2, 0.65, 0], color: '#ec4899' },
      { id: 'arbiter', title: '优先级仲裁栅栏', detail: '确保每次至多有一个最高优先级通道进入编码矩阵', worldPos: [0, 0.72, 0], color: '#fbbf24' },
      { id: 'out', title: '2 位编码与 GS 有效灯', detail: '输出二进制 Y₁Y₀ 及 GS 有效状态', worldPos: [1.3, 0.72, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从多选一请求到紧凑二进制编号',
        narration: '4 根独立信号线只需要 2 根二进制地址线就能传完索引值，线缆数量直接减半，还送你 1 根 GS 有效确认灯。',
        camera: { position: [4.0, 2.9, 4.0], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '高位优先仲裁：当 I₂ 与 I₀ 同时为 1',
        narration: '拨动控制面板上的多个输入拨杆：即便 I₀ 与 I₁ 同时打开，只要更高的 I₂ 或 I₃ 为 1，低位信号立刻被黄色仲裁闸门遮蔽！',
        renderNarration: (p) => {
          const i3 = (p.i3 ?? 0) >= 0.5 ? 1 : 0;
          const i2 = (p.i2 ?? 0) >= 0.5 ? 1 : 0;
          const i1 = (p.i1 ?? 0) >= 0.5 ? 1 : 0;
          const i0 = (p.i0 ?? 0) >= 0.5 ? 1 : 0;
          const gs = i3 || i2 || i1 || i0 ? 1 : 0;
          const y1 = i3 || i2 ? 1 : 0;
          const y0 = i3 || (!i2 && i1) ? 1 : 0;
          const win = i3 ? 'I₃' : i2 ? 'I₂' : i1 ? 'I₁' : i0 ? 'I₀' : '无有效输入';
          return `当前输入 I₃..I₀ = ${i3}${i2}${i1}${i0}：最高优先级命中 【${win}】，编码输出 Y₁Y₀ = ${y1}${y0}，有效指示 GS = ${gs}。`;
        },
        camera: { position: [0.2, 2.4, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '编码器 + 辉光管 / 译码器联动',
        narration: '把编码器的 Y₁Y₀ 接到辉光管或 2-4 译码器，即可直观验证“输入仲裁 -> 压缩编码 -> 还原选通”完整信息流！',
        camera: { position: [-3.5, 2.7, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  DECODER_2_4: {
    type: 'DECODER_2_4',
    title: '2线-4线地址译码器 (2-to-4 Decoder)',
    englishTitle: '2-to-4 One-Hot Address Decoder',
    badge: '地址译码 · 独热选通',
    summary: '编码器的逆过程：把 2 位二进制地址 A₁A₀ 精准翻译为 4 路互斥“独热码 (One-Hot)”通道中唯一亮起的芯片使能信号！',
    formulas: [
      { expr: 'Y_k = (INH == 0) · [A₁A₀ == k]  (k ∈ {0,1,2,3})', note: '同一时刻至多只有 1 路输出端拉高为 5V' },
      { expr: 'INH = 1 ⇒ Y₃ = Y₂ = Y₁ = Y₀ = 0', note: '禁止端悬空默认读作 0（始终使能），拉高立即全关断' },
    ],
    keyTakeaways: [
      '译码器是计算机访存与端口寻址的心脏——只要给定地址编码，就能唯一选中外设或内存体。',
      '在本平台中特意设计为高电平禁止端 INH（悬空自动导通），新手只需接 A₁、A₀ 两根线就能点亮！',
      '与 4 路信号灯搭配可以直观验证二进制数 00→Y0、01→Y1、10→Y2、11→Y3 的一一对应。',
    ],
    controls: [
      { key: 'a1', label: '地址高位 A₁ (×2)', kind: 'toggle', defaultValue: 1 },
      { key: 'a0', label: '地址低位 A₀ (×1)', kind: 'toggle', defaultValue: 0 },
      { key: 'inh', label: '禁止门控 INH', kind: 'toggle', defaultValue: 0 },
    ],
    callouts: [
      { id: 'addr', title: '2 位二进制地址总线', detail: 'A₁A₀ 组合形成 4 种离散地址状态', worldPos: [-1.15, 0.68, 0], color: '#14b8a6' },
      { id: 'rotor', title: '机械类比选通转针', detail: '地址切换时转动拨针精准对准目标分支轨道', worldPos: [0, 0.72, 0], color: '#fbbf24' },
      { id: 'outputs', title: 'Y₀..Y₃ 独热输出塔', detail: '被选中的唯一灯塔亮起 5V 高电平', worldPos: [1.35, 0.78, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从紧凑编码“展开”到唯一控制线',
        narration: '计算机只用 2 根地址线就能控制 4 台互不干扰的设备，译码器就像铁路道岔把单束指令精准导流到目标站台。',
        renderNarration: (p) => {
          const inh = (p.inh ?? 0) >= 0.5 ? 1 : 0;
          const a1 = (p.a1 ?? 0) >= 0.5 ? 1 : 0;
          const a0 = (p.a0 ?? 0) >= 0.5 ? 1 : 0;
          const idx = (a1 << 1) | a0;
          return inh
            ? `禁止端 INH = 1（片选禁用）：无论地址 A₁A₀ = ${a1}${a0}（索引 ${idx}）为何值，4 路输出全部锁定为 0V！`
            : `当前地址 A₁A₀ = ${a1}${a0}（十进制 ${idx}），INH = 0：唯一选通输出通道 Y${idx} = 1 (5V)，其余三路全为 0V！`;
        },
        camera: { position: [4.0, 2.9, 4.0], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '用 INH 禁止端实现片选级联扩展',
        narration: '把 INH 当作“总闸”：多片 2-4 译码器通过 INH 互联，就能拼成 3-8 译码器或控制大容量寄存器阵列！',
        camera: { position: [0.2, 2.35, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '构建硬件指令译码器 (Instruction Decoder)',
        narration: '在 CPU 中，将操作码送入译码器，其 Y0..Y3 输出即可直接充当 ALU 写入、寄存器锁存与跳转分支的控制线！',
        camera: { position: [-3.4, 2.75, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  MUX_4BIT: {
    type: 'MUX_4BIT',
    title: '4位二选一总线选择器 (4-Bit 2:1 Bus MUX)',
    englishTitle: '4-Bit Dual-Bus Multiplexer',
    badge: '数据通路切换 · 条件分支骨架',
    summary: '用单根选择控制线 SEL 同步切换整组 4 位并行数据总线 (A[3:0] vs B[3:0])，让 CPU 能在“顺序写回”与“跳转地址/加载常数”之间瞬间改道！',
    formulas: [
      { expr: 'Y[3:0] = (SEL == 0) ? A[3:0] : B[3:0]', note: '4 路同步选通开关共享同一根 SEL 指令线' },
      { expr: '可充当写回数据源切换或条件跳转目标选择器', note: 'ZERO 标志接入 SEL 即完成 JZ 条件分支！' },
    ],
    keyTakeaways: [
      '搭建 4 位计算机时，用 4 颗单路 MUX_2_1 会拖出密密麻麻 16 根杂乱飞线；4 位总线选择器一芯片搞定整条半字节总线。',
      '当 ALU 的 ZERO 标志接入 SEL，即可在“顺序下一条 (A)”与“分支目标 (B)”之间自动择路，这是实现图灵完备分支跳跃的钥匙！',
    ],
    controls: [
      { key: 'valA', label: 'A 总线数值 A[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 5 },
      { key: 'valB', label: 'B 总线数值 B[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 12 },
      { key: 'sel', label: '通道选择 SEL (0=A / 1=B)', kind: 'toggle', defaultValue: 0 },
    ],
    callouts: [
      { id: 'busA', title: 'A[3:0] 四线并行输入槽', detail: 'SEL=0 时全体直通输出端 Y[3:0]', worldPos: [-1.15, 0.8, -0.5], color: '#38bdf8' },
      { id: 'busB', title: 'B[3:0] 备选输入总线', detail: 'SEL=1 时瞬间接管全部 4 条出线', worldPos: [-1.15, 0.55, 0.5], color: '#a855f7' },
      { id: 'bar', title: '四极同步道岔联动杆', detail: '机械类比 SEL 如何同步推动四位高速电子开关', worldPos: [0, 0.85, 0], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '一条总线，四位并行同步切换',
        narration: '观察紫色四极联动横杆如何在红色 A 总线与蓝色 B 总线之间整体滑移：四根信号线绝不会出现“某一位没跟上”的撕裂现象。',
        renderNarration: (p) => {
          const a = Math.round(p.valA ?? 5) & 15;
          const b = Math.round(p.valB ?? 12) & 15;
          const sel = (p.sel ?? 0) >= 0.5 ? 1 : 0;
          const y = sel ? b : a;
          return `当前 SEL = ${sel}：${sel ? 'B 总线获胜并切入通道' : 'A 总线获胜并切入通道'} — A=${a} (0x${a.toString(16).toUpperCase()}), B=${b} (0x${b.toString(16).toUpperCase()}) ⇒ 输出 Y[3:0] = ${y} (0b${y.toString(2).padStart(4, '0')})。`;
        },
        camera: { position: [4.1, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: 'CPU 中的写回源选择 (Write-Back MUX)',
        narration: 'A 路接入 ALU 运算结果，B 路接入 RAM 刚读出的新数据；只需拨一下 SEL，寄存器就知道该存算术结果还是加载常数。',
        camera: { position: [0.3, 2.3, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '配合状态标志实现图灵完备条件跳转',
        narration: '将 ALU 的 ZERO 或 COUT 旗标直接连入 MUX_4BIT 的 SEL：零结果就跳转，非零继续执行——图灵机“条件分支”跃然桌上！',
        camera: { position: [-3.5, 2.8, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  REGISTER_4BIT: {
    type: 'REGISTER_4BIT',
    title: '4位并行数据寄存器 (4-Bit Parallel Register)',
    englishTitle: '4-Bit Synchronous Register with WE & RST',
    badge: '图灵核心 · 累加器 ACC / PC',
    summary: '将 4 枚上升沿 D 触发器打包在同一组控制总线之下：当写使能 WE=1 且 CLK 上升沿到来时同步锁存 4 位新状态，构成计算机的累加器或通用寄存器！',
    formulas: [
      { expr: 'RST = 1 ⇒ Q[3:0] ← 0000（异步立即清零）', note: '最高优先复位指令，开机归零' },
      { expr: 'CLK↑ 且 WE = 1 ⇒ Q[3:0] ← D[3:0] ； WE = 0 ⇒ 保持原值', note: '写使能防止无效时钟脉冲冲毁旧数据！' },
    ],
    keyTakeaways: [
      '普通 D 触发器每个时钟都要被迫刷新一次，而真正可用的 CPU 寄存器必须具备 WE (Write Enable) 锁存门控才能长久保存中间计算结果。',
      '将 ACC 寄存器输出接回 ALU 的 A 输入端，再用 ALU 结果接回 ACC 的 D 输入端，就构成了经典计算机的“读-改-写”累加闭环！',
    ],
    controls: [
      { key: 'dVal', label: '待写入数据 D[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 9 },
      { key: 'we', label: '写使能 WE (允许写入)', kind: 'toggle', defaultValue: 1 },
      { key: 'rst', label: '异步复位 RST', kind: 'toggle', defaultValue: 0 },
    ],
    callouts: [
      { id: 'bus', title: '4 位输入数据总线 D[3:0]', detail: '上升沿尚未到来前仅在门外候命', worldPos: [-1.15, 0.65, 0], color: '#38bdf8' },
      { id: 'weGate', title: 'WE 写使能闸门 + CLK 撞锤', detail: '必须 WE=1 且 CLK 触发上升沿才会把 D 打入右侧储格', worldPos: [0, 0.9, 0.45], color: '#fbbf24' },
      { id: 'cells', title: '4 枚同步记忆柱 Q₃..Q₀', detail: '稳稳保持当前二进制半字节状态直至下次授权写入', worldPos: [1.1, 0.82, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '为什么图灵机需要受控的状态记忆？',
        narration: '图灵完备系统必须能在有限控制状态下稳妥保存、有条件地覆写当前数据状态。WE=0 时无论时钟怎样跳动，已存入的 4 个比特都纹丝不动！',
        renderNarration: (p) => {
          const d = Math.round(p.dVal ?? 9) & 15;
          const we = (p.we ?? 1) >= 0.5;
          const rst = (p.rst ?? 0) >= 0.5;
          if (rst) return 'RST = 1：异步清零信号激活，4 枚记忆柱瞬间归 0000，无视时钟与 WE 状态！';
          return `待写输入 D = ${d} (0b${d.toString(2).padStart(4, '0')})，写使能 WE = ${we ? '1 (闸门开启，每拍 CLK↑ 更新锁存)' : '0 (写保护锁死，记忆保持不变)'}。`;
        },
        camera: { position: [4.1, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '同步采样与反馈防竞争',
        narration: '因为四位同时在 CLK 边沿采样上一拍稳态输出，即便把 Q 直接经过 ALU 加法器折返连到 D 端，也不会在同一时钟拍内无限自激累加！',
        camera: { position: [0.1, 2.35, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '工作台接线提示：记得使能 WE！',
        narration: 'WE 引脚悬空默认读作 0（保护态）——在工作台让寄存器跟随节拍工作时，别忘了把 LOGIC_IN(1) 或译码器写入信号接到 WE！',
        camera: { position: [-3.5, 2.8, 3.8], target: [0, 0.65, 0] },
      },
    ],
  },

  ALU_4BIT: {
    type: 'ALU_4BIT',
    title: '4位算术逻辑单元 (4-Bit ALU)',
    englishTitle: '4-Bit Arithmetic & Logic Unit with Carry/Zero Flags',
    badge: '图灵运算心脏 · 算逻+标志位',
    summary: '现代 CPU 最核心的组合计算发动机！根据 2 位操作码 OP[1:0] 对两组 4 位操作数 A、B 执行加/减/与/异或运算，并输出进位 COUT 与条件判零标志 ZERO！',
    formulas: [
      { expr: '00: ADD (A+B)  |  01: SUB (A-B)  |  10: AND (A&B)  |  11: XOR (A^B)', note: '算术与布尔逻辑二合一（模 16 截断至 F[3:0]）' },
      { expr: 'ZERO = (F[3:0] == 0000) ? 1 : 0', note: '零标志位正是构造“相等判断 (A==B)”与条件分支的灵魂！' },
    ],
    keyTakeaways: [
      '只有组合计算还算不上“可编程图灵机”，ALU 输出 ZERO（在 SUB 模式下等效判别 A == B）才是让程序产生智能决策分支的基础。',
      'ADD 模式下 COUT 表示无符号溢出进位；SUB 模式下 COUT=1 表示无借位（即 A ≥ B），用于大小比较 (< / ≥)。',
    ],
    controls: [
      { key: 'valA', label: '操作数 A[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 6 },
      { key: 'valB', label: '操作数 B[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 6 },
      { key: 'op', label: '操作码 OP (0:ADD 1:SUB 2:AND 3:XOR)', kind: 'slider', min: 0, max: 3, step: 1, unit: '', defaultValue: 1 },
    ],
    callouts: [
      { id: 'ops', title: '双 4 位数据输入栈 A / B', detail: 'A 接累加器，B 接内存数据或立即数', worldPos: [-1.25, 0.72, 0], color: '#38bdf8' },
      { id: 'core', title: '可编程功能矩阵核 (OP1, OP0)', detail: '实时在行波进位加法、补码减法、按位逻辑门阵间切换', worldPos: [0, 0.85, 0], color: '#f59e0b' },
      { id: 'flags', title: 'COUT 进位与 ZERO 判零信标', detail: '标志位送入控制器实现 JZ / JC 分支跳转', worldPos: [1.3, 0.95, 0.45], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '算术运算与布尔逻辑融合在同一矩阵',
        narration: '观察左右操作数柱如何汇聚到黄金 ALU 核心并点亮右侧 4 位输出 F[3:0]；拖动 OP 滑块即可在 4 种指令间瞬时切换。',
        renderNarration: (p) => {
          const a = Math.round(p.valA ?? 6) & 15;
          const b = Math.round(p.valB ?? 6) & 15;
          const op = Math.round(p.op ?? 1) & 3;
          const names = ['ADD (A+B)', 'SUB (A-B)', 'AND (A&B)', 'XOR (A^B)'];
          const raw = op === 0 ? a + b : op === 1 ? a - b : op === 2 ? a & b : a ^ b;
          const f = raw & 15;
          const cout = op === 0 ? (raw > 15 ? 1 : 0) : op === 1 ? (a >= b ? 1 : 0) : 0;
          const zero = f === 0 ? 1 : 0;
          return `当前指令 OP=${op.toString(2).padStart(2, '0')} [${names[op]}]：A=${a} (0x${a.toString(16).toUpperCase()})、B=${b} (0x${b.toString(16).toUpperCase()}) ⇒ F = ${f} (0x${f.toString(16).toUpperCase()})，COUT = ${cout}，ZERO = ${zero}${zero ? '（零标志亮起！）' : ''}。`;
        },
        camera: { position: [4.2, 3.0, 4.1], target: [0, 0.68, 0] },
      },
      {
        id: 'step-2',
        title: 'SUB 减法如何变成条件判等与比较器？',
        narration: '试试把 A 和 B 都设成相同值并切到 OP=1 (SUB)：A - B = 0，ZERO 金灯立刻亮起！这正是所有 CPU BEQ / JZ 比较指令的物理真相。',
        camera: { position: [0.3, 2.35, 4.4], target: [0, 0.68, 0] },
      },
      {
        id: 'step-3',
        title: '打造图灵完备“计算-分支”闭环',
        narration: '将 ALU + 4位寄存器 + 16×4 RAM + MUX_4BIT + 计数器连接成数据通路，再把 F 接到辉光管，即可亲眼见证每拍指令运算成果！',
        camera: { position: [-3.5, 2.8, 3.9], target: [0, 0.68, 0] },
      },
    ],
  },

  RAM_16X4: {
    type: 'RAM_16X4',
    title: '16×4位静态随机存储器 (16×4 SRAM)',
    englishTitle: '16×4-Bit Static Random Access Memory',
    badge: '可读可写内存 · 存储程序基石',
    summary: '具备 16 个可独立寻址的 4 位存储格 (0x0 ~ 0xF)：既可预先在属性栏写入机器码表当成程序 ROM，也能在运行期间把运算成果写回任意内存单元 (WE=1)！',
    formulas: [
      { expr: '读操作 (异步): Q[3:0] = MEM[ A[3:0] ]', note: '改变地址 A₀..A₃ 后立刻无延迟读出对应存储格内容' },
      { expr: '写操作 (同步): 若 WE = 1 且 CLK↑ ⇒ MEM[ A ] ← D[3:0]', note: '存储状态与计算状态统一，正式跨入冯·诺依曼图灵完备架构！' },
    ],
    keyTakeaways: [
      '只有可读可写的随机存储器 (RAM)，计算系统才能做到在有限状态之外按任意变量地址存取中间数组或修改程序。',
      '结合 4 位计数器作为程序计数器 (PC) 驱动 A[3:0]，即可每拍依次从 0x0 到 0xF 取指执行预设十六进制程序！',
    ],
    controls: [
      { key: 'addr', label: '寻址地址 A[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 5 },
      { key: 'dataIn', label: '待写入数据 D[3:0]', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 11 },
      { key: 'we', label: '写使能 WE (0=读 / 1=写入)', kind: 'toggle', defaultValue: 0 },
    ],
    callouts: [
      { id: 'grid', title: '4×4 共 16 单元存储矩阵', detail: '16 根发光高度柱各自保存 0~15 的 4 比特十六进制半字节', worldPos: [0, 0.72, 0], color: '#10b981' },
      { id: 'cursor', title: 'X-Y 地址交叉选通光环', detail: '根据 A[3:0] 在千万单元中毫秒级唯一锁定目标格子', worldPos: [-0.35, 0.9, 0.35], color: '#fbbf24' },
      { id: 'io', title: 'WE 读写方向切换门', detail: 'WE=0 读出至 Q[3:0]；WE=1 伴随 CLK↑ 覆写进目标格', worldPos: [1.3, 0.78, 0], color: '#38bdf8' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '二维交叉阵列与随机地址寻址',
        narration: '4 条地址线经过行/列两级译码在 4×4 矩阵中精确定位唯一亮起的金色选通单元；无论跳到 0 号还是 15 号格，读取耗时完全一样。',
        renderNarration: (p) => {
          const addr = Math.round(p.addr ?? 5) & 15;
          const din = Math.round(p.dataIn ?? 11) & 15;
          const we = (p.we ?? 0) >= 0.5;
          const presetWord = (addr * 3 + 1) & 15;
          const shown = we ? din : presetWord;
          return `当前地址 A = 0x${addr.toString(16).toUpperCase()} (${addr})，${
            we
              ? `WE = 1（写入允许）：CLK 上升沿已将 D = 0x${din.toString(16).toUpperCase()} 写入格子 #${addr} 并回显于 Q！`
              : `WE = 0（只读模式）：直接从格子 #${addr} 异步读出存储内容 Q = 0x${shown.toString(16).toUpperCase()} (${shown})。`
          }`;
        },
        camera: { position: [4.2, 3.2, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '为什么具备 RAM 才是真正的图灵完备？',
        narration: '如果只有固定几个寄存器，问题规模一超过寄存器个数就束手无策；有了可动态寻址读写的 RAM，就能存队列、算数列、自修改状态！',
        camera: { position: [0.2, 2.7, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '在工作台属性栏直接编辑 16 单元十六进制程序表',
        narration: '选中工作台里的 RAM_16X4，右下角属性栏会展开 16 格可点击编辑的十六进制内存表，运行时更能实时看到写回后格子的动态跳变！',
        camera: { position: [-3.5, 2.9, 3.9], target: [0, 0.65, 0] },
      },
    ],
  },
};
