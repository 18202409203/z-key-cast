# Design: Overlay structure split

## Architecture

```
src/routes/overlay/+page.svelte     # bootstrap + listen + compose
src/lib/overlay/
  HudView.svelte                    # presentational HUD + view styles
  hud-slots.svelte.ts               # slots, held sets, idle timers, showChip API
src/lib/components/                 # KeyCard, KeyboardMap, MouseSchematic (unchanged)
src/lib/cast.ts / settings.ts / …   # wire contracts (unchanged)
```

## Boundaries

| Layer | Owns | Must not own |
|-------|------|--------------|
| `overlay/+page` | `onMount` listen/get, place-mode `startDragging`, pass props into view | HUD markup / CSS for chips & km-group |
| `hud-slots.svelte.ts` | `keySlot` / `mouseSlot` / held sets / idle timers / `showChip` / `showCaptureUnavailable` / derived flags used by view | Tauri `listen` registration; DOM |
| `HudView.svelte` | Markup + transitions + layout CSS; reads style/locale/slot-derived props | Calling `listen` / mutating timers directly |
| `$lib/components` | Primitives only | Overlay orchestration |

## Data flow

```
Tauri channels (event, hook-status, hud-style, place-mode, ui-locale)
        │
        ▼
 overlay/+page onMount  ──listen──►  handlers
        │                              │
        │                              ├── applyStyle / locale / placeMode
        │                              └── hudSlots.showChip / showCaptureUnavailable
        ▼
 HudView({ style, locale, placeMode, …slot view-model })
        │
        ├── KeyCard / KeyboardMap / MouseSchematic
```

## Rune module API (sketch)

Export a factory or module-level runes the page instantiates once:

- State: slots, held sets, statusActive, (optionally) mirrors of style fields needed for dwell
- Methods: `applyStyle(style)`, `showChip(chip)`, `showCaptureUnavailable()`, `clearAllIdleTimers()` (for teardown)
- Derived for view: `statusText`, `showKmGroup`, `showKeySide`, `showMouseSide`, `activeKeyIds`, `mouseActiveButtons`, card/text helpers

Exact export shape is implementation detail; keep dwell/`isFull` behavior identical to today’s `showChip`.

## Place mode

- `placeMode` flag and drag `onpointerdown` stay on the page (or page passes `onPlacePointerDown` into `HudView`). Prefer **HudView emits/receives** the pointer handler from the page so Tauri window API stays in the route.

## Compatibility

- No channel/command/JSON changes.
- Global transparent `html,body` styles may stay on the route (window chrome) or move with HudView — prefer **route** for `:global(html,body)` so the view stays embeddable.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| B: view + rune, listen in page | Thin route; logic testable; matches MVP layering | Two new files to navigate |
| Not C | Listen stays visible at route boundary | Page still ~100–150 lines of wiring |

## Rollback

Git revert; no schema migration.
