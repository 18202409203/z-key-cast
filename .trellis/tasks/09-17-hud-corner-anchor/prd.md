# HUD 键鼠按 corner 贴边

## Goal

当 HUD 窗口落在某个角落时，窗口内的键鼠 / 时间线内容也贴在 HUD 内容区的对应角落，而不是永远贴右下；Text/Lite 时间线生长方向随水平贴边镜像；组内交叉轴对齐随垂直贴边切换。

## Confirmed facts（代码）

- `HudCorner = "br" | "bl" | "tr" | "tl"`；`HudPositionSettings` 支持 `mode: "corner" | "custom"`。
- 窗口位置由 Rust `corner_position` / custom 坐标控制；overlay 内容在 `HudView` 内布局。
- `HudView` 根 `.hud` 写死 `justify-content: flex-end; align-items: flex-end`（内容永远贴右下）。
- Text/Lite 的 `.timeline` / `.card-row` 也写死 `justify-content: flex-end`；入场动画为右入左移。
- Overlay 页目前未把 `corner` / position 传入 `HudView`。
- Full 的 `keyMouseLayout` 只控制键鼠相对构图，不控制相对窗口的贴边。
- custom 结束放置只持久化 `x/y`，不记 corner。

## Locked decisions

- **内容锚点跟随 corner**：br/bl/tr/tl → 内容贴 HUD 内对应角。
- **Text/Lite 时间线水平镜像**：左贴边（bl/tl）→ 左入右移；右贴边（br/tr）→ 右入左移。
- **Full**：`keyMouseLayout` 构图不变，整组随锚点贴角。
- **custom（本任务）**：内容锚点固定 br + 右入左移；不提供独立选择项。
- **后续（非本任务）**：仅 custom 下可选内容贴边角（方案 C）。
- **组内交叉轴**：
  - 左右并排（klmr/krml）：下贴边底对齐；上贴边顶对齐。
  - 上下堆叠（ktmb/kbmt）：左贴边（bl/tl）左对齐；右贴边（br/tr）右对齐（窄鼠相对宽键盘贴对应侧）。

## Requirements

1. Overlay / `HudView` 根据当前 position 推导内容锚点：`corner` 模式用该 corner；`custom` 固定按 `br`。
2. 根布局与 timeline/card-row/km-group 的主轴、交叉轴对齐随锚点变化；切换 corner 即时生效（无需重启）。
3. Text/Lite 入场/位移方向随水平贴边镜像；Full 仅整体贴角，不改 `keyMouseLayout` 语义。
4. place affordance、status（capture unavailable）等与键鼠同属 `.hud` 流式布局，一并跟锚点。
5. 不改变窗口定位数学（Rust `corner_position` / custom 坐标）除非为实现内容锚点所必需的前端订阅。

## Out of scope

- custom 模式下的内容贴边用户选项（后续任务）。
- 按屏幕象限自动猜测锚点。
- 改 `keyMouseLayout` 选项含义或预设图卡。
- 设置表单视觉分区（姐妹任务 `09-17-form-section-hierarchy`）。

## Acceptance Criteria

- [ ] `corner=br/bl/tr/tl` 时，Full 键鼠组与 Text/Lite 时间线贴在 HUD 内容区对应角。
- [ ] 左贴边时间线左入右移；右贴边右入左移；切换 corner 后新出现的条目方向正确。
- [ ] 上贴边组内顶对齐（并排）；下贴边（及 custom）组内底对齐（并排）；上下堆叠时左贴边左对齐、右贴边右对齐。
- [ ] `custom` 下内容始终按 br 锚点与右入左移，拖窗口不改变内容锚点。
- [ ] 切换 corner / 进出 custom 无需重启 overlay；status / place 提示与内容同锚。
- [ ] 窗口角落定位与 place 拖放行为与改前一致。

## Notes

- 来源：`design/03.md`「位置优化」
- 姐妹任务：`09-17-form-section-hierarchy`
- 与 `design/03`「右入左移」：默认 br 与 custom 仍右入左移；bl/tl 为本任务明确镜像扩展。
