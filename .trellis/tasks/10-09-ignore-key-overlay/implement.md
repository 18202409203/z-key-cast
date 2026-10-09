# Ignore-key add overlay

1. Replace `take_ignore_capture` with `ignore_capture_armed`. Suppress key up and down HUD emits while armed; emit `cast://ignore-key-captured` on each down. Update the capture unit test. Mirror the branch in `macos.rs` and `windows.rs`, including the Caps Lock synthetic up.
2. Capture panel: overlay with Cancel and Confirm, candidate state, pointer-only buttons, window focus-loss discard. Stop writing the ignore list from the capture listener.
3. i18n: replace-hint and Confirm, en and zh.
4. Update `.trellis/spec/tauri/cast-events.md` to the session-long arm.
5. Validate with `cargo test --lib ignore_capture` from `src-tauri`.
