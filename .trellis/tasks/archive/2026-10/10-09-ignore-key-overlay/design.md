# Ignore-key add overlay

## Boundary

Settings-window UI plus the existing ignore-capture arm. The keyboard map click-to-toggle path stays. Persist still goes through `set_capture_settings` only when the user clicks Confirm.

## Hook contract

`IGNORE_KEY_CAPTURE_ARMED` stays true across key events. `arm_ignore_key_capture` / `cancel_ignore_key_capture` are unchanged as the arm and disarm commands.

While armed, on macOS and Windows:

- Key or modifier **down**: emit `cast://ignore-key-captured` with `{ id }` and do not disarm.
- Key or modifier **down and up**: still `reduce` held mods, then skip `cast://event`.
- Mouse and scroll keep the normal emit path and do not disarm.
- The macOS Caps Lock synthetic up is also skipped while armed.

`take_ignore_capture` (consume-on-first-down) goes away. Call sites use `ignore_capture_armed()`.

The tap stays listen-only, so keys still reach the webview. The overlay swallows keydown and keyup so Space and Enter cannot activate Confirm or Cancel.

## UI

The overlay is a `position: fixed` layer from `CapturePanel`, covering the settings window including the tab bar. It is not a native `<dialog>` (those close on Escape).

States:

- No candidate: prompt only, Confirm disabled.
- Candidate already in `ignoredKeyIds`: label + id in `--app-danger`, a 12px `--app-muted` “already in the ignore list” line under the key, Confirm disabled. Each already-ignored key down remounts the label and id so a short CSS translate shake replays on those two lines only, including the same id again. The “already in the ignore list” line stays still and does not fade. A different id, or the same not-yet-ignored id pressed again, fades the label and id in over 160ms. Valid keys do not shake. `prefers-reduced-motion: reduce` disables both animations. This is not haptic feedback.
- Otherwise: label + id, Confirm enabled.

Confirm snapshots the id, disarms, then persists that id. A failed persist re-arms and shows the same candidate. Cancel, scrim click, window blur (`onFocusChanged`), and panel unmount disarm without writing.

## Compatibility

`cast://ignore-key-captured` stays `{ id }`. The frontend stops appending to the ignore list on that event.
