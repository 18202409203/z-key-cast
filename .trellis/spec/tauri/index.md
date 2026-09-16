# Tauri / Rust Core Guidelines

> Contracts for the Tauri shell, Rust input hooks, and emit/listen boundaries.

---

## Overview

This layer owns Rust-side modules under `src-tauri/` and the wire contracts shared with the Svelte overlay/main windows.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Cast Events](./cast-events.md) | `HudChip` / `HookStatus` / HUD style channel, capture toggles, platform cfg | Filled |

---

## Pre-Development Checklist

- [ ] Read [Cast Events](./cast-events.md) before changing emit payloads, channel names, or capture toggles
- [ ] Keep TypeScript `$lib/cast.ts` aligned with Rust `input/event.rs`
- [ ] Keep `$lib/settings.ts` aligned with Rust `settings.rs` (capture + `HudStyleSettings` + `HudPositionSettings` + `uiLocale`)
- [ ] Do not implement Windows/Linux hooks without a dedicated task

---

## Quality Check

- [ ] Payload shape matches `design/index.md` (`HudChip`, no public `phase`)
- [ ] Non-macOS path is an explicit stub (`unsupported_platform`), not a fake hook
- [ ] Key autorepeat / spam filtering happens before `cast://event` emit
- [ ] Chip reducer: bare mods no emit; primary/mouse down only
- [ ] Capture toggles filter **after** reduce via `allows_chip`, not by skipping reduce
- [ ] `mouseClickRipple` is a peer of capture toggles; `cast://mouse-ripple` stays off `HudChip`; ripple window gated only by that flag
- [ ] Capture / HUD style / HUD position commands have ACL permissions; saves preserve sibling `settings.json` fields
- [ ] `cast://hud-style` hot-updates overlay dwell, `persistVisible` pin surfaces, and chip CSS without restart
- [ ] `cast://hud-place-mode` drives overlay drag affordance; non-place mode stays click-through
