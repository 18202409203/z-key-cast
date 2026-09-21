# Journal - zhupengji (Part 1)

> AI development session journal
> Started: 2026-09-15

---



## Session 1: macOS CastEvent input hooks

**Date**: 2026-09-15
**Task**: macOS CastEvent input hooks
**Branch**: `main`

### Summary

Implemented macOS CGEventTap → CastEvent emit to overlay HUD + main log; Accessibility status; light repeat filter. Spec: tauri/cast-events.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `60f2641` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Key-mouse HUD coexist

**Date**: 2026-09-15
**Task**: Key-mouse HUD coexist
**Branch**: `main`

### Summary

Split overlay into independent key/mouse slots with separate dwell timers; vertical stack; status exclusive. Spec/design updated.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `beacdf7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Mouse schematic top-half crop

**Date**: 2026-09-15
**Task**: Mouse schematic top-half crop
**Branch**: `main`

### Summary

Cropped MouseSchematic to a compact pebble mouse-head; L/R/wheel press fills with HUD textColor instead of stroke highlight.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `10fdf28` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: key-filter + drag HUD position

**Date**: 2026-09-15
**Task**: key-filter + drag HUD position
**Branch**: `main`

### Summary

Shipped ignore-key filter (categories + press-to-add) and HUD corner/custom drag-to-place with place-mode click-through safety.

### Main Changes

### Done
- key-filter: ignoredKeyIds, category presets, Add key capture, emit-path filter
- drag-hud-position: corner|custom persist, Move HUD/Done, abandon on exit
- Spec: cast-events updated for both

### Next
- 09-15-i18n then 09-15-log-export


### Git Commits

| Hash | Message |
|------|---------|
| `5b681c1` | (see git log) |
| `c91a73f` | (see git log) |
| `7c92b3e` | (see git log) |
| `8552a2f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: i18n done; archive filter/drag/i18n; log-export backlog

**Date**: 2026-09-15
**Task**: i18n done; archive filter/drag/i18n; log-export backlog
**Branch**: `main`

### Summary

Shipped en/zh UI; archived key-filter, drag-hud-position, i18n; deferred log-export to backlog.

### Main Changes

### Done
- Archived 09-15-key-filter, 09-15-drag-hud-position, 09-15-i18n
- Roadmap active path closed through #10 (i18n)
- 09-15-log-export marked BACKLOG (deferred)

### Left dirty
- design/02-ui.md (untracked polish notes; not committed)


### Git Commits

