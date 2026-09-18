# Windows click ripple

## Goal

在 Windows 上复用现有主屏点击涟漪：开 `mouseClickRipple` 后，主屏 L/R/M **down** 在点击处播环；与 `captureMouse` / HudChip 解耦。

## Background

- macOS 已交付（`09-16-mouse-click-ripple`）：独立 `ripple` 窗、`cast://mouse-ripple`、`MouseRippleEvent`、Settings 开关。
- Windows `WH_*_LL` 已交付；`input/windows.rs` 未 emit ripple。
- Settings / `sync_ripple_window` / `/ripple` 已跨平台；本任务只补 Win 坐标 → channel。
- 验收：负责人 Windows 真机自测；本任务 agent **不强制**实机 smoke。

## Decisions

| Topic | Choice |
|-------|--------|
| 产品范围 | **严格对等 macOS**：仅主屏、同一 channel/开关/固定环；无额外能力 |
| Settings / UI / 视觉 | 不改 |
| 事件合同 | 不改 `HudChip`；复用 `cast://mouse-ripple` |
| 真机测试 | 负责人自测；不进 agent AC |
| Linux | 不做 |

## Requirements

### R1 — Emit on Windows mouse down

`WH_MOUSE_LL` 在 L/R/M **down** 且 `mouseClickRipple` 开时，向 ripple 窗 emit `cast://mouse-ripple`；外接屏丢弃；不改 `HudChip` / `cast://event`。

### R2 — Coord parity

屏幕点 → **主屏 top-left 局部 CSS/逻辑 px**，与 macOS / `/ripple` 的 `left/top` 一致（含 DPI：物理点 ÷ `scale_factor`）。

### R3 — No new Settings / UI

不新增开关或样式。

### R4 — Docs / spec

更新 `design/index.md`、README（en/zh）、`.trellis/spec/tauri/`：Windows 涟漪已交付；Linux 仍 deferred。

## Acceptance Criteria

- [ ] AC1: Win 代码路径上，涟漪 on 时主屏 L/R/M down 会 emit；与 `captureMouse` 无关。(R1)
- [ ] AC2: emit 不走 `allows_chip`；`HudChip` 合同不变。(R1)
- [ ] AC3: 非主屏坐标不 emit。(R1, R2)
- [ ] AC4: macOS / Linux stub 无回归（现有 `cargo test` + 相关 cfg 编译）。(R1)
- [ ] AC5: docs/spec 标明 Win 已支持、Linux 未做。(R4)
- [ ] AC6: 真机 smoke 由负责人完成（不阻塞本任务 agent 收口）。

## Out of scope

- Linux 涟漪；外接屏 / 多屏；可配样式 / 轨迹 / 光标指示器
- 本任务内强制 Windows 实机测试
- 改 Settings 文案/布局；改 `HudChip` 或把坐标塞进 `cast://event`
