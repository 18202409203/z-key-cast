# Implement: mouse click ripple

## Checklist

1. **Settings** — Add `mouseClickRipple` to TS `CaptureSettings` + Rust `CaptureSettings` / disk schema; omit→false; roundtrip tests; `set_capture_settings` preserves siblings and triggers ripple window sync.
2. **Window** — Register `ripple` route + webview config (or runtime `WebviewWindowBuilder`); primary-monitor geometry helper; click-through; lazy show when ripple on.
3. **Emit path** — macOS mouse down: read location; if `mouseClickRipple` ∧ on primary → `cast://mouse-ripple`; never attach coords to `HudChip`.
4. **Ripple page** — Minimal Svelte page: listen, render fixed ring animation, cleanup.
5. **Settings UI** — Checkbox under mouse capture (always visible); en/zh strings.
6. **Docs** — `design/index.md`: remove/adjust「不做光标涟漪」; note optional separate-layer ripple（macOS 一期、主屏、独立开关）.
7. **Validate** — `cargo test` settings/chip; manual: default off; ripple on → rings; captureMouse off + ripple on → rings without mouse HUD; HUD contract unchanged.

## Validation

```bash
cargo test --manifest-path src-tauri/Cargo.toml
# manual macOS: Accessibility on; Settings Capture toggles; click primary vs external
```

## Risks

| Risk | Mitigation |
|------|------------|
| Fullscreen transparent window cost / focus steal | lazy create; `focus: false`; ignore cursor |
| Coord space (global vs monitor-local, retina scale) | map explicitly to primary physical bounds; verify on Retina |
| Z-order vs HUD | accept rings under corner HUD for MVP |
| Accidental HudChip change | ripple-only channel; chip tests unchanged |

## Follow-up（非本任务）

- Windows 输入钩子 + 主屏坐标 → 复用 `cast://mouse-ripple` 与 ripple 窗/前端
- 外接屏、位置指示器（可选）

## Before `task.py start`

- [x] PRD converged
- [x] design.md + implement.md present
- [ ] User approves planning → then `task.py start`
