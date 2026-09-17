# Implement: scroll-wheel-hud (pivot)

1. **Rust event/chip**: `ScrollDirection`, `RawInput::Scroll`, `HudChip::Scroll`; serde camelCase `kind: "scroll"`.
2. **Coalesce + gate**: `allows_chip` Mouse|Scroll → `captureMouse` only; after reduce drop via `ignoredMouseActions`.
3. **Settings**: remove `captureScroll`; add `ignoredMouseActions`; legacy `captureScroll: false` → `"scroll"`; runtime mutex like ignored keys.
4. **macOS / Windows**: subscribe + normalize vertical only; tests for reduce/coalesce/ignore filter + migration.
5. **TS cast**: extend `HudChip`, `isHudChip`, `formatHudLabel` / log formatter.
6. **hud-slots**: handle scroll — Text mouse text slot; Lite/Full pulse state; schematic visibility; no held-set.
7. **MouseSchematic + HudView**: wire pulse prop + tick animation.
8. **CapturePanel**: Keyboard vs Mouse sections; ignore L/M/R/Scroll; ripple independent.
9. **design/index.md** + specs (`cast-events`, type-safety, tauri index) sync.
10. Validate: `pnpm check`, `cargo test --lib` settings/input as applicable.

## Rollback

Revert scroll kind + ignoredMouseActions; restore prior capture docs if needed.
