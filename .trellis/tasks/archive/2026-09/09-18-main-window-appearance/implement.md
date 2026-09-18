# Implement — Main window appearance + Settings IA

## Checklist

1. [ ] **Rust types + store**: `UiAppearance`, `AppSettings.ui_appearance`, lock, parse/default tests; preserve field in all `AppSettings` reconstruct paths (capture/hud/locale/ripple).
2. [ ] **Rust commands**: `appearance.rs` get/set + emit `cast://ui-appearance`; register in `mod.rs` / `lib.rs`; ACL permissions.
3. [ ] **TS settings**: types, channel const, get/set invoke wrappers; guards if used elsewhere.
4. [ ] **CSS tokens**: shell `html`/`data-appearance` dark + light maps (both Mac-Settings flat); refactor FormSection / FormRow / Tabs / panels / brand off old slate-gradient shell.
5. [ ] **Shell**: load appearance, resolve, `matchMedia` when system, listen channel; wire Appearance panel.
6. [ ] **IA**: rename Settings → Appearance (`AppearancePanel`, tab id, i18n `nav.*`); move Theme + Position into HudPanel (Presentation → Theme → Position); Appearance = SegmentedControl appearance then Language select.
7. [ ] **i18n**: Appearance / 外观; System/Dark/Light · 跟随系统/深色/浅色; section titles as needed.
8. [ ] **Smoke**: `pnpm tauri dev` — AC1–AC6; toggle HUD Theme vs window appearance independence; OS flip under `system`.

## Validation

```bash
# Rust settings tests (appearance parse + preserve)
cd src-tauri && cargo test settings

# Frontend typecheck if project script exists
pnpm check   # or existing svelte-check / vitest entry
```

Manual: both appearances on every tab; mid-session OS theme change with `system`; restart persistence.

## Risky files / rollback

- `types.rs` + every `AppSettings { … }` clone site — easy to drop `ui_appearance`
- Large CSS touch surface — keep tokens centralized; both modes are a visual redesign (expect broader UI diff than a light-only add)
- HudPanel grows — keep Theme/Position logic colocated; don’t split stores

Rollback: revert task branch / commits as one unit (Rust field + UI IA + tokens).

## Before `task.py start`

- [x] `prd.md` converged
- [x] `design.md` + `implement.md` present
- [x] User review / approve planning
- [x] `implement.jsonl` / `check.jsonl` curated (step 1.3)
- [x] Implement + check complete (AC1–AC6 pass; Capture KeyboardMap tokens + place-copy i18n fixed in check)
