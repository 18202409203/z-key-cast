# Implement: HUD key/mouse layout presets

## Checklist

1. **Rust** (`src-tauri/src/settings.rs`): add `KeyMouseLayout` enum; field on `HudStyleSettings` + `Default`; update any test fixtures that construct full structs.
2. **TS settings** (`src/lib/settings.ts`): type, default, guard, normalize.
3. **i18n** (`src/lib/i18n.ts`): `settings.keyMouseLayout` + four option keys (en/zh).
4. **Main UI** (`src/routes/+page.svelte`): select + change handler via `patchHud`.
5. **Overlay** (`src/routes/overlay/+page.svelte`): `.km-group` wrapper; class/style from `style.keyMouseLayout`; stable key→mouse DOM + CSS for row/column and flips.
6. **Smoke**: both chips visible under each preset; solo chip; change setting live; legacy omit field.

## Validation

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run check   # or project’s svelte-check / typecheck script
```

Manual: overlay with keyboard+mouse events; toggle all four presets; confirm no position swap on staggered press.

## Risk / rollback

- Risky: overlay markup + fade transitions interacting with flex `order`.
- Rollback: revert commits; settings without field still load on older code paths after revert.

## Ready for start when

- User approves this plan + PRD/design.
- `implement.jsonl` / `check.jsonl` have real spec entries (not seed-only).
