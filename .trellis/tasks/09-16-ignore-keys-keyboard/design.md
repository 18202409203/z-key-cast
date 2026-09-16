# Design — Ignore keys keyboard picker

## Boundaries

| Layer | Change? | Notes |
|-------|---------|-------|
| Rust ignore / arm capture | No | Keep `ignoredKeyIds`, `arm_ignore_key_capture`, `cast://ignore-key-captured` |
| `$lib/keyboard-layout.ts` | Read-only helper ok | Export a `layoutKeyIdSet` (or equivalent) for off-board filtering; do not expand rows |
| `$lib/KeyboardMap.svelte` | Yes | Add select/ignore mode + muted class; keep overlay path display-only |
| `$lib/key-ignore-presets.ts` | Maybe | Reuse; optional helper `offBoardIgnoredIds(ignored, layoutIds)` if it keeps `+page` thin |
| `src/routes/+page.svelte` | Yes | Rewire ignore-block to stacked board + filtered list |
| `src/routes/overlay/+page.svelte` | Minimal | Pass existing props only; no new handlers |
| i18n | Small | Hint/empty copy for off-board list if strings change |

## Component contract (`KeyboardMap`)

```ts
type Props = {
  activeIds?: ReadonlySet<string>;       // overlay press highlight (default empty)
  ignoredIds?: ReadonlySet<string>;      // Capture muted state (default empty)
  interactive?: boolean;                 // default false — buttons/click only when true
  textColor: string;
  backgroundCss: string;
  fontSizePx: number;
  legendLayout?: KeyboardLegendLayoutId;
  disabled?: boolean;                    // Capture: saving / capturing
  onToggleKey?: (id: string) => void;    // fired only when interactive && !spacer && !disabled
};
```

- Spacer ids (`id.startsWith("_")`): never interactive, never ignored styling.
- Overlay: `interactive={false}`, pass `activeIds` only.
- Capture: `interactive={true}`, pass `ignoredIds` from `ignoredKeyIds`; `activeIds` unused (or empty).
- CSS: `.key.ignored` muted (opacity + weaker border). Forbidden: applying `.active` for ignore.

## Data flow

```
Category checkbox / board click / Add-key capture / list remove
  → patch ignoredKeyIds
  → setCaptureSettings (existing persist + revert on failure)
  → board ignoredIds + off-board list re-derive
```

Off-board list:

```
offBoard = ignoredKeyIds.filter(id => !LAYOUT_KEY_IDS.has(id))
```

`LAYOUT_KEY_IDS` = all non-spacer ids from `MAIN_ROWS` ∪ `NUMPAD_ROWS`.

## Compatibility

- Existing `settings.json` `ignoredKeyIds` unchanged.
- Users with long lists: on-board ids become board-only (no list row); off-board rows remain. No migration.
- Category Navigation (Home/End/PageUp/PageDown) still works; those ids surface in the off-board list until layout grows (out of scope).

## Trade-offs

| Choice | Why | Risk |
|--------|-----|------|
| Extend `KeyboardMap` vs new wrapper | One layout source of truth | Props surface grows — keep defaults overlay-safe |
| Muted ignore vs selected fill | Avoid HUD press confusion | Lower contrast — tune opacity for Settings panel bg |
| Stacked full board in main window | Matches product D2 | Vertical space — rely on `.panel` scroll; slightly smaller `fontSizePx` in Capture ok |

## Rollback

Revert `KeyboardMap` props/CSS and Capture ignore-block markup; settings file format unchanged so data survives.
