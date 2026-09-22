# Implement: marketing-page module split

## Approach

Reorganize the flat draft into the `marketing/` + `components/` (+ `StagePanel/` folder) tree from `design.md`, then harden contracts and verify.

## Checklist

1. [ ] Create `marketing/components/` and `marketing/components/StagePanel/`; move files per design map; update relative imports.
2. [ ] Update en/zh routes to `$lib/marketing/MarketingPage.svelte`; delete `$lib/marketing-page.svelte`.
3. [ ] Verify Stage→shell `bind:powered` mirror used by wheel handler.
4. [ ] Verify `panel-scroll` still finds three `:scope > .panel` roots.
5. [ ] Spot-check Stage: dual slots + fan-out, blinds timer cleanup, `cable-layout` import from Stage folder.
6. [ ] Spot-check Download: placeholder → `fetchMacDownload` cancel-safe apply.
7. [ ] Rewrite `.trellis/spec/frontend/directory-structure.md` marketing bullets to the final tree.
8. [ ] Run `pnpm --filter z-key-cast-website check`.
9. [ ] Manual smoke (AC4) on en + zh when a website preview is available.

## Validation

```bash
pnpm --filter z-key-cast-website check
# Manual: Brand→Stage→Download, power, blinds, download CTA, / ↔ /zh/
```

## Risky files / rollback

| Path | Risk |
|------|------|
| `marketing/components/StagePanel/*` | Power / adapter / theme / CSS regressions |
| `marketing/MarketingPage.svelte` | Snap + download orchestration |
| Route `+page.svelte` / `zh/+page.svelte` | Broken import if path not updated |
| Spec `directory-structure.md` | Docs drift |

Rollback: restore HEAD marketing entry + delete `$lib/marketing/` + revert routes/spec.

## Out of scope during implement

- Stage sub-component extraction beyond the StagePanel folder
- i18n / visual redesign
- HUD package changes

## Gate before `task.py start`

- [x] `prd.md` / `design.md` / `implement.md` (D1–D4, including direct route import)
- [ ] User approved start (`task.py start` + implement/check)
- [x] `implement.jsonl` / `check.jsonl` curated
