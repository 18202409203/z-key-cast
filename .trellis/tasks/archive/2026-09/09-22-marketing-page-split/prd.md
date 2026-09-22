# Split marketing-page into modules

## Goal

Make the website marketing landing page maintainable by splitting the monolithic `marketing-page.svelte` (~1900 lines) into clear modules, without changing user-visible behavior.

## Background

- Entry today: `website/src/routes/+page.svelte` (en) and `zh/+page.svelte` import `$lib/marketing-page.svelte`.
- HEAD monolith ≈1942 lines (script ~537 + markup ~300 + styles ~1100) with Brand / Stage / Download snap sections + side rail.
- Cross-cutting: snap wheel/scroll nav on the page; Stage owns DOM input adapter + power; download resolves from `/updates/latest.json`.
- Specs: `.trellis/spec/frontend/directory-structure.md`, `component-guidelines.md`; marketing notes in `.trellis/spec/guides/site-updater.md`.
- Working tree has a flat draft under `website/src/lib/marketing/*` plus a thin `marketing-page.svelte` re-export; layout will be reorganized to the decided tree before acceptance.

## Decisions

- D1. Keep and harden the existing draft — do not revert to HEAD for a full redo.
- D2. Do not further split Stage internals (blinds / monitor / desk / cables); Stage stays one logical module (multi-file folder OK).
- D3. Domain folder `$lib/marketing/`; UI under `marketing/components/`; single-file flat, multi-file = directory; page-level helpers/CSS at `marketing/` root. Prefer `components` over `panels`.
- D4. Routes import `$lib/marketing/MarketingPage.svelte` directly; delete `$lib/marketing-page.svelte` (no compat shim).

## Requirements

- R1. Split by responsibility so no single Svelte file remains a mixed ~1900-line blob.
- R2. en/zh routes import `$lib/marketing/MarketingPage.svelte`; remove `$lib/marketing-page.svelte`.
- R3. No intentional UX / i18n / visual regressions (snap, blinds/theme, stage power + HUD fan-out, cables, notepad caret, download CTA + version, lang footer).
- R4. Page-level pure helpers at `marketing/*.ts`; Stage-only helpers under `components/StagePanel/`; small components keep scoped `<style>`; Stage styles may be a sibling CSS file in that folder.
- R5. Follow frontend website conventions; HUD primitives remain in `z-key-cast-hud-view`.
- R6. Page shell yields wheel snap while Stage is powered via an explicit Stage→shell contract (`bind:powered` or equivalent).

## Acceptance Criteria

- [ ] AC1. Layout matches design tree: `marketing/` shell + page helpers; Brand / Stage / Download / rail under `marketing/components/`; Stage is a multi-file folder.
- [ ] AC2. Cable layout lives with Stage; panel scroll + mac download fetch are page-level `.ts` helpers.
- [ ] AC3. `pnpm --filter z-key-cast-website check` (or `website` `pnpm run check`) passes.
- [ ] AC4. Manual smoke: Brand → Stage → Download snap; Stage power / typing / blinds; Download CTA + version; en ↔ zh.
- [ ] AC5. `.trellis/spec/frontend/directory-structure.md` documents the final marketing layout.
- [ ] AC6. No `$lib/marketing-page.svelte`; routes point at `MarketingPage.svelte`.

## Out of Scope

- Visual redesign, copy, or i18n catalog changes
- HUD package API changes
- New website features (e.g. Windows download)
- Further Stage sub-component extraction (blinds/monitor/desk as separate components)

## Notes

- Complex task: `design.md` + `implement.md` required before `task.py start`.
- Sub-agent manifests curated; ready after user approves implementation start.
