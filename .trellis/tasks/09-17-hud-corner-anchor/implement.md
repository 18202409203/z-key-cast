# Implement — HUD 键鼠按 corner 贴边

## Checklist

1. [x] Add `HUD_POSITION_CHANNEL` (`cast://hud-position`) in `$lib/settings.ts`; document/export alongside other HUD channels.
2. [x] Rust: emit position payload after `set_hud_position_settings` and `end_hud_place_mode` succeed (same pattern as hud-style emit).
3. [x] Overlay `+page.svelte`: load `getHudPositionSettings`, listen channel, derive `contentCorner` (`custom` → `br`), pass to `HudView`.
4. [x] `HudView`: prop + anchor classes; `.hud` / `.timeline` / `.card-row` / `.km-group` justify/align per corner.
5. [x] Mirror Text/Lite `timelineIn` / `timelineOut` translateX for left anchors (bl/tl).
6. [x] Confirm Full `keyMouseLayout` unchanged; status/place follow `.hud` flow.
7. [x] ACL / permissions if new emit listen needs it (check existing hud-style pattern).
8. [x] Validate: `pnpm check`; Rust `cargo test` for settings if touched; manual corner + custom smoke notes.

## Validation

```bash
pnpm check
cd src-tauri && cargo test settings::  # or relevant hud/position tests
```

Manual:

- [ ] br/bl/tr/tl: content sticks to matching inner corner
- [ ] bl/tl: timeline enters from left; br/tr from right
- [ ] tr/tl: group top-aligned; br/bl/custom bottom-aligned
- [ ] custom: window free, content stays br
- [ ] Switch corner in Settings → overlay updates without restart

## Review gates

- PRD acceptance criteria
- No window placement math regressions
- Channel payload = existing `HudPositionSettings` shape

## Rollback

Revert channel emit + settings.ts constant + overlay page + HudView in one go.
