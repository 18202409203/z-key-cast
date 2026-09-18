# Implement — Main window UI polish

## Checklist

1. [x] Add `--app-success` / `--app-danger` (+ `--radius-lg`, `--panel-pad-x`) on dark/light token maps in `+page.svelte`.
2. [x] `FormSection`: `border-radius: var(--radius-lg)`.
3. [x] Panels: `padding-inline: var(--panel-pad-x)` (Hud, Appearance, Capture, Log, About).
4. [x] Capture: always-on hook status + i18n keys; remove hard-coded error hex.
5. [ ] Smoke both appearances; confirm tabs full-bleed, content inset, status colors.

## Validation

```bash
pnpm check
```

Manual: Capture waiting → grant/deny path colors; resize; light/dark.

## Before start

- [x] prd / design / implement
- [x] User start approval
- [x] jsonl curated
- [x] Implement + check complete (AC1–AC4 pass)
