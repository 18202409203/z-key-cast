# Design — 表单分区与标题层级统一

## Boundaries

- **In**: SettingsPanel / HudPanel / CapturePanel markup structure + shared form chrome styles/components.
- **Out**: LogPanel / AboutPanel form restyle; Capture tab split; overlay / corner anchoring; settings persistence / invoke logic changes.

## Approach

Introduce a small shared form chrome under `$lib/components/` (or shared scoped CSS imported by the three panels) so the three settings panels stop copying divergent `.panel` / `h2` / `.field` blocks.

### Visual contract (from PRD)

```
section.form-section
  h2.form-section-title          ← outside group; larger than field label
  div.form-group                 ← light gray rounded inset
    div.form-row | form-row--stack
      [label column + optional hint]
      [control]
    (hairline between rows)
```

| Row mode | When | Hint |
|----------|------|------|
| `form-row` (L/R) | select, toggle, number, color, narrow button, range | under label |
| `form-row--stack` | ChoiceCardGroup, KeyboardMap, ignore blocks | under control block |

### Component shape (preferred)

- `FormSection.svelte` — props: `title`, `titleId?`; slot = group body
- Optional `FormRow.svelte` — props: `label`, `hint?`, `stack?: boolean`, `labelledBy?`; slot = control

If thin wrappers feel heavy, a shared `settings-form.css` (or Svelte partial styles) with the same class names is acceptable — still one source of truth, panels only compose classes.

### Capture-specific

- Keep one Capture tab; two `FormSection`s (Mouse / Keyboard).
- Ignore blocks: inside the same `form-group`, `form-row--stack` + weaker `.form-sublabel`; no nested gray group.
- Hook failure message: above sections, outside any `form-group`.

### Typography / color (align existing slate/sky)

- Section title: larger than field label; not competing via tiny uppercase alone (may keep or drop uppercase — prefer readable size + weight over all-caps micro type).
- Field label: body contrast (`#e2e8f0` range).
- Sub-label: smaller / muted than field label.
- Group fill: subtle light-on-dark inset (e.g. `color-mix` / low-alpha slate), radius ~10–12px; row hairlines only inside group width.
- No full-bleed section dividers under the tab bar.

## Data flow / compatibility

- No settings schema changes.
- Panels keep owning get/set + listeners; shared pieces are presentational only.
- a11y: preserve `aria-labelledby` / section labelling; toggles stay accessible.

## Tradeoffs

| Choice | Why |
|--------|-----|
| Shared chrome vs per-panel copy | Fixes “panels inconsistent”; slight upfront extract |
| Components vs CSS-only | Components enforce row/stack; CSS-only is faster if markup stays disciplined |
| No nested groups for ignore | Avoids gray-on-gray; keep two top-level Capture sections |

## Rollout / rollback

- Single frontend change set; revert shared chrome + panel markup together.
- No migration / feature flag.
