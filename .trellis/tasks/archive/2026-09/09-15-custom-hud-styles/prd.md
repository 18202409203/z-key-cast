# Custom HUD styles and dwell time

## Goal

用户可配置 HUD 字体大小/颜色、背景色/透明度、空闲停留时长（淡出前）。

## Ordering

- After `09-15-key-mouse-toggles`（建议序）；硬依赖 `09-15-hud-chip` 的单条 fade 行为。

## Requirements

- **R1** 可调：字号、文字色、背景色、背景透明度、dwell ms
- **R2** 默认值对齐 MVP（dwell=1000）
- **R3** 设置持久化并热更新 overlay

## Out of scope

- 皮肤市场；拖拽位置（另任务）

## Acceptance Criteria

- [ ] 修改样式后 overlay 立即反映
- [ ] 改 dwell 后空闲消失时间与设置一致
- [ ] 重启后设置保留
