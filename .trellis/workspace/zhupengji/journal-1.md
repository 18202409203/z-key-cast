# Journal - zhupengji (Part 1)

> AI development session journal
> Started: 2026-09-15

---



## Session 1: macOS CastEvent input hooks

**Date**: 2026-09-15
**Task**: macOS CastEvent input hooks
**Branch**: `main`

### Summary

Implemented macOS CGEventTap → CastEvent emit to overlay HUD + main log; Accessibility status; light repeat filter. Spec: tauri/cast-events.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `60f2641` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Key-mouse HUD coexist

**Date**: 2026-09-15
**Task**: Key-mouse HUD coexist
**Branch**: `main`

### Summary

Split overlay into independent key/mouse slots with separate dwell timers; vertical stack; status exclusive. Spec/design updated.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `beacdf7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Mouse schematic top-half crop

**Date**: 2026-09-15
**Task**: Mouse schematic top-half crop
**Branch**: `main`

### Summary

Cropped MouseSchematic to a compact pebble mouse-head; L/R/wheel press fills with HUD textColor instead of stroke highlight.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `10fdf28` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: key-filter + drag HUD position

**Date**: 2026-09-15
**Task**: key-filter + drag HUD position
**Branch**: `main`

### Summary

Shipped ignore-key filter (categories + press-to-add) and HUD corner/custom drag-to-place with place-mode click-through safety.

### Main Changes

### Done
- key-filter: ignoredKeyIds, category presets, Add key capture, emit-path filter
- drag-hud-position: corner|custom persist, Move HUD/Done, abandon on exit
- Spec: cast-events updated for both

### Next
- 09-15-i18n then 09-15-log-export


### Git Commits

| Hash | Message |
|------|---------|
| `5b681c1` | (see git log) |
| `c91a73f` | (see git log) |
| `7c92b3e` | (see git log) |
| `8552a2f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: i18n done; archive filter/drag/i18n; log-export backlog

**Date**: 2026-09-15
**Task**: i18n done; archive filter/drag/i18n; log-export backlog
**Branch**: `main`

### Summary

Shipped en/zh UI; archived key-filter, drag-hud-position, i18n; deferred log-export to backlog.

### Main Changes

### Done
- Archived 09-15-key-filter, 09-15-drag-hud-position, 09-15-i18n
- Roadmap active path closed through #10 (i18n)
- 09-15-log-export marked BACKLOG (deferred)

### Left dirty
- design/02-ui.md (untracked polish notes; not committed)


### Git Commits

| Hash | Message |
|------|---------|
| `54bb082` | (see git log) |
| `a2cb71f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: HUD key/mouse layout presets

**Date**: 2026-09-15
**Task**: HUD key/mouse layout presets
**Branch**: `main`

### Summary

Fixed overlay key/mouse fighting with four persisted layout presets in Settings (default key-left-mouse-right).

### Main Changes

### Done
- Settings: keyMouseLayout select (4 presets), en/zh i18n
- Overlay: stable key→mouse DOM + CSS flex-direction/order; solo chips collapse
- Spec: type-safety.md note for keyMouseLayout
- Archived 09-15-hud-km-layout

### Testing
- [OK] npm run check; cargo test (23)


### Git Commits

| Hash | Message |
|------|---------|
| `b6973e8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
