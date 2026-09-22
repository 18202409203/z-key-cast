# Design: marketing-page module split

## Architecture

```
$lib/marketing/
  MarketingPage.svelte                 # page shell: snap nav + download fetch + compose
  marketing-chrome.css                 # :root tokens, html snap, .page / .panel
  constants.ts                         # PRODUCT_NAME, PANEL_NAV, BLIND_SLAT_COUNT
  panel-scroll.ts                      # panelList / nearest / scrollTo (page-level)
  fetch-mac-download.ts                # placeholder + latest.json (page-level)
  components/
    BrandPanel.svelte                  # single-file
    PageRail.svelte                    # single-file (chrome UI, not a snap .panel)
    DownloadPanel.svelte               # single-file
    StagePanel/
      StagePanel.svelte                # blinds, HUD, notepad, desk, cables
      stage-panel.css                  # Stage-only styles (script import)
      cable-layout.ts                  # measureCableGeo / computeRigFit (Stage-only)
```

## Naming

- **`marketing/`** — website landing domain (not a generic shared library).
- **`marketing/components/`** — UI pieces owned by that domain. Prefer over `panels/` because PageRail is not a snap panel, and nesting under `marketing/` avoids clashing meaning with app `$lib/components/`.
- **Folder rule** — one `.svelte` → flat file; `.svelte` + css/helpers → directory named after the component.

## Boundaries

| Module | Owns | Must not own |
|--------|------|--------------|
| `MarketingPage` | `pageEl`, active panel, wheel/scroll snap, download state, compose children | HUD slots, adapter, blinds, cable geometry |
| `StagePanel/` | lite+full slots, adapter, blinds/theme, fit/cables, notepad caret, stage CSS | Page snap, download manifest |
| `PageRail` / `BrandPanel` / `DownloadPanel` | Presentational UI + local scoped styles | Page listeners, Stage power |
| Page-level `*.ts` | Cross-component nav / download fetch | Stage-only geometry |
| `z-key-cast-hud-view` | HudView / KeyboardMap / MouseSchematic / createHudSlots | Website layout |

## Contracts

### Stage → shell power mirror

- `StagePanel` exposes `powered = $bindable(false)`.
- On adapter `onPowerChange`, Stage sets local `stageFocused` and mirrors into `powered`.
- Shell wheel handler returns early when `stagePowered` is true so the adapter owns wheel while the demo is armed.

### Panel DOM for snap

- Brand / Stage / Download roots remain **direct children** of `<main class="page">` with class `panel`, so `panel-scroll.panelList` (`:scope > .panel`) keeps working across component boundaries.

### CSS

- `marketing-chrome.css`: global page chrome.
- `StagePanel/stage-panel.css`: Stage-only; script-imported (global). Selectors nest under `.panel-stage` / `.stage`.
- Other components: scoped `<style>` inside the `.svelte` file.

### Download fetch

- `fetchMacDownload(locale, { cancelled })` returns `{ version, download } | null`.
- Shell applies result only if not cancelled; placeholders remain when manifest missing.

## Compatibility / migration from flat draft

1. Create `components/` and `components/StagePanel/`.
2. Move Brand / PageRail / Download into `components/`.
3. Move Stage Svelte + CSS + `cable-layout.ts` into `components/StagePanel/`.
4. Fix imports in `MarketingPage.svelte` / Stage.
5. Point en/zh routes at `$lib/marketing/MarketingPage.svelte`; delete `$lib/marketing-page.svelte` (D4).
6. Update `directory-structure.md` to the final tree.

Rollback: restore HEAD `marketing-page.svelte`, delete `$lib/marketing/`, revert spec bullets + route imports.

## Trade-offs

- **`components/` vs `panels/`** (D3): clearer for mixed snap sections + rail; domain nesting disambiguates from app components.
- **Stage folder** (D2): keeps Stage cohesive without extracting blinds/monitor/desk components.
- **Direct route import** (D4): one less indirection; routes become the only entry.
- **Global stage CSS**: avoids scoped `:global` noise into hud-view; rely on stage class prefixes.

## Risks / hardening focus

1. Wheel snap vs Stage power — `bind:powered` mirror.
2. `:scope > .panel` after moves — three panel roots still direct children of `.page`.
3. Import path breakage during folder move — run website check immediately after.
4. Lite+full slot fan-out preserved.
