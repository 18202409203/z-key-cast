# Implement: Overlay structure split

## Checklist

1. [x] Create `src/lib/overlay/`.
2. [x] Extract `hud-slots.svelte.ts` from overlay page script (slots, timers, held sets, `showChip` / status / style-dependent dwell).
3. [x] Extract `HudView.svelte` (markup + view CSS); take props / bind to rune outputs; keep KeyCard/KeyboardMap/MouseSchematic imports here.
4. [x] Slim `overlay/+page.svelte` to bootstrap + listens + place drag + `<HudView … />`; keep transparent window `:global` on the route.
5. [x] Update `.trellis/spec/frontend/directory-structure.md` (+ brief component-guidelines note if useful).
6. [x] `pnpm check` (passed); manual smoke AC3 still for operator via `pnpm tauri dev`.

## Validation

```bash
pnpm check
# Manual via pnpm tauri dev: text/lite/full, idle, place mode, status, locale/style live
```

## Risky points

| Risk | Mitigation |
|------|------------|
| Dwell / full held-set drift | Port `showChip` / `applyFullHeld` verbatim first |
| Timer leak on unmount | Page teardown still calls `clearAllIdleTimers` + unlistens |
| Style channel vs local style | Keep single `style` owned by page or rune—one writer |

## Ready for `task.py start` when

User reviewed prd/design/implement; jsonl curated.
