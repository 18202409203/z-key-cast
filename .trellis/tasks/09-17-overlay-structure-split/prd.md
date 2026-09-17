# Overlay structure split

## Goal

Split `src/routes/overlay/+page.svelte` so HUD presentation is easier to change without touching event/slot lifetime logic.

## Status

Deferred. Sibling of `09-17-frontend-components-panels`. **Do not start** until the MVP child is done (or explicitly reprioritized).

## Ordering

Depends on MVP conventions: prefer reusing `$lib/components` and the documented directory rules from the MVP child.

## Requirements (draft — refine when opening)

- R1. Separate overlay slot/timer/listen wiring from presentational markup (e.g. HUD view component and/or rune module).
- R2. Behavior parity for presets (text/lite/full), place mode, locale, capture-unavailable status.
- R3. Reuse shared components where appropriate; no intentional UX change.

## Acceptance Criteria (draft)

- [ ] Overlay route is primarily wiring; presentation lives in `$lib` modules/components.
- [ ] Manual smoke: key/mouse HUD, idle clear, place mode, status chip.

## Out of scope

- Main-window panel work (MVP child).
- Product features (numpad toggle, scroll wheel, etc.).
