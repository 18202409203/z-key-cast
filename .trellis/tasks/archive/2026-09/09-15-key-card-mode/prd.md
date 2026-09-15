# Key card display mode

## Goal

键盘展示模式增加 **key card**：每个物理键一张卡片样式（如分别显示 ⌘、Shift、A），仍消费 `HudChip` 的 `mods`/`key` `id`。

## Ordering

- After custom styles；depends on `HudChip` ids from `09-15-hud-chip`.

## Requirements

- **R1** 模式枚举含 `text` | `key-card`（默认 text）
- **R2** key-card 按 mods+key 渲染多卡，不重新发明键名
- **R3** 淡出/单条槽规则与 text 一致（除非本任务 PRD 修订）

## Out of scope

- 全键盘固定布局（`09-15-full-keyboard-mode`）

## Acceptance Criteria

- [ ] 可切换 text / key-card
- [ ] 组合键多卡顺序稳定、id 可追溯
