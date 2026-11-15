# 链路二：课程建设与 RC 暂态教学修正

来源：Antigravity 原始项目会话的可见消息索引。
会话：57ff23a6-5208-4eb1-94d9-2a5a6f3f7e9a

以下保持原文顺序。个人本机路径已替换为 <LOCAL_USER> / <PROJECT>；工具执行细节不在此消息索引内。

## 用户 Prompt · step 1069

0.4版本新增教学模式，从零基础开始从零讲解各种电路原理，并且配备对应逐步扩展的电路演示和模块原理演示，先覆盖本科电工学上册内容，必要时重构底座以适配教学模式

## AI 可见回复 · step 1313

正在运行全量单元测试（包含 36 个教学阶段与交流/三相物理断言）及 TypeScript / Vite 构建检查，稍候同步结果。

## AI 可见回复 · step 1322

已修复 `pinVoltages` 字段名与 `Math.sqrt(3)` 类型报错，正在重新运行 `npm test` 与 `tsc --noEmit && vite build` 全量验证。

## AI 可见回复 · step 1328

已启动前端与后端开发服务器，并委派浏览器代理在 `1280×720` 分辨率下对教学模式主流程、渐进电路演示、3D 思索联动、三相断零故障抢修与交流有效值表进行端到端真实验证。

## AI 可见回复 · step 1344

修复了 `1280px` 视口顶部导航栏中“交流论坛”标签的挤压裁剪问题（将次级工具按钮文本展开断点调至 `2xl`），正在重新运行全量测试与生产构建，随后复验浏览器界面布局。

## AI 可见回复 · step 1350

正在复验 `1280×720` 下顶栏无重叠与教学模式第11课（三相电路断零故障修复）全视图截图，完成后即清理临时进程。

## AI 可见回复 · step 1364

已完成 **ElectroLab 3D v0.4 教学模式（本科《电工学》上册零基础交互课程体系与仿真底座升级）** 的开发与验证，所有改动保留在工作区供审阅。

