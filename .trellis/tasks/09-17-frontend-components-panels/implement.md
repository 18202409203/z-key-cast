# Implement: Frontend components and panels MVP

## Checklist

1. [x] Create `$lib/components/`; `git mv` (or move) `KeyCard.svelte`, `KeyboardMap.svelte`, `MouseSchematic.svelte`; fix imports in overlay, capture usages, ripple if any; remove empty `src/components/`.
2. [x] Extract `Tabs.svelte` from main shell (markup + keyboard nav + styles); wire `+page` to it.
3. [x] Extract `SegmentedControl.svelte`; replace HUD (and any other) segmented radiogroups on main window.
4. [x] Introduce shared log buffer on shell (`logLines` + `appendLog`); extract `LogPanel` (listen + stick-to-bottom UI); switch host from `{#if}` to always-mounted + `hidden`/`inert`.
5. [x] Extract `AboutPanel` (app name/version load can stay in panel or shell—prefer panel).
6. [x] Extract `HudPanel` (style + presentation persistence).
7. [x] Extract `SettingsPanel` (theme, position/place mode, language; locale callback to shell).
8. [x] Extract `CapturePanel` (capture settings, ignore map, arm/cancel, ignore-captured listen + window teardown cancel).
9. [x] Strip `+page.svelte` to shell only; move shared shell CSS (tokens, tabs already in Tabs, field styles used by multiple panels—either duplicate minimally per panel or small shared `<style>`/`app.css` only if clearly shared).
10. [x] Update `.trellis/spec/frontend/directory-structure.md` (+ brief note in `component-guidelines.md` if helpful).
11. [ ] Smoke: five tabs, ignore-key across tab switch, log while on other tabs, place mode, overlay HUD, locale change updates tab labels.

## Validation

```bash
pnpm check          # if project script exists
# or
pnpm exec svelte-check --threshold error
cargo check --manifest-path src-tauri/Cargo.toml   # only if Rust touched (expect no)
```

Manual: `pnpm tauri dev` — exercise AC4–AC5 in PRD.

## Risky files / rollback points

| Step | Risk | Rollback |
|------|------|----------|
| 4–8 mount change | Dropped listeners if `{#if}` left in place | Restore always-on listen in shell |
| Capture extract | Armed capture lost on tab switch | Keep Capture mounted + listener |
| Locale split | Tab labels stale / double-save | Single notify path shell ← Settings |

Git revert of the feature branch/commit is sufficient; no settings schema migration.

## Ready for `task.py start` when

- User reviewed `prd.md` / `design.md` / `implement.md`
- `implement.jsonl` and `check.jsonl` have real spec entries
