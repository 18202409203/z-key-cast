# Implement: Brand selling-point cards

## Checklist

1. **i18n** — Add `brand.feature.offline` / `size` / `oss` (+ optional `brand.features.aria`) to `website/src/lib/i18n.ts` en + zh per PRD table.
2. **BrandPanel** — Under tagline, render three feature cards (grid): I1 SVG icons + `t(...)` labels; scoped styles (border, gap, responsive wrap); `prefers-reduced-motion` safe (reuse existing rise or none).
3. **Viewport** — Tighten Brand spacing/type so 1366×768 still shows name + tagline + three cards without crop; do not change snap panel count.
4. **Spec note** — In finish phase: clear "Brand feature cards deferred" in `.trellis/spec/guides/site-updater.md` (not a blocker for first implement pass if deferred to 3.3).
5. **Validate** — `pnpm website:check`; smoke `/` and `/zh/` Brand panel visually; confirm Stage/Download unchanged.

## Validation commands

```bash
pnpm website:check
# optional: pnpm website:build
```

Manual: Brand at 1366×768 and 1440×900 — three cards visible; icons decorative; copy matches PRD.

## Risky files / rollback

| File | Risk |
|------|------|
| `BrandPanel.svelte` | Over-tall Brand breaks snap readability |
| `i18n.ts` | Missing zh key → fallback to en (still shippable but AC fail) |

Rollback: revert those two files (and any FeatureCards extract).

## Review gate before `task.py start`

- [x] `prd.md` converged
- [x] `design.md` + `implement.md` present
- [x] `implement.jsonl` / `check.jsonl` curated
- [ ] User approved planning → then `task.py start`
