# Implement: Rust settings module split

## Checklist

1. [ ] Create `src-tauri/src/settings/` and move code from `settings.rs` into `types` / `store` / `capture` / `hud` / `locale` / `ripple` with `mod.rs` facade (`pub use`).
2. [ ] Delete flat `settings.rs`; confirm `lib.rs` + `input/*` still compile on `settings::` paths.
3. [ ] Relocate `#[cfg(test)]` tests with owning modules (or `settings/tests.rs` included from `mod.rs`).
4. [ ] `cargo check` + `cargo test` (settings / package tests).
5. [ ] Update `.trellis/spec/tauri/index.md` checklist paths (`settings/` not `settings.rs`); skim `cast-events.md` for stale `settings.rs` mentions.
6. [ ] Manual smoke AC3 if `tauri dev` available.

## Validation

```bash
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

## Risky points

| Risk | Mitigation |
|------|------------|
| Missed `pub use` breaks input | Grep `settings::` and compile |
| Test-only helpers private | `pub(crate)` or keep in same module as tests |
| Lock/atomic init order | Keep `OnceLock` / `Atomic*` in `store` only |

## Ready for `task.py start` when

User reviewed artifacts; jsonl curated.
