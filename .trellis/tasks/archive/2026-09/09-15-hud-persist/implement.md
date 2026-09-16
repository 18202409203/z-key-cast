# Implement: HUD persist never-fade

## Checklist

1. **Rust** (`src-tauri/src/settings.rs`): `persist_visible: bool` on `HudStyleSettings` + `Default` false + `#[serde(default)]`; update `hud_clamp_bounds` fixture; add omit→false parse test.
2. **TS settings** (`src/lib/settings.ts`): type, `DEFAULT_HUD_STYLE`, guard, normalize.
3. **i18n** (`src/lib/i18n.ts`): `settings.persistVisible`, `settings.persistVisibleHint` (en/zh). Optionally retune `dwellMsHint` so it covers highlight duration, not only “chip hide”.
4. **Main UI** (`src/routes/+page.svelte`): checkbox under dwell; `patchHud({ persistVisible })`; dwell input stays enabled.
5. **MouseSchematic**: allow unpressed `button`.
6. **Overlay** (`src/routes/overlay/+page.svelte`): pin vs slot derived flags; mode-aware `armKeyIdle` / `armMouseIdle`; `showKmGroup` includes pins; status still exclusive.
7. **Smoke**: default off; persist + full keyboard empty then highlight then dwell-unhighlight; persist + mouse schematic same; persist + text last chip stays; status hides pins then fades; live checkbox; legacy omit.

## Validation

```bash
cargo test --manifest-path src-tauri/Cargo.toml
npm run check
```

Manual via `pnpm tauri dev`: AC1–AC6 on overlay while toggling Settings.

## Risk / rollback

- Risky: idle timers vs pin flags vs status exclusive; `MouseSchematic` unpressed styles.
- Rollback: revert additive field; omit stays compatible.

## Ready for start when

- User approves PRD + design + this plan.
- `implement.jsonl` / `check.jsonl` have real spec entries.
