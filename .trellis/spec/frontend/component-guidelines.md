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
- `AppearancePanel` notifies locale / appearance via `onLocaleChange` / `onAppearanceChange` rather than writing shell state directly beyond the callbacks

---

## Styling Patterns

- Scoped `<style>` per component/panel
- Shell owns `data-appearance` (`dark` \| `light` resolved) and `--app-*` tokens; panels/components consume tokens — do not hard-code slate/sky hex for main chrome
- Main chrome depth ladder: page `--app-bg` → group `--app-inset` → control `--app-control-bg` (dark: deep→elevated; light: whitest page → soft `#f2f2f7` inset → white controls). HUD overlay colors stay on HUD Theme settings, not `--app-*`
- Capture ignore-board `KeyboardMap` in the main window uses window tokens (`--app-fg` / `--app-control-bg`), not HUD `textColor` / `backgroundCss`
- Overlay Full `KeyboardMap` / `MouseSchematic`: fills use `--kb-bg` / `--m-bg` (already includes `backgroundOpacity`). Do **not** `color-mix(..., transparent)` on those fills — that ignores the opacity slider and always shows the desktop through. Hierarchy = mix fg into bg only.

---

## Accessibility

- `Tabs`: `role="tablist"`, tab ids `tab-{id}`, `aria-controls` → `panel-{id}`, roving `tabindex`, Arrow/Home/End keyboard nav
- Panels: `role="tabpanel"`, `aria-labelledby="tab-{id}"`, inactive → `hidden` + `inert`
- `SegmentedControl`: `role="radiogroup"` with `aria-labelledby` when a field label exists
- `ChoiceCardGroup`: radiogroup for visual choices (HUD preset, key/mouse layout, window appearance). **Default `layout="fill"`**: 4:3 framed preview (`max-width: 96px`), label below outside, selection via **outline** (not border). Appearance schematics are full-bleed fixed swatches; HUD/layout icons keep inner padding. `layout="compact"` is legacy inset cards. Do not wire live HUD theme colors into schematics.

---

## Common Mistakes

- Destroying Log/Capture with `{#if activeTab}` (drops long-lived listeners)
- Importing moved HUD files from flat `$lib/*.svelte` instead of `$lib/components/`
- Putting overlay HUD / slots under `$lib/panels/` (panels are main-window tabs only)
- Redefining `HudChip` / channel strings in panels instead of `$lib/cast.ts` / `$lib/settings.ts`
- Saving locale / appearance from both shell and Appearance (double-persist) — Appearance owns persist; shell mirrors via callback / channel
