# Full keyboard map display mode

## Goal

全键盘示意图：根据 `HudChip` 的稳定 `id`（含左右修饰）高亮对应键位。

## Ordering

- After key-card；depends on precise Left/Right and key ids from `09-15-hud-chip`.

## Requirements

- **R1** 展示模式含 `keyboard`
- **R2** 高亮目标键与 `id` 一一对应（含 Numpad、Backspace 等）
- **R3** 空闲淡出与现有 dwell 配置一致

## Out of scope

- 每应用布局；非标准键盘编辑器

## Acceptance Criteria

- [ ] 按下左/右修饰时高亮正确一侧
- [ ] Digit 与 Numpad 高亮不同键
