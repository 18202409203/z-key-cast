# Implement — 表单分区与标题层级统一

## Checklist

1. [x] Add shared form chrome (`FormSection` / `FormRow` and/or shared settings-form styles) matching PRD visual contract.
2. [x] Refactor `SettingsPanel.svelte` to title-outside + gray groups + L/R rows (wide controls none here except possibly none).
3. [x] Refactor `HudPanel.svelte` — ChoiceCardGroup fields use stack rows; selects/ranges use L/R; hints by row type.
4. [x] Refactor `CapturePanel.svelte` — Mouse / Keyboard sections; ignore as stack inside group; failure message outside groups.
5. [x] Remove duplicated per-panel form CSS that the shared chrome replaces; keep panel-only styles (ignore board, category grid, etc.).
6. [x] Leave LogPanel / AboutPanel non-form layouts unchanged (aside from accidental shared imports — none expected).
7. [ ] Smoke: switch tabs, change theme/position/locale, HUD preset/layout, capture toggles/ignore map — persist still works.

## Validation

```bash
# Frontend typecheck / build as used in this repo (pick what exists)
pnpm check || npm run check || pnpm exec svelte-check
```

Manual:

- [ ] Settings / HUD / Capture look consistent (title outside, inset group, hairlines).
- [ ] Section title clearly larger than field labels; ignore sub-labels weaker.
- [ ] No full-width section rules under tabs.
- [ ] L/R vs stack + hint placement matches PRD table.
- [ ] Capture still one tab; two sections; no nested gray for ignore.

## Review gates

- PRD acceptance criteria all checked.
- No behavior/schema regressions in settings save paths.

## Rollback

Revert the shared chrome module + three panel files in one commit revert.
