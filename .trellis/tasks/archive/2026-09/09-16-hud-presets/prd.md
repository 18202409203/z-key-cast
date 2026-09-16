# HUD presets: Text · Lite · Full

## Goal

Replace the keyboard × mouse display-mode cartesian product with three bundled HUD presets. Full is a always-on reference board with real up/down held-state highlighting; Text/Lite stay lightweight down+dwell overlays for normal recordings.

## Background

Settings currently expose independent `keyboardDisplayMode` (`text` | `key-card` | `keyboard`) and `mouseDisplayMode` (`text` | `schematic`), plus `persistVisible`. Competitors ship named modes/presets, not a 3×2 matrix. Grilling consensus: three presets are enough; Full ≡ persist + phase-accurate highlights.

`cast://event` today emits down-only `HudChip` (no `phase`); bare modifiers and ups are swallowed by `ChipReducer`. Full requires that contract to change in the same delivery (no half-finished “pinned board with dwell fake highlights”).

## Requirements

### R1 — Single preset field

- Persist `hudPreset: "text" | "lite" | "full"` on `HudStyleSettings` (default `"text"`).
- Remove user-facing / typed fields: `keyboardDisplayMode`, `mouseDisplayMode`, `persistVisible`.
- Migration: not a product concern; prefer latest shape. Reasonable best-effort map from old dual modes is OK; garbage → `"text"`.

### R2 — Preset bundles

| Preset | Keyboard surface | Mouse surface |
|--------|------------------|---------------|
| `text` | text chip | text chip |
| `lite` | key-card | schematic |
| `full` | full keyboard map | schematic |

### R3 — Behavior by preset

| | Text / Lite | Full |
|--|-------------|------|
| Surface pin | No | Always (empty board + empty mouse stay visible) |
| Highlight source | Last down chip; idle clear via `dwellMs` | Held-set from down/up (keys multi; mouse L/R/M multi) |
| Bare modifier | Does not occupy the text/key-card bar | Lights on the keyboard map while held |
| `dwellMs` | Controls chip fade | Ignored for highlights |

### R4 — Event contract

- Extend public `HudChip` with `phase: "down" | "up"`.
- Emitter always sends precise down/up (including bare modifiers and mouse ups), independent of preset.
- Consumers decide: Text/Lite ignore `up` and bare-mod-only downs for the bar; Full maintains held sets; Log records down and up.

### R5 — Settings UI

- One segmented control / radio: Text · Lite · Full (en + zh labels + short hints).
- Remove the two display-mode selects and the persist checkbox.
- When preset is Full, **hide** the dwell control (not merely disable).

### R6 — Overlay / components

- Derive show/pin flags from `hudPreset` only.
- Full: `KeyboardMap` `activeIds` = currently held key ids; `MouseSchematic` supports **multiple** pressed buttons at once.
- Status exclusivity unchanged (covers pins while shown).
- `keyMouseLayout` still applies when both sides are visible.

### R7 — Spec / docs

- Update `.trellis/spec` (cast-events / frontend type-safety as needed), `design/index.md` HudChip sketch if still authoritative, and i18n strings.

## Out of scope

- New fourth preset; advanced “split keyboard/mouse style” again.
- Cursor ripple / capture toggles changes (orthogonal).
- Perfect multi-monitor held-state edge cases beyond current hook fidelity.
- Caring about lossless migration of every legacy combination.

## Acceptance Criteria

- [ ] AC1: Settings expose only Text / Lite / Full; no dual mode selects; no persist checkbox.
- [ ] AC2: Default preset is Text; dwell visible; behavior matches today’s text+text down+dwell (plus any phase field ignored by overlay).
- [ ] AC3: Lite shows key-card + schematic; no pin; dwell fades chips/highlights as today for non-Full.
- [ ] AC4: Full always shows keyboard + mouse schematic with no prior input; highlights follow physical hold; release clears that key/button; dwell control hidden and unused.
- [ ] AC5: `cast://event` payloads include `phase`; bare mod and mouse up emit; Log lists down and up.
- [ ] AC6: Text/Lite bar still does not show bare-modifier-only presses.
- [ ] AC7: Types/settings no longer require `keyboardDisplayMode` / `mouseDisplayMode` / `persistVisible`; specs updated.
- [ ] AC8: Single delivery — no ship of Full pin without up/down held-set.

## Notes

- Grilling decisions archived in session; this PRD is the source of truth for the task.
- Related history: archived `09-15-hud-persist`, `09-15-mouse-schematic`, `09-15-full-keyboard-mode`, `09-15-key-card-mode`.
