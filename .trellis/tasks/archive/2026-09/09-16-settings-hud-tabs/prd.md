# Restructure Settings/HUD tabs

## Goal

Split recording HUD controls from app-shell settings: a top-level **HUD** tab owns presentation behavior; **Settings** keeps Theme / Position / Language only. Reduce confusion from Appearance mixing font size with colors, and from font/dwell remaining visible when Full ignores them.

## Background (decided via grill)

- Capture is already its own tab; do not move it back into Settings.
- Theme colors are **shared across Text / Lite / Full** (one `textColor` + `backgroundColor`/`backgroundOpacity`); no per-mode colors.
- Full board / Full mouse schematic ignore chip `fontSizePx` (already shipped); Text/Lite still use it.
- Do **not** add a separate Theme tab.

## Requirements

- **R1** Top nav tabs (order): **HUD → Settings → Capture → Log → About**. Cold start default = **HUD**.
- **R2** Tab labels: en `HUD` / zh `呈现` for the new tab; other labels unchanged.
- **R3** **HUD** tab contents (order): HUD preset → key/mouse layout → legend layout (Lite/Full only, as today) → font size → dwell. Font size and dwell **visible only when preset ≠ Full**; stored values persist while hidden.
- **R4** **Settings** tab contents (order): **Theme** section (color preset + Custom text/bg/opacity) → **Position** → **Language**. Remove Appearance / former Presentation blocks from Settings. Theme section keeps an `h2` title (not flattened).
- **R5** Behavior/contracts unchanged except IA: same `HudStyleSettings` fields, channels, clamps; Theme still drives all three presets; Capture / Log / About unchanged.
- **R6** i18n: add nav label; rename Appearance → Theme (en/zh); drop or stop using orphaned Appearance strings as section titles.

## Out of scope

- Per-mode color themes
- Persisting last-selected tab across launches
- Changing dwell/font clamps or Full scale behavior
- Capture / ignore-key / ripple UX

## Acceptance Criteria

- [ ] AC1: Tab order is HUD, Settings, Capture, Log, About; app opens on HUD.
- [ ] AC2: HUD tab shows preset → km layout → (legend if Lite/Full) → font + dwell only for Text/Lite; switching to Full hides font + dwell without resetting values; switching back restores the same controls/values.
- [ ] AC3: Settings shows only Theme (with h2), Position, Language — no presentation/font/dwell there.
- [ ] AC4: Changing Theme (preset or Custom) still updates Text chips, Lite keycaps/mouse, and Full keyboard/mouse (shared colors).
- [ ] AC5: en/zh labels correct (`HUD`/`呈现`, Theme/主题); keyboard tab order / aria still valid for five tabs.

## Notes

- Grill consensus archived in this PRD; no further product forks expected before implement.
