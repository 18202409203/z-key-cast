# design/03 HUD UX backlog

## Goal

把 `design/03.md` grilling 收敛成可独立交付的子任务树：设置示意图、小键盘板形、滚轮 HUD、Text 多键队列。父任务只维护需求总表、顺序与集成验收，不直接实现。

## Source

- `design/03.md` + 2026-09-17 grilling session（共享理解已确认）

## Child task map（执行顺序）

| # | 目录 | 交付 | 复杂度 | 状态 |
|---|------|------|--------|------|
| 1 | `09-17-hud-settings-schematics` | 预设 1×3 + 键鼠布局 1×4 静态图卡 | 轻量–中等 | done (archived) |
| 2 | `09-17-has-numpad-toggle` | 捕获区「有小键盘」；Full/Capture 板形 | 中等 | done (archived) |
| 3 | `09-17-scroll-wheel-hud` | `scroll` HudChip + 刻度方向脉冲 | 复杂 | done (archived) |
| 4 | `09-17-text-key-queue` | Text/Lite 键盘时间线（grilling 中） | 复杂 | planning |

## Cross-child acceptance

- [ ] 四子任务可独立 `start` / 验收 / archive；互不要求同 PR
- [ ] 子任务 PRD 与 grilling 锁定表一致；滚动任务更新产品「忽略滚轮」约定
- [ ] `design/03.md` 与本父任务地图对齐

## Out of scope (parent)

- 自动检测键盘是否有小键盘
- 滚轮速度映射 / 横向滚动 / 双视觉方案可选
- 实现代码（在子任务内）
