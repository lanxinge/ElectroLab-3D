# 链路三：555 重复触发、实测频率与教学反馈

来源：Antigravity 原始项目会话的可见消息索引。
会话：57ff23a6-5208-4eb1-94d9-2a5a6f3f7e9a

以下保持原文顺序。个人本机路径已替换为 <LOCAL_USER> / <PROJECT>；工具执行细节不在此消息索引内。

## 用户 Prompt · step 2298

555 一键演示不能重复触发。 首次成功，脉冲结束后再次点击无响应。当前动作只把开关设为 1，需要增加“复位、等待、重新触发”的过程。[对应代码 (line 1603)](C:/Temp/Circuit-v05-experience-3782f6a/src/tutorial/lessonsVol2DigitalMixed.ts:1603)

频率关卡应验证实际波形。 页面用公式算频率；按输出边沿测量，默认参数约为 1.31Hz／理论 1.39Hz，RB=10kΩ 时约为 4.59Hz／理论 4.81Hz。建议同时展示理论与实测值，并说明模型误差；通关应检查实际周期。[当前判定 (line 1695)](C:/Temp/Circuit-v05-experience-3782f6a/src/tutorial/lessonsVol2DigitalMixed.ts:1695)

教学反馈需要统一。 通关后继续操作，顶部保留完成记录，当前卡片却变回“待完成”；单稳脉冲自然结束也会如此。建议分别显示“本关已完成”和“当前实验状态”。555、阶梯波课程还应默认打开示波器，减少寻找面板的步骤。

部分教学名称需要更准确。 末课目前没有“风扇散热→温度下降”的反馈模型，称“温控联锁实验”更贴切；“闪存并行 ADC”也应改为“闪速／并行 ADC”。

## AI 可见回复 · step 2457

正在等待 `npm test` 与 `npm run build` 执行完成……

## AI 可见回复 · step 2465

正在等待 `npm test` 与 `npm run build` 完成……

## AI 可见回复 · step 2471

已启动浏览器验证子代理，正在 `1280×720` 分辨率下验证 555 可重复触发、实测频率校验、统一状态反馈、默认示波器及命名修正……

## AI 可见回复 · step 2488

已完成上述四项问题的修复与改进，并通过单元测试、生产构建与 `1280×720` 浏览器实机验证：

