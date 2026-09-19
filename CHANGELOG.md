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


## 1.3.0 (2026-09-16)

### Features

  - add keyboard-mouse app icon
  - add LL input hooks; KeyRef id-only

### Other

  - docs: split README into EN and zh-CN


## 1.3.1 (2026-09-17)

### Bug Fixes

  - hide hook jargon; cache status for late UI
  - unify mouse with key tokens
  - align mouse fill; drop board blur

### Other

  - refactor(settings): split Rust settings into modules
  - refactor(overlay): split HudView and slot runes
  - refactor(ui): extract components and panels
  - style(hud): drop full-board cast shadows


## 1.4.0 (2026-09-18)

### Features

  - anchor overlay content to position corner
  - unify settings panels with grouped form chrome
  - add Text/Lite timelineMax setting
  - defer Text/Lite modifier chords
  - Text/Lite shared operation timeline
  - scroll pulse and mouse ignore actions
  - optional numpad board, default off
  - schematic cards for preset and layout

### Bug Fixes

  - lock Text/Lite timeline to LTR right-enter
  - clear Text scroll-up arrow from wheel line
  - restore preset schematic morphs
  - tighten schematic mouse seam and text glyph

### Other

  - style(hud): drop Text/Lite cast shadows
  - docs(spec): release-kit owns CHANGELOG
  - docs(task): restore out-of-scope header on archived design/03 PRD
  - docs(task): close design/03 HUD UX backlog acceptance
  - docs(task): mark text-key-queue archived in design/03 map
  - docs(task): mark scroll-wheel-hud archived in design/03 map


## 1.5.0 (2026-09-19)

### Features

  - emit click ripple on Windows primary screen
  - main window appearance and Appearance tab

### Bug Fixes

  - shorten ripple and ignore-mouse hints

### Other

  - style(ui): modernize HUD/KM choice schematics
  - style(ui): polish chrome inset, tabs, choice cards
  - style(ui): drop shell brand; tighten padding
  - style(ui): crossfade dark/light appearance tokens


## 1.5.1 (2026-09-19)

### Features

  - hide settings on close, restore via tray

### Other

  - docs: add HUD screenshots to README


## 1.5.2 (2026-09-19)

### Bug Fixes

  - share background opacity across color presets
  - bake semi-transparent alpha into color presets
  - honor background opacity on Full keyboard/mouse
  - restore main theme color crossfade
  - stop preset card flash on theme/color change
  - stop checkbox flash and overlay focus steal