### 1. 仿真与工作台底座重构升级
- **交流相角、自适应微步长与整周期有效值解算**（[types.ts](file:///e:/codelearn/Circuit/shared/types.ts)、[componentCatalog.ts](file:///e:/codelearn/Circuit/src/engine/componentCatalog.ts)、[mnaSolver.ts](file:///e:/codelearn/Circuit/src/engine/mnaSolver.ts)）：
  - 为 `AC_SOURCE` 增加初相角 `phase`（支持 `0° / -120° / +120°` 三相交流供电），为 `VOLTMETER` / `AMMETER` 增加 `mode: 'dc' | 'rms'`（直流瞬时挡 / 交流有效值 `AC~` 挡）。
  - 新增 `advanceCircuitSimulation`，按最高激励频率自适应细分步长（单周期可达 240 子步），滑动统计整周期加权有效值 `vRms`、`iRms`、平均有功功率 `avgPower`、视在功率 `apparentPower` 与功率因数 `powerFactor`，并同步白炽灯热惯性稳态功率过载判定。
- **教学慢放倍速、预热稳态与高亮引导**（[useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts)、[Workbench3DEngine.ts](file:///e:/codelearn/Circuit/src/sim3d/Workbench3DEngine.ts)、[meshes.ts](file:///e:/codelearn/Circuit/src/sim3d/meshes.ts)、[Workbench3DView.tsx](file:///e:/codelearn/Circuit/src/components/Workbench3DView.tsx)、[Schematic2DSidebar.tsx](file:///e:/codelearn/Circuit/src/components/Schematic2DSidebar.tsx)、[PropertyInspector.tsx](file:///e:/codelearn/Circuit/src/components/PropertyInspector.tsx)、[BottomAnalysisDock.tsx](file:///e:/codelearn/Circuit/src/components/BottomAnalysisDock.tsx)）：
  - 支持 `timeScale`（`1× / 0.2× / 0.05×` 交流慢放）、单步推进 `stepOnce`、`loadCircuit` 稳态预热 `prewarmSeconds`，以及切换电路时 3D 视角自动对焦 `fitCameraToCircuit()`。
  - 3D 场景与 2D 原理图同步渲染教学重点脉冲高亮环（`highlightedIds`）与 `+新增` 器件徽标（`newlyAddedIds`），底部解析栏新增 **“交流有效值与功率因数”** 实时数据表。
- **3D 思索（Ponder）深链直达与交流实测桥接**（[usePonderStore.ts](file:///e:/codelearn/Circuit/src/store/usePonderStore.ts)、[PonderModal.tsx](file:///e:/codelearn/Circuit/src/components/PonderModal.tsx)、[ponderInstanceBridge.ts](file:///e:/codelearn/Circuit/src/ponder/ponderInstanceBridge.ts)）：
  - `openPonder(type, componentId, stepIndex)` 支持从课程卡片直接跳转到对应器件的指定 3D 原理演示步骤，并在实例联动模式中展示交流相角、有效值 `V~ / I~` 与功率因数。

### 2. 零基础渐进式课程体系（7 章 · 12 课 · 36 个递进实验阶段）
课程定义位于 [tutorialTypes.ts](file:///e:/codelearn/Circuit/src/tutorial/tutorialTypes.ts)、[tutorialHelpers.ts](file:///e:/codelearn/Circuit/src/tutorial/tutorialHelpers.ts)、[lessonsCh0ToCh2.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsCh0ToCh2.ts)、[lessonsCh3ToCh6.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsCh3ToCh6.ts) 与 [curriculumIndex.ts](file:///e:/codelearn/Circuit/src/tutorial/curriculumIndex.ts)：
- **第 0 章 零基础认识电与仪表**：电源与参考地电位差 → 开关与灯泡闭合回路 → 电压表并联/电流表串联双表测功 → 短路过流与熔断器保护。
- **第 1 章 电路基本定律**：欧姆定律定量测量、电位器连续分压、LED 限流电阻与焦耳功耗红线、KCL 节点分流守恒、KVL 串联回路压降守恒与双电源节点电位方程。
- **第 2 章 电路分析与等效定理**：惠斯通电桥调平、电压源/电流源等效互换与内耗边界、SPDT 安全置零叠加定理实验、戴维南等效与最大功率传输阻抗匹配。
- **第 3 章 动态电路一阶暂态**：RC 零状态充电/零输入放电与全响应三要素法、RL 通电励磁、感性负载断闸反电动势击穿危害与并联续流二极管钳位保护。
- **第 4 章 正弦交流、谐振与功率因数**：`220V~` 有效值测量、感抗与容抗频率响应对比、`50Hz` RLC 串联谐振与品质因数电容过电压、感性电机并联电容无功补偿降线损。
- **第 5 章 三相交流供电与安全**：对称 `Y0` 三相四线制（`220V~ / 381V~` 与零中线电流）、不对称负载“断零”轻载相飙压过载事故与合闸抢修、三角形 `Δ` 接法 $\sqrt{3}$ 倍线电流关系。
- **第 6 章 变压器与直流稳压电源**：变压器 `20:1` 隔离降压 → 二极管半波整流与 `470µF` 电容滤波平波 → `5.1V` 齐纳稳压管反向钳位构建完整 `220V~ → 5V` 线性直流稳压电源。

### 3. 教学模式交互工作区与无损切换
- [useTutorialStore.ts](file:///e:/codelearn/Circuit/src/store/useTutorialStore.ts)、[TutorialCoursePanel.tsx](file:///e:/codelearn/Circuit/src/components/TutorialCoursePanel.tsx)、[TutorialWorkspace.tsx](file:///e:/codelearn/Circuit/src/components/TutorialWorkspace.tsx)、[HeaderBar.tsx](file:///e:/codelearn/Circuit/src/components/HeaderBar.tsx)、[App.tsx](file:///e:/codelearn/Circuit/src/App.tsx)：
  - 集成章节目录抽屉、阶段进度、实时公式代入验算、实验快捷交互控件、3D 模块思索跳转、实时判题闯关卡片与“一键自动演示”。
  - 进入教学模式时自动快照备份自由仿真台电路；点击“返回自由仿真台”无损恢复原工程，点击“带电路去自由台”可将当前教学电路直接带入自由工作台继续改装。

### 4. 验证结果
- **自动化测试**（[tutorial.test.ts](file:///e:/codelearn/Circuit/tests/tutorial.test.ts) 等 4 个测试文件）：`npm test` **34 / 34 全部通过**（覆盖全部 12 课 36 个阶段的拓扑引脚合法性、三相不对称断零过压、50Hz RLC 谐振与功率因数补偿物理精度、36 个闯关任务自动演示通关以及自由台电路无损恢复）。
- **类型与生产构建**：`npm run build`（`tsc --noEmit && vite build`）零报错通过。
- **1280×720 浏览器端到端实测**（实测截图：[final_step_63.png](file:///<LOCAL_USER>/.gemini/antigravity/brain/57ff23a6-5208-4eb1-94d9-2a5a6f3f7e9a/browser_evidence/a5f42558-8b3c-4cf1-be1b-f7d99e97a4fe/final_step_63.png)）：验证顶栏与面板零重叠挤压、单 WebGL 实例渲染、渐进式阶段扩展、思索 3D 弹窗联动、第 11 课三相断零故障从 `~293V~` 过压抢修恢复 `220V~` 三相平衡，全程 `0` 控制台/页面错误。

## 用户 Prompt · step 1365

先修复这几个问题

## 用户 Prompt · step 1366

暂停切换开关，会产生错误的电容电压，并误记通关。
我在 RC 放电课中复现了：
- 电容已充至约 10V，暂停仿真。
- 切到接地放电，电压立即显示 0V，任务被判为“已通关”。
- 推进一个微步，电压又变成 9.61V，任务显示“待完成”，累计完成数却已增加。
修改属性时走了 dt=0 求解，而该分支将电容按直流稳态开路处理。应区分“求直流工作点”和“保持储能状态的瞬时重算”，让切换后的显示与通关判断使用正确暂态结果。[属性更新 (line 556)](<PROJECT>/src/store/useCircuitStore.ts:556) · [电容求解分支 (line 897)](<PROJECT>/src/engine/mnaSolver.ts:897)

电流曲线实际画成了电流表自身的压降。
RC 放电时，数值表已经显示约 −9.6mA，示波器的 PA_C 电流 通道却显示 −0.00V，曲线接近水平。当前 DC 电流表仍采集 voltageDrop，图例和纵轴也统一写 V。
建议让示波通道明确包含“元件、测量量、单位”，正确区分瞬时电压、瞬时电流和有效值，并处理不同量纲的刻度。[采样位置 (line 138)](<PROJECT>/src/store/useCircuitStore.ts:138) · [纵轴标注 (line 106)](<PROJECT>/src/components/BottomAnalysisDock.tsx:106)

正常无功补偿实验持续出现电感、电容过载告警。
补偿效果已达标时，界面仍反复显示电感、电容“约 100—200W／额定 5W”过载。这来自将瞬时 |u·i| 用于功耗判断，混淆了储能交换与损耗。
应在元件模型中区分储能功率、实际损耗及耐压／电流限制，让教学中的正常运行状态与告警一致。[相关计算 (line 1502)](<PROJECT>/src/engine/mnaSolver.ts:1502)

RC 公式旁的时间没有从开关动作开始计时。
我开始充电时，界面显示 t=12.18s，Vc=0.61V。这里的时间是进入实验以来的总时间，但指数响应公式中的时间应从这次切换开始计算。建议记录切换时刻及初始状态，显示“本次充电／放电已进行多久”。[当前时间显示 (line 81)](<PROJECT>/src/tutorial/lessonsCh3ToCh6.ts:81)

## AI 可见回复 · step 1572

全部 4 个测试文件（38 项测试）已通过，正在等待 `npm run build` 完成以继续浏览器端到端验证。

## AI 可见回复 · step 1578

已启动开发服务器并指派浏览器子代理在 `1280×720` 视口下执行三项核心场景的实时端到端验证，等待结果返回。

## AI 可见回复 · step 1591

已修复全部 4 项问题并完成单元测试、生产构建与 `1280×720` 浏览器端到端验证（工作区改动暂留待查，未执行 `git commit`）。

### 修复说明

1. **暂停状态下切换开关保持电容电压与电感电流连续，杜绝 `0V` 误判通关**
   - 在 [mnaSolver.ts](file:///e:/codelearn/Circuit/src/engine/mnaSolver.ts) 导出 `ZeroDtSolveMode`（`'dcOperatingPoint' | 'holdState'`）与 `SolveStepOptions`，默认保留 `'dcOperatingPoint'` 以兼容既有直流工作点求解；当 `zeroDtMode === 'holdState'` 时，`CAPACITOR` 以 `CAP_HOLD_G` Norton 伴随模型锁定 $u_C(0_+)=u_C(0_-)$ 并还原瞬时电流，`INDUCTOR` 以 `IND_HOLD_G` 保持 $i_L(0_+)=i_L(0_-)$。
   - 在 [useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts) 的 `updateComponentProp`、`recomputeInstant`、`resetSimulationTime`、`undo`、`addComponent`、`spawnCustomIc`、`addWire`、`removeEntity` 与无预热 `loadCircuit` 中传入 `{ zeroDtMode: 'holdState' }`。在 `l7-s2` 暂停切换 `K1` 接地时，$V_C$ 维持在 `~10V`、$I_C$ 立即跃变为 `-10mA`，不再瞬跳 `0V` 或误记通关。

2. **示波器电流通道正确采样电流物理量与量纲，支持电压/电流独立双纵轴**
   - 新增 [scopeChannelMeta.ts](file:///e:/codelearn/Circuit/src/engine/scopeChannelMeta.ts)，提供 `getScopeChannelMeta`、`extractScopeSampleValue`、`computeNiceScaleBound`、`formatScopeChannelValue`、`formatScopeAxisTick`，区分 `瞬时电压 V`、`有效值电压 V~`、`瞬时电流 A/mA` 与 `有效值电流 A~`。
   - 更新 [useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts) 的 `sampleScopeChannels` 采集 `tel.current` / `tel.iRms`（开关切换时当场记录一帧 $t=0_+$ 采样，切换 `dc/rms` 模式时清理旧量纲缓存）；更新 [BottomAnalysisDock.tsx](file:///e:/codelearn/Circuit/src/components/BottomAnalysisDock.tsx) 实现按量纲分轴自动缩放（电压与电流共存时左侧显示蓝底 `V` 刻度、右侧显示绿底 `mA`/`A` 刻度）并在图例中标明元件、测量量与单位；同步简化 [Workbench3DView.tsx](file:///e:/codelearn/Circuit/src/components/Workbench3DView.tsx) 中直流电流表/电压表 3D 标签显示（直流电流表仅显示电流，不再显示 `-0.00V`）。

3. **区分储能无功交换与实际热损耗，修复无功补偿误报电感/电容过载**
   - 在 [componentCatalog.ts](file:///e:/codelearn/Circuit/src/engine/componentCatalog.ts) 为 `CAPACITOR` 增加默认 `maxVoltage: 450`（V），为 `INDUCTOR` 增加 `maxCurrent: 8`（A），为 `TRANSFORMER` 增加 `maxCurrent: 15`（A）。
   - 在 [mnaSolver.ts](file:///e:/codelearn/Circuit/src/engine/mnaSolver.ts) 中，将 `CAPACITOR`、`INDUCTOR`、`TRANSFORMER` 的有功 `power` 修正为真实热损耗（理想电容热耗 `0W`，电感铜耗 $I^2 \cdot 0.02\,\Omega$，变压器副边铜耗 $I_2^2 \cdot 0.01\,\Omega$），无功交换/传输视在功率 `VA` 改放 `extraInfo`；抽出共享函数 `formatComponentOverloadWarning`，电容按峰值耐压 `maxVoltage` 判定，电感与变压器按载流上限 `maxCurrent` 及铜耗判定，并在 `advanceCircuitSimulation` 满足完整交流周期时按 RMS/平均有功重构 `result.warnings`。
   - 更新 [PropertyInspector.tsx](file:///e:/codelearn/Circuit/src/components/PropertyInspector.tsx) 暴露 `额定耐压 (V)` / `额定载流 (A)` 编辑项并准确标注 `热损耗 P` 与 `耐压裕度` / `电流负载`。

4. **RC/RL 暂态时间从开关切换动作开始计时，并展示初始储能值**
   - 在 [useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts) 新增 `TransientEventSnapshot`（`transientAnchor`），在加载、复位及开关/激励源阶跃操作时记录切换时刻 `t0`、`hasSwitched` 与换路瞬时 `initialCapVoltages` / `initialIndCurrents`。
   - 通过 [tutorialTypes.ts](file:///e:/codelearn/Circuit/src/tutorial/tutorialTypes.ts)、[useTutorialStore.ts](file:///e:/codelearn/Circuit/src/store/useTutorialStore.ts) 与 [TutorialCoursePanel.tsx](file:///e:/codelearn/Circuit/src/components/TutorialCoursePanel.tsx) 向课程公式传入 `elapsedSinceSwitch`、`hasSwitched` 与初值；在 [TutorialWorkspace.tsx](file:///e:/codelearn/Circuit/src/components/TutorialWorkspace.tsx) 传输栏增加 `[data-testid="tutorial-switch-dt"]`（`Δt=...s`）徽标，并更新 [lessonsCh3ToCh6.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsCh3ToCh6.ts) 的 `l7-s1`、`l7-s2`、`l7-s3`、`l8-s1` 动态公式展示。

### 验证结果

- **自动化测试与构建**（[tutorial.test.ts](file:///e:/codelearn/Circuit/tests/tutorial.test.ts) 新增 4 项回归测试后运行 `npm test` 与 `npm run build`）：
  - `vitest run`：4 个测试文件、38 项测试全部通过（`engine.test.ts` 17 项、`ponder.test.ts` 8 项、`api.test.ts` 4 项、`tutorial.test.ts` 9 项，耗时 8.94s）。
  - `tsc --noEmit && vite build`：零报错完成构建。
- **真实浏览器 `1280×720` 验证**（访问 `http://127.0.0.1:5173`，无控制台运行时报错）：
  - **场景 A（`l7-s1`）**：`K1` 接地空转至 `t=0.52s` 时公式提示 `待切换 K1 开始计时` 且不显示 `Δt`；切换至 `+10V` 后，传输栏显示 `Δt=0.94s`（`t=1.46s`），公式显示 `本次充电已进行 Δt=0.94s · 初值 0.00 V`。
  - **场景 B（`l7-s2`）**：`Vc=10.00V` 时点击暂停，在 `已暂停` 状态拨动 `K1` 接地，立即显示 `Vc ≈ 9.99V / 10.00V`、`Ic = -10.00 mA`，通关状态保持 `待完成`（累计 `5/36` 未误增）；步进至 `Vc = 9.27 V` 时，示波器 `[data-testid="scope-channel-pill-am_c"]` 显示 `CH2 PA_C 电流 · 瞬时电流: -9.27 mA`，画布左轴 `+12V / 0V / -12V`、右轴 `+12mA / 0mA / -12mA` 双波形清晰可见（见 [step_78_shot_1_screenshot_1_scenario_b.png](file:///C:/Users/%E8%93%9D%E6%B4%B5/.gemini/antigravity/brain/ea1deaa3-0525-4745-9f3e-ab4dab37a283/browser_sandbox/screenshots/step_78_shot_1_screenshot_1_scenario_b.png)）。
  - **场景 C（`l10-s2`）**：闭合 `K_comp` 达稳态后，`cosφ=1.00`、`CH1 PA_主干线 · 有效值电流: 1.12 A~`、`CH2 PA_电机支路 · 有效值电流: 1.54 A~`，所有支路状态为 `正常`、零过载/过流告警，版面无重叠裁剪（见 [final_step_86.png](file:///C:/Users/%E8%93%9D%E6%B4%B5/.gemini/antigravity/brain/57ff23a6-5208-4eb1-94d9-2a5a6f3f7e9a/browser_evidence/ea1deaa3-0525-4745-9f3e-ab4dab37a283/final_step_86.png)）。

验证用后台开发服务器及临时 `data/` 已全部清理关闭。如确认无误，需要提交当前 v0.4 改动或继续下一阶段开发请随时告诉我。
