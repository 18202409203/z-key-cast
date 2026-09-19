# Design: system tray + hide main on close

## Boundaries

| Area | Owns | Does not own |
|------|------|----------------|
| Rust tray module | Tray icon, menu, show-main / quit helpers | Frontend UI chrome |
| `lib.rs` run loop | `CloseRequested` → hide; `Reopen` → show; Exit / place-mode | Overlay content |
| Settings / locale | Supply `uiLocale` for menu labels; call tray relabel on locale set | Tray click handling |
| Overlay / ripple | Unchanged visibility | — |

## Architecture

```
setup
  └─ build TrayIcon (icon from app default / icons)
       ├─ menu: open-settings | quit
       ├─ on_tray_icon_event: Left → show_main()
       └─ on_menu_event: open-settings → show_main(); quit → app.exit(0)

RunEvent
  ├─ WindowEvent::CloseRequested { main } → prevent_close + abandon_place + hide
  ├─ Reopen (macOS) → show_main()   // ignore has_visible_windows (overlay counts as visible)
  └─ Exit / ExitRequested → abandon_place (existing)
```

## Contracts

### Window lifecycle

- **Hide path** (X, and any future hide): `api.prevent_close()` then `main.hide()`, then `abandon_hud_place_mode`.
- Do **not** rely on `Destroyed` for the hide path (window stays alive).
- **Show path**: `main.show()` + `set_focus()` (+ `unminimize` if needed on Windows).
- **Quit**: `app.exit(0)` — all windows go away; hooks stop with process.

### Tray

- Enable Cargo feature: `tauri = { features = ["macos-private-api", "tray-icon"] }`.
- Prefer Rust `TrayIconBuilder` in setup (not frontend-only tray plugin) so lifecycle stays with shell.
- Menu item ids: `open-settings`, `quit`.
- Labels: en `Open Settings` / `Quit`; zh `打开设置` / `退出` — mirror `uiLocale` lock; rebuild or `set_text` when `set_ui_locale_settings` succeeds.
- Icon: reuse bundled app icon (`icons/icon.png` or platform default via Tauri default window icon).

### Capabilities / ACL

- Tray built in Rust needs no extra frontend allowlist for show/hide if handled entirely in Rust.
- If any frontend invoke is added (unlikely), document here — prefer zero new invokes.

## Data / persistence

- No new `AppSettings` fields.
- Main visibility is session-only; cold start still shows Main (`tauri.conf.json` `visible: true`).

## Compatibility

- Place-mode cleanup must run on hide (same as old destroy path).
- Overlay `skipTaskbar` / click-through unchanged.
- Docs drift: README / `design/index.md` still say “toggle HUD” — update wording in wrap-up / spec update, not blocking code.

## Trade-offs

| Choice | Why | Rejected |
|--------|-----|----------|
| Hide vs destroy Main | Preserves Svelte state / listeners | Recreate window on every open |
| Left-click = show (not toggle hide) | Safer; hide remains X-only | Left-click toggle |
| No HUD tray toggle | User: HUD always on | MVP doc “toggle HUD” |
| Rust tray | One place for lifecycle | Frontend tray plugin only |

## Rollout / rollback

- Feature is additive; rollback = remove tray module + restore destroy-on-close (not desired).
- Manual smoke on macOS required; Windows smoke if available.
