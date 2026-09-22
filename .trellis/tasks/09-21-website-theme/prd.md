# Website stage HUD dark/light toggle

## Goal

在官网 **第二屏演示台（`#stage`）** 提供 HUD **dark / light** 外观切换，用于产品演示（所见即所得），不是站点页壳舒适度主题。

## Background

- 早期占位曾设想「页壳 black/white」；`09-21-website-marketing-visual` 定稿近纯黑暗台，并写明页壳 Black/White 切换器不做。
- 2026-09-22 grill 纠偏：主职是 **产品演示** → 只做第二屏 HUD 色板；全页面多主题不做。
- 共享包已有 `HUD_COLOR_PRESETS`（dark / light）；官网应对齐该预设，不另造色板。
- 冲突：light 预设底 `#f4f4f5` 与现记事本 `--paper` 同色，亮屏时浅色 HUD 不可见 → 记事本必须与 HUD **对偶**换底。

## Status

- **Planning**：需求已 grill 定稿；待用户确认后补 `design.md` / `implement.md`（若判为复杂），再 `task.py start`。
- 与 i18n 独立；控件文案走现有官网 i18n 键即可，不阻塞本任务。

## Requirements

1. **主职**：演示「录屏/直播时 HUD 深浅底长什么样」；不改变第一屏、下载区、页脚等页壳视觉。
2. **切换对象**：仅 HUD 颜色预设 dark ↔ light（text + background）；**不**切换 Text / Lite / Full 布局预设。
3. **染面**：第二屏内 Lite 角标 HUD 与 Full 键鼠示意 **同步** 应用同一 color preset；monitor 外框与页壳保持现状暗台。
4. **记事本对偶**（亮屏有纸面时）：
   - dark HUD → 浅色编辑器纸（参考 VS Code Light+ 默认编辑区 `#ffffff`），深色墨/光标。
   - light HUD → 深色编辑器纸（参考 VS Code Dark+ 默认编辑区 `#1e1e1e`），浅色墨/光标。
   - 熄屏（stage 未聚焦）可保持现有黑屏逻辑；对偶在亮纸态生效。
5. **控件**：放在 `#stage` 铬条、电源控件附近；语义为舞台内 HUD 外观，不得做成导航/第一屏全局主题开关。
6. **默认**：进入页面为 dark HUD + 浅纸；**不** `localStorage` 持久化；**不**跟随 `prefers-color-scheme`。
7. **动效**：切换时 HUD 与记事本短交叉淡入（约 150–200ms），二者一起过渡；不做分步演出。

## Acceptance Criteria

- [x] 第二屏可在 dark / light 间切换；Lite 与 Full 外观色板同步变化。
- [x] light 模式下亮屏记事本为深色编辑器底，浅色 HUD 清晰可读（不再与纸同色糊掉）。
- [x] dark 模式下亮屏记事本为浅色编辑器底，深色 HUD 清晰可读。
- [x] 第一屏、CTA/下载区、页脚等页壳不因切换改变主题。
- [x] 刷新或新开会话后回到默认 dark + 浅纸。
- [x] 切换有短过渡，且不显著拖慢舞台跟手输入演示。
- [x] 控件仅出现在第二屏舞台铬条语境，不出现在站点导航作为全局主题。

## Out of scope

- 全页面 / 页壳 light-dark tokens、站点级主题切换器
- `prefers-color-scheme` 或跨访问持久化
- HUD 布局预设（Text / Lite / Full）切换器
- App Settings 主窗 Appearance（system/dark/light）改动
- 修改共享包内 `HUD_COLOR_PRESETS` 色值本身（官网消费现有预设）
