# Design: Settings / HUD tab IA

## Boundaries

| Surface | Owns |
|---------|------|
| Main window tabs | `MainTab` union + `TABS` order + default `activeTab` |
| HUD panel | Presentation fields only (preset, km layout, legend, font, dwell) |
| Settings panel | Theme, Position, Language |
| Overlay / Rust settings | Unchanged contracts |

## Contracts

- `HudStyleSettings` fields and `cast://hud-style` unchanged.
- Visibility: `showFontSize = showDwellMs = hudPreset !== "full"` (reuse one derived or twin).
- `showLegendLayout` stays `lite || full` as today.
- Theme section title: replace `settings.hudAppearance` usage with `settings.theme` (en Theme / zh 主题), or repurpose the Appearance key — prefer **new key** `settings.theme` and leave unused Appearance key only if something else still needs it (else remove from catalogs).
- Nav: add `nav.hud` (en `HUD`, zh `呈现`); `MainTab` includes `"hud"`.

## Data flow

No new persistence. UI only remounts existing bound controls under different panels. `patchHud` / `persistHud` paths unchanged.

## UI structure

```
tabs: HUD | Settings | Capture | Log | About
default: hud

HUD panel
  [optional single h2 "Presentation"/reuse settings.presentation or omit — prefer one h2 using settings.presentation for consistency]
  preset segmented
  keyMouseLayout
  legendLayout? (lite|full)
  fontSize? (!full)
  dwellMs? (!full)

Settings panel
  Theme h2
    colorPreset + custom colors
  Position h2
    corner + place
  Language h2
    locale select
```

## Tradeoffs

- Five tabs: accepted; short HUD label mitigates crowding.
- Font/dwell hide on Full: discovery cost vs false affordance — hide chosen.
- Shared Theme: no per-mode colors.

## Compatibility

- Existing `settings.json` needs no migration.
- Users who expected font under Appearance find it under HUD when Text/Lite.

## Rollback

Revert main `+page.svelte` + `i18n.ts` tab/section markup; no backend rollback.
