# Implement — Ignore keys keyboard picker

## Checklist

1. **Layout helper** — Export non-spacer layout id set from `$lib/keyboard-layout.ts` (or tiny helper next to it).
2. **KeyboardMap** — Add `ignoredIds`, `interactive`, `disabled`, `onToggleKey`; spacer skip; `.key.ignored` muted CSS; ensure overlay call site stays display-only.
3. **Capture ignore-block** — Order: categories → `<KeyboardMap interactive …>` → Add key/Cancel → off-board-only list; wire toggle to existing persist helpers.
4. **i18n** — Adjust empty/hint strings if “no ignored keys” becomes misleading when only on-board ignores exist.
5. **Verify** — `npm run check`; manual Capture + Overlay paths below.

## Validation

```bash
npm run check
# optional if touching Rust (should not): cargo test -p z-key-cast --lib
```

Manual:

- Overlay keyboard mode: press highlight still works; keys not clickable.
- Capture: click key → muted + persisted; click again → clears; category Letters → letter keys muted; Add key for non-layout id → list row only; remove row; Add key Cancel still works; Escape while armed still adds Escape.

## Risky files

- `src/lib/KeyboardMap.svelte` — shared with Overlay; regress press highlight carefully.
- `src/routes/+page.svelte` — large Settings file; keep ignore-block edits localized.

## Rollback point

After step 2, Overlay must still compile/render with old prop usage before Capture wiring lands.

## Done when

All PRD acceptance criteria AC1–AC5 pass; no Rust contract change.