| Hash | Message |
|------|---------|
| `54bb082` | (see git log) |
| `a2cb71f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: HUD key/mouse layout presets

**Date**: 2026-09-15
**Task**: HUD key/mouse layout presets
**Branch**: `main`

### Summary

Fixed overlay key/mouse fighting with four persisted layout presets in Settings (default key-left-mouse-right).

### Main Changes

### Done
- Settings: keyMouseLayout select (4 presets), en/zh i18n
- Overlay: stable key→mouse DOM + CSS flex-direction/order; solo chips collapse
- Spec: type-safety.md note for keyMouseLayout
- Archived 09-15-hud-km-layout

### Testing
- [OK] npm run check; cargo test (23)


### Git Commits

| Hash | Message |
|------|---------|
| `b6973e8` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: HUD persist never-fade

**Date**: 2026-09-16
**Task**: HUD persist never-fade
**Branch**: `main`

### Summary

Added Settings checkbox to pin full keyboard / mouse schematic as a recording reference. Highlights still follow dwell (chips are down-only). Spec records pin-vs-slot so later persist up/down can keep writing slots.

### Main Changes

### Done
- `persistVisible` on HudStyleSettings (TS + Rust); omit → false
- Overlay pin vs slot; MouseSchematic unpressed; Settings checkbox + i18n
- Spec: cast-events.md + type-safety.md + tauri quality checklist
- Archived 09-15-hud-persist

### Testing
- [OK] npm run check; cargo test (25)

### Git Commits

| Hash | Message |
|------|---------|
| `0246453` | feat(hud): add persist-visible HUD pin |
| `21c0027` | chore(task): archive 09-15-hud-persist |

### Status

[OK] **Completed**

### Next Steps

- Persist mode key up/down so highlights track physical hold


## Session 7: Ignore keys keyboard picker

**Date**: 2026-09-16
**Task**: Ignore keys keyboard picker
**Branch**: `main`

### Summary

Capture ignore via shared KeyboardMap click-toggle; Add key for off-board ids; main window 600x680 centered shell; archived 09-16-ignore-keys-keyboard.

### Main Changes

### Done
- Shared KeyboardMap: interactive + muted ignored; Overlay display-only
- Capture stack: categories → board → Add key → off-board list only
- Window/shell: 600×680, minWidth 600, content max 560px centered; numpad flex with main
- Hidden scrollbars; specs updated (cast-events + type-safety)
- Archived `09-16-ignore-keys-keyboard`

### Testing
- [OK] npm run check; trellis-check AC1–AC5


### Git Commits

| Hash | Message |
|------|---------|
| `f540f69` | (see git log) |
| `8a12b3e` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Mouse click ripple (macOS)

**Date**: 2026-09-16
**Task**: Mouse click ripple (macOS)
**Branch**: `main`

### Summary

Separate primary-monitor ripple layer with peer mouseClickRipple toggle; cast://mouse-ripple; Y coord fix (no Quartz flip).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b62778a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: HUD presets Text Lite Full

**Date**: 2026-09-16
**Task**: HUD presets Text Lite Full
**Branch**: `main`

### Summary

Grilled and shipped three HUD presets (Text/Lite/Full): single hudPreset, HudChip phase down/up always emitted, Full pinned held-set, Text/Lite down+dwell; archived 09-16-hud-presets.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `70db209` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Settings HUD tab IA

**Date**: 2026-09-16
**Task**: Settings HUD tab IA
**Branch**: `main`

### Summary

Split presentation into default HUD tab; Settings keeps Theme/Position/Language. Also pinned Full mouse scale and documented dwell 200–5000 in hints.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `000469a` | (see git log) |
| `196bd32` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Windows LL input hooks

**Date**: 2026-09-16
**Task**: Windows LL input hooks
**Branch**: `main`

### Summary

Added Windows WH_*_LL key/mouse hooks into the shared HudChip pipeline; removed KeyRef.label so UI resolves display from id+legend/OS; platform-specific Capture hook-failed copy; Linux remains stub; live Win smoke deferred.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `6b2b7f1` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Scroll wheel HUD wrap-up

**Date**: 2026-09-17
**Task**: Scroll wheel HUD wrap-up
**Branch**: `main`

### Summary

Shipped scroll HudChip + Lite/Full tick pulse; captureMouse gates scroll; ignoredMouseActions replaces captureScroll; archived 09-17-scroll-wheel-hud. Continued planning 09-17-text-key-queue (Text+Lite timeline).

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ef6898a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 13: Text/Lite operation timeline

**Date**: 2026-09-17
**Task**: Text/Lite operation timeline
**Branch**: `main`

### Summary

Shipped Text/Lite unified timeline (≤5, scroll tail-refresh, status clear); Lite KeyCard+schematic frames; Text i18n mouse/scroll labels + line-art icons; outro fixed-position polish; archived 09-17-text-key-queue. design/03 child map complete.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b5e998cfe46c04c1d64da94d3fd5af8fa3af7494
91428a3 chore(task): archive 09-17-text-key-queue
b5e998c feat(hud): Text/Lite shared operation timeline
99a06d9 docs(task): mark scroll-wheel-hud archived in design/03 map
e69d8b9 chore: record journal
5a7c4f1 chore(task): archive 09-17-scroll-wheel-hud` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 14: Archive design/03 HUD UX parent

**Date**: 2026-09-17
**Task**: Archive design/03 HUD UX parent
**Branch**: `main`

### Summary

Archived parent 09-17-design-03-hud-ux after all four children delivered (schematics, numpad, scroll HUD, Text/Lite timeline). Cross-child AC checked; design/03 marked delivered.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `b5e998c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 15: Text/Lite timelineMax + archive mod-chord

**Date**: 2026-09-17
**Task**: Text/Lite timelineMax + archive mod-chord
**Branch**: `main`

### Summary

Added configurable Text/Lite timelineMax (1–10, default 5, trim on shrink). Archived timeline-max and text-lite-mod-chord tasks.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `332e86c` | (see git log) |
| `0d77e4a` | (see git log) |
| `ad6aed7` | (see git log) |
| `2868a50` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## 2026-09-18 — form chrome + HUD corner + LTR timeline

**Branch**: `main`

### Summary

Delivered macOS-style settings form chrome, HUD content corner anchoring, then locked Text/Lite timeline to fixed LTR right-enter (dropped timelineGrow). Archived three tasks.

### Git Commits

| Hash | Message |
|------|---------|
| `5b89b3a` | feat(ui): unify settings panels with grouped form chrome |
| `632fe1c` | feat(hud): anchor overlay content to position corner |
| `cd1177a` | fix(hud): lock Text/Lite timeline to LTR right-enter |

### Status

[OK] **Completed** — form-section-hierarchy, hud-corner-anchor, timeline-grow-direction archived.

### Next Steps

- Optional: custom-mode content-corner picker (方案 C)



## Session 16: Main window appearance

**Date**: 2026-09-18
**Task**: Main window appearance
**Branch**: `main`

### Summary

Persisted system/dark/light main chrome with flat tokens and page→inset→control depth ladder; Settings→Appearance; Theme+Position under HUD; specs for uiAppearance.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c2ed29d` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 17: Main UI polish

