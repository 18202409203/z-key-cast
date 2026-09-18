# Design: Windows click ripple

## Boundaries

| Layer | Owns |
|-------|------|
| `input/windows.rs` | 读 `MSLLHOOKSTRUCT.pt`；主屏判定 + 局部坐标；`mouseClickRipple` 开时向 ripple 窗 emit |
| `input/event.rs` / `$lib/cast.ts` | **不变** — 复用 `MOUSE_RIPPLE_CHANNEL` / `MouseRippleEvent` |
| `settings/ripple.rs` | **原则上不变** — 已有跨平台 lazy 主屏窗；仅当 Win 实机发现窗生命周期问题时再修 |
| `/ripple` + Settings UI | **不变** |
| Docs / spec | 去掉「Win 不 emit」表述；Linux 仍 deferred |

## Data flow

```
WH_MOUSE_LL (L/R/M DOWN)
  → MSLLHOOKSTRUCT.pt (screen)
  → if !mouse_click_ripple_enabled → skip
  → map to primary-local CSS px (or drop if outside primary)
  → ripple webview.emit(cast://mouse-ripple, { x, y, button })
  → /ripple CSS left/top ring
```

并行：`normalize_mouse` → `process_raw` → reducer → `allows_chip` → `cast://event`（与涟漪无关）。

## Coord mapping (Windows)

目标与 macOS / spec 一致：`x`/`y` = **主屏 top-left 的逻辑/CSS px**（无 Y 翻转）。

1. `app.primary_monitor()` → `position` / `size`（Tauri **physical**）+ `scale_factor`
2. `pt` 相对主屏物理原点：`local_phys = (pt.x - origin.x, pt.y - origin.y)`
3. 越界（相对 physical size）→ `None`（外接屏丢弃）
4. `local_css = local_phys / scale_factor` → emit

说明：`MSLLHOOKSTRUCT.pt` 与 Tauri monitor 几何在常见 Per-Monitor DPI 下按 **physical** 对齐；ripple 窗按 logical size 创建、前端用 CSS px，故必须 ÷ scale。macOS 侧 CGEvent 已是逻辑点，**不要**为了对齐去改 macOS。

可选：抽纯函数 `primary_local_from_screen_phys(...)` 便于单测；不必跨平台共享实现。

## Emit placement

在 `mouse_proc`（或等价、仍持有 `pt` 的路径）对 **Down** 调用 `maybe_emit_mouse_ripple`，**不要**把坐标塞进 `RawInput` / `HudChip`。

门控：仅 `settings::mouse_click_ripple_enabled()`；忽略 `captureMouse` / `allows_chip` / `ignoredMouseActions`。

窗不存在时：与 macOS 一样静默 return（依赖 Settings 开时 `sync_ripple_window`）。

## Compatibility

- 不改 channel 名、payload 字段、前端 guard
- 不改 Settings schema
- Linux stub 仍无 ripple emit
- 更新：`design/index.md`、README en/zh、`cast-events.md`、`tauri/index.md` Quality Check

## Risks

| Risk | Mitigation |
|------|------------|
| DPI 下环偏位 | physical→CSS ÷ scale；真机自测 100%/125%/150% |
| 多显示器原点为负 | 用 monitor.position 做差，勿假设 (0,0) |
| 窗未创建仍 emit | 与 macOS 同：无窗则 skip；开开关走 sync |
| 误改 HudChip | 坐标只走 ripple channel |
