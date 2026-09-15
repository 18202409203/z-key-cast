# Key listen/ignore filter

## Goal

用户可配置监听哪些键，或忽略哪些键，减少录屏噪音。

## Ordering

- After display modes per roadmap；depends on stable key `id`s.

## Requirements

- **R1** 支持忽略列表和/或允许列表（实现时二选一或组合，在 design 阶段定）
- **R2** 过滤基于 `id`，在 emit chip 前生效
- **R3** 修饰键规则与「裸修饰不占条」不冲突

## Out of scope

- 按应用过滤

## Acceptance Criteria

- [ ] 忽略某键后该键不再出现 chip
- [ ] 设置可持久化
