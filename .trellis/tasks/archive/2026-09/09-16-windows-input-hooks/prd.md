# Windows input hooks

## Goal

Make z-key-cast usable for screen recording on Windows by replacing the Windows stub with `WH_*_LL` hooks into the existing `HudChip` pipeline, and clean the key contract: stable logical **`id` only** on the wire; all display labels resolved in the UI from id + legend/OS.

## Confirmed facts (repo)

- Non-macOS today: `stub.rs` → `denied("unsupported_platform")`.
- macOS: thread + CGEventTap → `RawInput` → filter → `ChipReducer` → `cast://event`.
- `KeyRef` today is `{ id, label }`; Text/`formatHudLabel` trust `label`; Lite/Full mostly use legend by `id`.
- Logical OS/meta modifier id is `MetaLeft`/`MetaRight` (not `WinLeft`).

## Decisions

| 项 | 选择 |
|----|------|
| MVP scope | Key + mouse hooks; **no** Windows ripple |
| Elevated apps | Best-effort, no require-admin |
| Hook failure UI | Platform-specific Capture copy |
| Key identity | Stable `Meta*` (etc.) ids — never OS-specific ids |
| Wire `KeyRef` | **A — remove `label`; `KeyRef = { id }` only** |
| Display | Svelte resolves all HUD/Log human text from id + legend/OS |
| Verification | Windows target build/check + review; no live Win smoke gate |
| Hook API | `WH_KEYBOARD_LL` + `WH_MOUSE_LL` |
| Linux / other | Keep `stub` — unsupported for now |

## Requirements

- **R1** Windows: real global key + mouse LL hooks.
- **R2** Same filter → reducer → `cast://event` path; stable **ids**.
- **R3** Hook failure → `cast://hook-status` with clear `reason`.
- **R4** No Windows ripple emits this task.
- **R5** No Administrator requirement.
- **R6** Platform-aware Capture hook-failed copy.
- **R7** Breaking: drop `KeyRef.label` from Rust + TS; `isHudChip` / ignore-capture payloads are id-only; migrate macOS normalize + tests.
- **R8** All user-visible key strings (Text HUD, Log summary, key-card fallbacks, ignore-list display) come from id→legend/OS helpers.
- **R9** Gate: Windows `cargo check` (or equiv.) + macOS/`pnpm check`; live Win smoke = follow-up.
- **R10** LL hooks in `windows.rs`; stub for non-macOS non-Windows.

## Out of scope

- Linux hooks; Windows ripple; UAC; `WinLeft` ids; installer polish; elevated guarantees; Raw Input / `rdev`

## Acceptance Criteria

- [ ] AC1: cfg routes macos / windows / stub; Linux still unsupported.
- [ ] AC2: Windows LL hooks → `HudChip` on existing channel (compile + path review).
- [ ] AC3: `KeyRef` is `{ id }` only end-to-end; no `label` field in wire or `isKeyRef`.
- [ ] AC4: Text/Log/ignore UI show Win-oriented Meta under win-us/auto-Windows (not `⌘`).
- [ ] AC5: Capture hook-failed copy differs mac vs win.
- [ ] AC6: No ripple emit on Windows this task.
- [ ] AC7: Windows target check + `pnpm check` / macOS path pass.
- [ ] AC8: Deferred live Win smoke documented.

## Notes

- Complex: `design.md` + `implement.md` before `task.py start`.
- Contract change must update `.trellis/spec/tauri/cast-events.md`.
