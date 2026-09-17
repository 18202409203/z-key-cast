# Directory Structure

> How frontend code is organized in this project.

---

## Overview

SvelteKit + Tauri webviews. Domain wire types and invokes live as `$lib/*.ts`. Reusable UI and HUD primitives live under `$lib/components/`. Main-window tab bodies live under `$lib/panels/`. Overlay HUD view + slot/timer runes live under `$lib/overlay/`. Routes stay thin shells that compose those pieces.

---

## Directory Layout

```
src/
├── routes/
│   ├── +page.svelte              # Main settings shell (brand, Tabs, panel host)
│   ├── overlay/+page.svelte      # Overlay bootstrap + listen + compose HudView
│   └── ripple/+page.svelte       # Click-ripple overlay
├── lib/
│   ├── components/               # Reusable UI + HUD primitives
│   │   ├── Tabs.svelte
│   │   ├── SegmentedControl.svelte
│   │   ├── ChoiceCardGroup.svelte  # labeled schematic radiogroup cards
│   │   ├── KeyCard.svelte
│   │   ├── KeyboardMap.svelte
│   │   └── MouseSchematic.svelte
│   ├── panels/                   # Main-window tab bodies (page slices)
│   │   ├── HudPanel.svelte
│   │   ├── SettingsPanel.svelte
│   │   ├── CapturePanel.svelte
│   │   ├── LogPanel.svelte
│   │   └── AboutPanel.svelte
│   ├── overlay/                  # Overlay HUD presentation + slot/timer logic
│   │   ├── HudView.svelte        # Presentational HUD (markup + view CSS)
│   │   └── hud-slots.svelte.ts   # Slots, held sets, idle timers, showChip API
│   ├── cast.ts                   # Event channels, wire types, guards
│   ├── settings.ts               # Capture / HUD style / position / locale API
│   ├── i18n.ts
│   ├── key-card.ts
│   ├── key-legends.ts
│   ├── key-ignore-presets.ts
│   └── keyboard-layout.ts
└── app.html
```

Do **not** put shared Svelte under top-level `src/components/` — use `$lib/components/`.

Do **not** put overlay orchestration under `$lib/panels/` — panels are main-window tab bodies only.

---

## Module Organization

| Layer | Owns | Must not own |
|-------|------|--------------|
| `$lib/components/` | Presentational / reusable controls; HUD primitives used by overlay + Capture | Tauri listen/persist for main settings tabs; overlay slot/timer orchestration |
| `$lib/panels/` | Tab markup, local `$state`, get/set via `$lib/settings`, panel-local listen | Global tab routing; inventing wire types; overlay HUD |
| `$lib/overlay/` | `HudView` markup/CSS; `hud-slots` slots / held sets / idle timers / `showChip` / style dwell | Tauri `listen` registration; main-window panels |
| `routes/overlay/+page.svelte` | Locale/style/place bootstrap, Tauri `listen`/`get*`, place-mode drag, compose `HudView`; transparent `:global(html,body)` | Full HUD markup blob; slot/timer implementation |
| `routes/+page.svelte` | `activeTab`, tab-label locale mirror, composing always-mounted panels, shared `logLines` / `appendLog` | Full panel form markup |
| `$lib/*.ts` | Wire types, invokes, i18n, layouts | Svelte markup |
### Panel mount contract

All five panels stay **mounted**. Inactive panels use `hidden` + `inert` (not `{#if}` destroy) so log streaming and armed ignore-key capture survive tab switches. Window teardown still cancels ignore capture.

### Locale

Shell keeps `locale` for `Tabs` labels. `SettingsPanel` loads/saves UI locale and notifies the shell via `onLocaleChange`. Shell does not re-save after notify.

### Cross-panel logging

Shell holds `logLines` + `appendLog`. Panels that need to report save failures receive `appendLog`. `LogPanel` owns stick-to-bottom UI and `cast://event` / `cast://hook-status` listeners that append into the same buffer.

---

## Naming Conventions

- Components / panels / overlay views: `PascalCase.svelte`
- Domain modules: `kebab-case.ts`
- Overlay rune modules: `kebab-case.svelte.ts` (e.g. `hud-slots.svelte.ts`)
- Import HUD primitives as `$lib/components/KeyCard.svelte` (etc.), never flat `$lib/KeyCard.svelte`
- Import overlay pieces as `$lib/overlay/HudView.svelte` / `$lib/overlay/hud-slots.svelte`

---

## Examples

- Thin shell: `src/routes/+page.svelte`
- Panel-owned I/O: `src/lib/panels/CapturePanel.svelte`
- Shared HUD primitive: `src/lib/components/KeyboardMap.svelte` (overlay + Capture)
- Overlay composition: `src/routes/overlay/+page.svelte` → `$lib/overlay/HudView.svelte` + `hud-slots.svelte.ts`
