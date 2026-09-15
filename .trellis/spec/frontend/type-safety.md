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
| Capture settings invoke API | `src/lib/settings.ts` (mirror Rust `src-tauri/src/settings.rs`) |
| Route-local UI state | Colocated in `+page.svelte` |

See also: [Tauri Cast Events](../tauri/cast-events.md).

---

## Validation

- Decode Tauri event payloads with `isHudChip` / `isHookStatus` before use
- Do not trust `listen<T>(...)` generics alone — they are compile-time only
- Call capture toggles only through `$lib/settings.ts` (`getCaptureSettings` / `setCaptureSettings`); do not inline invoke command names in routes

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
