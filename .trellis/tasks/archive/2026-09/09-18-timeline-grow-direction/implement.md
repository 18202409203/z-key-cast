# Implement — 固定 LTR 时间线

## Checklist

1. [x] Remove `TimelineGrow` / `timelineGrow` from TS settings + normalize/guards/helper.
2. [x] Remove Rust enum/field + tests; ignore leftover JSON if needed.
3. [x] Remove HudPanel control + i18n keys.
4. [x] HudView: fixed right-enter; strip align from contentCorner only; delete timeline-from-left path.
5. [x] Update cast-events.md / type-safety.md.
6. [x] `pnpm check` + `cargo test settings::`

## Validation

Manual: br/bl/tr/tl — always new on right; left corner old at left edge; no settings row for grow.
