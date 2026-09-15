# Main window Settings / Log / About tabs

## Goal

主窗口用 TAB 分区，避免设置控件挤压日志区；为后续样式等设置留出 Settings 页空间。

## Ordering

- After `09-15-key-mouse-toggles`；before `09-15-custom-hud-styles`.

## Decisions

| 项 | 选择 |
|----|------|
| Tabs | Settings / Log / About |
| 默认 TAB | Log（开发期看事件方便）；可后续持久化，本任务不强制 |
| 路由 | 单页内 TAB 状态即可，不必拆 SvelteKit 多路由 |
| 日志订阅 | 切到 Settings/About 时仍可在后台收事件（切回 Log 不丢近期缓冲） |

## Requirements

- **R1** 主窗口顶部（或等价）TAB：Settings、Log、About
- **R2** Settings：现有捕获开关（键/鼠）迁入；日志 UI 不占同屏垂直空间
- **R3** Log：现有滚动日志 + Clear；占满可用内容区
- **R4** About：应用名、版本（能取则取）、一句话产品说明
- **R5** 布局在窄主窗口下 Log 可滚动且不被 Settings 永久挤压

## Out of scope

- 托盘打开指定 TAB；多语言 About；自定义样式控件（下一任务）
- 拆成多个 BrowserWindow

## Acceptance Criteria

- [ ] **AC1** 可在三 TAB 间切换，同时只显示一个面板
- [ ] **AC2** Settings 含键/鼠开关且仍热更新
- [ ] **AC3** Log 面板有足够高度滚动查看；Clear 可用
- [ ] **AC4** About 显示名称与版本或明确占位
- [ ] **AC5** 在非 Log TAB 时仍能收到 hook/chip 事件，切回 Log 可见新行（缓冲上限可沿用现有）