### 1. 555 单稳态一键演示支持任意状态重复触发
- **多步等待动作支持**：在 [tutorialTypes.ts](file:///e:/codelearn/Circuit/src/tutorial/tutorialTypes.ts#L60-L92) 与 [useTutorialStore.ts](file:///e:/codelearn/Circuit/src/store/useTutorialStore.ts#L118-L126) 中为 `autoDemo` 新增 `{ kind: 'wait', seconds }` 与 `settleSeconds` 能力。
- **复位—等待—重触发闭环**：将 `l24-s2`（[lessonsVol2DigitalMixed.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsVol2DigitalMixed.ts#L1602-L1612)）的一键演示改为 `sw_trig → 0`（复位）→ 等待 `1.25s`（让耦合电容 `C_trig` 经上拉电阻完全恢复充电，同时兼容脉冲中途点击时让前一次 `1.1s` 脉冲自然结束并放空 `Ct`）→ `sw_trig → 1`（重新产生负跳变触发）→ 推进 `0.60s` 停在脉冲高电平期。无论首次点击、脉冲结束后再次点击还是脉冲中途点击均可稳定重触发。

### 2. 555 无稳态频率关卡改为验证实际输出波形并展示模型误差
- **子步滞回边沿周期测量**：在 [mnaSolver.ts](file:///e:/codelearn/Circuit/src/engine/mnaSolver.ts#L2618-L2696) 中新增 `WaveformEdgeStats`，在子步推进（`h ≤ 2ms`）内通过 `2.0V / 3.0V` 施密特滞回与 `2.5V` 线性插值实时测量连续上升沿周期 `periodSec`、实际频率 `frequencyHz`、占空比及周期计数，并在修改元件参数或拓扑时（[useCircuitStore.ts](file:///e:/codelearn/Circuit/src/store/useCircuitStore.ts#L592-L595)）自动清空旧周期记录，杜绝仅改参数未形成真实波形即误判通关。
- **理论值与实测值并列展示 + 误差机理说明**：在 `l24-s3`（[lessonsVol2DigitalMixed.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsVol2DigitalMixed.ts#L1620-L1736)）中同时展示理想公式值与输出边沿实测值（默认 `RB=47kΩ` 实测约 `1.31 Hz` / 理论 `1.39 Hz`；`RB=10kΩ` 实测约 `4.55–4.59 Hz` / 理论 `4.81 Hz`），说明 `DIS` 放电管导通内阻（约 `12 Ω`）、比较器输入端微弱漏电与离散翻转过冲导致的周期延长，并将通关判定改为检查实际输出周期 `T_实 ≤ 0.25 s`（`f_实 ≥ 4.0 Hz` 且已完成完整周期）。

### 3. 统一教学通关记录与实时实验状态反馈，并默认打开示波器
- **拆分“本关已完成”与“当前实验状态”**：在 [TutorialCoursePanel.tsx](file:///e:/codelearn/Circuit/src/components/TutorialCoursePanel.tsx#L517-L616) 中将持久通关徽章（`本关已完成 ✓` / `待完成`，与顶部进度和步骤对勾严格一致）与实时状态框（`当前实验状态`：`达标运行中 ✓`、`自由调节 / 脉冲已结束（通关已保留）`、`待达标`）分离展示；单稳脉冲自然结束或通关后继续调参时，不再回退显示“待完成”。
- **555 与阶梯波等波形课程默认展开示波器**：将 `l24-s2`、`l24-s3`、`l25-s3`、`l22-s2` 的 `preferredAnalysisTab` 从 `'ac'` 修正为 `'telemetry'`，并为 `l24-s1`、`l25-s1`、`l25-s2` 预置 `scopeChannels`（[lessonsVol2DigitalMixed.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsVol2DigitalMixed.ts#L1448-L1451)、[lessonsVol2DigitalMixed.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsVol2DigitalMixed.ts#L2085-L2088)），进入课程即直接显示底部实时波形示波器；带电路前往自由仿真台时（[useTutorialStore.ts](file:///e:/codelearn/Circuit/src/store/useTutorialStore.ts#L211-L216)）亦自动保持分析示波面板开启。

### 4. 修正课程与关卡专业术语名称
- 在 [curriculumIndex.ts](file:///e:/codelearn/Circuit/src/tutorial/curriculumIndex.ts#L134-L142) 与 [lessonsVol2DigitalMixed.ts](file:///e:/codelearn/Circuit/src/tutorial/lessonsVol2DigitalMixed.ts#L2145-L2470) 中：
  - 将误译的 `闪存并行 ADC` 统一改为 **`闪速／并行 ADC`**；
  - 将无温度回落热反馈模型的第 14 章末课由 `混合闭环` / `闭环温控` 统一改为 **`温控联锁实验`**，并在实验说明中明确标注当前为开环温度比较 + 数字安全联锁驱动实验。

### 验证结果
- **自动化测试与构建**：新增专项回归测试 [tutorial.test.ts](file:///e:/codelearn/Circuit/tests/tutorial.test.ts#L429-L511)，运行 `npm test`（4 个测试文件共 **49** 项测试全部通过）与 `npm run build`（`tsc --noEmit && vite build` 零报错通过）。
- **浏览器实机验证（`1280×720`）**：验证了 `l24-s2` 脉冲结束后保持 `本关已完成 ✓` 且无须手动复位即可二次触发、`l24-s3` 理论/实测双读数与实测周期通关、`l25-s3` 默认展示阶梯波示波器，以及第 26 课 `闪速／并行 ADC` 与 `温控联锁实验` 文案显示正常（控制台 `0` 报错）。

## 用户 Prompt · step 2489

提交

## AI 可见回复 · step 2497

已完成本地提交（未推送远端）：

- **分支与提交**：`main` · `c632b3b` (`feat: ElectroLab 3D v0.6 首页入口、交流双向流动效、辉光编码与图灵完备组件及555教学体验修复`)
- **变更统计**：`31 files changed, 3482 insertions(+), 182 deletions(-)`（含新增 [LandingHomeView.tsx](file:///e:/codelearn/Circuit/src/components/LandingHomeView.tsx) 等 `v0.6` 功能与本轮 555 重复触发、实际波形周期校验、统一状态反馈、默认示波器及第 14 章术语修正，共 49 项自动化测试通过且工作区已清空 `nothing to commit, working tree clean`）。
