# Scroll wheel HUD direction pulse

## Goal

有限度开放滚轮到 HUD：纵向方向反馈 + 强节流，不刷屏、不跟速度表。

## Locked decisions (grilling + pivot)

| 项 | 选择 |
|----|------|
| 产品约定 | **有限推翻**「忽略滚轮」：可进 HUD，必须合并 |
| 合同 | 新 kind：`{ kind: "scroll"; direction: "up" \| "down" }`（不复用 `mouse.phase`） |
| 轴向 | **仅纵向**；横向丢弃 |
| 开关 | **无**独立 `captureScroll`；Mouse/Scroll 均受 `captureMouse`；类别用 `ignoredMouseActions: ("left"\|"right"\|"middle"\|"scroll")[]`（默认 `[]`） |
| 遗留 | JSON `captureScroll: false` → 加载时并入 `ignoredMouseActions` 含 `"scroll"` |
| 视觉 | Lite/Full：现有滚轮**刻度**方向脉冲；不做箭头方案、不做用户双选 |
| 速度 | **不**映射真实滚速；固定短脉冲动画 |
| Text | 单条 `↑` / `↓`（仍单槽顶替模型） |
| Lite/Full 与点击 | **不互斥**：按键 held-set / 高亮 ∥ 刻度脉冲 |
| 性能 | 可常订阅滚轮事件；Rust 早丢弃 + burst 合并后再 emit |
| Capture UI | Keyboard / Mouse 两段；关 listen 时灰掉该段 ignore；涟漪独立于 `captureMouse` 与 ignore 列表 |

## Requirements

- R1. 平台钩子识别纵向滚轮（macOS 需纳入 tap；Windows 在现有 LL 钩子中 normalize）
- R2. Reducer/emit：`HudChip` 增加 `scroll`；Log 可记录
- R3. Coalesce：短窗合并同向；避免逐 tick 前端更新
- R4. `allows_chip`：Key→keyboard；Mouse|Scroll→`captureMouse`；ignore mouse/scroll 在 reduce 后过滤
- R5. Text：鼠侧文字显示方向；Lite/Full：`MouseSchematic` 刻度动画；不进 Full held-set
- R6. 更新 `design/index.md`「不做滚轮」表述与本任务一致

## Out of scope

- 横向 / tilt-wheel
- 速度档位、真速度映射
- Text 多键队列（`09-17-text-key-queue`）
- 箭头视觉可选方案

## Acceptance Criteria

- [ ] AC1: 开捕获鼠标且未忽略 scroll 时，纵向滚动出现方向反馈；关 `captureMouse` 或 ignore `"scroll"` 则无 scroll chip
- [ ] AC2: 快速连滑不导致 HUD/DOM 风暴（合并可感知）
- [ ] AC3: Lite/Full 滚动时左/右/中高亮可同时存在
- [ ] AC4: Text 显示 ↑/↓；横向滚动不产生 chip
- [ ] AC5: TS/Rust 合同与测试覆盖新 kind + ignore mouse/scroll + 遗留迁移；产品文档已改

## Complexity

Complex：必须 `design.md` + `implement.md` 后再 `task.py start`。
