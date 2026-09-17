# Overlay structure split

## Goal

Thin `src/routes/overlay/+page.svelte` (~590 lines) by separating HUD presentation and slot/timer logic from Tauri listen wiring—no intentional UX change.

## Background

- MVP archived: `$lib/components` + `$lib/panels` conventions live.
- Overlay already uses `$lib/components` primitives; the route still owns slots, idle timers, held-sets, style/locale/place listen, and all markup.
- **Decision:** option **B** — `$lib/overlay/` with `HudView` + rune module for slots/timers; `+page` keeps bootstrap/`listen` only.

## Requirements

- R1. Add `$lib/overlay/` (not `$lib/panels/`).
- R2. Extract `HudView.svelte` — presentational HUD (place affordance, status chip, text/lite/full key+mouse layout, styles that belong to the view).
- R3. Extract a Svelte 5 rune module (e.g. `hud-slots.svelte.ts`) for key/mouse slots, held-sets, idle timers, `showChip` / `showCaptureUnavailable` / style apply side effects needed by the view.
- R4. `overlay/+page.svelte` owns: locale/style/place bootstrap, Tauri `listen`/`get*`, window drag in place mode, composing `HudView` from the rune module’s public state.
- R5. Behavior parity: text/lite/full, idle clear, place mode, locale + style live channels, capture-unavailable status.
- R6. Update `.trellis/spec/frontend/directory-structure.md` (and component guidelines if needed) for `$lib/overlay/`.

## Acceptance Criteria

- [ ] AC1. Overlay route is primarily wiring + composition (target: well under half of ~590 lines, no full HUD markup blob).
- [ ] AC2. Presentation in `$lib/overlay/HudView.svelte`; slot/timer logic in `$lib/overlay/*.svelte.ts` (or equivalent), not one inline script in the route.
- [ ] AC3. Manual smoke: text/lite/full HUD, idle clear, place mode, status chip, live locale/style.
- [ ] AC4. Directory spec documents `$lib/overlay/`.

## Out of scope

- Main-window panels (done).
- Rust `settings.rs` split.
- Product features (`design/03.md`).
- Wrapping Tauri `listen` into a generic overlay helper (option C).
- Visual redesign.
