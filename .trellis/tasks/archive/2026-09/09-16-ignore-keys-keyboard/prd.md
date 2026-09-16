# Ignore keys keyboard picker

## Goal

In Capture settings, ignore keys mainly by clicking a shared full-keyboard schematic; use Add key only to discover and list ids that are not drawn on that board.

## Background

- Overlay already renders `$lib/KeyboardMap.svelte` with press highlight via `activeIds`.
- Capture ignore today: category checkboxes + Add key (arm capture) + full flat id list (`src/routes/+page.svelte`).
- Persistence stays flat `ignoredKeyIds` (categories are frontend sugar). Contract: `.trellis/spec/tauri/cast-events.md`.
- Layout is a compact Mac-like subset (`$lib/keyboard-layout.ts`); off-board means set difference against that layout, not a pre-built catalog.

## Decisions

| ID | Decision |
|----|----------|
| D1 | Keep categories + board click-toggle + Add key (option C). |
| D2 | Stacked Capture ignore chrome: categories → board → Add key → list. No nested tabs / segmented switch. |
| D3 | List under board shows **only** ignored ids not on the layout (Add key discovery + category spill). |
| D4 | Capture ignored keys use a **muted** look (lower opacity / weaker border); do **not** reuse overlay `.key.active`. |

## Requirements

- **R1 — Shared board**: One `KeyboardMap` (extended) used by Overlay and Capture; no duplicated layout markup.
- **R2 — Ignore visualization**: Capture board marks layout keys present in `ignoredKeyIds` with muted styling (D4).
- **R3 — Click toggle**: Non-spacer keys toggle that id in `ignoredKeyIds` through existing `setCaptureSettings` persist path; disabled while `captureSaving` or `ignoreCapturing`.
- **R4 — Categories**: Existing category checkboxes remain; board and off-board list stay consistent with the flat id list.
- **R5 — Add key**: Arm/cancel press-to-add remains the discovery path for non-layout ids; Escape-as-data / Cancel-only exit unchanged.
- **R6 — Off-board list**: Removable list shows only `ignoredKeyIds` ∉ layout id set; omit empty-state scare copy when the only ignores are on-board.
- **R7 — Overlay unchanged**: Overlay keeps display-only press highlight; no click handlers.
- **R8 — Stacked order**: Fixed section order per D2.

## Out of scope

- Rust ignore filter / arm-capture contract changes.
- Expanding `keyboard-layout` to every normalize id.
- Mouse ignore / schematic picker.
- Nested Board|List navigation.
- Full ignored-id list that duplicates on-board keys.

## Acceptance Criteria

- [x] AC1: Overlay full-keyboard mode still uses the shared board; press highlight unchanged. (R1, R7)
- [x] AC2: Capture board shows muted ignored layout keys; click toggles ignore and persists. (R2, R3, D4)
- [x] AC3: Category presets still mutate `ignoredKeyIds`; board/list reflect the result. (R4)
- [x] AC4: Add key still arms capture; under-board list contains only off-layout ignored ids and supports remove. (R5, R6, D3)
- [x] AC5: Capture ignore UI is stacked (categories → board → Add key → off-board list) with no nested switcher. (R8, D2)
