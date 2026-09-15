# Mouse schematic display mode

## Goal

鼠标展示模式：绘制鼠标外形，左/中/右键区域随 `HudChip` mouse 事件高亮；保留 text 模式。

## Ordering

- After full-keyboard（路线图序）；depends on mouse `HudChip`.

## Requirements

- **R1** 模式 `text` | `schematic`（鼠标侧）
- **R2** schematic 高亮与 button 枚举一致
- **R3** 与键盘展示模式可独立（若键鼠分开关已存在则尊重）

## Out of scope

- 光标涟漪 / 轨迹

## Acceptance Criteria

- [ ] 左中右点击高亮对应区域
- [ ] 可切回 text（如 `Mouse · Left`）
