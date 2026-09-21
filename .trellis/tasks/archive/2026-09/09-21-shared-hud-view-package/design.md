# Design — 共享 HUD 视图包

## Approach

1. 盘点 `HudView` 传递闭包：components、`hud-slots`、`key-card`、`key-legends`、`keyboard-layout`、cast 纯类型/格式化、settings 中 HUD style 切片、i18n 最小依赖。
2. 新建 `packages/hud-view`（名称可微调），用 Svelte 库入口导出组件与 TS API。
3. 拆分 `cast.ts`：`HudChip` + `isHudChip` + 展示 helpers → 共享包；`invoke`/channel 订阅封装 → App（如 `src/lib/cast-host.ts`）。
4. 拆分 `settings.ts`：HUD style 类型/normalize/DEFAULT/CSS → 共享包；persist/invoke → App。
5. App 全局替换 import；删除或薄 re-export 旧路径。

## Risks

- `createHudSlots` 使用 Svelte 5 runes：共享包需与 App/website 同 major svelte。
- CapturePanel 等对 `KeyboardMap` 的依赖：一并迁 import，避免双份。
- i18n：优先「共享包接受 `locale` + 纯 label 函数」或迁入 HUD 用得到的字典切片；避免把整个设置页 i18n 拖进包。

## Rollback

- 单 PR/连续提交可整体 revert；不留下 website 半引用。
