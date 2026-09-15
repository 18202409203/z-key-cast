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
| Route-local UI state | Colocated in `+page.svelte` |

See also: [Tauri Cast Events](../tauri/cast-events.md).

---

## Validation

- Decode Tauri event payloads with `isCastEvent` / `isHookStatus` before use
- Do not trust `listen<T>(...)` generics alone — they are compile-time only

---

## Common Patterns

```ts
import { EVENT_CHANNEL, isCastEvent, formatLabel } from "$lib/cast";

listen(EVENT_CHANNEL, (event) => {
  if (!isCastEvent(event.payload)) return;
  pushChip(formatLabel(event.payload));
});
```

---

## Forbidden Patterns

- Inline `as CastEvent` / field fishing on `event.payload` in routes
- Duplicating channel string literals outside `$lib/cast.ts` / Rust `EVENT_CHANNEL`
