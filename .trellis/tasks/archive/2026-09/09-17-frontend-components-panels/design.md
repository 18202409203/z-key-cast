# Design: Frontend components and panels MVP

## Architecture

```
src/routes/+page.svelte          # shell: brand, Tabs, locale mirror, panel host
src/lib/components/              # reusable UI + existing HUD primitives
  Tabs.svelte
  SegmentedControl.svelte
  KeyCard.svelte
  KeyboardMap.svelte
  MouseSchematic.svelte
src/lib/panels/                  # main-window tab bodies (page slices)
  HudPanel.svelte
  SettingsPanel.svelte
  CapturePanel.svelte
  LogPanel.svelte
  AboutPanel.svelte
src/lib/*.ts                     # unchanged domain modules (cast, settings, i18n, …)
```

## Boundaries

| Layer | Owns | Must not own |
|-------|------|--------------|
| `components/` | Presentational / reusable controls; HUD primitives used by overlay + capture | Tauri listen/persist for main settings |
| `panels/` | Tab markup, local `$state`, get/set via `$lib/settings`, panel-local listen | Global tab routing; inventing wire types |
| `+page` shell | `activeTab`, tab labels locale, composing panels | Full panel form markup |
| `$lib/*.ts` | Wire types, invokes, i18n, layouts | Svelte markup |

## Mount / lifetime

Today panels are `{#if activeTab}`—destroying them would break:

- Log: continuous `cast://event` + `cast://hook-status` while user is on other tabs
- Capture: `IGNORE_KEY_CAPTURED` while “add key” is armed across tab switches
- Place mode: cleanup must remain reliable

**Contract:** host always mounts all five panels; inactive panels use `hidden` + `inert` (or CSS equivalent) and correct `aria` so only the active `tabpanel` is exposed. Window teardown still runs Capture’s cancel-ignore and unlistens.

## Locale

- Shell keeps `locale` for `Tabs` labels and `t("nav.*")`.
- `SettingsPanel` owns load/save of UI locale; on success calls `onLocaleChange(next)`.
- Shell may still bootstrap locale once before/with Settings so first paint of tabs is correct (Settings must not fight shell: single source after first successful load—prefer Settings notifies shell, shell does not re-save).

## Cross-panel logging

Save failures today call `appendLog` from HUD/Settings/Capture. Options:

1. Pass `appendLog` callback from `LogPanel` upward via shell bindable/callback registry, or
2. Small `$lib` event bus / shared rune module for log lines.

Prefer **shell-held `logLines` + `appendLog`**, passed into panels that need it; `LogPanel` receives `logLines` (or bindable) and owns stick-to-bottom UI only. Hook status / HUD chip summarization listeners live in `LogPanel` (always mounted) and mutate the same store/callback the shell exposes.

Clarification vs R4: **persistence** is panel-owned; **shared log buffer** may live in shell so multiple panels can append without importing LogPanel.

## Data flow

```
Tauri settings / events
        │
        ▼
 $lib/settings.ts / $lib/cast.ts
        │
        ├── HudPanel / SettingsPanel / CapturePanel  (get/set, local UI)
        ├── LogPanel  (listen → append via shared buffer)
        └── Overlay routes  (import components only; unchanged behavior)
```

## Compatibility

- No Tauri command/channel/JSON shape changes.
- Overlay/ripple: import path updates only for moved components.
- A11y: preserve `role="tablist"`, tab ids `tab-{id}`, panel ids `panel-{id}`, roving tabindex.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| Panels own I/O | Thin shell; colocated logic | Larger first PR |
| Always-mounted panels | Parity with today’s always-on listeners | Slightly higher idle DOM |
| Shell log buffer | Simple cross-panel append | Shell not 100% markup-free |

## Rollback

Revert the refactor commit(s); no data migration. Keep changes behavioral-noop so rollback is git-only.
