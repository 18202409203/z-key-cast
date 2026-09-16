# Design: HUD persist never-fade

## Boundaries

| Layer | Change |
|---|---|
| Rust `HudStyleSettings` | `persist_visible: bool` (`#[serde(default)]`, default `false`) |
| TS `src/lib/settings.ts` | Mirror field, default, `isHudStyleSettings`, `normalizeHudStyleSettings` |
| Main Settings UI | Checkbox under dwell (`field-toggle`); dwell input stays enabled |
| Overlay | Pin-surface flags vs slot highlight; mode-aware idle timers |
| `MouseSchematic` | `button` optional / nullable for unpressed |
| i18n | Label + hint (en/zh) |

No new Tauri commands. Reuse `get_hud_style_settings` / `set_hud_style_settings` + `HUD_STYLE_CHANNEL`.

## Contract

```ts
type HudStyleSettings = {
  // existing fields…
  persistVisible?: boolean; // omit → false
};
```

JSON: `persistVisible` (struct `rename_all = "camelCase"`). Rust `bool` + `Default::default()` is `false`.

TS: if the field is present it must be `boolean`; omit is valid. `normalizeHudStyleSettings` fills `false`.

## Overlay: pin vs slot

Keep **highlight/content** in `keySlot` / `mouseSlot`. Persist only **pins the surface**.

```
pinKey   = persistVisible && keyboardDisplayMode === "keyboard"
pinMouse = persistVisible && mouseDisplayMode === "schematic"

showKeyboardMap    = pinKey || (keySlot && mode === "keyboard")
showKeyCards       = keySlot && mode === "key-card"
showMouseSchematic = pinMouse || (mouseSlot && mode === "schematic")

showKmGroup = !statusActive && (keySlot || mouseSlot || pinKey || pinMouse)
```

`KeyboardMap` already accepts empty `activeIds`. `MouseSchematic` must accept no button (no `.active` fills).

`keyMouseLayout` still applies when both sides are visible (slot or pin). Solo pin/slot: only that child mounts (no blank gap).

Status remains exclusive: `statusText` branch hides the km-group (including pins). After status dwell, pins return.

## Idle timers

`armKeyIdle` / `armMouseIdle` stay, but the timeout **does not unmount a pin**.

| persist | side mode | on idle |
|---|---|---|
| off | any | `slot = null` (current; unmounts) |
| on | `keyboard` / `schematic` | `slot = null` → highlights clear, pin stays |
| on | `text` / `key-card` | do **not** arm hide for that side |

`applyStyle` / persist toggle:

- Persist on + pin modes: surfaces appear even with empty slots; re-arm highlight timers only if a slot is present.
- Persist off: unmount pin-only surfaces; if a slot remains, arm dwell.

Do not skip status idle.

## Future up/down (out of scope, seam only)

Later persist mode will consume key/mouse **up** (and held) so highlights track physical state.

Do **not** invent a second highlight store. Follow-on should keep writing `keySlot` / `mouseSlot` (or the same `activeIds` derivation) and may skip schematic idle-clear once live up/down exists. Pin-surface flags stay independent of that.

## Compatibility

- Old `settings.json` without field → `false`.
- Invalid non-bool: TS guard rejects the emit; Rust serde fail → existing load-or-default.

## Trade-offs

- Dwell still enabled: schematic highlight duration remains user-controlled without a key-up protocol.
- Text persist ≠ schematic persist (last chip vs empty board): matches “常驻参考图” vs “空文本条没有意义”.
- Status covers pins: errors stay readable; pins resume after fade.

## Rollback

Revert the additive bool + UI + overlay pin flags. Omit field remains loadable.
