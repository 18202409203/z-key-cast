# Drag to place HUD position

## Goal

允许用户拖拽决定 HUD overlay 窗口位置；四角预设作为快捷方式；默认录屏仍点击穿透。

## Ordering

- After `09-15-key-filter`（已完成）；roadmap #9。

## Confirmed from codebase

- Overlay 启动硬编码右下角（`lib.rs`）；始终 `set_ignore_cursor_events(true)`
- Settings Corner 下拉为 `disabled` 占位
- Capabilities 已有 `set-position` / `outer-position` / `set-ignore-cursor-events`

## Decisions (locked)

| 项 | 选择 |
|----|------|
| 进入拖拽 | Settings「Move HUD」：临时关穿透 → 拖 overlay →「Done」锁回 |
| 退出放置 | **仅 Done**（无失焦/超时） |
| 四角快捷 | 本任务启用四角；选角覆盖 custom |
| 持久化 | `corner: br\|bl\|tr\|tl` **或** `custom: {x,y}` |
| Corner UI | 含 **Custom** 项；custom 时选中它；再选四角切回 corner |

## Requirements

- **R1** Settings「Move HUD」进入放置模式；可拖拽 overlay 窗口
- **R2** 「Done」结束放置并立即恢复点击穿透
- **R3** 非放置模式保持 always-on-top + 点击穿透
- **R4** Corner：Bottom right / left、Top right / left + Custom；四角选择 → `corner` 模式并按当前 monitor 定位
- **R5** 拖拽结束 → `custom: {x,y}`（物理像素）并持久化；Custom 项反映该状态
- **R6** 启动时按持久化模式定位（corner 重算 / custom 恢复坐标）；默认 `corner: br`（与今日硬编码一致）

## Out of scope

- 多显示器精细策略超出「可用」
- 全局快捷键进入拖拽
- 失焦/超时自动退出放置模式

## Acceptance Criteria

- [ ] Move HUD / Done 可进出放置模式；Done 后恢复点击穿透
- [ ] 放置模式可拖动 overlay
- [ ] 四角切换立即生效（corner）
- [ ] 拖拽后为 custom，下拉显示 Custom，重启坐标仍在
- [ ] 录屏默认仍点击穿透
