# Type Safety

> Type safety patterns in this project.

---

## Overview

TypeScript (strict via SvelteKit) for the webviews. Shared wire types for Tauri events live in `$lib`, not in route files.

---

## Type Organization

| Kind | Location |
|------|----------|
| Cast / hook wire types | `src/lib/cast.ts` (mirror Rust `src-tauri/src/input/event.rs`) |
| Capture / HUD style invoke API | `src/lib/settings.ts` (mirror Rust `src-tauri/src/settings/`) |
| Main-window panel UI state | `$lib/panels/*.svelte` (shell keeps `activeTab`, locale mirror, shared `logLines`) |
| Overlay HUD slots / timers | `$lib/overlay/hud-slots.svelte.ts` (route owns listen + locale/place) |
| Ripple UI state | Colocated in `routes/ripple/+page.svelte` |

See also: [Tauri Cast Events](../tauri/cast-events.md).

---

## Validation

- Decode Tauri event payloads with `isHudChip` / `isHookStatus` / `isHudStyleSettings` / `isMouseRippleEvent` before use
- Do not trust `listen<T>(...)` generics alone — they are compile-time only
- Call capture / HUD style APIs only through `$lib/settings.ts`; do not inline invoke command names in routes
- Keep `HUD_STYLE_CHANNEL` (`cast://hud-style`) in `$lib/settings.ts` aligned with Rust `settings::HUD_STYLE_CHANNEL`
- Keep `CAPTURE_SETTINGS_CHANNEL` (`cast://capture-settings`) in `$lib/settings.ts` aligned with Rust `settings::CAPTURE_SETTINGS_CHANNEL`; decode with `isCaptureSettings` + `normalizeCaptureSettings` (omit `hasNumpad` → `false`; omit `ignoredMouseActions` → `[]`; legacy `captureScroll: false` → ensure `"scroll"` ignored)
- Keep `MOUSE_RIPPLE_CHANNEL` (`cast://mouse-ripple`) in `$lib/cast.ts` aligned with Rust `input::MOUSE_RIPPLE_CHANNEL`; ripple page must use `isMouseRippleEvent`
- `mouseClickRipple` (omit → `false`) is a peer of `captureKeyboard` / `captureMouse`; Settings checkbox always visible under Mouse section; does not gate HUD mouse chips; independent of `ignoredMouseActions`
- `ignoredMouseActions` (`"left"|"right"|"middle"|"scroll"[]`, default `[]`) drops matching mouse/scroll chips after reduce; scroll chips also require `captureMouse` (no separate scroll master toggle)
- `hasNumpad` (omit → `false`, Rust `#[serde(default)]`) is Capture hardware UI only: `KeyboardMap` `showNumpad` + `layoutKeyIds(showNumpad)`. Does **not** gate `allows_chip`, ignore list, or Numpad ignore category
- Key-card / full-keyboard rendering uses `hudCards()` + layout `id`s from `$lib/cast.ts` / `$lib/keyboard-layout.ts`; do not invent labels in the overlay
- Key-card / full-keyboard / text / schematic all use HUD `textColor` + `backgroundColor`/`backgroundOpacity`. Color presets Black/White set **colors only**; `backgroundOpacity` is a shared setting (always editable). Custom = custom text/bg colors. Matching a preset ignores opacity.
- `MouseSchematic` is a cropped pebble mouse-head (`src/lib/components/MouseSchematic.svelte`); `size` `"board"` \| `"timeline"`. Board (Full): resting body uses HUD `backgroundColor`/`backgroundOpacity` (same as keycaps); pressed L/R/wheel fills with `textColor` via `activeButtons` (multi-button OK); optional `scrollDirection` animates wheel ticks (~250ms) without clearing button highlights. Timeline (Lite queue): fixed `frame` L/R/M/scroll-up/scroll-down; height aligned to KeyCard via `fontSizePx`. Do not evenodd-punch wheel wells — the overlay is transparent, so holes show the desktop
- Legend layout preference: `keyboardLegendLayout` `auto|mac-us|win-us` (OS guess when auto). Prefer keycap glyphs (`↵`/`⌫`/`⌦`/`⇥`/`⇧`); Caps uses text `Caps` (not `⇪` — too similar to Shift `⇧` at HUD sizes). Word labels Title Case. `NumLock` legend is `Clr` (mac-us) / `Num` (win-us). Enter mark is unified as `↵` (U+21B5), not `⏎`. Meta Text/Log glyphs: `⌘` (mac-us) / `Win` (win-us) via `displayLabelForKeyId` — never read a payload `label`.
- `KeyRef` wire type is `{ id: string }` only; `isKeyRef` / `isIgnoreKeyCaptured` require `id`; all HUD/Log/ignore display strings come from id + resolved legend layout.
- Key/mouse relative arrangement: `keyMouseLayout` (`key-left-mouse-right` default; also `key-right-mouse-left`, `key-top-mouse-bottom`, `key-bottom-mouse-top`). **UI gate = Full only** (value still persisted); Text/Lite do not apply this layout (timeline is fixed LTR right-enter). Overlay Full keeps stable key→mouse DOM and uses CSS `flex-direction`/`order`; omit field → normalize/default. Do **not** flip `keyMouseLayout` by HUD dock corner — only the whole `.km-group` follows content anchor.
- Overlay content anchor: derive from `hudPosition` (`corner` → that corner; `custom` → stored `contentCorner`, omit → `br`) via `contentCornerFromPosition` + `cast://hud-position`; drives `.hud` / timeline / card-row / km-group justify+align. Text/Lite timeline is always LTR right-enter (newest on right; appear at right end of strip); strip horizontal pack follows content corner only (`bl`/`tl` → start / left = origin; `br`/`tr` → end / right = live edge). No left-enter / `row-reverse` / `timelineGrow`.
- `hudPreset` (`text`|`lite`|`full`, default `text`): replaces independent keyboard/mouse display modes and `persistVisible`. Text = operation timeline of text chips (key + mouse + scroll, length = `timelineMax` default 5 / clamp 1–10, per-item `dwellMs`; deferred modifier chord commit); Lite = same timeline with KeyCard + compact MouseSchematic frames (mods KeyCards before mouse/scroll schematic); Full = keyboard+schematic board always pinned with held-sets from up/down + scroll pulse (ignore dwell; ignore mouse/scroll `mods`). Main shell: HUD tab owns presentation (preset, km layout, legend, font, dwell, timeline length); Settings owns Theme/Position/Language. Hide font size, dwell, and `timelineMax` when Full; hide `keyMouseLayout` unless Full (values persist).
- `KeyboardMap` is shared: Overlay passes `activeIds` only (no click handlers). Capture ignore uses `interactive` + `ignoredIds` + muted `.key.ignored` (never `.active` for ignore). Off-board ignore rows = `ignoredKeyIds` minus `layoutKeyIds(hasNumpad)` (main-only when numpad hidden); Add-key capture remains the discovery path. Overlay Full and Capture both use `KEYBOARD_MAP_FONT_PX` / `KEYBOARD_MAP_WIDTH_PX` (not HUD chip `fontSizePx`) so the Full board matches Capture scale.
- Main Settings shell: content column `--shell-max: 560px` centered (`margin-inline: auto`); default window `600×680` / `minWidth: 600`. Numpad and main board flex by `MAIN_LAYOUT_UNITS`:`NUMPAD_LAYOUT_UNITS` (not a fixed numpad px width).
- Public `HudChip`: `key`/`mouse` require `phase: "down"|"up"`; `mouse`/`scroll` require `mods: KeyRef[]`; `scroll` requires `direction` and **no** phase. `isHudChip` rejects missing/invalid phase on key/mouse, missing `mods` on mouse/scroll, and accepts scroll without phase. Text/Lite overlay: modifier **downs** never enqueue (clear that id from `consumedModIds`); companion key/mouse/scroll downs enqueue and mark all mod ids on the chip consumed; non-mod / mouse **ups** ignored; unconsumed modifier **ups** synthesize a display `key` chip (`phase: "down"`, `mods` = other held from wire) then consume; consumed modifier ups silent; shared timeline (`timelineMax`, default 5, clamp 1–10; shrink drops oldest immediately; same-direction scroll at tail refreshes dwell only when mods id multiset matches). Full uses held-sets + orthogonal scroll pulse (ignores mouse/scroll `mods`). Log shows key/mouse phases, scroll direction, and mods on mouse/scroll.

---

## Common Patterns

```ts
import { EVENT_CHANNEL, isHudChip, formatHudLabel } from "$lib/cast";

listen(EVENT_CHANNEL, (event) => {
  if (!isHudChip(event.payload)) return;
  showChip(formatHudLabel(event.payload, legendLayout));
});
```

---

## Forbidden Patterns

- Inline `as HudChip` / field fishing on `event.payload` in routes
- Duplicating channel string literals outside `$lib/cast.ts` / Rust `EVENT_CHANNEL` (and sibling channel consts)
- Omitting or inventing a non-`down`/`up` `phase` on key/mouse `cast://event` payloads
- Reusing `mouse.phase` for scroll direction instead of `kind: "scroll"`
- Putting click coordinates on `HudChip` / `cast://event` instead of `cast://mouse-ripple`
- Persisting or typing `keyboardDisplayMode` / `mouseDisplayMode` / `persistVisible` (use `hudPreset`)
