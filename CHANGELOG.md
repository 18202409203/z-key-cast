# Changelog

## 1.0.0 (2026-09-15)

### Features

  - macOS hooks emit HudChip to HUD (single text chip, idle fade)


## 1.1.0 (2026-09-16)

### Features

  - replace keyboard/mouse display modes with Text · Lite · Full presets
  - emit HudChip down/up phases (Full held-set highlights; Log both)
  - add persist-visible HUD pin
  - add key/mouse layout presets
  - add en/zh locale switching
  - corner presets and drag-to-place
  - ignore keys by id with category presets
  - crop mouse schematic to pebble head
  - let keyboard and mouse HUD slots coexist
  - add independent mouse schematic display mode
  - drive all display modes from color presets
  - add US ANSI key legends with OS layout guess
  - add full keyboard highlight display mode
  - add key-card keyboard display mode
  - add configurable style and dwell settings
  - split main window into Settings/Log/About tabs
  - add keyboard/mouse capture toggles
  - emit HudChip with single-chip fade

### Bug Fixes

  - stop label clicks opening color pickers
  - stop settings horizontal scroll and label wraps

### Other

  - refactor(ui): reorganize settings, add Capture tab
  - docs(task): defer log-export to backlog
  - docs(task): plan UI i18n
  - docs(task): plan drag HUD position
  - docs(task): plan key-filter ignore list


## 1.2.0 (2026-09-16)

### Features

  - split HUD tab from Settings shell
  - replace display modes with Text/Lite/Full presets
  - add macOS primary-screen click rings
  - pick ignore keys on shared board

### Bug Fixes

  - pin Full mouse size; show dwell range
  - size Full keyboard like Capture board
  - clarify special-key legends with glyphs
  - align mouse schematic with keycap colors

