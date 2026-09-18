# Main window UI polish

## Goal

Finish small main-window chrome polish: hook status feedback, radius token, panel content inset.

## Decisions (locked)

| ID | Choice |
|----|--------|
| P1 | Capture shows **fail banner only** (user-facing `captureFailed*`); success/waiting stay Log-only — no “hook” jargon in Capture UI. Keep `--app-danger` for the fail line. |
| P2 | `--radius-lg: 12px`; `FormSection` group uses it |
| P3 | Shared horizontal padding on main scrollable panels (Mac-like content inset under edge-to-edge tabs) |

## Requirements

- **R1**: Capture shows failure banner only (`captureFailed*`); use `--app-danger`. Do not show waiting/ok on Capture (Log keeps `summarizeHookStatus`).
- **R2**: Shell tokens include `--radius-lg`; FormSection uses `var(--radius-lg)` (no bare `12px`).
- **R3**: HUD / Appearance / Capture / Log / About panels share the same horizontal content inset (e.g. 16–20px); tabs stay full-bleed.

## Acceptance Criteria

- [x] AC1: Capture shows the fail banner when capture is unavailable; no waiting/ok / “hook” copy on Capture. (R1)
- [x] AC2: Form groups use `--radius-lg` in both appearances. (R2)
- [x] AC3: Panel bodies inset from window edges; tab bar still edge-to-edge. (R3)
- [x] AC4: Fail banner uses `--app-danger` readable in light and dark. (R1)

## Out of scope

- Overlay / ripple; Windows ripple; log-export; design/02 items already shipped
