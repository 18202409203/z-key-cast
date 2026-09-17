# Design: HUD settings morphotype schematics

## Boundaries

| Area | Change |
|------|--------|
| `$lib/components/` | New reusable card radiogroup(s) + static SVG schematic snippets |
| `$lib/panels/HudPanel.svelte` | Wire preset + km layout to cards; remove SegmentedControl + km `<select>` |
| `$lib/settings.ts` / Rust | **No** field changes |
| Overlay | Unchanged |

## Components

- `SchematicChoiceGroup.svelte` — generic `role="radiogroup"` grid of labeled cards (value, label, snippet slot or render prop via snippet)
- Or two thin wrappers: `HudPresetSchematics` + `KeyMouseLayoutSchematics` sharing one group shell

Prefer one `ChoiceCardGroup` with `items: { value, label, kind }[]` and internal SVG by kind — keeps HudPanel thin.

## Visual tokens

Match existing slate/sky: border `#334155`, selected `#38bdf8` / sky tint (same as `SegmentedControl`). Schematic strokes mid-slate, not theme HUD colors.

## A11y

Mirror `SegmentedControl`: hidden radio inputs, `aria-labelledby` from field label, disabled while saving.
