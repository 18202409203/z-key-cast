# Main window appearance + Settings IA

## Goal

Main window chrome follows `system` | `dark` | `light`, and IA splits overlay controls (HUD) from app chrome + language (Appearance tab).

## Background

- **1.4.0** shipped; this is 1.5 polish.
- Main shell / form chrome are hard-coded dark slate; no window appearance setting.
- Today Settings holds Theme (HUD colors) + Position + Language; HUD holds Presentation only.
- Locale persistence (`ui_locale` + get/set + `cast://ui-locale`) is the pattern to mirror.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Modes | `system` \| `dark` \| `light`; omit → `system` |
| Link to HUD colors | None |
| Chrome look | Flat grouped UI (no 1.4 slate/gradient). Shared **3-step depth**: dark outer-deep→inner-light; light outer-whitest→soft inset→white controls |
| Nav | Rename Settings → **Appearance / 外观** |
| Appearance tab | **Window appearance** first, then **Language** |
| HUD after move | **Presentation → Theme → Position** |
| Native title bar | Out (OS / Tauri default) |

## Requirements

- **R1**: Persist window appearance; UI on Appearance tab (above Language).
- **R2**: CSS variables for main chrome; flat grouped UI with a **3-step depth ladder** in both modes (dark deep→shallow; light white→soft inset→white controls); drop 1.4 radial/slate shell.
- **R3**: Tokens cover shell, Tabs, FormSection/FormRow, all main panels; main-window KeyboardMap chrome uses window tokens; overlay keeps HUD colors.
- **R4**: Live update without restart; `system` tracks OS scheme changes.
- **R5**: en/zh for tab + three options; `nav.settings` → Appearance / 外观.
- **R6**: Move Theme + Position into HudPanel (order above); Appearance panel = appearance + language only.

## Acceptance Criteria

- [x] AC1: `system` tracks OS light/dark mid-session. (R1, R4)
- [x] AC2: `dark` / `light` override OS; both use flat groups with clear page→inset→control depth (not the old gradient shell). (R1, R2)
- [x] AC3: HUD Theme and window appearance do not drive each other. (locked)
- [x] AC4: All main tabs readable in both resolved appearances. (R3)
- [x] AC5: Persists across restart; legacy omit → `system`. (R1)
- [x] AC6: Theme + Position only under HUD (Presentation → Theme → Position); Appearance tab = appearance then language; nav = Appearance / 外观. (R5, R6)

## Out of scope

- Named skins / extra accents; native titlebar theming; overlay/ripple redesign; Windows ripple / log-export / other 1.5 items
