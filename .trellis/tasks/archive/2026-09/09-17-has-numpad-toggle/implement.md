# Implement: has-numpad-toggle

1. Rust: add `has_numpad` to `CaptureSettings` + `AppSettings` with default-false serde; wire store `from_runtime` / persist / tests (omit → false, explicit true roundtrip).
2. Emit `cast://capture-settings` on successful `set_capture_settings`.
3. TS: extend `CaptureSettings`, get/set, export channel + guard if needed.
4. `KeyboardMap`: `showNumpad` prop; conditional numpad column + CSS flex.
5. `keyboard-layout.ts`: helper for layout id set with/without numpad; CapturePanel off-board uses it.
6. CapturePanel: toggle + i18n en/zh; pass `showNumpad` to board.
7. Overlay `+page` / `HudView`: load + listen capture settings; pass through to Full map.
8. Validate: `pnpm check`, `cargo test` settings/capture as applicable.

## Rollback

Revert field + UI; old installs keep working with default true.
