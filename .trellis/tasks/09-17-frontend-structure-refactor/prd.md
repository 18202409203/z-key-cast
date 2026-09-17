# Frontend structure refactor (parent)

## Goal

Make the codebase easier to navigate and change by splitting oversized UI/settings modules into clear layers—without changing product behavior.

## Task map

| Child | Role | When |
|-------|------|------|
| `09-17-frontend-components-panels` | **Next** — components, Tabs/Segmented, panels (panel-owned I/O + always-mounted), directory spec | Start after this child's planning is approved |
| `09-17-overlay-structure-split` | Overlay state vs presentation split | Later |
| `09-17-rust-settings-split` | Split `settings.rs` by domain | Later |

Parent owns the requirement set, child map, cross-child acceptance, and final integration review. Parent is **not** the primary implementation target unless it gains direct work.

## Cross-child acceptance

- [ ] ACA. MVP child ships `$lib/components` + `$lib/panels` and documents layout under `.trellis/spec/frontend/`.
- [ ] ACB. Overlay child (when done) preserves HUD behavior; reuses shared components where it fits.
- [ ] ACC. Rust settings child (when done) preserves IPC/channels and `$lib/settings` contracts.
- [ ] ACD. No intentional UX or public API changes across the tree.

## Out of scope

- Features in `design/03.md` (numpad toggle, scroll-wheel HUD, etc.).
- Visual redesign.
