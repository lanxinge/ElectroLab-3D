# 链路一：当前元件解释、独立仿真与公式校验

来源：Antigravity 原始项目会话的可见消息索引。
会话：57ff23a6-5208-4eb1-94d9-2a5a6f3f7e9a

以下保持原文顺序。个人本机路径已替换为 <LOCAL_USER> / <PROJECT>；工具执行细节不在此消息索引内。

## 用户 Prompt · step 613

修复并且改进下面的问题然后再提交0.3:把“思索”接到用户当前正在研究的电路上。

我将工作台电阻改为 1kΩ 后打开思索，它仍以独立的 220Ω、5V 示例开始。这个独立演示本身有用，但学习过程存在跳转。

建议保留“标准原理演示”，再增加“解释当前元件”：带入当前阻值、电压、电流和功耗，让学生看到自己的操作为什么产生这个结果。

另一个具体细节：异或门输入改成 A=1、B=1 后，输出正确变成 0，但章节说明仍写“当前 A=1、B=0”。参数、动画、讲解文案应同步变化。 齿轮等机械表达也应明确标为原理类比。纯 2D 模式仍会停止仿真。
RC 实验切到纯 2D 后，时间停在 0.3s，波形不再更新，按钮仍显示“运行中”；切回分屏恢复。仿真推进仍依赖 [3D 渲染循环 (line 643)](<PROJECT>/src/sim3d/Workbench3DEngine.ts:643)，应移到独立运行层。

错误公式会被当作有效逻辑烧录。
我输入不完整的 A &，界面显示“示例试算 → 0”，允许烧录，重新打开后错误公式仍被保留。这样会让学生把输入错误误认为逻辑结果。应报告缺失操作数、未知变量、括号不匹配等错误，并阻止应用。[表达式解析位置 (line 145)](<PROJECT>/src/engine/customIcEngine.ts:145)

五脚封装芯片没有显示引脚名称。
实际连接全加器时，图上看不到 A/B/C、S/Cout，需要记住端口顺序。代码目前只在引脚数不少于六个时绘制名称。应让自定义芯片始终显示引脚名，并提供完整名称的悬停提示。[绘制位置 (line 706)](<PROJECT>/src/components/Schematic2DSidebar.tsx:706)

悬浮面板同时展开时仍有遮挡。
在本次 1280×720 视口下，分析面板会盖住二维图纸的一部分；重新打开图纸也没有自动适配全部电路。经典布局中，选择元件与导线时属性栏高度变化，还会让图纸上下移动。建议优先补自动适配、可调整的面板布局和稳定的属性区域高度。

## AI 可见回复 · step 916

正在运行构建 `tsc --noEmit && vite build`（`npm test` 3 个测试套件共 27 项已全部通过），等待构建完成后继续进行 1280×720 浏览器端到端验证与 0.3 提交。

## AI 可见回复 · step 937

已启动并确认前后端服务就绪（`http://127.0.0.1:5173` 与 `http://127.0.0.1:3001`），正在运行 `1280×720` 浏览器端到端验证。

## AI 可见回复 · step 947

浏览器端到端检查中发现 `TruthChipEditorModal.tsx` 存在一处 React Hook 顺序问题（条件早返回放在了两个 `useMemo` 之前），已立即修复并热更新，正在复测场景 D（自定义真值芯片表达式严格校验与防误烧录拦截）。

## AI 可见回复 · step 953

场景 D 复测与全量 1280×720 浏览器端到端验证已全部通过；`npm test` 3 个测试套件共 27 项全部通过，正在等待最终生产构建 `vite build` 完成以便清理并提交 v0.3。

## AI 可见回复 · step 962

已完成全部 5 项问题修复与改进，并通过单元测试、生产构建及 `1280×720` 浏览器端到端验证后，已提交 **v0.3** 到 Git 仓库（`main` 分支，提交号 `e863c68`）。

---

### 修复与改进详情

