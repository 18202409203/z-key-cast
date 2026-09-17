# Rust settings module split

## Goal

Split oversized `src-tauri/src/settings.rs` (~1257 lines) into a `settings/` module tree without changing IPC channels, command names, or frontend `$lib/settings.ts` contracts.

## Background

- Frontend siblings done; parent progress 2/3.
- Call sites use `settings::…` from `lib.rs` and `input/{macos,windows}.rs`.
- **Decision:** option **A** — `mod` + `types` + `store` + `capture` + `hud` + `locale` + `ripple` (+ tests colocated or `tests.rs`).

## Requirements

- R1. Replace `settings.rs` with `settings/` as below; keep **`settings::name`** stable via `pub use` in `mod.rs` (no call-site renames unless unavoidable).
- R2. No intentional behavior change: commands, channels, JSON shapes, clamp/legacy migrate, existing unit tests still pass.
- R3. Zero TypeScript contract changes.
- R4. Update `.trellis/spec/tauri/index.md` (and cast-events path refs if they say `settings.rs`) to document `settings/` layout.

## Target layout

```
src-tauri/src/settings/
  mod.rs       # facade: re-export public API + channels/constants
  types.rs     # enums/structs + HudStyle deserialize/clamp helpers
  store.rs     # locks/atomics, AppSettings, load/save/persist
  capture.rs   # capture commands + allows_chip/filter/ignore arm
  hud.rs       # style + position + place-mode commands/helpers
  locale.rs    # ui locale get/set + emit
  ripple.rs    # sync/ensure ripple window
```

Tests: keep with the module that owns the logic, or `#[cfg(test)]` in `mod.rs` / `tests` submodule—prefer moving existing tests next to the types/store/capture they assert.

## Acceptance Criteria

- [ ] AC1. Flat `settings.rs` removed; `settings/` present; existing `settings::` call sites compile unchanged.
- [ ] AC2. `cargo test -p z-key-cast` (or package-equivalent) and `cargo check` pass; prior settings unit tests still run.
- [ ] AC3. Manual smoke: capture, HUD style/position/place mode, locale, ripple toggle.
- [ ] AC4. Tauri spec index mentions `settings/` modules (not a single `settings.rs`).

## Out of scope

- New settings features / `design/03.md`.
- Frontend refactors.
- On-disk schema changes.
- Option B/C partitions.
