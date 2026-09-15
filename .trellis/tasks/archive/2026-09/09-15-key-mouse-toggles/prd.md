# Independent keyboard/mouse capture toggles

## Goal

设置中可分别开关「监听键盘」「监听鼠标」，互不影响。

## Ordering

- After `09-15-hud-chip`（chip 流已稳定）。

## Requirements

- **R1** 两个独立布尔设置，默认均开
- **R2** 关闭一侧时，该侧不产出 `HudChip`（或等价不展示）
- **R3** 设置变更立即生效，无需重启

## Out of scope

- 按应用过滤；键级白名单（见 `09-15-key-filter`）

## Acceptance Criteria

- [ ] 关键盘后仅鼠标 chip；关鼠标后仅键盘 chip
- [ ] 双关则 HUD 无新 chip；开回立即恢复
