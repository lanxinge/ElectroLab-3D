# AI 协作开发记录

这里整理了 ElectroLab 3D 从需求提出、原理联动和教学实验修正，到 v1.0 收尾的开发记录。保留用户输入、AI 可见回复、反馈与复测信息，便于结合代码版本阅读。

## 阅读入口

| 材料 | 内容 |
| --- | --- |
| [完整开发会话](01-full-history.md) | Antigravity 开发过程，13 条用户 Prompt、42 条 AI 可见回复，共 55 条消息 |
| [链路一：原理与仿真联动](02-principle-and-simulation.md) | 当前元件参数进入思索、独立仿真推进、公式与符号一致性 |
| [链路二：RC 暂态与教学](03-transient-teaching.md) | 课程建设、暂停换路时的储能状态、电流量纲与换路计时 |
| [链路三：555 与教学反馈](04-timer-and-feedback.md) | 重复触发、实测周期判定、完成记录与当前状态分离 |
| [Antigravity 结构化记录](antigravity-visible-history.json) | 保留消息顺序、角色、原文与 step 编号的 JSON |
| [Codex 评估与 v1.0 修复记录](codex-review-and-v1.json) | 3 个会话轮次、22 条可见消息，以及相应构建和测试输出 |

建议先阅读三条专题链路，再查看完整会话与结构化记录。`step` 沿用原始会话编号。

## 与代码版本对应

| 迭代内容 | Git 提交 |
| --- | --- |
| 当前实例解释、独立仿真层与公式校验 | [e863c68](https://github.com/lanxinge/ElectroLab-3D/commit/e863c68) |
| RC 放电符号与实例试算读数同步 | [e2b33e3](https://github.com/lanxinge/ElectroLab-3D/commit/e2b33e3) |
| 交互课程、暂态换路与示波量纲修正 | [b3207d6](https://github.com/lanxinge/ElectroLab-3D/commit/b3207d6) |
| 555 重复演示、实测频率与教学反馈 | [c632b3b](https://github.com/lanxinge/ElectroLab-3D/commit/c632b3b) |
| 工程导入、学习状态与界面流程收尾 | [65f2114 · v1.0](https://github.com/lanxinge/ElectroLab-3D/commit/65f2114) |

记录中的功能数量与测试结果对应各自开发阶段。当前功能与启动方式见[仓库首页](../../README.md)，仓库协作规则见 [AGENTS.md](../../AGENTS.md)。
