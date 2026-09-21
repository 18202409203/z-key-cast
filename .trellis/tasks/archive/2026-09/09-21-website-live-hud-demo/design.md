# Design — 官网 live HUD demo

## Approach

1. `website` 依赖共享 `hud-view` 包。
2. 新增 `DomInputAdapter`（名称可调）：在 demo 根节点 `tabIndex=0` 聚焦后监听事件；把 `KeyboardEvent.code` / button / wheel 映射为 `HudChip`（id 对齐 App 约定）。
3. 页面状态：`createHudSlots()` + 固定 Full 的 `HudView` props（默认 style/locale；placeMode=false）。
4. IA：替换当前 `website/src/routes/+page.svelte` 结构；下载/`latest.json` 逻辑保留并下移到 Downloads/Version 区。

## Focus / wheel

- **推荐**：点击或 Tab 进入 demo 后开始捕获；未聚焦时展示轻提示（非视觉定稿，实用即可）。
- Demo 聚焦且指针在 demo 内时对 `wheel` `preventDefault`，避免边试边滚页。

## Mapping limits

- 浏览器无法产生与原生 hook 完全相同的覆盖面（如部分系统快捷键被浏览器吃掉）：属预期；靠能力边界文案，不扩 scope 做扩展插件。

## Rollback

- 回退 `+page.svelte` 与 adapter；不影响共享包与 App。
