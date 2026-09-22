# Design: Website stage HUD dark/light

## Metaphor (UX)

Second-screen **room light** is controlled by **Venetian blinds + pull cord**, not a Dark/Light text control.

| Blinds | Room | HUD preset | Notepad |
|---|---|---|---|
| **Open** (default) | Bright — sunny sky (blinds retracted) | `light` | Light paper (`#ffffff`) |
| **Closed** | Dim — slats sealed + room shade | `dark` | Dark paper (`#1e1e1e`) |

- Same-family pairing (light+light / dark+dark) — contrast relies on HUD plate opacity and chip chrome; revisit if chips wash out.
- Desk tracks room light; screen bounce uses `--paper` when powered.
- Pull cord on the right yanks briefly and toggles open/closed (~420ms).
- Power button still only arms the demo; blinds only change room light + HUD colors.
- Page shell (brand / download) stays unthemed.

## Boundaries

| In | Out |
|---|---|
| `website/src/lib/marketing-page.svelte` — stage env layers, cord, desk surface, HUD color apply, notepad CSS vars, crossfade | Page-shell / `:root` brand tokens as a site theme |
| `website/src/lib/i18n.ts` — blinds copy (en/zh) | App Settings Appearance; `packages/hud-view` preset hex values |
| Consume `colorsFromHudPreset("dark" \| "light")` | Lite/Full/Text layout preset switcher; persistence; `prefers-color-scheme`; sun/moon as primary toggle; desk lamp prop |

## Contracts

### State

- Primary UX state: `blindsOpen: boolean` (default `true`).
- Derived: `hudColor = blindsOpen ? "dark" : "light"`.
- On change: apply `colorsFromHudPreset(hudColor)` to lite + full slots (preserve opacity / preset / font / dwell).
- Notepad pairing via `data-hud-color` on `.stage` (unchanged mapping).

### Control

- Interactive: right-edge **blind cord** button (`aria-pressed` = closed).
- Must not live in site nav / brand / download panels.

### Motion

- Blinds / sky / room shade / desk surface ~420ms; HUD + notepad ~180ms crossfade window; cord yank ~280ms.
- `prefers-reduced-motion: reduce` → instant (no yank / no slat tween).

## Data flow

```
user pulls blind cord
  → blindsOpen flips
  → sky/blinds/desk CSS classes update
  → apply colorsFromHudPreset to liteSlots + fullSlots
  → data-hud-color updates notepad tokens
```

No URL, localStorage, or documentElement theme attribute.

## Compatibility / rollback

- Remove `.stage-env` / cord; restore prior control or dark-only init.
- Shared HUD package unchanged → App behavior untouched.
