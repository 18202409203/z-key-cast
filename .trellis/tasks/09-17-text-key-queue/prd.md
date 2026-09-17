# Text mode multi-key queue

## Goal

Text 预设下，按键不再「下一条立刻顶掉上一条」，改为从右入、向左走的多键条，每键独立 dwell，最多 N 个。

## Status

**规划未完成。** 仅从 design/03 grilling 拆出；**实现前必须再跑一轮 grilling**（N、修饰键、鼠/滚轮是否入队、动画细节）。

## Intent (provisional)

- 新键从右侧进入，旧键向左推移
- 每枚键（或每枚 chip）独立停留时长，到期淡出/移除
- 可见上限 N（具体值未定）
- 动机：连招/快捷键序列在录屏中可读

## Open questions (for next grilling)

- N 默认值？是否暴露设置？
- `Ctrl+Space` 算一条还是修饰+主键分条？
- 鼠侧 / `scroll` 是否进同一队列，还是键队与鼠槽分离？
- 与现有「键、鼠各最多 1 条」合同如何迁移？
- Lite 是否保持单槽、仅 Text 改队列？

## Out of scope until grilling closes

- 任何实现
- 与 `09-17-scroll-wheel-hud` 捆绑交付

## Acceptance Criteria

- [ ] AC0: grilling 收敛并写入本 PRD 锁定表后，再写 `design.md` / `implement.md`
- [ ] （其余 AC 待 grilling 后补）

## Complexity

Complex；P2；勿在未 grilling 前 `task.py start`。