**Date**: 2026-09-18
**Task**: Main UI polish
**Branch**: `main`

### Summary

Panel inset/radius tokens, fixed tab height, fail-only capture banner, unified fill ChoiceCardGroup with outline selection; ring research captured.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `66624c6` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 18: Windows click ripple

**Date**: 2026-09-19
**Task**: Windows click ripple
**Branch**: `main`

### Summary

Win WH_MOUSE_LL downs emit cast://mouse-ripple with primary-local CSS coords; owner smoke on real Windows.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `9205d68` | (see git log) |
| `7a5e3a2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 19: System tray + hide main on close

**Date**: 2026-09-19
**Task**: System tray + hide main on close
**Branch**: `main`

### Summary

Fixed orphan-after-X: Main close hides Settings; tray/Dock restore; Quit exits. HUD stays always on. Spec updated for tray lifecycle.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e63b69c` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 20: Custom HUD content-corner picker

**Date**: 2026-09-19
**Task**: Custom HUD content-corner picker
**Branch**: `main`

### Summary

Shipped scheme C: custom positions persist contentCorner (legacy omit → br); inherit corner when entering custom; FormRow picker; no auto place on custom; place-mode locks Main except Done + content-corner; removed in-HUD place banner. Archived 09-19-custom-content-corner.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `c6080f5` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 21: LAN website + internal updater

**Date**: 2026-09-20
**Task**: 官网本地流程与更新检查联调
**Branch**: `main`

### Summary

Added `website/` (SvelteKit) with deploy root `website/publish/`, LAN serve/publish scripts, test keypair, and `tauri:build:internal` updater path. Public `tauri build` stays updater-free. About checks then confirms before install. Spec: guides/site-updater.md. Archived 09-20-site-local-update-flow.

### Main Changes

- website package + pnpm workspace; site scripts/keys under website/
- site:publish-test / site:publish-artifacts + release-kit postrelease hook
- About update confirm UX (en/zh)

### Git Commits

| Hash | Message |
|------|---------|
| `795fc5a` | feat(site): add LAN website and internal updater |
| `a16dad8` | chore(task): archive 09-20-site-local-update-flow |

### Testing

- [OK] pnpm check / website:check; cargo check ± internal-updater
- [ ] macOS C-loop fully signed off on device (user was exercising)

### Status

[OK] **Completed** (manual C-loop follow-up optional)

### Next Steps

- Optional: finish macOS C-loop once with confirm UI
- Later: website visual design task; public HTTPS updater with prod keys


## Session 21: 官网所见即所得 HUD 共享包

**Date**: 2026-09-21
**Task**: 官网所见即所得 HUD 共享包
**Branch**: `main`

### Summary

抽出 z-key-cast-hud-view；App overlay 接线；官网 Full live demo（DOM→HudChip）；更新 frontend directory specs

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `2ba341a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Website marketing visual redesign

**Date**: 2026-09-21
**Task**: Website marketing visual redesign
**Branch**: `main`

### Summary

Demo-first desk hero: power-session capture, dual HudSlots, orthogonal cables, Lite timeline fullscreen.

### Main Changes

Shipped marketing page for z-key-cast: monitor (Lite + notepad) + Full KeyboardMap/MouseSchematic, document-level on/off capture, one-shot intro typewriter, measured orthogonal cables with input-triggered packets toward the monitor. HudView timelineOut pinned absolute to .timeline. Spec notes in frontend component-guidelines + site-updater. Task archived as 09-21-website-marketing-visual.


### Git Commits

| Hash | Message |
|------|---------|
| `30d38e1` | (see git log) |
| `603bce9` | (see git log) |
| `579e759` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
