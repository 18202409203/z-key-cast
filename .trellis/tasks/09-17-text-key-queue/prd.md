# Text / Lite operation timeline

## Goal

Text 与 Lite 的 HUD 从「键/鼠各一槽 current」改为「最多 5 条的操作时间线」：键、鼠键、滚轮同一队列，右入左移，每条独立 dwell。Full 仍为真实键鼠仿真。Lite = 样式化 Text（KeyCard + 缩小版 schematic 五态定帧），不再挂常驻整只 MouseSchematic 板。

## Background

- 现合同：Text/Lite 双槽顶替 + 共享 `dwellMs`；`scroll` 在 Text 进鼠槽；Lite/Full 有示意与滚轮脉冲（见已归档 `scroll-wheel-hud`）。
- 产品分层：Full = 仿真；Text = 极简操作顺序；Lite = 带样式的 Text。

## Requirements

- **R1** Text 与 Lite 共用同一时间线语义；Full 行为不变（held-set、键盘图、MouseSchematic、滚轮刻度脉冲）。
- **R2** 入队：`key`（非裸修饰 down）、`mouse` down、`scroll`；忽略 `up` 与裸修饰（沿用 Text/Lite）。
- **R3** 可见上限固定 **5**；满则新条目入队时立刻丢最旧；不暴露 N 设置；不另开 current|timeline 模式。
- **R4** 连发：主键/鼠键总是新条目；仅当队尾为同向 `scroll` 时刷新该条 dwell、不增枚数。
- **R5** Text：`formatHudLabel` 文本芯片（鼠键 `LMB`/`RMB`/`MMB`；滚轮 `Scr↑`/`Scr↓`，与方向键 `↑`/`↓` 区分）。Lite：`key` → KeyCard；`mouse`/`scroll` → **缩小版 MouseSchematic 五态定帧**（左亮 / 右亮 / 中亮 / 下滚 / 上滚），身高与 KeyCard 合拍；配色走与 KeyCard 相同的 HUD `textColor` / `backgroundCss`（随 Theme/HUD 外观）。
- **R6** 每条独立 `dwellMs`（现 HUD 设置）；到期移除并左移。
- **R7** status（hook offline 等）清空整队后独占；dwell 后空队。
- **R8** HUD「键鼠布局」仅 Full 显示；Text/Lite 隐藏；值持久。时间线方向固定右入左移。
- **R9** 动画最低：淡入/淡出 + 短 CSS 重排 transition；滑入轨迹非硬验收。
- **R10** 更新预设文案/示意卡含义，使 Lite ≠「按键卡片 + 鼠标示意图」。

## Out of scope

- `AxN` 连击计数徽章
- 暴露队列长度或时间线方向设置
- 改 Rust `scroll` 合同或 64ms coalesce
- Full 仿真路径改动
- 横向滚轮

## Technical notes

- 线合同 `HudChip` 不变；改动主要在 overlay 槽模型与 HudView/Lite 表面。
- Scroll 同向最快约 ~15.6 Hz（64ms leading-edge）；队尾 refresh 防刷屏。
- 和弦仍是单条 `mods[]+key`。

## Acceptance Criteria

- [ ] AC1: Text/Lite 连续按键可见最多 5 条，新键右入，满则丢最旧；各条独立按 `dwellMs` 消失。
- [ ] AC2: 鼠键与纵向滚轮与键同一队列；Text 为文本；Lite 为 KeyCard + 缩小 schematic 五态定帧（L/R/M/↓/↑）；无常驻整只示意板；配色随 HUD/Theme。
- [ ] AC3: 同向 scroll 撞队尾只刷新 dwell；换向或隔开其他条目则新条目。
- [ ] AC4: Full 行为与设置（含键鼠布局、示意、脉冲）不被破坏。
- [ ] AC5: Text/Lite 隐藏键鼠布局；status 清队独占。
- [ ] AC6: 预设 hint/示意与「Lite = 样式化时间线」一致；`pnpm check` 通过。

## Complexity

Complex；P2。Grilling 已收口 → 需 `design.md` + `implement.md` + jsonl 后再 `task.py start`。
