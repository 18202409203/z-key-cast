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
| Capture / HUD style invoke API | `src/lib/settings.ts` (mirror Rust `src-tauri/src/settings.rs`) |
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
- Keep `MOUSE_RIPPLE_CHANNEL` (`cast://mouse-ripple`) in `$lib/cast.ts` aligned with Rust `input::MOUSE_RIPPLE_CHANNEL`; ripple page must use `isMouseRippleEvent`
- `mouseClickRipple` (omit → `false`) is a peer of `captureKeyboard` / `captureMouse`; Settings checkbox always visible under mouse listen; does not gate HUD mouse chips
- Key-card / full-keyboard rendering uses `hudCards()` + layout `id`s from `$lib/cast.ts` / `$lib/keyboard-layout.ts`; do not invent labels in the overlay
- Key-card / full-keyboard / text / schematic all use HUD `textColor` + `backgroundColor`/`backgroundOpacity` (presets Black/White or custom)
- `MouseSchematic` is a cropped pebble mouse-head (`src/lib/components/MouseSchematic.svelte`); resting body uses HUD `backgroundColor`/`backgroundOpacity` (same as keycaps); pressed L/R/wheel fills with `textColor` via `activeButtons` (multi-button OK). Do not evenodd-punch wheel wells — the overlay is transparent, so holes show the desktop
- Legend layout preference: `keyboardLegendLayout` `auto|mac-us|win-us` (OS guess when auto). Prefer keycap glyphs (`↵`/`⌫`/`⌦`/`⇥`/`⇧`); Caps uses text `Caps` (not `⇪` — too similar to Shift `⇧` at HUD sizes). Word labels Title Case. `NumLock` legend is `Clr` (mac-us) / `Num` (win-us). Enter mark is unified as `↵` (U+21B5), not `⏎`. Meta Text/Log glyphs: `⌘` (mac-us) / `Win` (win-us) via `displayLabelForKeyId` — never read a payload `label`.
- `KeyRef` wire type is `{ id: string }` only; `isKeyRef` / `isIgnoreKeyCaptured` require `id`; all HUD/Log/ignore display strings come from id + resolved legend layout.
- Key/mouse relative arrangement: `keyMouseLayout` (`key-left-mouse-right` default; also `key-right-mouse-left`, `key-top-mouse-bottom`, `key-bottom-mouse-top`). Overlay keeps stable key→mouse DOM and uses CSS `flex-direction`/`order`; omit field → normalize/default. Do not mirror by HUD dock corner.
- `hudPreset` (`text`|`lite`|`full`, default `text`): replaces independent keyboard/mouse display modes and `persistVisible`. Text = text+text down+dwell; Lite = key-card+schematic down+dwell; Full = keyboard+schematic always pinned with held-sets from up/down (ignore dwell). Main shell: HUD tab owns presentation (preset, km layout, legend, font, dwell); Settings owns Theme/Position/Language. Hide font size and dwell controls when Full (values persist).
- `KeyboardMap` is shared: Overlay passes `activeIds` only (no click handlers). Capture ignore uses `interactive` + `ignoredIds` + muted `.key.ignored` (never `.active` for ignore). Off-board ignore rows = `ignoredKeyIds` minus `LAYOUT_KEY_IDS`; Add-key capture remains the discovery path. Overlay Full and Capture both use `KEYBOARD_MAP_FONT_PX` / `KEYBOARD_MAP_WIDTH_PX` (not HUD chip `fontSizePx`) so the Full board matches Capture scale.
- Main Settings shell: content column `--shell-max: 560px` centered (`margin-inline: auto`); default window `600×680` / `minWidth: 600`. Numpad and main board flex by `MAIN_LAYOUT_UNITS`:`NUMPAD_LAYOUT_UNITS` (not a fixed numpad px width).
- Public `HudChip` includes required `phase: "down"|"up"`; `isHudChip` rejects missing/invalid phase. Text/Lite overlay ignores ups and bare-mod downs (`isModifierKeyId`); Log shows both phases.

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
- Omitting or inventing a non-`down`/`up` `phase` on `cast://event` payloads
- Putting click coordinates on `HudChip` / `cast://event` instead of `cast://mouse-ripple`
- Persisting or typing `keyboardDisplayMode` / `mouseDisplayMode` / `persistVisible` (use `hudPreset`)
