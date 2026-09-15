# HUD key/mouse layout presets

## Goal

Keyboard and mouse HUD chips keep a **fixed relative arrangement** when both are visible, configurable via Settings (four presets). No mount-order “fighting.”

## Background

Overlay HUD stacks independent `keySlot` / `mouseSlot` blocks in a column flex docked to a corner (`src/routes/overlay/+page.svelte`). Solo chips sit at the dock edge; a second chip pushes the first → perceived swap. Window dock (`HudPositionSettings`) is separate from in-HUD key/mouse order.

## Decisions

| Topic | Choice |
|---|---|
| Scope | Settings + four persisted presets |
| Default | `key-left-mouse-right` |
| Solo chip | Collapse empty slot (no reserved gap) |
| Dock mirroring | Absolute relative order; do **not** flip by corner |

## Requirements

### R1 — Preset contract

Add `keyMouseLayout` to `HudStyleSettings` (TS + Rust) with values:

| Value | Layout |
|---|---|
| `key-left-mouse-right` | row · key left · mouse right |
| `key-right-mouse-left` | row · key right · mouse left |
| `key-top-mouse-bottom` | column · key above · mouse below |
| `key-bottom-mouse-top` | column · key below · mouse above |

Omit → normalize/default to `key-left-mouse-right`.

### R2 — Settings UI

Select in main Settings (same pattern as keyboard/mouse display mode). en + zh i18n for label + four options.

### R3 — Overlay behavior

When both key and mouse content show, apply the selected flex direction + DOM/order (or CSS `order`). Solo key or solo mouse: single chip only. Live update via existing `HUD_STYLE_CHANNEL`.

## Acceptance Criteria

- [ ] AC1: Both visible → relative positions match preset; arrival order does not reverse them. (R1, R3)
- [ ] AC2: Changing preset in Settings updates overlay without restart. (R2, R3)
- [ ] AC3: Legacy settings without the field load and use default. (R1)
- [ ] AC4: en + zh strings for control + four options. (R2)
- [ ] AC5: Solo key or solo mouse → one chip, no blank sibling gap. (R3)

## Out of scope

- HUD window dock / place-mode changes
- New keyboard/mouse display modes
- Per-corner automatic mirroring of arrangement
