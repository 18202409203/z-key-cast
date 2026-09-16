# HUD persist never-fade

## Goal

Settings 里「停留时间」下方增加勾选项：勾选后 HUD **常驻**，全键盘和鼠标示意图即使没按过也留在屏幕上，作为录屏参考。高亮仍按停留时间消退。文本 / 按键卡片保留最后一次内容、不整块淡出。

## Background

Overlay (`src/routes/overlay/+page.svelte`) 用独立 `keySlot` / `mouseSlot` 空闲计时，共享 `HudStyleSettings.dwellMs`（默认 1000，clamp 200–5000）。计时结束把槽位清成 `null`，整块 HUD 消失。全键盘 / 鼠标示意目前绑在槽位非空上：没按过键时看不到布局。

`cast://event` 只在主键/鼠标 **down** 出 `HudChip`；**up 被 reducer 忽略**（`src-tauri/src/input/chip.rs`）。本任务不改该合同。将来会在常驻模式下接入 key up/down 来反映真实按住状态；届时高亮源仍应是槽位数据，而非常驻「钉住表面」逻辑。

`MouseSchematic` 的 `button` 目前是必填 `"left" | "right" | "middle"`，无未按下态。

## Decisions

| Topic | Choice |
|---|---|
| Scope | `HudStyleSettings` 新布尔 + Settings 勾选 + overlay 行为；走现有 `cast://hud-style` 热更新 |
| Default | 关闭；旧 `settings.json` 缺字段 → 关闭 |
| Schematic / full keyboard | 钉住**表面**（空布局可显示）；高亮仍按 `dwellMs` 消退 |
| Text / key-card | 最后一条不空闲隐藏；空窗直到第一次事件 |
| Dwell input | 保持可用（控制高亮 / 非钉住模式的淡出） |
| Status | hook-offline 等 **仍按 dwell 淡出**，并独占（暂时盖住常驻表面） |
| Capture 开关 | overlay 不读 capture settings；常驻只看 HUD 样式 + 展示模式 |
| Key-up 合同 | **本任务不做**；后续常驻模式再接 up/down |

## Requirements

### R1 — Persist field

Add `persistVisible` to `HudStyleSettings` (TS `$lib/settings.ts` + Rust `settings.rs`).

- Type: boolean
- Omit / missing → `false`
- Persist in same `settings.json` `hud` object; never wipe sibling fields
- Live update via existing `HUD_STYLE_CHANNEL`

### R2 — Settings UI

Under the dwell-ms control, a checkbox (same `field-toggle` pattern as capture toggles).

- en + zh label + hint
- Default unchecked
- Dwell number input stays enabled

### R3 — Overlay: schematic / full keyboard

When `persistVisible` and keyboard mode is `"keyboard"`: show `KeyboardMap` even with no `keySlot` (empty `activeIds`). After dwell, highlights clear; the board stays.

When `persistVisible` and mouse mode is `"schematic"`: show `MouseSchematic` even with no `mouseSlot` (unpressed). After dwell, button highlight clears; the schematic stays. Requires optional `button` on the component.

Solo persist of one side still collapses the other (no blank sibling gap); `keyMouseLayout` still applies when both surfaces show.

### R4 — Overlay: text / key-card

When `persistVisible`, last text chip / key-card row does **not** idle-hide. Empty until first event (no fake empty chip).

### R5 — Idle timers

Reuse existing key/mouse idle timers.

- Persist + keyboard / schematic: timer clears the **slot** (highlights) but does not unmount the pinned surface.
- Persist + text / key-card: do not arm hide timers for that side.
- Unchecked: current behavior (slot clear unmounts the chip).
- Status timers unchanged.

### R6 — Toggle live

Checking persist: cancel hide for pinned surfaces; keyboard / schematic appear immediately if those display modes are on.

Unchecking persist: empty persist-only surfaces unmount; if a slot is still showing, arm dwell so it can fade.

## Acceptance Criteria

- [x] AC1: Unchecked (default / legacy omit) → current dwell fade unchanged. (R1, R5)
- [x] AC2: Checked + full keyboard → keyboard visible with no prior key; press highlights; highlight clears after dwell; board stays. (R3, R5)
- [x] AC3: Checked + mouse schematic → mouse visible with no prior click; press highlights; highlight clears after dwell; schematic stays. (R3, R5)
- [x] AC4: Checked + text/key-card → last chip stays until replaced. (R4)
- [x] AC5: Status / hook-offline still fades after dwell and hides persist surfaces while shown. (Decisions)
- [x] AC6: Changing the checkbox updates overlay without restart. (R1, R6)
- [x] AC7: en + zh strings for the control. (R2)

## Out of scope

- Key-up / held-state `HudChip` contract (follow-on: persist mode consumes up/down)
- Per-mode persist (one checkbox for all HUD)
- Changing dwell clamp range
- HUD dock / place-mode
- Parent roadmap `09-15-hud-roadmap` child-map rewrite
