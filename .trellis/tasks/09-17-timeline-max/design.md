# Design: timelineMax

## Contract

```ts
// HudStyleSettings
timelineMax?: number; // omit → 5; clamp 1..10
```

Rust: `timeline_max: u32` with `#[serde(default = "default_timeline_max")]` or Option in De + default 5 in assemble; `clamp(1, 10)`.

Channel: existing `cast://hud-style` — no new channel.

## Overlay

- Replace `TIMELINE_MAX` const with `timelineMax` from `style` (normalized).
- `pushTimelineChip` / trim loop uses current max.
- `applyStyle`: if `timeline.length > nextMax`, drop from front (oldest), clear those item timers, assign trimmed array.

## UI

- `HudPanel`: show when `hudPreset !== "full"` (same gate as dwell).
- Control: `<input type="range" min="1" max="10" step="1">` + label with `{n}`.

## Docs

- `design/03.md` timeline bullet; cast-events / type-safety ≤5 → configurable `timelineMax`.
