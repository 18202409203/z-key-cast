# HudChip contract + text HUD

## Goal

把 macOS 钩子产出的 raw 输入，在 Rust 侧合并为对外 **`HudChip`**；overlay 与 main 日志共用该合同，实现可录屏的单条 text HUD（空闲 1s 淡出），并纠正易混键的稳定 `id` / `label`。

## Background

- 前置：`archive/.../09-15-rust-input-hooks` 已提供全局捕获、`CastEvent` emit、overlay/main 订阅、Accessibility 状态。
- 父任务：`09-15-hud-roadmap` grilling 决策见父 `prd.md`。
- 现状：overlay 仍按 raw `CastEvent`（含 `phase`）推最多 3 条 chip，无空闲淡出。

## Decisions

| 项 | 选择 |
|----|------|
| 对外合同 | `HudChip`（结构化）；替换 `cast://event` 载荷语义 |
| 内部 | 可保留 raw 做状态机；不双写 raw 到前端 |
| 键盘 | 主键 down → chip；up 丢弃；裸修饰不占条 |
| 鼠标 | down → chip；up 丢弃 |
| 展示 | 默认仅当前 1 条 text；用 `label` 拼接即可 |
| 键身份 | `id` + `label`；修饰左右分立 |
| 淡出 | 前端空闲 1000ms；新 chip 重置 |
| Key 纠偏 | Backspace≠Delete；主区数字≠小键盘等，映射进 `id`/`label` |

## Requirements

- **R1** 定义 Rust + TS `HudChip`（`kind: key | mouse`；key 含 `mods: {id,label}[]` + `key: {id,label}`；mouse 含 `button`）；无 `phase`
- **R2** Rust 状态机：在现有过滤（autorepeat 等）之后产出 chip，经 `cast://event`（或文档化的等价 channel）emit
- **R3** 裸修饰键 alone 不 emit chip；带主键的组合在主键 down 时 emit 一次
- **R4** 鼠标 left/right/middle 仅 down emit
- **R5** overlay：订阅 chip → 单条 text；空闲 1s 淡出/清除；新事件重置计时
- **R6** main 日志：订阅同一 chip 合同，摘要可读（非 raw phase）
- **R7** 更新 `design/index.md` 与 `.trellis/spec/tauri/cast-events.md`（或后继文档）对齐 `HudChip`
- **R8** Key 映射纠偏：至少 Backspace / ForwardDelete 区分；DigitN vs NumpadN 区分；修饰 Left/Right 分立 id

## Out of scope

- key card / 全键盘 / 鼠标示意皮肤（后续子任务）
- 历史条数设置、自定义样式、键鼠分开关、键过滤、拖拽、i18n、日志导出
- 托盘 / 四角设置 UI（若已有则仅验证；缺失另开任务）
- Windows / Linux；对外 raw channel

## Ordering

- Depends on archived hooks work already in tree.
- Blocks later display-mode children that consume `HudChip.id`.

## Acceptance Criteria

- [ ] **AC1** macOS 上 `⌘+Shift+S`（或等价）仅在主键 down 出现一条 chip；松手不再刷第二条
- [ ] **AC2** 单独敲修饰键不出现 chip
- [ ] **AC3** 鼠标点击 down 出一条；up 不出；与键盘同一 HUD 槽
- [ ] **AC4** 停手约 1s 后 HUD 清空/淡出；连续输入期间保持可见并刷新
- [ ] **AC5** HUD 默认同时最多 1 条可见 chip
- [ ] **AC6** payload 无 `phase`；含稳定 `id`（含左右修饰、Backspace vs Delete、主区 vs 小键盘抽样可辨）
- [ ] **AC7** main 日志与 overlay 均基于 chip，无依赖 raw down/up 才能读懂
- [ ] **AC8** `cargo check` + 前端类型检查通过；相关 design/spec 合同已更新
