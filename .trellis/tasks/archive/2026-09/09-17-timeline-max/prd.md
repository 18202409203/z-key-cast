# Text/Lite timeline length setting

## Goal

用户可配置 Text/Lite 操作时间线可见条数上限（现写死 5），并持久化；Full 不受影响。

## Background

- `hud-slots.svelte.ts` 常量 `TIMELINE_MAX = 5`；满则丢最旧。原 text-key-queue 曾不暴露 N，现要开放。
- 样式通道已有 `HudStyleSettings` + `cast://hud-style`。

## Requirements

- **R1** 字段 `timelineMax: u32` / number：默认 **5**，范围 **1–10**，步进 1；Rust `clamp` + TS `normalizeHudStyleSettings`；缺省/非法 → 5（或 clamp 进范围）。
- **R2** HUD 面板控件（推荐 range，与 fontSize 同类），**仅 Text/Lite 显示**；Full 隐藏，值仍持久。
- **R3** Overlay Text/Lite 用 `style.timelineMax` 做入队截断；同向 scroll 队尾 refresh 不变。
- **R4** **调小 N 时立刻从队首丢掉多余项**（并清对应 idle timer），与满队丢最旧一致。
- **R5** i18n：预设 hint 与设置标签不再写死「最多 5」；标签可显示当前 N。
- **R6** 更新 `design/03.md`、cast-events / type-safety 中「≤5」表述。

## Decisions

- 默认 5；范围 1–10；步进 1；HUD 与 dwell 同区。
- 调小 N → **立即裁剪**最旧条目。

## Out of scope

- 时间线方向；分键/鼠上限；改 dwell 默认。

## Acceptance Criteria

- [ ] AC1: 无字段旧配置 → 上限仍为 5。
- [ ] AC2: Text/Lite 可调 1–10；入队满则丢最旧；调小立刻裁到 N。
- [ ] AC3: Full 无控件；切回 Text/Lite 保留已存值。
- [ ] AC4: `pnpm check` + settings clamp 相关测试通过；spec/design 摘要已改。

## Complexity

偏轻量；短 `design.md` + `implement.md` + jsonl 后可 `task.py start`。
