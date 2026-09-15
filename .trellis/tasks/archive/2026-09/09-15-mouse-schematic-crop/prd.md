# Mouse schematic top-half crop

## Goal

鼠标示意模式只保留上半截（左/中/右键 + 滚轮区域），去掉掌托下半身，减少 HUD 占位且仍能一眼认出按键。轮廓贴近真实鼠标：左右键包围中间滚轮；按下时用前景色整块填充，而不是边沿高亮。

## Ordering

- Child of `09-15-hud-roadmap`
- After archived `09-15-mouse-schematic`（已有 `MouseSchematic` + `mouseDisplayMode`）

## Confirmed (repo)

- 组件：`src/lib/MouseSchematic.svelte`
- Overlay：`mouseDisplayMode === "schematic"` 时渲染该组件
- 交互不变：`button` 为 `left` | `right` | `middle` 时高亮对应区域

## Decisions

- **裁切力度**：只留上半键帽区；下方不留掌托 stub（方案 A）
- **轮廓**：现代简洁的鼠标前半（圆角鼠头 glyph），用户草图只作结构参考，不按几何半圆描线
- **分区**：左右键以窄缝 + 滚轮凹槽包围中间滚轮；滚轮是小胶囊，不是占满中线的大椭圆
- **按下**：对应区域用 HUD `textColor` 实心填充；描边保持轮廓，不以加粗描边充当高亮

## Requirements

- **R1** schematic 为鼠标前半键帽区；下半掌托不可见（改 SVG path / viewBox / 显示尺寸，不新增模式）
- **R2** 左/右键包围中间滚轮；`left` / `right` / `middle` 分别点亮左瓣 / 右瓣 / 滚轮
- **R3** 按下态为前景色全色填充，而不是仅边沿高亮
- **R4** `text` 模式与设置项不变

## Out of scope

- 新鼠标展示模式、涟漪/轨迹、滚轮滚动事件
- 裁切边缘渐隐特效（硬几何裁断即可）

## Acceptance Criteria

- [ ] schematic 视觉上是鼠标前半，无掌托 stub，也不是几何半圆
- [ ] 左/右键包围中间滚轮；中键点亮滚轮
- [ ] 按下区域为实心填充，而非仅描边变亮
- [ ] text ↔ schematic 切换行为不变
