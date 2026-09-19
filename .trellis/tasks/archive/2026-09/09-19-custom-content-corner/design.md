# Design — Custom content-corner picker

## Boundaries

- **In**: Extend `HudPositionSettings::Custom` with content corner; TS guards + `contentCornerFromPosition`; HudPanel FormRow; Rust persist / `end_hud_place_mode` preserve or inherit; remove in-HUD place affordance; i18n; spec touch-ups.
- **Out**: Window `corner_position` math; center anchors; auto-quadrant; HudView CSS anchor classes (reuse existing); relocating status off contentCorner.

## Contract

```ts
type HudPositionSettings =
  | { mode: "corner"; corner: HudCorner }
  | { mode: "custom"; x: number; y: number; contentCorner: HudCorner };
```

Rust (serde camelCase, tagged `mode`):

```rust
Custom { x: i32, y: i32, #[serde(default)] content_corner: HudCorner }
```

- Default / omitted `contentCorner` → `Br`（兼容旧 JSON）。
- `contentCornerFromPosition(pos)`: `corner` → `pos.corner`；`custom` → `pos.contentCorner`。

## Data flow

1. **Corner → place → Done**  
   Panel 记 `draftContentCorner = previous.corner`（FormRow 可改）。  
   `end_hud_place_mode` 写入 `Custom { x, y, content_corner: draft }`（Rust 需接收前端传入的角，或 Done 前先 `set_hud_position_settings` 带草稿角）。  
   **推荐实现**：Done 前若仍是 corner，panel 先 `set` 一次 `Custom{ currentOuter?, contentCorner: draft }` 不合适（坐标在 Rust）。更干净：  
   - **扩展 `end_hud_place_mode` 可选参数 `contentCorner`**，缺省则：若 runtime 已是 Custom 则保留其角，否则 `Br`；panel 在 Done 时显式传入 draft（继承或用户所选）。  
   - 或：选 custom / 开 place 时不改 mode；FormRow 变更且 place 中 → 仅更新 panel draft；Done 传给 end。

2. **Already custom**  
   FormRow `onchange` → `set_hud_position_settings({ ...custom, contentCorner })` → persist + emit → overlay。

3. **Abandon place**  
   现有 `abandon_hud_place_mode`；draft 丢弃。

## UI

- `FormSection` Position：在「移动 HUD」行附近，`{#if showPlaceControls}` 内增加 FormRow「内容贴边」。
- Options 复用 `settings.corner.br|bl|tr|tl`；新 label key `settings.contentCorner`（en/zh）。
- `disabled` 与其它 position 控件一致。
- **HudView**：删除 place affordance 块（及 `.place-affordance` 样式）；保留 `.placing` 边框/拖拽与 place `aria-label`。status chip 仍在 `.hud` 流内跟锚点。若 `overlay.placeAffordance` 无其它引用可删 i18n 键。
- **进自定义**：`enter_hud_custom_mode(contentCorner)` 快照 `outer_position` → Custom，**不**开 place；须点「移动面板」才 `start_hud_place_mode`。
- **Place 锁**：`cast://hud-place-mode` → 主窗 Tabs `disabled`；HudPanel 除「完成」与「内容贴边」外 `placeUiLocked`；`set_hud_custom_content_corner` 只改角、不 `apply`（拖拽中不回弹）。

## Tradeoffs

| Choice | Why |
|--------|-----|
| Field on Custom only | Corner mode needs no duplicate; matches「仅 custom」 |
| end 带 contentCorner 参数 | 坐标仍由 Rust `outer_position` 读；角由 UI 决定，避免二次 get |
| 不改 HudView | 四角 CSS 已齐 |

## Rollback

Revert Custom 字段 + panel FormRow + end 签名 + `contentCornerFromPosition` + specs。
