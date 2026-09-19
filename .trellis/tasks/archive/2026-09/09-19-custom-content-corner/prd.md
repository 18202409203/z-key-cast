# Custom HUD content-corner picker（方案 C）

## Goal

自定义放置 HUD 时，用户可选择内容贴边角（tl/tr/bl/br），使键鼠 / 时间线与窗口放置意图一致，不再在 custom 下强制贴右下；放置态 HUD 内容流更干净，不被 place 横幅挤开。

## Background

归档任务 `09-17-hud-corner-anchor` 将「仅 custom 下可选内容贴边角」标为后续方案 C；当时 custom 内容锚点固定 `br`。用户从左上等角落进入自定义后，窗口可拖走，内容仍贴右下。place affordance 与键鼠同处 `.hud` flex，横幅 `align-self: stretch` 削弱贴角观感。

## Confirmed facts

- `HudPositionSettings`：`corner { corner }` | `custom { x, y }`（TS `settings.ts` + Rust `types.rs`）。
- Overlay：`contentCornerFromPosition` + `cast://hud-position` → `HudView` `.hud-anchor-*`。
- 选「自定义」只开 place mode；**Done**（`end_hud_place_mode`）才持久化 `custom {x,y}`；abandon 回到已持久设置。
- Position UI：角落 `<select>` + custom 时「移动 HUD / 完成」按钮（`HudPanel.svelte`）。
- `statusText` 与键鼠/时间线互斥（`if status / else if showKmGroup`）；place affordance 叠在内容流上方。

## Locked decisions

| 项 | 决定 |
|----|------|
| 贴边集合 | 仅 tl / tr / bl / br；不加 center / 边中点 |
| 暴露时机 | 仅 custom，或 place 进行中（UI 显示为 custom） |
| 进入 custom 默认 | 继承进入前的 corner；旧 `custom` 无字段 → `br` |
| UI | Position 区额外 FormRow + 四角 `<select>`（与「角落」同风格） |
| 自动猜测 | 不做象限 / 拖放位置推断 |
| `corner` 模式 | 行为不变；内容锚点仍由所选角落推导 |
| Place 横幅 | **去掉 HUD 内 place affordance**；放置态靠虚线框 + 设置「移动/完成」 |
| Status | **保留**，仍跟 contentCorner；与键鼠互斥 |
| 进自定义 | **不**自动进 place；选 custom → 快照当前位置为 Custom；需手动点「移动面板」 |
| Place 锁 UI | 移动态：主窗口 Tab 与其它控件禁用；仅「完成」+「内容贴边」可操作 |

## Requirements

1. **R1 Persistence**：`custom` 持久化内容贴边角；缺省 / 旧配置 → `br`。
2. **R2 Inherit**：从 `corner` 进入 custom（Done 首次写入）时，内容贴边 = 进入前的 corner（除非用户在写入前已改 FormRow）。
3. **R3 Settings UI**：custom / place 时显示「内容贴边」FormRow（四角 select）；变更即时保存并热更新 overlay（place 中尚未写成 custom 时，以草稿为准，Done 一并写入）。
4. **R4 Overlay**：`contentCornerFromPosition` 对 custom 返回已存贴边角；`cast://hud-position` 继续驱动热更新。
5. **R5 Place chrome**：移除 `HudView` 内 place affordance 节点及相关样式/文案若已无引用；保留 `.placing` 虚线框与拖拽；`aria-label` 仍可区分 place。
6. **R6 Compatibility**：`corner` 定位与 place 拖放数学不变；`keyMouseLayout` / Text·Lite 出字方向合同不变；status（capture unavailable）行为保留。

## Out of scope

- center / 边中点锚点
- 按屏幕象限或窗口位置自动猜锚点
- 改 `keyMouseLayout` 语义
- 重新引入 timeline 生长方向设置
- 把 status 改成独立于 contentCorner 的固定屏位

## Acceptance Criteria

- [ ] AC1: 旧 `{"mode":"custom","x":…,"y":…}` 加载后内容锚点为 `br`。
- [ ] AC2: `corner=tl` → 自定义 → Done（未改贴边）后，持久化 custom 且内容锚点为 `tl`；键鼠/时间线贴左上。
- [ ] AC3: 已 custom 时改「内容贴边」select，overlay 无需重启即切换锚点。
- [ ] AC4: custom / place 时显示内容贴边 FormRow；纯 corner 模式不显示。
- [ ] AC5: 切回预设 corner 后内容锚点跟该 corner；再进 custom 时继承该 corner（除非之后改过贴边）。
- [ ] AC6: place mode 下 HUD **不**再显示 place affordance 横幅；虚线框 + 设置侧完成仍可用；status 仍可显示。
- [ ] AC7: TS/Rust 反序列化与 `contentCornerFromPosition`（或等价）有测试；`pnpm check` / 相关 cargo test 通过。
