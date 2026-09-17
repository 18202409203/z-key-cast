# Design: Optional numpad on Full keyboard map

## Contract

Add `hasNumpad: bool` (camelCase) to capture settings; **default `false`**.

| Layer | Change |
|-------|--------|
| Rust `CaptureSettings` / `AppSettings` | Field `has_numpad`; serde `#[serde(default)]` → false |
| Runtime atomics / `from_runtime` | Persist + load with other capture fields |
| TS `CaptureSettings` | `hasNumpad: boolean`; get/set round-trip |
| `KeyboardMap` | Prop `showNumpad?: boolean` (default `true` for prop only when callers omit; callers pass capture value); hide `.numpad` + drop num flex when false |
| `keyboard-layout.ts` | `layoutKeyIds(showNumpad: boolean)` (or `LAYOUT_KEY_IDS_MAIN` + helper) so Capture off-board list matches visible board |
| Overlay | Load/listen capture settings; pass `showNumpad={hasNumpad}` into Full `KeyboardMap` |
| Capture panel | Toggle near keyboard/mouse capture; wire persist |

## Live sync

Emit `cast://capture-settings` with full `CaptureSettings` from `set_capture_settings` so Overlay (and Capture if needed) hot-updates without restart. Mirror `cast://hud-style` pattern.

## Non-goals

- Do not gate `allows_chip` / ignore list on `hasNumpad`
- Do not auto-detect hardware

## Compatibility

Old settings JSON without `hasNumpad` → `false`.
