# Design: drag HUD position

## Boundaries

| Layer | Owns |
|-------|------|
| Rust `settings` | Persist HUD position mode; apply on load; optional helpers to compute corner coords |
| Rust / Tauri window | `set_ignore_cursor_events`, `set_position`, read `outer_position` / monitor |
| Main Settings UI | Corner select + Move HUD / Done; invoke position + place-mode commands |
| Overlay UI | While placing: visible drag affordance; `startDragging` or pointer → window move |

## Position contract

```ts
type HudCorner = "br" | "bl" | "tr" | "tl";

type HudPositionSettings =
  | { mode: "corner"; corner: HudCorner }
  | { mode: "custom"; x: number; y: number }; // physical pixels

// Persist under AppSettings, e.g. hudPosition; default { mode: "corner", corner: "br" }
```

Margins: keep current ~24× / 48y CSS-px × scale (match `lib.rs` today).

## Place mode

| Command / action | Behavior |
|------------------|----------|
| `start_hud_place_mode` | `overlay.set_ignore_cursor_events(false)`; set runtime armed flag; maybe emit channel for overlay chrome |
| `end_hud_place_mode` | Re-enable ignore cursor; clear flag; if window moved, persist as `custom` from `outer_position` |
| Corner change | Persist `corner`, compute position on current monitor, `set_position`; leave place mode unchanged (or force end — prefer leave unchanged if already placing) |

Drag implementation preference:

1. Overlay shows a drag handle / full-surface drag while place mode
2. Use Tauri `Window.startDragging()` on pointerdown (simplest on macOS) OR manual delta + `set_position`
3. On Done: read final `outer_position` → save custom

Main window owns Start/Done; overlay only participates when place mode is on (listen `cast://hud-place-mode` `{ active: boolean }`).

## Settings UI (Display section)

- Enable Corner `<select>`: BR / BL / TR / TL / Custom
  - Custom is selectable only as display of state — choosing Custom alone does nothing new; or disable selecting Custom manually (only via drag). **Prefer:** Custom option present, user cannot pick it from empty state (disabled option) unless already custom; selecting a corner always works.
- Button: «Move HUD» ↔ «Done» toggle

## Startup

Replace hardcoded BR in `lib.rs` with `settings::apply_hud_position(overlay)` after load.

## Compatibility

- Missing `hudPosition` → default corner BR
- Spec: extend settings notes in `cast-events.md` or settings section if present

## Trade-offs

| Choice | Why |
|--------|-----|
| Mode enum vs always x,y | Corners survive resolution changes |
| Done-only exit | Avoid accidental unlock end while testing position |
| startDragging | Less JS math; good enough for undecorated overlay |
