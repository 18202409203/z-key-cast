# Rust settings module split

## Goal

Split oversized `src-tauri/src/settings.rs` (~1257 lines) into domain modules without changing IPC channels or frontend `$lib/settings` contracts.

## Status

Deferred. Sibling of `09-17-frontend-components-panels`. **Do not start** until explicitly opened (can run after or parallel to overlay child once MVP is stable).

## Ordering

No hard code dependency on frontend MVP, but prefer finishing MVP first to avoid mixed churn. Preserve existing command names, event channels, and serialized setting shapes.

## Requirements (draft — refine when opening)

- R1. Partition by domain (e.g. hud style, hud position, capture, locale) behind stable `mod` boundaries.
- R2. Keep public Tauri commands / channels / JSON shapes compatible with `$lib/settings.ts`.
- R3. No intentional behavior change.

## Acceptance Criteria (draft)

- [ ] `settings.rs` is a thin facade or removed in favor of domain modules.
- [ ] Frontend settings flows still work (load/save/listen) without TS contract changes—or documented, minimal TS updates only if unavoidable.
- [ ] `cargo check` / app smoke for settings panels.

## Out of scope

- Frontend panel extraction (MVP child).
- New settings features.
