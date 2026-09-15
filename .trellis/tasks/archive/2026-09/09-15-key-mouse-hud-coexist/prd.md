# Keyboard and mouse HUD coexist

## Goal

键盘与鼠标 HUD 互不覆盖：两侧可同时可见，各自按展示模式渲染，互不打断。

## Ordering

- Child of `09-15-hud-roadmap`
- Depends on existing `HudChip` key/mouse 分流与 overlay 展示模式（text / key-card / keyboard / schematic）

## Confirmed (repo)

- Overlay 现为单槽 `active`：`showChip` 整条替换（`src/routes/overlay/+page.svelte`）
- Rust 仍按事件分别 emit key / mouse chip；捕获开关已独立
- Spec / design 原文写「同时最多 1 条」——本任务要改掉键鼠互斥部分

## Decisions

- **空闲淡出**：键、鼠各自计时、各自淡出；一侧新事件不重置另一侧 dwell
- **布局**：竖排叠放；键盘在上、鼠标在下（右下角对齐不变）
- **Status**：hook offline 等 message 独占显示，清掉键/鼠两槽，dwell 后消失

## Requirements

- **R1** 键盘 chip 与鼠标 chip 可同时显示，后到的一侧不清除另一侧
- **R2** 各侧继续尊重 `keyboardDisplayMode` / `mouseDisplayMode`
- **R3** 同类事件仍单槽替换（新 key 替换旧 key；新 mouse 替换旧 mouse）
- **R4** 键/鼠独立 `dwellMs` 计时与淡出
- **R5** 竖排：键盘区在上、鼠标区在下
- **R6** status message 独占：清除两槽，单独 dwell

## Out of scope

- 键盘侧多条历史 / 鼠标侧多条历史
- 光标涟漪 / 轨迹
- 改 Rust chip 合并语义（前端双槽即可）
- 可配置键鼠叠放顺序
- status 与 chip 并存

## Acceptance Criteria

- [ ] 先按键再点鼠标：两侧同时可见，键盘在上、鼠标在下
- [ ] 先点鼠标再按键：两侧同时可见，顺序同上
- [ ] 仅一侧活动时行为与现网一致（含对应展示模式）
- [ ] 一侧超时淡出后，另一侧若未超时仍保持可见
- [ ] status 出现时键/鼠不可见；status 消失后需新事件才再显示 chip
