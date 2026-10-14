# Directory Structure

> How frontend code is organized in this project.

---

## Overview

SvelteKit + Tauri webviews. **HUD presentation** (Text / Lite / Full) lives in the workspace package `z-key-cast-hud-view` (`packages/hud-view`). App `$lib` keeps Tauri IPC, settings persistence, and main-window panels. The `website/` package is a separate SvelteKit app that consumes the same HUD package with DOM-sourced chips.

---

## Monorepo packages

```
.
├── packages/hud-view/          # z-key-cast-hud-view (shared HUD view; no @tauri-apps)
│   └── src/
│       ├── components/         # HudView, KeyCard, KeyboardMap, MouseSchematic
│       ├── model/              # HudChip, style, legends, layout, HUD i18n slice
│       ├── state/              # createHudSlots
│       └── index.ts            # public exports only
├── website/                    # marketing/download shell + live Full demo
└── src/                        # Tauri app webviews (settings + overlay host)
```

Import HUD from the package root — do **not** deep-import package internals:

```ts
import { HudView, createHudSlots, type HudChip } from "z-key-cast-hud-view";
```

Vite hosts must set `optimizeDeps.exclude` + `ssr.noExternal` for `z-key-cast-hud-view`.

---

## App directory layout (`src/`)

```
src/
├── routes/
│   ├── +page.svelte              # Main settings shell (brand, Tabs, panel host)
│   ├── overlay/+page.svelte      # Overlay bootstrap + Tauri listen + compose HudView
│   └── ripple/+page.svelte       # Click-ripple overlay
├── lib/
│   ├── components/               # Settings-window UI only (Tabs, Form*, ChoiceCard, RangeSlider)
│   ├── panels/                   # Main-window tab bodies
│   ├── cast.ts                   # Tauri channels + invoke; re-exports chip API from package
│   ├── settings.ts               # Persist/IPC; re-exports HUD style API from package
│   ├── i18n.ts                   # App/settings locale strings
│   ├── key-card.ts               # thin re-export → package (prefer package import)
│   ├── key-legends.ts            # thin re-export → package
│   ├── key-ignore-presets.ts
│   └── keyboard-layout.ts        # thin re-export → package
└── app.html
```

Do **not** put shared Svelte under top-level `src/components/`.

Do **not** put a second copy of HudView / KeyCard / KeyboardMap / MouseSchematic under `$lib` — those live only in `packages/hud-view`.

Do **not** put overlay orchestration under `$lib/panels/` — panels are main-window tab bodies only.

---

## Module Organization

| Layer | Owns | Must not own |
|-------|------|--------------|
| `z-key-cast-hud-view` | HudView, primitives, `createHudSlots`, HudChip types/formatters, HUD style types/defaults | `@tauri-apps/*`, DOM/native input adapters |
| `$lib/components/` | Settings-window presentational controls | HUD keyboard/mouse primitives |
| `$lib/panels/` | Tab markup, local `$state`, get/set via `$lib/settings`, panel-local listen | Global tab routing; inventing wire types; HUD view impl |
| `routes/overlay/+page.svelte` | Locale/style/place bootstrap, Tauri `listen`/`get*`, place-mode drag, compose package `HudView` | Full HUD markup blob; slot/timer implementation |
| `website/` | Landing page (en + `/zh/`), `lib/i18n.ts` catalog, DOM→HudChip adapter, downloads/`latest.json` | Duplicate HUD UI; Tauri IPC; app `$lib/i18n.ts` |
| `$lib/cast.ts` / `settings.ts` | Channels, invoke, persistence; re-export pure HUD APIs | Re-implement chip/style logic |

### Panel mount contract

All five panels stay **mounted**. Inactive panels use `hidden` + `inert` (not `{#if}` destroy) so log streaming and armed ignore-key capture survive tab switches. Window teardown still cancels ignore capture.

### Locale

Shell keeps `locale` for `Tabs` labels. `SettingsPanel` loads/saves UI locale and notifies the shell via `onLocaleChange`. Shell does not re-save after notify.

### Cross-panel logging

Shell holds `logLines` + `appendLog`. Panels that need to report save failures receive `appendLog`. `LogPanel` owns stick-to-bottom UI and `cast://event` / `cast://hook-status` listeners that append into the same buffer.

---

## Naming Conventions

- Components / panels: `PascalCase.svelte`
- Domain modules: `kebab-case.ts`
- Slot rune modules: `kebab-case.svelte.ts` (e.g. `hud-slots.svelte.ts`)
- Import HUD as `z-key-cast-hud-view`, never `$lib/overlay/*` (removed) or flat `$lib/KeyCard.svelte`

---

## Examples

- Thin shell: `src/routes/+page.svelte`
- Panel-owned I/O: `src/lib/panels/CapturePanel.svelte`
- Shared HUD: `import { KeyboardMap, HudView, createHudSlots } from "z-key-cast-hud-view"`
- Overlay composition: `src/routes/overlay/+page.svelte` → package `HudView` + `createHudSlots`
- Website demo: `website/src/lib/dom-input-adapter.ts` → chips → same package views
- Website locales: `website/src/routes/+page.svelte` (en) + `website/src/routes/zh/+page.svelte` → `$lib/marketing/MarketingPage.svelte` + `lib/i18n.ts`
- Website marketing layout:

```
$lib/marketing/
  MarketingPage.svelte                 # page shell: snap nav + download fetch + compose
  marketing-chrome.css                 # :root tokens, html snap, .page / .panel
  constants.ts                         # PRODUCT_NAME, SOURCE_REPO_URL, PANEL_NAV, BLIND_SLAT_COUNT
  panel-scroll.ts                      # panelList / nearest / scrollTo (page-level)
  fetch-mac-download.ts                # placeholder + latest.json (page-level)
  components/
    BrandPanel.svelte                  # selling-point controls (see below)
    PageRail.svelte                    # chrome UI (not a snap .panel)
    DownloadPanel.svelte
    StagePanel/
      StagePanel.svelte                # blinds, HUD, notepad, desk, cables
      stage-panel.css
      cable-layout.ts                  # Stage-only geometry
```

Brand feature cards are controls. Offline and size call `MarketingPage`'s `onSelectPanel`, which uses `scrollToPanel` (stage, then download). The open-source card is an anchor to `SOURCE_REPO_URL[locale]` (`en` → GitHub, `zh` → Gitee) with `target="_blank"` and `rel="noopener noreferrer"`. Hover and active change border and glow only — do not translate or scale the card; the page is mandatory scroll-snap.
