# Implement: key + mouse HUD coexist

## Checklist

1. [x] Refactor `src/routes/overlay/+page.svelte` to `keySlot` / `mouseSlot` / `statusText` + three idle timers
2. [x] Route `showChip` by `chip.kind`; status clears both slots
3. [x] Render stack: status XOR (keyboard block above mouse block); reuse existing mode branches
4. [x] Update `.trellis/spec/tauri/cast-events.md` + `design/index.md` single-slot wording
5. [x] `npm run check`
6. [ ] Manual: key then mouse; mouse then key; one side fades alone; status clears both

## Validation

```bash
npm run check
```

Manual via `pnpm tauri dev` (or project equivalent): dwellMs as configured.

## Rollback

Revert overlay (+ spec/design doc edits) to single `active` slot.
