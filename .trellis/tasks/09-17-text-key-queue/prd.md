# Text / Lite key timeline queue

## Goal

Text **与** Lite 下，键盘展示从「单槽 current」改为「长度 ≤ N 的时间线队列」：新键从右入、旧键左移，每枚独立 dwell。动机：连招/快捷键序列在录屏中可读。Text 与 Lite 对键盘几乎同构（纯文本 vs 带样式），队列应对两者一致。

## Status

**规划中（grilling）。** 勿 `task.py start`，直至锁定表收口并写出 `design.md` / `implement.md`。

## Locked decisions

| 项 | 选择 |
|----|------|
| 预设范围 | **Text + Lite** 都用键盘时间线；Full 不变（held-set） |
| 心智模型 | 旧 = 槽/current（N=1）；新 = 时间线（可见序列长度 N） |

## Intent (provisional)

- 新键从右侧进入，旧键向左推移
- 每枚键（或每枚 chip）独立停留时长，到期淡出/移除
- 可见上限 N（具体值未定）
- Text / Lite 键盘路径共享同一队列语义；视觉仍跟各自表面（text chip vs key-card）

## Open questions (grilling)

- **是否再开「current | timeline」用户模式？**（本轮讨论中）
- N 默认值？是否暴露设置？N=1 是否等价恢复旧槽行为？
- `Ctrl+Space` 算一条还是修饰+主键分条？（线合同已是单条 `mods+key`）
- 鼠侧 / `scroll` 是否进同一时间线，还是键队与鼠槽分离？
- Lite 示意面与键盘时间线如何共存（布局）

## Out of scope until grilling closes

- 任何实现
- 与已交付的 `09-17-scroll-wheel-hud` 捆绑改合同

## Acceptance Criteria

- [ ] AC0: grilling 收敛并写入本 PRD 锁定表后，再写 `design.md` / `implement.md`
- [ ] （其余 AC 待 grilling 后补）

## Complexity

Complex；P2；勿在未 grilling 前 `task.py start`。
