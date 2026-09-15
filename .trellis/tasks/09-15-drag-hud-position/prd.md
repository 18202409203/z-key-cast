# Drag to place HUD position

## Goal

允许用户拖拽决定 HUD 位置；现有四角预设可保留为快捷方式。

## Ordering

- After key-filter per roadmap；四角若已够用可降优先级。

## Requirements

- **R1** 可拖拽放置 overlay 内容锚点（在 click-through 约束下找可行交互，如临时解锁拖拽）
- **R2** 位置持久化
- **R3** 不破坏 always-on-top / 点击穿透的默认录屏行为

## Out of scope

- 多显示器精细策略超出「可用」

## Acceptance Criteria

- [ ] 拖到自定义位置后重启仍在
- [ ] 录屏时默认仍点击穿透
