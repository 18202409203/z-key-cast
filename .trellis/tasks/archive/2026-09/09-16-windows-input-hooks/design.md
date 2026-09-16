# Design: Windows input hooks + id-only KeyRef

## Boundaries

| Layer | Owns | Does not own |
|-------|------|--------------|
| `input/windows.rs` | LL hooks, VK/mouse → `RawInput` (id-only keys), hook-status | Display strings, ripple |
| `input/{chip,filter,event,macos}` | Shared reduce/filter; migrate off `label` | Legend glyphs |
| Svelte `$lib` | id → display via legend/OS; platform hookFailed copy | OS hooks |
| `stub.rs` | Non-macOS non-Windows | — |

## Module layout

```
input/mod.rs      cfg: macos | windows | stub
input/windows.rs  WH_KEYBOARD_LL + WH_MOUSE_LL
input/event.rs    KeyRef { id } only
```

Windows Cargo deps: `windows` crate with minimal hook features.

## Contracts (breaking)

**Before:** `KeyRef = { id: string, label: string }`  
**After:** `KeyRef = { id: string }`

- `HudChip`, ignore-capture channel, Rust serde, TS `isKeyRef` all align.
- Spec: update `cast-events.md` + frontend type-safety.
- Internal `RawInput::Key` carries `KeyRef` or just `id` + `is_modifier` — prefer id-only `KeyRef`.

## Display

- Single helper family: `displayLabelForKeyId(id, legendLayout)` / extend `legendForKeyId` + `formatHudLabel(chip, legendLayout)`.
- Overlay Text, main Log `formatLogLine`, key-card/KeyboardMap fallbacks, ignore-row labels: **no** reading payload.label.
- `keyboardLegendLayout: auto` supplies Win vs Mac modifier glyphs.

## Data flow (Windows)

```
SetWindowsHookEx(LL keyboard + mouse)
  → normalize to RawInput (ids)
  → filter → ChipReducer → cast://event
  → ignore-capture emits KeyRef { id } only
```

No ripple emit. Dedicated thread + message loop.

## Failure / elevated

- Install fail → denied + reason; Windows-specific i18n (not Accessibility).
- Elevated miss: accepted; optional short note in copy.

## Residual risk

- No live Windows smoke this round.
