# Implement: Custom HUD styles

1. [x] Extend Rust settings to `AppSettings` + `HudStyleSettings`; migrate load (missing hud → defaults); capture save preserves hud
2. [x] Commands get/set hud styles; emit `cast://hud-style` on change; load emits or overlay fetches on mount
3. [x] Permissions/capabilities for new commands
4. [x] TS `$lib/settings.ts` types + helpers; channel constant
5. [x] Settings TAB UI for style controls
6. [x] Overlay: CSS variables + dwell from settings; listen hot updates
7. [x] Update cast-events or settings spec briefly
8. [x] `cargo test` / `pnpm check`
