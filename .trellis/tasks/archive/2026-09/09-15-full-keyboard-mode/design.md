# Design notes: full keyboard mode

- Extend `keyboardDisplayMode` with `keyboard`
- Layout ids must match Rust `KeyRef.id` (`MetaLeft`/`Digit1`/`Numpad1`/…)
- Overlay window enlarged (760×320) so the map fits; mouse/status chips fall back to text/key-card rules
- Highlight set = `hudCards(chip)` ids; dwell unchanged
