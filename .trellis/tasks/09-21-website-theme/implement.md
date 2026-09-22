# Implement: Website stage HUD dark/light

## Checklist

1. [x] i18n: add en/zh keys for stage theme control (label, dark, light, aria).
2. [x] `marketing-page.svelte`: `hudColor` state default `"dark"`; helper to re-apply `colorsFromHudPreset` onto lite + full slots without clobbering non-color fields.
3. [x] Wire control in `.desk` beside power; toggle flips `hudColor` and re-applies styles.
4. [x] Notepad pairing: bind `data-hud-color` (or class) on stage/screen; set `--paper` / `--paper-ink` per design table for lit state; keep power-off screen black.
5. [x] CSS: ~150–200ms transition on notepad bg/color and HUD-relevant surfaces; `prefers-reduced-motion: reduce` → `transition: none`.
6. [x] Sanity: light mode lit notepad is dark; dark mode lit notepad is light; page shell tokens unchanged; refresh resets to dark.

## Validation

```bash
pnpm --filter website check   # or repo-equivalent typecheck/lint for website
# Manual: site:serve → #stage → toggle Black/White → type in notepad → power off/on
```

## Review gates

- PRD AC all checked before claiming done.
- No `:root` brand theme flip; no persistence; no layout-preset switcher.

## Rollback

Revert `marketing-page.svelte` + `i18n.ts` theme-related hunks; leave hud-view package alone.
