# Design: Website stage HUD dark/light

## Boundaries

| In | Out |
|---|---|
| `website/src/lib/marketing-page.svelte` — stage chrome control, HUD color apply, notepad CSS vars, short crossfade | Page-shell / `:root` brand tokens (`--bg`, `--fg`, …) as a site theme |
| `website/src/lib/i18n.ts` — stage theme labels (en/zh) | App Settings Appearance; `packages/hud-view` preset hex values |
| Consume `colorsFromHudPreset("dark" \| "light")` | Lite/Full/Text layout preset switcher; persistence; `prefers-color-scheme` |

## Contracts

### State

- Single stage-local state: `hudColor: HudColorPresetId` (`"dark" | "light"`), default `"dark"`.
- On change: `liteSlots.applyStyle({ ...liteSlots.style, ...colorsFromHudPreset(hudColor) })` and same for `fullSlots` (preserve opacity / preset / font / dwell).
- Notepad pairing is CSS only via a class or data attribute on `.stage` / `.screen` (e.g. `data-hud-color="light"`), not a second Svelte store.

### Notepad tokens (bright / focused paper)

| `hudColor` | `--paper` | `--paper-ink` |
|---|---|---|
| `dark` | `#ffffff` (VS Code Light+ editor) | `#333333` (near Light+ fg) |
| `light` | `#1e1e1e` (VS Code Dark+ editor) | `#d4d4d4` (near Dark+ fg) |

Unfocused (power off) screen stays the existing black/off treatment; paper vars apply when the screen is in the lit notepad state.

### Control

- Toggle (or two-option control) in `.desk` near `.power-btn`.
- Labels via i18n (`stage.theme.dark` / `stage.theme.light` or equivalent); aria reflects current + action.
- Must not live in site nav / brand / download panels.

### Motion

- Crossfade ~150–200ms on HUD surfaces + notepad background/ink together.
- Honor `prefers-reduced-motion: reduce` → instant swap (no fade).
- Do not sequence paper-then-HUD.

## Data flow

```
user toggles stage control
  → hudColor state flips
  → apply colorsFromHudPreset to liteSlots + fullSlots
  → stage/screen data attribute updates notepad CSS vars
  → CSS transition paints HUD + paper (or instant if reduced motion)
```

No URL, localStorage, or documentElement theme attribute.

## Compatibility / rollback

- Additive UI on stage only; remove control + revert applyStyle init to dark-only to roll back.
- Shared HUD package unchanged → App behavior untouched.

## Tradeoffs

- Notepad dual is a demo contrast scaffold, not a claim that users’ desktops match VS Code — chosen so light HUD stays readable.
- Short crossfade is marketing polish only; App settings remain instant.
