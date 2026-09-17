# Implement: timelineMax

## Checklist

1. [x] Rust `HudStyleSettings` + De + Default + `clamp` + tests for omit→5 and out-of-range.
2. [x] TS `settings.ts`: type, DEFAULT, normalize/isHudStyleSettings.
3. [x] `hud-slots.svelte.ts`: use style max; trim on `applyStyle` when shrinking.
4. [x] `HudPanel.svelte` + i18n en/zh (label, hint, preset copy).
5. [x] Specs: `design/03.md`, cast-events, type-safety.
6. [x] `pnpm check`; `cargo test` settings types if applicable.

## Validation

```bash
pnpm check
cd src-tauri && cargo test settings::types::
```

## Review gate

- [x] PRD decisions locked (incl. immediate trim)
- [ ] User approves start
