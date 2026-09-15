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
| Route-local UI state | Colocated in `+page.svelte` |

See also: [Tauri Cast Events](../tauri/cast-events.md).

---

## Validation

- Decode Tauri event payloads with `isHudChip` / `isHookStatus` / `isHudStyleSettings` before use
- Do not trust `listen<T>(...)` generics alone — they are compile-time only
- Call capture / HUD style APIs only through `$lib/settings.ts`; do not inline invoke command names in routes
- Keep `HUD_STYLE_CHANNEL` (`cast://hud-style`) in `$lib/settings.ts` aligned with Rust `settings::HUD_STYLE_CHANNEL`
- Key-card / full-keyboard rendering uses `hudCards()` + layout `id`s from `$lib/cast.ts` / `$lib/keyboard-layout.ts`; do not invent labels in the overlay
- Key-card / full-keyboard / text / schematic all use HUD `textColor` + `backgroundColor`/`backgroundOpacity` (presets Black/White or custom)
- `MouseSchematic` is a cropped pebble mouse-head (`src/lib/MouseSchematic.svelte`); pressed L/R/wheel fills with `textColor`. Do not evenodd-punch wheel wells — the overlay is transparent, so holes show the desktop
- Legend layout preference: `keyboardLegendLayout` `auto|mac-us|win-us` (OS guess when auto)
- Key/mouse relative arrangement: `keyMouseLayout` (`key-left-mouse-right` default; also `key-right-mouse-left`, `key-top-mouse-bottom`, `key-bottom-mouse-top`). Overlay keeps stable key→mouse DOM and uses CSS `flex-direction`/`order`; omit field → normalize/default. Do not mirror by HUD dock corner.

---

## Common Patterns

```ts
import { EVENT_CHANNEL, isHudChip, formatHudLabel } from "$lib/cast";

listen(EVENT_CHANNEL, (event) => {
  if (!isHudChip(event.payload)) return;
  showChip(formatHudLabel(event.payload));
});
```

---

## Forbidden Patterns

- Inline `as HudChip` / field fishing on `event.payload` in routes
- Duplicating channel string literals outside `$lib/cast.ts` / Rust `EVENT_CHANNEL`
- Assuming a public `phase` field on `cast://event` payloads
