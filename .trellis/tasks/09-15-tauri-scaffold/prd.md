# Scaffold Tauri overlay + design docs

## Goal

Establish product/tech baseline for z-key-cast and a runnable Tauri 2 scaffold with a corner HUD overlay window skeleton.

## Requirements

- Capture agreed product decisions in `design/index.md`
- Scaffold Tauri 2 + SvelteKit (TS) at repo root
- Overlay window: transparent, always-on-top, click-through
- Settings/main window + HUD stub
- Cross-platform project layout (macOS / Windows / Linux)

## Acceptance Criteria

- [x] `design/index.md` documents product decisions, architecture, MVP, risks
- [x] Tauri 2 + SvelteKit TS scaffold builds (`pnpm build`, `cargo check`)
- [x] Overlay window config present (transparent, decorations off, always on top)
- [x] HUD UI stub renders in the corner overlay
- [x] `.gitignore` covers Node / Rust / Tauri artifacts

## Notes

- Input hooks are out of scope for this scaffold
- Linux Wayland global capture remains a later risk
- `create-tauri-app --force` wiped prior untracked Trellis/design files once; Trellis was re-inited
