# Implement: drag HUD position

## Checklist

1. **Settings contract (Rust + TS)**
   - `HudPositionSettings` serde + default BR
   - get/set (or fold into existing settings get/set — prefer dedicated get/set_hud_position_settings mirroring hud style, OR nest under AppSettings and expose with capture/hud load)
   - `apply_hud_position(app)` used at setup and on set
   - Unit tests: deserialize default / corner / custom

2. **Place mode**
   - `start_hud_place_mode` / `end_hud_place_mode` (+ permissions/capabilities)
   - Channel `cast://hud-place-mode` for overlay
   - end persists custom from outer position

3. **Overlay**
   - On place-mode active: show drag affordance; pointerdown → `getCurrentWindow().startDragging()`
   - Optional subtle border so user sees the hit target

4. **Main Settings**
   - Wire Corner select (incl. Custom display)
   - Move HUD / Done buttons
   - Persist corner changes immediately

5. **Validate**
   - `cargo test`
   - `npm run check`
   - Manual: corner jump, drag→custom→restart, Done restores click-through

## Validation commands

```bash
cd src-tauri && cargo test
npm run check
```

## Risky points

- Forgetting to re-enable ignore-cursor on Done / app quit while placing
- Custom coords off-screen after monitor change — clamp lightly if easy, else accept out-of-scope
- `startDragging` requires cursor events enabled (place mode only)

## Rollback

Revert position settings + place commands; overlay falls back to hardcoded BR.
