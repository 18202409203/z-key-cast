# Design: mouse click ripple

## Boundaries

| Layer | Owns |
|-------|------|
| Rust `input` (macOS) | On mouse down, read location; if `mouseClickRipple`, emit ripple event with coords + button |
| Rust `settings` | Persist `mouseClickRipple`; window show/hide follows **only** that flag (not `capture_mouse`) |
| Rust / Tauri window | Create/position `ripple` webview on primary monitor; `set_ignore_cursor_events(true)`; show/hide (or create/destroy) |
| Ripple UI (`/ripple`) | Listen channel; spawn CSS/SVG ring at local coords; auto-remove after animation |
| Main Settings | Toggle under mouse capture; always visible (grouping only; not gated by `captureMouse`) |
| Overlay HUD | **Unchanged** |

## Settings

```ts
// CaptureSettings (or sibling under same settings.json capture object)
type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  mouseClickRipple: boolean; // omit → false
};
```

- Persist with sibling fields; never wipe keyboard/mouse toggles.
- Settings UI: checkbox always visible under mouse capture (grouping only).
- Gate emit + window visibility on `mouseClickRipple` only; `captureMouse` / `allows_chip` stay HUD-only.

## Event contract

Do **not** extend `HudChip`.

```ts
// cast://mouse-ripple (name final in implement)
type MouseRippleEvent = {
  x: number; // physical px, relative to primary monitor origin (or global mapped into ripple window)
  y: number;
  button: "left" | "right" | "middle";
};
```

Emit only on mouse **down**, only when `mouseClickRipple`, only if point maps onto primary monitor bounds.

Coord mapping: prefer converting CGEvent location → primary-monitor-local so the ripple page can use `left/top` without multi-monitor math.

## Window lifecycle

| State | Behavior |
|-------|----------|
| App start, ripple off | No visible ripple window (prefer **lazy create** on first on) |
| Ripple on | Ensure window exists; size/pos = primary monitor; ignore cursor; show |
| Ripple off | Hide + optional destroy; stop emits |
| Display config change | Best-effort re-apply primary geometry when turning on / settings set |

Z-order: both `overlay` and `ripple` are always-on-top; ripple fullscreen should not block HUD visually (both transparent). Prefer keeping overlay above if platform allows; if not, rings under HUD corner is acceptable for MVP.

## Visual (fixed)

- Single expanding stroke circle, light/neutral color, ~300–450ms fade
- No Settings knobs; no per-button color difference required (optional subtle strength by button is unnecessary for MVP)
- Concurrent clicks: allow multiple rings; cap ~8 and drop oldest if needed

## Compatibility

- `cast://event` + reducer + overlay slots: untouched
- `allows_chip` / `captureMouse`: HUD mouse chips only; ripple ignores them
- Docs: update `design/index.md` HUD 约定 / 二期列表 when shipping
- Non-macOS: keep stub hooks; ripple emit path is macOS-only until a follow-up task
