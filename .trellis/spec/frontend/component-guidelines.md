# Component Guidelines

> How components are built in this project.

---

## Overview

Three Svelte layers under `$lib`:

- **`components/`** — reusable controls and HUD primitives (`Tabs`, `SegmentedControl`, `ChoiceCardGroup`, `KeyCard`, `KeyboardMap`, `MouseSchematic`)
- **`panels/`** — main-window tab bodies that own their settings get/set and panel-local listeners
- **`overlay/`** — overlay HUD only: `HudView` (presentation) + `hud-slots.svelte.ts` (timeline/timers/held-sets); route keeps Tauri `listen` and place drag

Route files compose these; they do not redefine cast/settings wire types. Do not put overlay orchestration in `panels/` or reinvent HUD primitives outside `components/`.

---

## Component Structure

- Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`)
- Props typed with a local `type Props = { ... }` and `let { ... }: Props = $props()`
- Colocate panel-specific styles in the panel; keep shell styles limited to chrome (brand, panels host)

---

## Props Conventions

- Panels that can append diagnostics take `appendLog: (line: string) => void` from the shell
- Tab bodies take `active: boolean` and set `hidden` / `inert` from it — do not gate mount with `{#if}`
- `SettingsPanel` notifies locale via `onLocaleChange` rather than writing shell state directly beyond the callback

---

## Styling Patterns

- Scoped `<style>` per component/panel
- Shell keeps global `html, body` tokens and `--shell-max`
- Prefer matching existing slate / sky accent look; no new design system in extraction PRs

---

## Accessibility

- `Tabs`: `role="tablist"`, tab ids `tab-{id}`, `aria-controls` → `panel-{id}`, roving `tabindex`, Arrow/Home/End keyboard nav
- Panels: `role="tabpanel"`, `aria-labelledby="tab-{id}"`, inactive → `hidden` + `inert`
- `SegmentedControl`: `role="radiogroup"` with `aria-labelledby` when a field label exists
- `ChoiceCardGroup`: same radiogroup pattern for **morphotype / layout** settings (static dead SVG + visible label under each card). Prefer this over `SegmentedControl` or `<select>` when the choice is spatial/visual (e.g. HUD preset, key/mouse layout). Do not wire live HUD theme colors into the schematics.

---

## Common Mistakes

- Destroying Log/Capture with `{#if activeTab}` (drops long-lived listeners)
- Importing moved HUD files from flat `$lib/*.svelte` instead of `$lib/components/`
- Putting overlay HUD / slots under `$lib/panels/` (panels are main-window tabs only)
- Redefining `HudChip` / channel strings in panels instead of `$lib/cast.ts` / `$lib/settings.ts`
- Saving locale from both shell and Settings (double-persist) — Settings owns persist; shell mirrors via callback
