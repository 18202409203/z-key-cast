# Implement: Windows input hooks + id-only KeyRef

## Checklist

1. [x] Break `KeyRef`: remove `label` in Rust `event.rs` + TS `cast.ts`; fix `isKeyRef`, chip tests, macos `KeyRef::new` call sites (id only).
2. [x] Frontend: id→display helpers; `formatHudLabel` / Log / ignore UI / key-card fallbacks use legend/OS — no payload.label.
3. [x] Cargo windows deps; `windows.rs` + `mod.rs` cfg (macos | windows | stub); LL hooks → RawInput ids → filter/reducer/emit; no ripple.
4. [x] hook-status reasons; i18n platform-specific `hookFailed`.
5. [x] Update `.trellis/spec/tauri/cast-events.md` (+ type-safety) for id-only KeyRef + Windows path.
6. [x] Validate: `pnpm check`; Windows `cargo check --target …`; document deferred Win smoke.

## Validation

```bash
pnpm check
cargo check --target x86_64-pc-windows-msvc   # or available Windows target
```

**Results (2026-09-16):**

- `pnpm check`: passed (0 errors)
- Host `cargo test` (macOS): 31 passed
- `rustup target add x86_64-pc-windows-msvc`: installed
- `cargo check --target x86_64-pc-windows-msvc`: fails in `tauri-winres` build script — missing `llvm-rc` when cross-compiling from macOS (not a `windows.rs` type error). Full Windows compile needs a Windows host or an `llvm-rc` toolchain.
- Live Windows smoke: **deferred** per PRD.

## Review gates

- No `label` on wire; no `WinLeft`; no Win ripple; shared reducer preserved.

## Rollback

Revert module + contract; restore `{ id, label }` only if abandoning the task entirely.
