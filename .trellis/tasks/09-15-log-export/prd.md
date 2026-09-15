# Export operation log

## Goal

导出一段操作步骤（chip 序列）便于分享或调试。

## Ordering

- Last in roadmap；depends on chip 流。

## Requirements

- **R1** 可导出最近一段 HUD/日志中的操作记录（格式在 design 定：JSON/文本）
- **R2** 导出内容基于 `HudChip`（含 id），非含糊截图
- **R3** 有条数或时长上限，避免无限缓冲

## Out of scope

- 完整会话回放播放器；云同步

## Acceptance Criteria

- [ ] 一次导出文件可被外部打开并辨认键鼠步骤
- [ ] 不含未授权的敏感窗口内容（仅输入 chip）