#### 1. “思索 (Ponder)”接入当前实验电路、实时同步讲解与 `[原理类比]` 标识
- **双模式联动**：在 [usePonderStore.ts](file:///e:/codelearn/Circuit/src/store/usePonderStore.ts)、[PonderModal.tsx](file:///e:/codelearn/Circuit/src/components/PonderModal.tsx) 和 [ponderInstanceBridge.ts](file:///e:/codelearn/Circuit/src/ponder/ponderInstanceBridge.ts) 中新增 `activeComponentId` 与 `ponderMode`（`'instance' | 'standard'`）。从工作台选中元件、悬停提示（[PonderHoverOverlay.tsx](file:///e:/codelearn/Circuit/src/components/PonderHoverOverlay.tsx)）、属性栏（[PropertyInspector.tsx](file:///e:/codelearn/Circuit/src/components/PropertyInspector.tsx)）或快捷胶囊进入思索时，默认进入 **「解释当前元件」** 模式，代入该元件当前设定参数（如 `1.00 kΩ`）、实测压降、电流、功耗、负载率与引脚电位，并可一键切换 **「标准原理演示」**。
- **参数-动画-讲解文案严格同步**：在 [ponderTypes.ts](file:///e:/codelearn/Circuit/src/ponder/ponderTypes.ts) 新增 `renderNarration`，在 [ponderAnalogData.ts](file:///e:/codelearn/Circuit/src/ponder/ponderAnalogData.ts)、[ponderDigitalData.ts](file:///e:/codelearn/Circuit/src/ponder/ponderDigitalData.ts)、[ponderExpandedData.ts](file:///e:/codelearn/Circuit/src/ponder/ponderExpandedData.ts) 及 [ponderScenesAnalog.ts](file:///e:/codelearn/Circuit/src/ponder/ponderScenesAnalog.ts) 中动态计算章节讲解（通过 `resolveStepNarration` 渲染，如异或门拨为 `A=1、B=1` 时同步更新为 `Y=0` 的抵消说明，不再停留在旧文案 `当前 A=1, B=0`）。
- **机械/水力类比显式标注**：通过 [ponderTypes.ts](file:///e:/codelearn/Circuit/src/ponder/ponderTypes.ts)、[Ponder3DStage.ts](file:///e:/codelearn/Circuit/src/ponder/Ponder3DStage.ts) 与 [PonderModal.tsx](file:///e:/codelearn/Circuit/src/components/PonderModal.tsx) 渲染 `analogyNote` 说明卡片（`原理类比` 徽章）与 3D 标注 `类比` 标签（覆盖齿轮、吊桥、跷跷板、快门、比例水闸、溢流阀、道岔、磁飞轮等比喻展示）。

#### 2. 独立仿真循环：纯 2D 模式持续推进时间与波形
- 新增独立于 3D WebGL 生命周期的仿真驱动 Hook [useSimulationRunner.ts](file:///e:/codelearn/Circuit/src/hooks/useSimulationRunner.ts) 并挂载到顶层 [App.tsx](file:///e:/codelearn/Circuit/src/App.tsx#L67)。
- 从 [Workbench3DEngine.ts](file:///e:/codelearn/Circuit/src/sim3d/Workbench3DEngine.ts) 和 [Workbench3DView.tsx](file:///e:/codelearn/Circuit/src/components/Workbench3DView.tsx) 的渲染循环移除 `onStepSim`，确保切换到 `纯2D`（`2d-only`）卸载 3D 画布后，RC 暂态时间与示波器数据仍连续步进；并在 [HeaderBar.tsx](file:///e:/codelearn/Circuit/src/components/HeaderBar.tsx#L156-L161) 常驻展示仿真时间 `sim-time-readout`。

#### 3. 严格布尔公式语法校验，阻止错误公式烧录
- 在 [customIcEngine.ts](file:///e:/codelearn/Circuit/src/engine/customIcEngine.ts#L145-L360) 实现 `tokenizeBooleanExpr`、`parseValidatedBooleanAst` 与 `validateBooleanExpression`，对不完整二元操作数（如 `A &`）、未知变量、空括号/不匹配括号、缺失二元运算符（如 `A B`）及非法字符给出中文错误提示；同时在 [TruthChipEditorModal.tsx](file:///e:/codelearn/Circuit/src/components/TruthChipEditorModal.tsx) 中修复了 Hook 调用顺序使其始终在早返回前执行，并在公式无效时隐藏误导性的 `"示例试算 → 0"`，展示逐行红字报错与顶部拦截提示并禁用“烧录并应用芯片配置”按钮。
- 顺带将 `getTruthChipPins`（[customIcEngine.ts](file:///e:/codelearn/Circuit/src/engine/customIcEngine.ts#L472-L483)）改为过滤 `NC` 空脚且 `IN` 靠左、`OUT` 靠右排列。

#### 4. 修复多脚封装芯片 2D 引脚名显示与悬停提示
- 在 [Schematic2DSidebar.tsx](file:///e:/codelearn/Circuit/src/components/Schematic2DSidebar.tsx#L673-L738) 移除 `pins.length >= 6` 限制并修正 SVG 绘制层级（先绘制封装 `<rect>` 再绘制引脚 `<text>`，此前 `<rect>` 在后导致文字被底色覆盖），使 5 脚全加器 `CUSTOM_IC` 等多脚芯片稳定显示 `A / B / C(Cin) / S / Cout`；针对多引脚芯片动态上移元件标题并外扩选中框及遥测文字纵坐标。
- 在 2D 引脚上新增 `<title>` 与悬浮提示条 `schematic-pin-tooltip`（[Schematic2DSidebar.tsx](file:///e:/codelearn/Circuit/src/components/Schematic2DSidebar.tsx#L1395-L1430)），同步将 [Workbench3DView.tsx](file:///e:/codelearn/Circuit/src/components/Workbench3DView.tsx#L141) 3D 悬停引脚查找改用 `getComponentPins(c)`。

#### 5. `1280×720` 无遮挡可调面板布局、2D 自动适配与经典分栏稳定高度
- **2D 自动适配与画布高度稳定**：在 [useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts) 增加 `circuitLoadVersion`（在 `loadCircuit`、`clearWorkbench`、`autoLayout2D` 时递增），[Schematic2DSidebar.tsx](file:///e:/codelearn/Circuit/src/components/Schematic2DSidebar.tsx#L960-L1024) 结合 `ResizeObserver` 与 `circuitLoadVersion` 在挂载、窗口变化及载入电路后自动 `fitToView`，并将 `selected` 快捷栏改为画布内悬浮层以免挤占 `<svg>` 高度。
- **分区无遮挡与拖拽调尺寸**：在 [useUIStore.ts](file:///e:/codelearn/Circuit/src/store/useUIStore.ts) 增加 `paletteWidth`、`rightColumnWidth`、`analysisHeight`、`splitInspectorHeight` 尺寸状态，[BottomAnalysisDock.tsx](file:///e:/codelearn/Circuit/src/components/BottomAnalysisDock.tsx#L16-L130) 支持 `embedded` / `heightPx`，[PropertyInspector.tsx](file:///e:/codelearn/Circuit/src/components/PropertyInspector.tsx#L25-L50) 补齐非紧凑态 `h-full`。在 [App.tsx](file:///e:/codelearn/Circuit/src/App.tsx#L115-L345) 中：
  - 悬浮模式下四个面板及悬浮球各自预留间距与边缘拖拽条，右侧属性栏与 2D 原理图采用纵向堆叠分栏并在底部为分析工作区留出边界；
  - 经典分屏模式下用固定高度插槽 `split-inspector-slot` + 拖拽分隔条包裹 `PropertyInspector`，切换选中元件 / 导线 / 空白处时 2D 图纸纵向位置不再跳动。

---

### 验证结果

1. **单元测试与构建**（全部于最终代码修改完成后执行）：
   - `npm test`：3 个测试文件共 **27 项测试全部通过**（[engine.test.ts](file:///e:/codelearn/Circuit/tests/engine.test.ts) 17 项、[ponder.test.ts](file:///e:/codelearn/Circuit/tests/ponder.test.ts) 6 项、[api.test.ts](file:///e:/codelearn/Circuit/tests/api.test.ts) 4 项），耗时 2.98s。
   - `npm run build`（`tsc --noEmit && vite build`）：类型检查与生产包构建全部通过（`dist/assets/index-DzTaYZHv.js`，耗时 5.70s）。
2. **`1280×720` 浏览器端到端实测**（Chromium 视口 `1280×720` 访问 `http://127.0.0.1:5173`，并核验最终截图 `final_step_445.png` 与 `BROWSER_HOST_FACTS`）：
   - **悬浮面板全展开无遮挡 & 自动适配**：同时打开元件库（`12..260`）、属性（`858..1268, y:60..255`）、2D 图纸（`858..1268, y:265..481`）、分析面板（`272..1192, y:493..708`），所有面板两两重叠面积为 `0 px²`，2D 电路节点全部落在可视 SVG 区域内。
   - **思索电路联动与动态讲解**：将 `R1` 改为 `1000` 后进入思索默认激活“解释当前元件 · R1”并显示 `1.00 kΩ`，可切换回“标准原理演示”(`220 Ω`)；切换至 XOR 步骤 2 并将输入拨为 `A=1, B=1` 后，讲解更新为 `Y=0` 对应说明，且显示 `[原理类比]` 徽章与说明。
   - **纯 2D 连续仿真与经典分屏稳定性**：载入一阶 RC 实验切到 `纯2D`（3D `<canvas>` 数为 `0`），仿真时间持续推进（测得 `259.4s -> 261.0s`）；回到经典分屏切换选中空白/元件/导线，`split-schematic-container` 的 `top` 均为 `57.000px`（位移 `0px`）。
   - **错误公式拦截**：在 `CUSTOM_TRUTH_8` 表达式模式输入 `A &` 报 `"运算符 “&” 后缺少右操作数"`，禁用烧录按钮且未显示 `"示例试算 → 0"`；取消重开后原公式未被覆盖，修正为 `A ^ B` 后可正常应用。
   - **5 脚封装芯片引脚名与悬停提示**：打包全加器实验生成 5 脚 `U1` 芯片后，2D SVG 渲染出 `A / B / C / S / Cout` 全部 5 个引脚名，悬停引脚显示 `schematic-pin-tooltip`。

---

### Git 提交记录

- 分支：`main`
- 提交：`e863c68` — `feat: ElectroLab 3D v0.3 电路联动思索、独立仿真层、公式校验与自适应无遮挡工作台`（40 个文件，工作区已清理临时运行时目录并确认 `nothing to commit, working tree clean`）。

## 用户 Prompt · step 963

联动解释还有两处一致性问题：RC 放电时，推导文字把正电压除以正电阻写成了负电流；“解释当前元件”中的输入按钮可以改成 1，但实测读数仍为 0。

## AI 可见回复 · step 1038

I have launched the development servers and started the `browser` subagent to verify both Ponder consistency fixes in a `1280×720` Chromium viewport. Waiting for the browser verification report.

## AI 可见回复 · step 1064

正在完成全量测试与生产构建检查，完成后即提交代码。

## AI 可见回复 · step 1068

已完成两处“思索 (Ponder)”联动一致性问题的修复，并通过单测、生产构建与 Chromium (`1280×720`) 实机验证后提交至 `main`（提交 `e2b33e3`）。

### 修复详情

1. **RC 放电阶段带符号公式与幅值推导一致性** — [ponderInstanceBridge.ts](file:///e:/codelearn/Circuit/src/ponder/ponderInstanceBridge.ts)
   - 新增 `formatOhmFormulaDerivation` 统一处理电阻/超高阻器在正反向电压下的表达式生成：存在负压降/负电流时，先列出**关联参考方向带符号欧姆定律**（如 `I = ΔV / R = -0.73 V / 1.00 kΩ = -733.7 µA`），再单独给出**幅值公式**（`|I| = 0.73 V / 1.00 kΩ = 733.7 µA`），不再将正数除以正数写成负电流。
   - 在 `deriveInstancePonderContext` 中同步区分电容 `放电阶段`（`dVc/dt < 0`、`I = C·dVc/dt = -... µA`）与 `充电阶段`，以及电源反灌流 / 向外供电表述。

2. **“解释当前元件”交互拨动与读数/推导同步** — [ponderInstanceBridge.ts](file:///e:/codelearn/Circuit/src/ponder/ponderInstanceBridge.ts)、[PonderModal.tsx](file:///e:/codelearn/Circuit/src/components/PonderModal.tsx)、[ponderScenesDigital.ts](file:///e:/codelearn/Circuit/src/ponder/ponderScenesDigital.ts)
   - 在 `PonderModal` 中分离工作台基础状态与交互覆盖参数 `activeParams` 并传入 `deriveInstancePonderContext`：当在“解释当前元件”模式下拨动输入开关或滑动条（如把 `U3_AND` 的 `B` 设为 `1`）时，左上角指标胶囊、右侧推演卡片徽章（切换为 `试算模式` 并保留原实测对照 `【交互试算 · 工作台原实测：...】`）、引脚读数（`试算引脚 — ...`）以及章节讲解文案会同步切换并重新计算输出。
   - 增加 **`还原实测`** 按钮用于放弃临时拨动并恢复 `工作台同步` 状态；对具有元件自身可写属性的模块（如 `LOGIC_IN`、`RESISTOR`、`DC_SOURCE`、`SWITCH_SPST` 等），在试算时提供 **`应用到工作台`** 按钮将其直接写回工作台电路。
   - 同步修复 `ponderScenesDigital.ts` 中 `buildDFlipFlopDiorama` 的初始 `_q` 状态同步问题，并补充两项单测于 [ponder.test.ts](file:///e:/codelearn/Circuit/tests/ponder.test.ts)。

### 验证结果

- **单元测试**（`npm test` → `vitest run`）：`3` 个测试文件全部通过（[tests/engine.test.ts](file:///e:/codelearn/Circuit/tests/engine.test.ts) 17 项、[tests/ponder.test.ts](file:///e:/codelearn/Circuit/tests/ponder.test.ts) 8 项、[tests/api.test.ts](file:///e:/codelearn/Circuit/tests/api.test.ts) 4 项，共 `29 passed`）。
- **类型检查与生产构建**（`npm run build` → `tsc --noEmit && vite build`）：退出码 `0`，产物构建成功（`4.62s`）。
- **浏览器端到端验证**（`1280×720` Chromium 访问 `http://127.0.0.1:5173/`）：
  - **一阶 RC 暂态实验**：放电期 `R1` 思索卡片显示 `I = ΔV / R = -0.73 V / 1.00 kΩ = -733.7 µA（电流大小 |I| = 0.73 V / 1.00 kΩ = 733.7 µA）`；`C1` 显示 `Vc = 0.73 V` 与 `放电阶段，dVc/dt < 0`、`I = C·dVc/dt = -733.7 µA（幅值 733.7 µA）`。
  - **一位全加器实验**：打开 `U3_AND` 思索并将 `B` 拨为 `1` 后，界面同步切换为 `试算模式`、`试算输入 A, B:A=1, B=1`、`试算输出 Y:Y=1 (5.0V)` 及 `试算引脚 — A: 5.00V(1) | B: 5.00V(1) | Y: 5.00V(1)`；点击 `还原实测` 恢复 `工作台同步`（`A=1, B=0`、`Y=0`）；打开 `LOGIC_IN` `B` 拨为 `1` 后点击 `应用到工作台`，状态与工作台同步为 `工作台同步` / `实测输出逻辑态:1 (HIGH +5.0V)`。
- **Git 提交**：`e2b33e3 fix: 修正思索RC放电符号推导与实例模式试算读数同步`（分支 `main`，工作区已清理无残留变更，开发服务器后台任务已停止）。
