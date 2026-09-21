# 抽共享 HUD 视图包并接线 App

## Goal

把整套 HUD 视图层（含 Text/Lite/Full 的 `HudView` 及依赖）抽成 pnpm workspace 共享包，App overlay 改为消费该包；**行为与视觉不回归**。为官网同源 demo 铺路。

## Ordering

- Parent：`09-20-website-wysiwyg-demo`
- **先于** sibling：`09-21-website-live-hud-demo`（官网依赖本包）

## Requirements

### R1 — 共享包

- 新增 workspace 包（建议 `packages/hud-view`，最终名在实现时与 `package.json` 一致即可）。
- 包含：`HudView`、`KeyCard`、`KeyboardMap`、`MouseSchematic`、`createHudSlots`、HUD 所需 legend/layout、`HudChip` 纯类型与展示格式化、HUD style 类型/默认值/CSS helpers。
- **禁止**依赖 `@tauri-apps/*`。从现有 `cast.ts` / `settings.ts` 拆出纯逻辑；IPC 留在 App。

### R2 — App 接线

- Overlay（及任何直接渲染 HUD 视图的路径）改为 import 共享包。
- Settings / Capture / Log 等若仅用展示组件（如 `KeyboardMap`），一并改依赖，避免双份组件。
- Text / Lite / Full 行为与抽出前一致。

### R3 — 回归

- `pnpm check` 通过；手动确认 overlay 三档 + 键鼠高亮/时间线。

## Out of scope

- 官网页面、DOM 适配器（sibling 任务）
- 改 Rust hook、改 chip 合同语义（除非拆包迫使无行为移动）
- 官网视觉定稿、三档切换 UI

## Acceptance Criteria

- [ ] 共享包在 `pnpm-workspace.yaml` 中，可被 App 依赖
- [ ] 共享包 `package.json` dependencies 不含 `@tauri-apps/*`
- [ ] App overlay Text/Lite/Full 手动验收通过
- [ ] 原 `src/lib` 下不再残留第二套 HUD 视图实现（可留 re-export 薄封装，过渡期需在 implement 标明并尽快删除）

## References

- Parent `prd.md` / `design.md`
- `design/index.md`（HudChip 合同）
- `src/lib/overlay/HudView.svelte`、`hud-slots.svelte.ts`、`components/{KeyCard,KeyboardMap,MouseSchematic}.svelte`
