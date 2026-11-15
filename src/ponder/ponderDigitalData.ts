import type { PonderModuleSpec } from './ponderTypes';

export const PONDER_DIGITAL_SPECS: Record<
  | 'LOGIC_IN'
  | 'CLOCK'
  | 'LOGIC_OUT'
  | 'HEX_DISPLAY'
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'NAND'
  | 'NOR'
  | 'XOR'
  | 'XNOR'
  | 'HALF_ADDER'
  | 'FULL_ADDER'
  | 'D_FF',
  PonderModuleSpec
> = {
  LOGIC_IN: {
    type: 'LOGIC_IN',
    title: '数字开关输入 (0 / 1)',
    englishTitle: 'Digital Logic Switch Input',
    badge: '数字激励 · 二进制源',
    summary: '将物理电压映射为抽象布尔代数中的“0（低电平 0V）”或“1（高电平 5V）”，用于手拨激励与真值表遍历。',
    formulas: [
      { expr: 'Logic 1 (HIGH) ≈ +5.0 V ,  Logic 0 (LOW) ≈ 0.0 V', note: '以 +2.5V 为核心逻辑识别阈值' },
    ],
    keyTakeaways: [
      '在数电实验室的“真值表与卡诺图分析”引擎中，LOGIC_IN 会被自动识别为输入自变量列。',
      '实际硬件拨码开关必须配合上拉或下拉电阻，否则断开时引脚会因悬空拾取噪声乱跳。',
      '在 3D 工作台直接点击开关帽即可切换 0/1。',
    ],
    controls: [
      { key: 'state', label: '拨动电平状态', kind: 'toggle', defaultValue: 1, trueLabel: '逻辑 1 (5.0V HIGH)', falseLabel: '逻辑 0 (0.0V LOW)' },
    ],
    callouts: [
      { id: 'lever', title: '机械拨杆开关', detail: '物理切换接向 VCC 轨或 GND 轨', worldPos: [-0.85, 0.85, 0], color: '#fbbf24' },
      { id: 'rail', title: '5V / 0V 供电轨', detail: '清晰区分数字逻辑高低电位', worldPos: [0.1, 0.45, -0.7], color: '#38bdf8' },
      { id: 'outLed', title: '输出电平指示柱', detail: '高亮代表布尔真值 1', worldPos: [1.05, 0.65, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '从连续模拟电压走进离散 0/1 世界',
        narration: '数字电路不关心电压究竟是 4.7V 还是 5.0V，它只用一道门槛将电压划为两档：高于阈值即为逻辑“1”，贴近零伏即为逻辑“0”。',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '一键切换逻辑激励',
        narration: '拨动控制开关把动触臂从 0V 地线切向 +5V 电源轨，输出端灯柱立刻亮起高电平绿光，向前方逻辑门发送 1 信号。',
        camera: { position: [0.3, 2.2, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '自动接入真值表推导',
        narration: '你在工作台放置的每一枚 LOGIC_IN，都会成为底部真值表与卡诺图自动枚举 2ⁿ 种输入组合的一位自变量。',
        camera: { position: [-3.2, 2.6, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  CLOCK: {
    type: 'CLOCK',
    title: '方波时钟发生器',
    englishTitle: 'Square-Wave Clock Source',
    badge: '时序节拍 · 同步脉冲',
    summary: '周期性输出 0 与 1 交替跳变的矩形波脉冲信号，驱动 D 触发器、计数器与状态机协同工作。',
    formulas: [
      { expr: 'T = 1 / f ,  Duty = t_high / T = 50%', note: '常规对称方波周期与占空比关系' },
    ],
    keyTakeaways: [
      '从 0 瞬间跃升到 1 的斜边称为上升沿（↑），大多数触发器在此刻采样锁存数据。',
      '时钟信号就像交响乐团指挥的节拍器，保证百万个逻辑门同步迈步而不产生竞态冒险。',
    ],
    controls: [
      { key: 'freq', label: '节拍频率 f', kind: 'slider', min: 0.4, max: 2.5, step: 0.1, unit: 'Hz', defaultValue: 1.0 },
    ],
    callouts: [
      { id: 'quartz', title: '晶振谐振腔', detail: '提供稳定节拍的石英振荡源', worldPos: [-1.05, 0.8, 0], color: '#a78bfa' },
      { id: 'train', title: '3D 行进矩形脉冲列', detail: '高平台=1 (5V)，低谷=0 (0V)', worldPos: [0.35, 0.75, 0], color: '#38bdf8' },
      { id: 'edge', title: '上升沿触发闪光点', detail: '0→1 跳变瞬间唤醒时序触发器', worldPos: [1.35, 0.9, 0], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '数字系统的“心跳节拍器”',
        narration: '中央石英晶体稳定地把时间切成等距小格，持续吐出一高一低、方方正正的方波序列向右推进。',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '上升沿与下降沿才是关键瞬间',
        narration: '方波由平坦的 0/1 平台和陡峭垂直边沿组成；注意看最右侧检测器——每逢 0→1 上升沿到达就会爆出一圈金色脉冲！',
        camera: { position: [0.3, 2.2, 4.3], target: [0.1, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '调高频率，加速逻辑世界流转',
        narration: '推动频率滑块加快节拍，脉冲方块列间距缩短，下方状态指示灯随之加速闪烁。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  LOGIC_OUT: {
    type: 'LOGIC_OUT',
    title: '逻辑电平探针灯',
    englishTitle: 'Digital Logic Probe / Indicator',
    badge: '输出观测 · 阈值判决',
    summary: '实时监测任意节点电位并按数字阈值（>2.5V 为 1，≤2.5V 为 0）点亮或熄灭高对比度状态灯。',
    formulas: [
      { expr: 'Y = (V_in ≥ 2.5 V) ? 1 : 0', note: '中间灰色窗口存在施密特抗噪迟滞特性认知' },
    ],
    keyTakeaways: [
      '真值表与卡诺图面板会自动把每个 LOGIC_OUT 识别为输出因变量 Y 列。',
      '高输入阻抗设计保证探针接入任何门电路输出脚都不会拉低电平。',
    ],
    controls: [
      { key: 'vin', label: '被测节点电位', kind: 'slider', min: 0, max: 5, step: 0.5, unit: 'V', defaultValue: 4.5 },
    ],
    callouts: [
      { id: 'meter', title: '模拟-数字判决标尺', detail: '2.5V 逻辑分界门限环', worldPos: [-0.85, 0.9, 0], color: '#fbbf24' },
      { id: 'beacon', title: '高亮度状态灯塔', detail: '高于阈值亮绿“1”，否则灰暗“0”', worldPos: [0.85, 1.1, 0], color: '#22c55e' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '用一盏灯看懂复杂电压',
        narration: '逻辑探针内置精密电压比较门限：左侧电位尺指示当前实际电压，只要越过 2.5V 金色判决门槛，右侧灯塔立刻点亮宣告逻辑 1！',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '抗噪容限的重要性',
        narration: '把输入调在 3.5V~5V 或 0V~1.5V 之间，灯光都稳定不变——正是这种电压容差让数字电路抗干扰能力远超模拟电路。',
        camera: { position: [0.2, 2.2, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '数电实验分析的终点',
        narration: '搭建完成组合逻辑电路后，接上 LOGIC_OUT 即可立刻在下方解析面板一键展开完整真值表与最简卡诺图化简式！',
        camera: { position: [-3.2, 2.7, 3.6], target: [0, 0.65, 0] },
      },
    ],
  },

  HEX_DISPLAY: {
    type: 'HEX_DISPLAY',
    title: '十六进制七段数码管',
    englishTitle: '7-Segment Hexadecimal Display',
    badge: '译码显示 · 4-bit 直观读数',
    summary: '接收 D3 D2 D1 D0 四位二进制输入，内置 7 段译码逻辑直接将 0000~1111 直观显示为 0~F。',
    formulas: [
      { expr: 'Value = 8·D3 + 4·D2 + 2·D1 + D0 ∈ [0, 15]', note: '8421 BCD / 十六进制权重相加' },
    ],
    keyTakeaways: [
      '七段分别标号为 a, b, c, d, e, f（外圈顺时针）和中间横杠 g。',
      '刚好完美展示 4 位二进制总线或全加器 4-bit 累加和（例如 9+5=E 十六进制）。',
    ],
    controls: [
      { key: 'hexVal', label: '4位二进制数值', kind: 'slider', min: 0, max: 15, step: 1, unit: '', defaultValue: 10 },
    ],
    callouts: [
      { id: 'bits', title: 'D3 D2 D1 D0 四位码柱', detail: '权重分别为 8 / 4 / 2 / 1', worldPos: [-1.15, 0.55, 0], color: '#38bdf8' },
      { id: 'segs', title: 'a~g 立体七段灯条', detail: '由 4-to-7 译码矩阵同步点亮', worldPos: [0.55, 1.05, 0], color: '#f87171' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '四根导线能表达多少数字？',
        narration: 'D3、D2、D1、D0 共 4 位二进制共有 2⁴=16 种组合，从 0000 到 1111 恰好对应十六进制符号 0~9 以及 A、b、C、d、E、F。',
        camera: { position: [4.1, 3.0, 4.2], target: [0.05, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '8-4-2-1 权值与七段译码魔法',
        narration: '拖动数值滑块，观察左侧 4 根二进制输入灯柱如何按 8-4-2-1 亮灭组合，驱动右侧 7 条独立 LED 灯段精准拼出对应字符！',
        camera: { position: [0.2, 2.2, 4.1], target: [0.1, 0.7, 0] },
      },
      {
        id: 'step-3',
        title: '实战场景：配对全加器输出结果',
        narration: '将多位全加器的 Sum 输出依次接入 D0~D3，即可直接把枯燥的高低电平读成十进制/十六进制计算结果！',
        camera: { position: [-3.2, 2.6, 3.6], target: [0, 0.65, 0] },
      },
    ],
  },

  AND: {
    type: 'AND',
    title: '与门 (AND Gate)',
    englishTitle: '2-Input AND Logic Gate',
    badge: '基本逻辑门 · 逻辑乘',
    summary: '只有当所有输入端全部为 1 时，输出 Y 才为 1；只要存在任意一个 0，输出必为 0。',
    formulas: [
      { expr: 'Y = A · B  (逻辑与 / 逻辑乘)', note: '0·0=0, 0·1=0, 1·0=0, 1·1=1' },
      { expr: '特性：A · 1 = A ,  A · 0 = 0', note: '常用作信号“使能/门控”开关：B=1 放行 A，B=0 封锁 A' },
    ],
    keyTakeaways: [
      '物理直观：相当于两个串联在同一根电源线上的机械开关。',
      '卡诺图对应最小项 m3（仅有 A=1, B=1 一个方格填 1）。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 1, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'swA', title: '串联前级开关 A', detail: 'A=1 时合上第一座桥梁', worldPos: [-0.9, 0.75, -0.55], color: '#fbbf24' },
      { id: 'swB', title: '串联后级开关 B', detail: 'B=1 时合上第二座桥梁', worldPos: [0.05, 0.75, 0.55], color: '#38bdf8' },
      { id: 'outY', title: '输出 Y = A · B', detail: '必须双桥同时闭合才点亮！', worldPos: [1.3, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '双桥串联，缺一不可',
        narration: '与门的机械直观模型就是两座首尾串联的吊桥 A 与 B：能量只有先后跨越两座闭合的桥面才能抵达输出灯柱 Y。',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '亲自拨动 A 与 B 验证全 1 出 1',
        narration: '尝试只把 A 或 B 其中之一设为 0，虽然另一个依然为 1，但电流在断桥处被彻底拦住，输出立刻熄灭（有 0 出 0）！',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '作为数字电路的“使能闸门”',
        narration: '如果把 B 端当作时钟或允许信号 Enable，那么 B=1 时脉冲 A 原样透传过去，B=0 时输出被强制清零封锁。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  OR: {
    type: 'OR',
    title: '或门 (OR Gate)',
    englishTitle: '2-Input OR Logic Gate',
    badge: '基本逻辑门 · 逻辑加',
    summary: '只要输入端中至少有一个为 1，输出 Y 就为 1；唯有所有输入全为 0 时输出才为 0。',
    formulas: [
      { expr: 'Y = A + B  (逻辑或 / 逻辑加)', note: '0+0=0, 0+1=1, 1+0=1, 1+1=1' },
      { expr: '特性：A + 0 = A ,  A + 1 = 1', note: '注意逻辑 1+1=1，而不是二进制算术加法 2' },
    ],
    keyTakeaways: [
      '物理直观：相当于两条并联并汇合到同一盏灯的机械开关。',
      '卡诺图包含 m1, m2, m3 三个 1 方格（仅 m0 为 0）。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 0, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'laneA', title: '并行通道 A', detail: '上支路独立通行桥', worldPos: [-0.2, 0.65, -0.75], color: '#fbbf24' },
      { id: 'laneB', title: '并行通道 B', detail: '下支路独立通行桥', worldPos: [-0.2, 0.65, 0.75], color: '#38bdf8' },
      { id: 'outY', title: '汇合输出 Y = A + B', detail: '任一通道畅通即可点亮', worldPos: [1.3, 0.85, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '两条并行双通道，“有 1 出 1”',
        narration: '或门等效于两条并排架设的通道 A 和 B，最后共同汇入输出节点 Y。只要其中任意一路打通，信号就能顺利到达终点。',
        camera: { position: [4.1, 3.2, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '为什么 1 + 1 在逻辑里依然等于 1？',
        narration: '同时打开 A=1 和 B=1，两条路一齐向输出灯供电，灯并不会变成“2”，它的状态仅仅是保持高电平亮起状态（逻辑 1）。',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '全 0 才出 0 的报警汇集应用',
        narration: '任何一路传感器故障（变为 1）都需要触发总警报灯 Y——这就是或门在安全联锁中的最典型应用。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  NOT: {
    type: 'NOT',
    title: '非门 / 反相器 (NOT)',
    englishTitle: 'Inverter (NOT Logic Gate)',
    badge: '基本逻辑门 · 逻辑取反',
    summary: '输入 1 则输出 0，输入 0 则输出 1；物理上利用晶体管/MOS 管共源反相放大并带输出小圆圈标识。',
    formulas: [
      { expr: "Y = Ā  (逻辑非 / 反相)", note: "两次反相等于原信号本身：A'' = A" },
    ],
    keyTakeaways: [
      '逻辑符号末端的“小圆圈（Bubble）”在全部数电图纸中都代表低电平有效或反相操作！',
      '反相器也是最简单的电压极性翻转与波形整形缓冲器（Schmitt Inverter）。',
    ],
    controls: [
      { key: 'a', label: '输入电平 A', kind: 'toggle', defaultValue: 0, trueLabel: 'A = 1 (压下跷跷板)', falseLabel: 'A = 0 (释放跷跷板)' },
    ],
    callouts: [
      { id: 'inA', title: '输入推杆 A', detail: '逻辑真时向下压住左臂', worldPos: [-1.0, 0.8, 0], color: '#fbbf24' },
      { id: 'pivot', title: '反相杠杆支点', detail: '如同机械跷跷板颠倒高低', worldPos: [0, 0.65, 0], color: '#a78bfa' },
      { id: 'outY', title: '反相输出 Y = Ā', detail: '始终与 A 处于相反电平！', worldPos: [1.05, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '永远唱反调的“机械跷跷板”',
        narration: '非门的工作方式好比一架精密跷跷板：当输入 A 为 0（左侧落下）时，另一头高高翘起输出 1；按下 A=1 时，输出端瞬间压回 0！',
        camera: { position: [4.0, 3.0, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: 'CMOS 反相器物理真相',
        narration: '在真实芯片内部，输入 A=1 导通下方下拉管把输出拽向 0V 地；A=0 则导通上方上拉管把输出拉上 +5V 电源。',
        camera: { position: [0.2, 2.2, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '奇偶个非门串联的区别',
        narration: '偶数个非门串联输出恢复原状（延时缓冲器）；奇数个非门首尾闭环还会构成自激环形振荡器！',
        camera: { position: [-3.2, 2.6, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  NAND: {
    type: 'NAND',
    title: '与非门 (NAND Gate)',
    englishTitle: '2-Input NAND Logic Gate',
    badge: '通用门之王 · 功能完备集',
    summary: '等价于“先与后非”：全 1 才出 0，有 0 就出 1。仅用与非门一种元件就能搭出计算机里的一切数字逻辑！',
    formulas: [
      { expr: 'Y = (A · B)′ = A′ + B′  (德摩根定律)', note: '仅当 A=1 且 B=1 时 Y=0，其余三行全为 1' },
    ],
    keyTakeaways: [
      'NAND 是“功能完备集”：{NAND} 单独就能构造出 NOT、AND、OR 以及存储单元！',
      '现代 CMOS 与闪存（NAND Flash）工艺中，与非门比单纯与门更省晶体管（4 只 vs 6 只）且速度更快。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 1, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'andCore', title: '前级与门核 (A·B)', detail: '双串联通时产生中间高电平', worldPos: [-0.35, 0.75, 0], color: '#38bdf8' },
      { id: 'bubble', title: '反相小圆环节点', detail: '将中间信号就地取反', worldPos: [0.55, 0.75, 0], color: '#f43f5e' },
      { id: 'outY', title: '输出 Y = (A·B)′', detail: '唯有双 1 齐聚才熄灭输出！', worldPos: [1.3, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“先做 AND，再套一个取反泡”',
        narration: '前半段与普通与门一模一样，但末端红色反相环将其彻底反转：平常哪怕有任一端为 0，输出反而高高兴兴维持 1！',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '全 1 出 0——唯一被熄灭的组合',
        narration: '当前 A=1、B=1 时，中间核心亮起（1），但反相泡将其拽回低谷，最终输出 Y=0！试着关掉 A 或 B 任意一个，输出灯立刻重新亮起。',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '为什么硅芯片最爱用 NAND？',
        narration: '把两输入并接在一起，NAND 就成了 NOT；再把两级 NAND 串起来就得到了 AND——整块 CPU 其实都能用与非门砌出来。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  NOR: {
    type: 'NOR',
    title: '或非门 (NOR Gate)',
    englishTitle: '2-Input NOR Logic Gate',
    badge: '通用门 · 锁存器基石',
    summary: '等价于“先或后非”：全 0 才出 1，有 1 就出 0。同样属于通用功能完备集，更是交叉耦合锁存器的经典核心。',
    formulas: [
      { expr: 'Y = (A + B)′ = A′ · B′  (德摩根定律)', note: '仅当 A=0 且 B=0 时 Y=1' },
    ],
    keyTakeaways: [
      '把两个 NOR 交叉连接即可构成最经典的置位-复位（S-R）基本触发器，诞生了 1 bit 数字记忆。',
      '根据德摩根第二定律，NOR 等价于两个先反相输入再接 AND。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 0, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 0, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'orCore', title: '并联或门核 (A+B)', detail: '任一高电平即点亮中间核', worldPos: [-0.35, 0.75, 0], color: '#fbbf24' },
      { id: 'bubble', title: '反相抑制环', detail: '一旦中间为 1 即拉低输出', worldPos: [0.55, 0.75, 0], color: '#f43f5e' },
      { id: 'outY', title: '输出 Y = (A+B)′', detail: '唯有双路安静全 0 才亮灯！', worldPos: [1.3, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“先并后反”：全 0 才出 1',
        narration: '或非门内部先通过并联轨道判断是否有输入为 1，随后被末端的红色抑制环一键反相：只要任何一路激活，输出就被压回 0。',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '拨动任意输入验证“有 1 出 0”',
        narration: '默认 A=0, B=0 时输出灯柱 Y 高亮为 1；只要将 A 或 B 任意拨到 1，输出灯立刻熄灭归 0！',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '通向 SR 锁存器的大门',
        narration: '与 NAND 并称两大通用万用门，在 Apollo 登月导航计算机中全部逻辑正是清一色由三输入 NOR 门构建而成！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  XOR: {
    type: 'XOR',
    title: '异或门 (XOR Gate)',
    englishTitle: 'Exclusive-OR Gate',
    badge: '运算核心 · 相异出 1',
    summary: '两输入不同（01 或 10）时输出 1，两输入相同（00 或 11）时输出 0；它是二进制不进位加法的灵魂。',
    formulas: [
      { expr: 'Y = A ⊕ B = A·B′ + A′·B', note: '卡诺图呈标志性棋盘格对角分布！' },
      { expr: '特性：A ⊕ 0 = A ,  A ⊕ 1 = A′ ,  A ⊕ A = 0', note: '不进位二进制模二相加（Sum = A ⊕ B）' },
    ],
    keyTakeaways: [
      '异或门在卡诺图上构成对角棋盘图案，因此“无法继续合并化简”。',
      '天然构成“可控反相器”（控制端为 1 时把信号取反）与数据加密混淆核心。',
      '双控楼梯灯电路就是完美的 XOR 机械现实。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 0, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'gears', title: '对称差异对比齿轮', detail: '两轮状态相反时传动咬合', worldPos: [-0.4, 0.8, 0], color: '#a78bfa' },
      { id: 'bridge', title: '跨位对称通道', detail: '仅允许 (0,1) 或 (1,0) 穿越', worldPos: [0.45, 0.75, 0], color: '#fbbf24' },
      { id: 'outY', title: '输出 Y = A ⊕ B', detail: '相异为 1，相同抵消为 0', worldPos: [1.3, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“不同则真，相同则消”的比较天平',
        narration: '异或门就像一台精密差异检测器：左右两个输入轮 A 和 B 状态如果一高一低（相异），中央比较器输出 1；状态相同反而抵消为 0。',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '亲自拨动 (1,1) 看相同抵消',
        narration: '当前 A=1, B=0 时两者互异，输出点亮为 1；试着把 B 也拨成 1，两股等高信号迎头撞击互相抵消，输出灯反而熄灭！',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '一门撑起 CPU 加法器半边天',
        narration: '回顾二进制加法：0+0=0、0+1=1、1+0=1、1+1=0（本位归零并产生进位），本位结果的真值表与异或门一模一样！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  XNOR: {
    type: 'XNOR',
    title: '同或门 (XNOR Gate)',
    englishTitle: 'Exclusive-NOR (Equivalence Gate)',
    badge: '比较逻辑 · 相同出 1',
    summary: '两输入完全相同时（00 或 11）输出 1，不同时输出 0；天生就是 1 位二进制数值相等比较器！',
    formulas: [
      { expr: 'Y = A ⊙ B = (A ⊕ B)′ = A·B + A′·B′', note: '当且仅当 A == B 时输出 Y = 1' },
    ],
    keyTakeaways: [
      '把多组 XNOR 的输出全部送入一个大 AND 门，即可判断两个 8-bit/32-bit 数字是否完全相等！',
      '对于偶数量输入，XNOR 与偶校验（Even Parity）密切相关。',
    ],
    controls: [
      { key: 'a', label: '输入端 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '输入端 B', kind: 'toggle', defaultValue: 1, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'twin', title: '双锁舌对等检验器', detail: '同高 (1,1) 或同低 (0,0) 时锁止对齐', worldPos: [-0.2, 0.85, 0], color: '#38bdf8' },
      { id: 'outY', title: '相等输出 Y = (A == B)', detail: '对齐亮起绿色 MATCH 信号', worldPos: [1.3, 0.8, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '二进制世界的“找相同”裁判',
        narration: '同或门正好是异或门的反面：两根对准杆必须一齐保持 0，或者一齐拉起为 1，两者步调一致时绿色 MATCH 灯立刻亮起！',
        camera: { position: [4.1, 3.1, 4.2], target: [0, 0.55, 0] },
      },
      {
        id: 'step-2',
        title: '一位失衡立即报错（输出 0）',
        narration: '拨动 A 或 B 使两者出现 1 与 0 错位，对等滑块瞬间错开不再咬合，输出变为 0（不相等）。',
        camera: { position: [0.3, 2.3, 4.1], target: [0, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '多位数字密码锁的核心元件',
        narration: '把 4 个同或门并排检验输入的 4 位密码是否与预设密钥每位一致，再用与门汇总——电子密码锁就诞生了。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.55, 0] },
      },
    ],
  },

  HALF_ADDER: {
    type: 'HALF_ADDER',
    title: '半加器 (Half Adder)',
    englishTitle: '1-Bit Half Adder',
    badge: '组合算术 · 二进制求和',
    summary: '对两位 1-bit 二进制数 A 和 B 相加，输出本位和 S（Sum）与向高位的进位 C（Carry）。',
    formulas: [
      { expr: 'S = A ⊕ B  (由 1 枚 XOR 实现)', note: '1 + 1 本位清零写 0' },
      { expr: 'C = A · B  (由 1 枚 AND 实现)', note: '1 + 1 满二向高一级进 1' },
    ],
    keyTakeaways: [
      '之所以叫“半”加器，是因为它没有预留来自低位的进位输入 Cin，因此只能用在多位数加法器的最低位（LSB）！',
      '仅由 1 枚异或门和 1 枚与门并行构成。',
    ],
    controls: [
      { key: 'a', label: '被加数 A', kind: 'toggle', defaultValue: 1, trueLabel: 'A = 1', falseLabel: 'A = 0' },
      { key: 'b', label: '加数 B', kind: 'toggle', defaultValue: 1, trueLabel: 'B = 1', falseLabel: 'B = 0' },
    ],
    callouts: [
      { id: 'xorUnit', title: '上层 XOR 求和核', detail: 'S = A ⊕ B 计算当前位结果', worldPos: [0.05, 1.05, -0.55], color: '#a78bfa' },
      { id: 'andUnit', title: '下层 AND 进位核', detail: 'C = A · B 判断是否逢二进一', worldPos: [0.05, 0.45, 0.55], color: '#fbbf24' },
      { id: 'outputs', title: '两位结果柱 (C, S)', detail: '如 1+1 = 10₂（C=1, S=0）', worldPos: [1.35, 0.75, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '双路分流，两枚基本门齐头并进',
        narration: '输入 A 与 B 一分为二同时送入两条产线：上方绿色/紫色 XOR 核负责算本位和 S，下方金色 AND 核专门盯防“两个 1 相撞产生的进位 C”。',
        camera: { position: [4.2, 3.2, 4.3], target: [0, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '经典算式 1 + 1 = 10₂',
        narration: '当 A=1 且 B=1 时：上方 XOR 因相同而归 0（S=0），同时下方 AND 恰好满足全 1 点亮（C=1）！合起来读作二进制 10（十进制 2）。',
        camera: { position: [0.3, 2.3, 4.2], target: [0, 0.6, 0] },
      },
      {
        id: 'step-3',
        title: '为什么它还不够算多位加法？',
        narration: '到了十位或更高比特时，你除了要加 A 和 B，还必须把低位送来的进位也一并加上——这就呼唤下一位主角“全加器”登场。',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.6, 0] },
      },
    ],
  },

  FULL_ADDER: {
    type: 'FULL_ADDER',
    title: '全加器 (Full Adder)',
    englishTitle: '1-Bit Full Adder',
    badge: '算术核心 · ALU 基本单元',
    summary: '把本位输入 A、B 连同来自低位的进位 Cin 共 3 个比特相加，输出本位和 S 与向高位的进位 Cout。',
    formulas: [
      { expr: 'S = A ⊕ B ⊕ Cin', note: '三个输入中有奇数个 1 时 S = 1' },
      { expr: 'Cout = A·B + Cin·(A ⊕ B)', note: '“三选二多数表决器”：≥2 个 1 即进位！' },
    ],
    keyTakeaways: [
      '内部经典拆解：两级半加器（HA1 + HA2）+ 一枚汇总进位的或门（OR）。',
      '将 N 个全加器的 Cout 依次连入下一级的 Cin，就能造出 8-bit/64-bit 行波进位加法器（CPU ALU 核心）。',
    ],
    controls: [
      { key: 'a', label: 'A', kind: 'toggle', defaultValue: 1, trueLabel: 'A=1', falseLabel: 'A=0' },
      { key: 'b', label: 'B', kind: 'toggle', defaultValue: 1, trueLabel: 'B=1', falseLabel: 'B=0' },
      { key: 'cin', label: 'Cin (低位进位)', kind: 'toggle', defaultValue: 1, trueLabel: 'Cin=1', falseLabel: 'Cin=0' },
    ],
    callouts: [
      { id: 'ha1', title: '第一级半加器 HA1', detail: '先算 A + B 的局部和与进位', worldPos: [-0.85, 0.85, -0.35], color: '#38bdf8' },
      { id: 'ha2', title: '第二级半加器 HA2', detail: '把局部分数再与 Cin 相加', worldPos: [0.15, 0.85, -0.35], color: '#a78bfa' },
      { id: 'orGate', title: '进位汇总或门 OR', detail: 'HA1 或 HA2 任一溢出均置位 Cout', worldPos: [0.35, 0.45, 0.7], color: '#fbbf24' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '三个 1 相加等于多少？1+1+1 = 11₂',
        narration: '全加器接收三个等价的 1-bit 输入（A、B、Cin）。观察右侧两位结果塔（Cout, S）：它直接把 1 的个数编码成 00(0)、01(1)、10(2)、11(3)！',
        camera: { position: [4.2, 3.3, 4.4], target: [0.05, 0.6, 0] },
      },
      {
        id: 'step-2',
        title: '两级半加器流水线内部揭秘',
        narration: 'HA1 先算出 A⊕B；第二级 HA2 再把刚才的结果加上低位进位 Cin 得出最终本位和 S；只要两级中任何一次满二，底部 OR 门立即送出 Cout=1！',
        camera: { position: [0.2, 3.6, 3.0], target: [0.05, 0.55, 0] },
      },
      {
        id: 'step-3',
        title: '动手拨动 3 位输入观察“多数进位”',
        narration: '试着单独关闭 Cin、B、A 中的任意一个或两个：只要三输入里凑够至少两个 1，进位柱 Cout 必定傲然亮起；奇数个 1 时 S 亮起！',
        camera: { position: [-3.3, 2.7, 3.7], target: [0, 0.6, 0] },
      },
    ],
  },

  D_FF: {
    type: 'D_FF',
    title: '上升沿 D 触发器',
    englishTitle: 'Positive-Edge D Flip-Flop',
    badge: '时序逻辑 · 1-bit 寄存器',
    summary: '数字电路“记忆”功能的最小原子：只在时钟上升沿（CLK ↑）一瞬间把输入 D 锁存到输出 Q，其余时间纹丝不动。',
    formulas: [
      { expr: 'Q(n+1) = D  (仅当 CLK ↑ 发生时采样)', note: '非上升沿期间 Q 保持前次记忆值不变' },
      { expr: 'Q′ = NOT(Q)', note: '同时提供互补反向输出端 Q̄' },
    ],
    keyTakeaways: [
      '区别于组合逻辑（输出随输入即时变化），D 触发器在时钟稳态期间哪怕输入 D 剧烈抖动，输出 Q 也绝不改变！',
      '将 Q̄ 接回自己的 D 端，即可构成经典“二分频器”（输出频率 = ½ 输入时钟频率）。',
      '多个 D 触发器并排共享同一个 CLK，就组成了 CPU 寄存器与数据总线锁存器。',
    ],
    controls: [
      { key: 'd', label: '数据输入 D', kind: 'toggle', defaultValue: 1, trueLabel: 'D = 1 (准备写入 1)', falseLabel: 'D = 0 (准备写入 0)' },
      { key: 'clk', label: '触发时钟 CLK', kind: 'toggle', defaultValue: 0, trueLabel: 'CLK = 1 (刚发生 ↑)', falseLabel: 'CLK = 0 (等待下次 ↑)' },
    ],
    callouts: [
      { id: 'dIn', title: 'D 数据待命闸口', detail: '可随时更改但暂不透传给 Q', worldPos: [-1.15, 0.9, -0.45], color: '#38bdf8' },
      { id: 'shutter', title: '上升沿高速机械快门', detail: '仅在 CLK 0→1 一瞬间闪开抓拍 D', worldPos: [0, 0.85, 0], color: '#fbbf24' },
      { id: 'qOut', title: '记忆输出灯 Q 与反相 Q̄', detail: '锁存后除非下次 ↑ 否则永久记忆', worldPos: [1.15, 0.85, 0], color: '#34d399' },
    ],
    steps: [
      {
        id: 'step-1',
        title: '“只拍一帧快照”的记忆快门',
        narration: 'D 触发器就像一台带有机械快门的拍立得相机：左侧输入 D 就像镜头前的风景，但中间快门平时紧紧锁死，右边的相片 Q 完全保持老样子！',
        camera: { position: [4.2, 3.1, 4.3], target: [0, 0.65, 0] },
      },
      {
        id: 'step-2',
        title: '在 CLK=0 期间随便改 D，Q 绝不跟风',
        narration: '试着在 CLK=0 时反复拨动 D 开关在 0 和 1 之间切换：看左侧数据柱跟着变色，但右侧记忆灯塔 Q 固若金汤、纹丝不动！',
        camera: { position: [0.3, 2.3, 4.2], target: [0, 0.65, 0] },
      },
      {
        id: 'step-3',
        title: '现在按下 CLK（0→1 上升沿）触发锁存！',
        narration: '当把 CLK 从 0 切换到 1 的一刹那，中央金色快门闪电般抬起并落下，把此刻 D 的数值精准抓拍印刻到 Q 上；把 CLK 降回 0 时记忆依然保留！',
        camera: { position: [-3.3, 2.7, 3.6], target: [0, 0.65, 0] },
      },
    ],
  },
};
