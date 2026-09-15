# Design: key listen/ignore filter

## Boundaries

| Layer | Owns |
|-------|------|
| Rust `settings` | Persist `ignoredKeyIds`; runtime `HashSet` for O(1) lookup; extend `allows`/filter after reduce |
| Rust `input/macos` | Arm/disarm ignore-capture; consume next key/mod **down** without `cast://event` |
| TS `settings` + main UI | Category preset defs; Capture section UI; derive category checkbox state; persist list |
| TS `cast` | Optional channel + type for capture result (`KeyRef`) |

Category → id lists live in **frontend only** (toggle expands into `ignoredKeyIds`). Rust stores/filters the flat list only.

## Settings contract

Extend `CaptureSettings` / `AppSettings`:

```ts
type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  ignoredKeyIds: string[]; // default []; dedupe on set; order = UI order
};
```

Serde: `#[serde(default)]` so old `settings.json` loads cleanly.

Runtime: `Mutex<HashSet<String>>` (or `RwLock`) updated on load/`set_capture_settings`. Keep keyboard/mouse atomics as today.

## Emit-path filter

After `reduce`, before `allows_chip` (or combined):

```text
HudChip::Key { mods, key }
  if ignored.contains(key.id) → drop
  else mods = mods.filter(|m| !ignored.contains(m.id)) → emit (allows_chip still applies)
HudChip::Mouse → unchanged by ignore list
```

Held-mod reducer state always updates (same rationale as capture toggles).

## Add-key capture

1. UI: `invoke("arm_ignore_key_capture")` → armed flag true; show Cancel.
2. Cancel: `invoke("cancel_ignore_key_capture")` → disarm; no list change.
3. On next `RawInput::Key { phase: Down, key, .. }` (including modifiers via FlagsChanged):
   - Disarm
   - `emit("cast://ignore-key-captured", KeyRef)`
   - Continue reducer for held-mod correctness
   - **Suppress** any `cast://event` that would come from this raw (R7)
4. Main window listens → append `id` to `ignoredKeyIds` if new → `set_capture_settings`.
5. Escape while armed → same as any key (add Escape); does **not** cancel.

No timeout. Mouse events while armed: ignore for capture (do not disarm); mouse chips still follow captureMouse + normal path unless we suppress only key capture — prefer: mouse still emits normally during key-capture arm (capture is keyboard-only).

## UI (Capture section)

Below keyboard/mouse toggles:

1. Row of 7 category checkboxes (or compact toggles); state derived:
   - checked = all category ids ⊆ ignored
   - unchecked = none
   - indeterminate = partial (optional; if hard in native checkbox, treat partial as unchecked visually but toggle-on adds all)
2. List of ignored ids (label + id); each has remove
3. Add key / Cancel button pair when armed

## Channels / commands

| Name | Role |
|------|------|
| `arm_ignore_key_capture` | Arm |
| `cancel_ignore_key_capture` | Disarm |
| `cast://ignore-key-captured` | `{ id, label }` once per successful capture |
| `get/set_capture_settings` | Extended with `ignoredKeyIds` |

## Compatibility

- Old settings without `ignoredKeyIds` → `[]`
- Spec `cast-events.md` should gain ignore-list + capture-arm notes in Phase 3.3

## Trade-offs

| Choice | Why |
|--------|-----|
| Flat id list only in Rust | Simple persist; categories are UI sugar |
| Capture at RawInput down | Bare mods never become chips but must be capturable |
| Strip mods vs drop whole chip when mod ignored | Matches「忽略该键」without killing entire combo |
| Esc adds, Cancel only | Esc can be ignored; user accepted Escape-as-data |
