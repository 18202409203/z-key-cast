# Design: Rust settings module split

## Architecture

```
lib.rs / input/*
    │  settings::foo  (unchanged paths)
    ▼
settings/mod.rs          # pub use + channel consts
    ├── types.rs         # HudPreset, HudStyleSettings, CaptureSettings, …
    ├── store.rs         # OnceLock mutexes, atomics, AppSettings, load/save
    ├── capture.rs       # get/set capture, ignore arm, allows_chip, filter
    ├── hud.rs           # style/position/place mode commands + apply_hud_position
    ├── locale.rs        # get/set ui locale + emit
    └── ripple.rs        # sync_ripple_window / ensure_ripple_window
```

## Boundaries

| Module | Owns | Depends on |
|--------|------|------------|
| `types` | Serde shapes, defaults, clamp / legacy `HudStyleSettingsDe` | std + serde only (and `HudChip`/`KeyRef` if needed for filter types—prefer keep chip filter in `capture`) |
| `store` | Runtime locks, `load`/`save`/`persist_app_settings`, `AppSettings::{from_runtime,apply_to_runtime}` | `types` |
| `capture` | Capture toggles, ignored keys, chip gate helpers used by input | `store` / `types` |
| `hud` | Style + position + place mode | `store`, `types`; may call `ripple` only if style save already does (prefer not) |
| `locale` | Locale persist + `UI_LOCALE_CHANNEL` | `store`, `types` |
| `ripple` | Ripple window lifecycle | `store` (ripple enabled flag), Tauri window APIs |
| `mod` | Re-exports for `settings::` | all |

## Compatibility (hard)

- Command names registered in `lib.rs` unchanged.
- Channel strings: `cast://hud-style`, `cast://hud-place-mode`, `cast://ui-locale`.
- `RIPPLE_WINDOW_LABEL`, `allows_chip`, `filter_key_chip`, `take_ignore_capture`, `mouse_click_ripple_enabled`, `arm_ignore_capture` / `cancel_ignore_capture` remain `pub` under `settings::`.
- On-disk `settings.json` shape and legacy migrate tests unchanged.

## Visibility

Prefer `pub(crate)` for helpers used across `settings/*`; only `mod.rs` re-exports what external crates/`lib`/`input` need. Avoid making every internal lock accessor public.

## Circular dependency risk

`persist_app_settings` touches the full `AppSettings` while domain setters update one slice—keep that orchestration in `store` (or thin wrappers in domain modules that build `AppSettings` via `from_runtime`). Do **not** have `store` import `hud`/`capture` command modules.

## Trade-offs

| Choice | Benefit | Cost |
|--------|---------|------|
| A: domain files + store | Matches product domains; readable | Careful `pub use` list |
| hud style+position together | Shared place-mode / position apply | `hud.rs` still medium-sized |

## Rollback

Git revert; no data migration.
