# Implement: system tray + hide main on close

## Checklist

1. [x] Enable `tray-icon` on `tauri` in `src-tauri/Cargo.toml`; confirm build.
2. [x] Add small Rust helper module (e.g. `src-tauri/src/tray.rs` or `settings/tray.rs`) with `show_main`, `build_tray`, locale-aware menu labels.
3. [x] Wire tray in `setup`; menu + left-click → show Main; Quit → `exit(0)`.
4. [x] Change `RunEvent` main `CloseRequested`: `prevent_close` + abandon place-mode + `hide` (drop destroy-as-primary path reliance).
5. [x] Handle `RunEvent::Reopen` → `show_main` (macOS Dock).
6. [x] On successful `set_ui_locale_settings`, refresh tray menu labels.
7. [x] Update product copy that still says “toggle HUD” (`README*`, `design/index.md`) to “open settings / quit” — can be same PR as code or finish-work.
8. [x] Manual smoke (AC1–AC7); `cargo check` / `cargo test` in `src-tauri`.
   - `cargo check` + `cargo test`: passed (52 unit tests). Manual AC smoke still for the user in `pnpm tauri dev`.

## Validation

```bash
cd src-tauri && cargo check && cargo test
pnpm tauri dev   # manual: X hide → tray/Dock reopen → Quit
```

## Risky files

- `src-tauri/src/lib.rs` — window lifecycle
- `src-tauri/Cargo.toml` — feature flag
- New tray module — menu event wiring
- `src-tauri/src/settings/locale.rs` — relabel hook

## Rollback points

- After feature enable: if tray fails to link, revert Cargo feature.
- After CloseRequested change: if hide misbehaves, restore previous abandon-only handler temporarily.

## Review gate before `task.py start`

- [x] `prd.md` converged
- [x] `design.md` present
- [x] `implement.md` present
- [ ] `implement.jsonl` / `check.jsonl` curated
- [ ] User approved planning → then `task.py start`
