# Tauri / Rust Core Guidelines

> Contracts for the Tauri shell, Rust input hooks, and emit/listen boundaries.

---

## Overview

This layer owns Rust-side modules under `src-tauri/` and the wire contracts shared with the Svelte overlay/main windows.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Cast Events](./cast-events.md) | `HudChip` / `HookStatus` payloads, channels, platform cfg boundary | Filled |

---

## Pre-Development Checklist

- [ ] Read [Cast Events](./cast-events.md) before changing emit payloads or channel names
- [ ] Keep TypeScript `$lib/cast.ts` aligned with Rust `input/event.rs`
- [ ] Do not implement Windows/Linux hooks without a dedicated task

---

## Quality Check

- [ ] Payload shape matches `design/index.md` (`HudChip`, no public `phase`)
- [ ] Non-macOS path is an explicit stub (`unsupported_platform`), not a fake hook
- [ ] Key autorepeat / spam filtering happens before `cast://event` emit
- [ ] Chip reducer: bare mods no emit; primary/mouse down only
