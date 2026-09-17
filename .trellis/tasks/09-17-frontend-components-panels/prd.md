# Frontend components and panels MVP

## Goal

Thin `src/routes/+page.svelte` by extracting reusable UI and per-tab panels under `$lib/`, with no user-visible behavior change.

## Background

- `+page.svelte` ~1583 lines: tabs, five panels, settings I/O, listeners, styles.
- Shared Svelte (`KeyCard`, `KeyboardMap`, `MouseSchematic`) sits flat in `$lib/` beside pure TS.
- Prefer `$lib/components` over top-level `src/components/` (remove unused empty dir).
- Sibling follow-ups: overlay split, Rust `settings.rs` split — out of this child.
- **Decision:** each panel owns its settings load/save and panel-local listeners (option 1).

## Requirements

- R1. Create `$lib/components/`; move `KeyCard`, `KeyboardMap`, `MouseSchematic` there; update all imports; delete unused `src/components/`.
- R2. Extract `Tabs.svelte` (items, value, aria label, arrow/Home/End keyboard nav, tab/tabpanel id wiring).
- R3. Extract `SegmentedControl.svelte` for repeated main-window radiogroups.
- R4. Extract five panels under `$lib/panels/` (`HudPanel`, `SettingsPanel`, `CapturePanel`, `LogPanel`, `AboutPanel`), each owning markup, panel-local styles, and its get/set persistence.
- R5. Keep panels **mounted** while inactive (hide via `hidden`/`inert` or equivalent)—do not `{#if}`-destroy panels that own long-lived listeners (log stream, ignore-key capture, place-mode cleanup). Preserve disarm-on-teardown for ignore capture when the **window** unloads.
- R6. Shell (`+page`) owns: brand, `Tabs`, `activeTab`, early **locale** state for tab labels (Settings panel loads/saves locale and notifies shell via callback), optional shared `appendLog` bridge if Log must receive lines from other panels’ save failures.
- R7. Behavior parity: persistence, capture/ignore-key, HUD place mode, locale, log stick-to-bottom, a11y roles/ids.
- R8. Document layout in `.trellis/spec/frontend/directory-structure.md`.

## Acceptance Criteria

- [ ] AC1. Shared UI imports use `$lib/components/...`; migrated Svelte files no longer live flat under `$lib/`.
- [ ] AC2. Main window uses extracted `Tabs` and `SegmentedControl` for prior duplicated patterns.
- [ ] AC3. Five panels under `$lib/panels/`; `+page.svelte` is shell + wiring only.
- [ ] AC4. Switching tabs does not drop log streaming or armed ignore-key capture; leaving the app still cancels ignore capture.
- [ ] AC5. Manual smoke: all five tabs + overlay still work; no intentional UX change.
- [ ] AC6. `.trellis/spec/frontend/directory-structure.md` describes components vs panels vs `$lib/*.ts`.

## Out of scope

- Overlay deep split (`09-17-overlay-structure-split`).
- Rust `settings.rs` split (`09-17-rust-settings-split`).
- New product features / visual redesign.
- Mandatory generic `Field` wrapper unless duplication is obvious during extract.
