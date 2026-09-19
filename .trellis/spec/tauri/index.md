# Tauri / Rust Core Guidelines

> Contracts for the Tauri shell, Rust input hooks, and emit/listen boundaries.

---

## Overview

This layer owns Rust-side modules under `src-tauri/` and the wire contracts shared with the Svelte overlay/main windows.

Durable settings live under `src-tauri/src/settings/` (`mod` facade + `types` / `store` / `capture` / `hud` / `locale` / `ripple`). Call sites keep using `settings::…`; do not reintroduce a flat `settings.rs`.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Cast Events](./cast-events.md) | `HudChip` / `HookStatus` / HUD style channel, capture toggles, platform cfg | Filled |

---

## Pre-Development Checklist

- [ ] Read [Cast Events](./cast-events.md) before changing emit payloads, channel names, or capture toggles
- [ ] Keep TypeScript `$lib/cast.ts` aligned with Rust `input/event.rs`
- [ ] Keep `$lib/settings.ts` aligned with Rust `settings/` (`types` + domain modules: capture + `HudStyleSettings` + `HudPositionSettings` + `uiLocale` + `uiAppearance`)
- [ ] Windows hooks live in `input/windows.rs` (LL); Linux/other stay on `stub` unless a dedicated task says otherwise
- [ ] `KeyRef` is `{ id }` only — display labels are frontend (`displayLabelForKeyId` / legend layout)

---

## Quality Check

- [ ] Payload shape matches `design/index.md` (`HudChip` with `phase` on key/mouse; `mouse`/`scroll` include `mods`; `scroll` without phase)
- [ ] Non-macOS non-Windows path is an explicit stub (`unsupported_platform`), not a fake hook
- [ ] Windows path uses `WH_KEYBOARD_LL` + `WH_MOUSE_LL` → same filter/reducer; `WM_MOUSEWHEEL` → scroll; drop `WM_MOUSEHWHEEL`; Win emits `cast://mouse-ripple` on primary-monitor L/R/M down when `mouseClickRipple` is on; Linux does not emit ripple
- [ ] `KeyRef` wire shape is `{ id }` only (no `label`)
- [ ] Key autorepeat / spam filtering happens before `cast://event` emit; scroll bursts coalesce before emit
- [ ] Chip reducer: emit bare mods + ups with `phase`; mouse/scroll snapshot `held_mods`; Text/Lite defer bare mods; Full held-sets may ignore mouse/scroll `mods`
- [ ] Capture toggles filter **after** reduce via `allows_chip`, not by skipping reduce; mouse **and** scroll require `captureMouse`; category drops use `ignoredMouseActions`
- [ ] `mouseClickRipple` is a peer of capture toggles; `cast://mouse-ripple` stays off `HudChip`; ripple window gated only by that flag
- [ ] Capture / HUD style / HUD position / locale / **appearance** commands have ACL permissions; saves preserve sibling `settings.json` fields (incl. `uiAppearance`)
- [ ] `cast://hud-style` hot-updates overlay dwell / `hudPreset` surfaces without restart
- [ ] `cast://capture-settings` hot-updates Overlay Full `showNumpad` without restart; `hasNumpad` does not gate `allows_chip` / ignore
- [ ] `cast://hud-place-mode` drives overlay drag affordance; non-place mode stays click-through
- [ ] `cast://ui-appearance` updates main `data-appearance` without restart; does not restyle overlay HUD colors
- [ ] Main X hides (not destroy); tray/Dock restore Main; tray Quit exits process; tray never toggles HUD; locale change refreshes tray labels
