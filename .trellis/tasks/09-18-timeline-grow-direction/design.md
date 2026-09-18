# Design — 固定 LTR 时间线（移除 timelineGrow）

## Approach

Revert the grow-direction setting. Keep contentCorner for strip placement only.

| Concern | Behavior |
|---------|----------|
| Grow / animation | Always newest on the right; enter at right end; older shift left |
| Left corner | Strip `align` start; leftmost = older / origin; newest toward center |
| Right corner | Strip `align` end; rightmost = newest (live edge) |
| Legacy `timelineGrow` | Drop from types; serde/TS ignore unknown or strip on normalize |

## HudView

- Remove `timelineFromLeft` helper usage, `timeline-from-left` class, row-reverse, mirrored in/out signs.
- `timelineIn` / `timelineOut` always right-enter / left-exit signs.
- Timeline horizontal pack follows `hud-anchor-bl/tl` → start, `br/tr` → end (not grow flag).

## Files

settings.ts, types.rs, i18n, HudPanel, HudView, specs, tests that mention TimelineGrow.
