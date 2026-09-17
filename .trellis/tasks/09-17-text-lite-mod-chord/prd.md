# Text/Lite modifier chord commit

## Goal

Text/Lite 时间线区分「单独修饰键」与「修饰键 + 主键/鼠/滚轮」：单独按修饰键要可见；按住期间每次主键、鼠标、滚轮都算组合；有过组合后松手不再出裸修饰。

## Background

- 现状：`ChipReducer` 已跟踪 `held_mods` 并向 `key` 快照；Text/Lite `showChip` 忽略 `up` 与裸修饰 down（`hud-slots.svelte.ts` + `isModifierKeyId`）；`mouse`/`scroll` 无 `mods` → 单独 `⇧` 不占条，`⌘+滚轮` 只出滚轮。
- Full 用 held-set，本任务不改其仿真语义（可忽略 mouse/scroll 上的 `mods`）。
- 产品推翻原「裸修饰不占条」（`design/01.md` / `design/index.md` / presets AC6）。

## Requirements

- **R1** 延迟提交 + 消费标记（Text/Lite）：修饰键 **down 永不入队**；伴随事件（非修饰主键 down / 鼠标 down / 滚轮）入队并快照 mods，且把该条上出现的所有修饰 id（`mods[]` 与若 `key` 本身是修饰）标为 **本轮已消费**；修饰键 **up**：未消费则入队展示用 key chip（见 R1b）；已消费则静默。
- **R1b** 未消费修饰 up：入队 `key` chip，`key` = 刚松开的修饰，`mods` = **此刻仍按住的其他修饰**（exclude self），`phase: "down"`（仅供时间线展示；不改变线合同 ups 仍会到达，消费者对已消费 up 静默）。入队后消费该条上全部修饰 id。例：`⌘`→`⇧`→松`⇧` → 一条 `⌘+⇧` 并消费两者；再松`⌘`静默。仅一颗修饰 up 且无其他 held → 裸修饰一条。
- **R2** 修饰按住期间每一次伴随事件都带当前 `held_mods`（含换向滚轮、连点）。消费只抑制该修饰松手裸条，不取消后续伴随的 mods。例：`⌘` 按住 → 上滚 → 下滚 → 每条都带 `⌘`；松`⌘`不再出裸`⌘`。
- **R3** 线合同：`HudChip` 的 `mouse` / `scroll` 增加 `mods: KeyRef[]`；Rust reduce 快照 `held_mods`；TS 类型、`isHudChip`、`formatHudLabel`、`hudCards`、Lite 展示同步。同版本前后端一起升（无旧 payload 兼容义务）。
- **R4** Text：鼠/滚标签 = `mods` 标签用 ` + ` 拼在现有鼠/滚文案前（`⌘ + Scr↑` / `⌘ + 滚↑`）；主键与裸/叠修饰沿用现 key 格式。
- **R5** Lite：key = KeyCard 行；鼠/滚 = 修饰 KeyCard(s) + timeline MouseSchematic 定帧（同一 timeline item）。
- **R6** Full：held-set / 滚轮脉冲不变；忽略 mouse/scroll 的 `mods`。
- **R7** Log：mouse/scroll 行能看到 mods（与 phase/direction 并列）。
- **R8** mods 排序沿用 ChipReducer（⌃ ⌥ ⇧ ⌘）；左/右分侧 id。
- **R9** 同向 scroll 队尾 refresh：同向 **且** mods id 多重集合相同才 refresh dwell；否则新条目。
- **R10** 更新 `design/index.md`（及过时「裸修饰不占条」摘要）、`.trellis/spec/tauri/cast-events.md`、`.trellis/spec/frontend/type-safety.md`。

## Out of scope

- Caps Lock 当和弦修饰
- 横向滚轮；改 64ms scroll coalesce
- Full 板面为滚轮单独高亮修饰（键盘 held-set 已覆盖按住态）
- 连击徽章 / 队列长度设置
- 裸修饰按住超时提前出条

## Decisions

- 裸/叠修饰 **仅在未消费的 up** 入队；down 先不显示；有伴随组合后松手静默。
- 多修饰叠按无主键/鼠/滚：松某一未消费修饰时出「仍按住 mods + 该键」，并消费该条全部修饰。

## Acceptance Criteria

- [ ] AC1: 单独按并松开一颗修饰 → 仅在 up 后出现一条裸修饰；按下未松无伴随 → 不出现。
- [ ] AC2: `⌘` 按住 → 上滚 → 下滚（可多次）→ 每条 scroll 带 `⌘`；松`⌘`无裸条。
- [ ] AC3: `⇧+S` / `⇧+点击` 只出组合条，无先行裸`⇧`；松`⇧`静默。
- [ ] AC4: `⌘`→`⇧`→松`⇧`→松`⌘` → 仅一条 `⌘+⇧`（或等价展示），无第二条裸`⌘`。
- [ ] AC5: Text 与 Lite 均能表达 mods+鼠/滚；Full 回归不破坏。
- [ ] AC6: `pnpm check` + Rust chip 单测（mouse/scroll 快照 mods）通过；spec/design 摘要已改。

## Complexity

Complex — 需 `design.md` + `implement.md` + 非空 jsonl；用户审阅后再 `task.py start`。
