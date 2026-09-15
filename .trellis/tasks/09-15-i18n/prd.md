# UI language Chinese/English

## Goal

设置与主要 UI 文案支持中英切换。

## Ordering

- Late roadmap；不阻塞录屏 HUD。

## Requirements

- **R1** UI 语言：中文 / English
- **R2** 键 cap `label` 策略明确（符号 ⌘ 可保持；文案型 label 随语言或保持符号优先——实现前在子 design 定）
- **R3** 语言选择持久化

## Out of scope

- 完整本地化平台；键 id 不随语言变

## Acceptance Criteria

- [ ] 切换语言后设置页/托盘等 UI 更新
- [ ] `HudChip.id` 不受语言影响
