# HUD chip roadmap after input hooks

## Goal

在 macOS 输入钩子（`09-15-rust-input-hooks`，已 archive）之上，先交付「第一次真实录屏够用」的 text HUD，再按约定顺序推进 `design/01.md` 中的展示/设置增强。本父任务只负责需求总表、子任务地图与集成验收，不直接写实现。

## Background / grilling decisions

| 项 | 选择 |
|----|------|
| `design/01.md` 定位 | 二期候选池；先闭环录屏够用 |
| MVP 展示 | text 模式；默认仅当前 1 条；内部上限可留 3，设置暂不暴露 |
| 淡出 | 空闲 1000ms 淡出；新 chip 重置计时 |
| 键盘 chip | 主键 down 出条；配对 up 忽略；裸修饰不占条 |
| 鼠标 chip | 与键盘对称：down 出条、up 忽略，同一条流 |
| 对外合同 | `HudChip` 结构化（非 raw `CastEvent`） |
| 键身份 | 稳定跨平台 `id` + 展示 `label`；修饰左右分立（`MetaLeft` / `MetaRight`…） |
| raw | Rust 内部可保留；现在不对外双写；将来若需要再开 raw channel |
| 日志 | 与 overlay 订阅同一 chip 合同 |
| hooks 任务 | 已收口，不回改其历史验收；chip 语义开新子任务 |

## Child task map（执行顺序）

| # | 目录 | 交付 | 复杂度 |
|---|------|------|--------|
| 1 | `09-15-hud-chip` | `HudChip` 状态机 + 合同 + text HUD + Key 映射纠偏 | 复杂（需 design/implement） |
| 2 | `09-15-key-mouse-toggles` | 键/鼠监听独立开关 | 轻量 |
| 3 | `09-15-main-tabs` | 主窗口 Settings / Log / About TAB | 轻量 |
| 4 | `09-15-custom-hud-styles` | 字体/色/透明度/停留时长 | 中等 |
| 5 | `09-15-key-card-mode` | 键卡片展示模式 | 中等 |
| 6 | `09-15-full-keyboard-mode` | 全键盘映射模式 | 复杂 |
| 7 | `09-15-mouse-schematic` | 鼠标示意模式 | 中等 |
| 8 | `09-15-key-filter` | 监听/忽略键 | 中等 |
| 9 | `09-15-drag-hud-position` | 拖拽放置位置 | 轻量 |
| 10 | `09-15-i18n` | 中英 UI | 轻量 |
| 11 | `09-15-log-export` | 操作日志导出 | 轻量 |

四角位置切换、托盘开关若 scaffold 已具备则在 #1 验收时顺手确认；缺失则另开薄任务，不塞进 #1 主范围。

## Cross-child acceptance

- [ ] **X1** #1 完成后可在真实录屏中看懂组合键与鼠标按键（单条 text + 1s 空闲淡出）
- [ ] **X2** 后续展示模式均消费同一套 `HudChip` `id`，不另发明键身份合同
- [ ] **X3** 子任务按上表顺序推进；后者依赖前者合同时，在子 PRD 写明，不把依赖写进父实现

## Out of scope（父级）

- Windows / Linux 钩子
- 皮肤市场、按应用过滤、历史回放、光标涟漪、滚轮滚动事件
- 输入法候选 / 死键完美还原
