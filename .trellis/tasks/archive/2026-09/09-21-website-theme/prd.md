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
2. **切换隐喻**：第二屏用 **百叶窗 + 右侧拉绳** 控制室内光（非 Dark/Light 文案钮；日月不作为主交互）。
   - **开叶（默认）**：日光透入 → 亮环境 → HUD `light` + 浅色记事本；桌面偏暖哑光。
   - **关叶**：室内变暗 → 暗环境 → HUD `dark` + 深色记事本；桌面偏冷石墨。
3. **染面**：Lite 角标 HUD 与 Full 键鼠示意 **同步** 应用同一 color preset；monitor 外框保持产品台；页壳不跟换。
4. **记事本**：与 HUD 同色系（开叶浅纸 / 关叶深纸）；若芯片对比不足再回调对偶方案。
5. **控件**：拉绳为唯一主题切换控件（电源仍只管演示通断）。不做台灯道具。
6. **默认**：进入为开叶亮环境；**不** `localStorage`；**不**跟随 `prefers-color-scheme`。
7. **动效**：百叶开合 + 拉绳短拽；HUD/纸面短交叉淡入；`prefers-reduced-motion` 下即时。

## Acceptance Criteria

- [x] 第二屏可通过拉绳开合百叶，同步切换 HUD dark/light；Lite 与 Full 色板一致。
- [x] 开叶：日光透入、light HUD + 浅纸；桌面呈暖哑光。
- [x] 关叶：室内变暗、dark HUD + 深纸；桌面呈冷石墨。
- [x] 第一屏、CTA/下载区、页脚等页壳不因切换改变主题。
- [x] 刷新或新开会话后回到默认开叶（亮环境）。
- [x] 百叶/HUD 有短过渡，且不显著拖慢舞台跟手输入演示。
- [x] 切换控件为第二屏拉绳（非站点导航全局主题）。

## Out of scope

- 全页面 / 页壳 light-dark tokens、站点级主题切换器
- `prefers-color-scheme` 或跨访问持久化
- HUD 布局预设（Text / Lite / Full）切换器
- App Settings 主窗 Appearance（system/dark/light）改动
- 修改共享包内 `HUD_COLOR_PRESETS` 色值本身（官网消费现有预设）
