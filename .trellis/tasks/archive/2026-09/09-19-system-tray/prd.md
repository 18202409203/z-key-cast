# System tray + hide main on close

## Goal

Closing Settings with X must not orphan the app: process and HUD keep running, and the user can show Settings again or fully quit from the system tray.

## Background

- Today, X on `main` destroys that window while `overlay` / optional `ripple` keep the process alive, so Settings cannot reopen (`src-tauri/src/lib.rs` only abandons place-mode on main close/destroy).
- Older product copy listed “tray: toggle HUD / open settings / quit” (`design/index.md`, README). **This task supersedes that:** HUD stays always on; tray only controls Main + Quit.
- No tray implementation yet; enable Tauri `tray-icon` and build a tray in Rust setup.
- Icons available under `src-tauri/icons/`.

## Decisions

| Topic | Decision |
|-------|----------|
| HUD | Always visible while the app runs. Tray does **not** toggle overlay / capture. |
| Close (X) | Hide Main (`prevent_close` + `hide`); do not destroy; do not exit. |
| Tray left-click | Show + focus Main (if already visible, bring to front). |
| Tray right-click menu | `Open Settings` · `Quit`. |
| macOS Dock | Reopen / Dock click after hide → show + focus Main. |
| Menu locale | Follow persisted `uiLocale` (en/zh); refresh labels when locale changes. |
| Platforms | macOS + Windows required; Linux best-effort with same API. |

## Requirements

- **R1**: Main close (X) hides Settings; app + overlay continue; webview is not destroyed.
- **R2**: Tray left-click and menu “Open Settings” show + focus the same Main window.
- **R3**: Tray “Quit” exits the process completely (no orphan overlay/ripple).
- **R4**: macOS Dock reopen/click restores Main after hide.
- **R5**: Hiding Main or quitting abandons HUD place-mode (same cleanup as today’s close path).
- **R6**: Tray never shows/hides the HUD overlay.

## Acceptance Criteria

- [ ] AC1: X on Settings → Main hides; HUD still works; process alive. (R1, R6)
- [ ] AC2: Tray left-click restores and focuses Main. (R2)
- [ ] AC3: Tray “Open Settings” restores and focuses Main. (R2)
- [ ] AC4: macOS Dock reopen/click after hide restores Main. (R4)
- [ ] AC5: Tray Quit exits completely. (R3)
- [ ] AC6: Place-mode abandons on Main hide and on Quit. (R5)
- [ ] AC7: Menu strings follow `uiLocale` (en/zh). (Decisions)

## Out of scope

- Tray toggle HUD / pause capture
- Persisting Main hidden/shown across app restarts (launch still shows Main)
- Custom cursor / ripple tray shortcuts
- Deep Linux tray DE quirks beyond best-effort

## Complexity

Complex — needs `design.md` + `implement.md` before `task.py start`.
