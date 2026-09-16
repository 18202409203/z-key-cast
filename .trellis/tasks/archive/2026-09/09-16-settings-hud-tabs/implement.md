# Implement: Settings / HUD tab IA

## Checklist

1. [x] i18n: `nav.hud` (HUD / 呈现); `settings.theme` (Theme / 主题); keep `settings.presentation` if HUD panel uses an h2.
2. [x] `MainTab`: add `"hud"`; `TABS` order HUD → Settings → Capture → Log → About; `activeTab` default `"hud"`.
3. [x] Extract/move Presentation markup into `activeTab === "hud"` panel; gate font with same condition as dwell; order preset → km → legend → font → dwell.
4. [x] Settings panel: Theme (colors only) → Position → Language; remove Appearance + Presentation from Settings.
5. [x] Fix tab keyboard / `aria-labelledby` / panel ids for the new tab.
6. [ ] Manual smoke: AC1–AC5 (Full hide font/dwell; Theme shared; locale; place mode still under Settings).

## Validation

- `pnpm check` / project typecheck if available
- Manual: `pnpm tauri dev` — switch presets, theme custom colors on each preset, tab order Left/Right

## Review gates

- No change to Rust settings or overlay color wiring unless a bug appears
- Spec touch: optional one-liner in `.trellis/spec/frontend/type-safety.md` or guides if IA is documented — prefer update after check if needed

## Rollback

`git revert` the UI commit; settings file untouched.
