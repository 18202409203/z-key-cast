# Design: HUD key/mouse layout presets

## Boundaries

| Layer | Change |
|---|---|
| Rust `HudStyleSettings` | New enum + field `key_mouse_layout` (`#[serde(default)]`, kebab-case values) |
| TS `src/lib/settings.ts` | Mirror type, default, `is*` / `normalizeHudStyleSettings` |
| Main Settings UI | New `<select>` near mouse/keyboard display controls |
| Overlay | Wrapper for key+mouse slots; CSS driven by layout value |
| i18n | Label + 4 option keys (en/zh) |

No new Tauri commands; reuse `get_hud_style_settings` / `set_hud_style_settings` + `HUD_STYLE_CHANNEL`.

## Contract

```ts
type KeyMouseLayout =
  | "key-left-mouse-right"   // default
  | "key-right-mouse-left"
  | "key-top-mouse-bottom"
  | "key-bottom-mouse-top";
```

Rust: `KeyMouseLayout` with `#[serde(rename_all = "kebab-case")]`, same variants; `Default` → `KeyLeftMouseRight`.

JSON field name: `keyMouseLayout` (camelCase via existing struct rename).

## Overlay layout

Render key and mouse blocks as children of a single `.km-group` (or always-present flex container when either is active):

| Layout | `flex-direction` | DOM / CSS order |
|---|---|---|
| `key-left-mouse-right` | `row` | key then mouse |
| `key-right-mouse-left` | `row` | mouse then key **or** key/mouse with `order` |
| `key-top-mouse-bottom` | `column` | key then mouse |
| `key-bottom-mouse-top` | `column` | mouse then key **or** `order` |

Prefer **stable DOM** (key block, then mouse block) + CSS `order` / `flex-direction` so Svelte `{#if}` transitions do not reorder siblings by mount sequence.

Parent `.hud` keeps dock alignment (`justify/align flex-end`). `.km-group` uses `align-items: flex-end` and `gap` matching current `10px`.

Solo visibility: only the active child mounts; group shrinks to content (AC5).

## Compatibility

- Old `settings.json` without field → Rust `Default` + TS `normalize` → `key-left-mouse-right`.
- Invalid string from hand-edited JSON: reject in TS guard / fall back in normalize; Rust serde fail → existing load-or-default path.

## Trade-offs

- Absolute order (no corner mirroring): simpler mental model; user can pick left/right preset if dock moves.
- CSS `order` vs swapping DOM: `order` keeps transitions predictable.

## Rollback

Revert the field + UI + overlay wrapper; omit field remains backward compatible with older app versions that ignore unknown JSON keys if any — new enum is additive only.
