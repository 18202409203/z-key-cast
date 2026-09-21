# Website marketing visual redesign

## Goal

把 `website/` 从极简单页壳升级为 **Demo-first 营销首屏**：上显示器（Lite HUD + 假桌面记事本）、下键鼠 Full 示意图，真键鼠驱动两处联动；保留下载与版本壳。服务录屏/演示受众，不绑死单一场景。

## Background

- 前序已落地：共享包 `z-key-cast-hud-view`、官网 DOM → `HudChip` 适配器、极简 Full live demo（`09-21-website-live-hud-demo`）。视觉定稿当时明确 out of scope。
- Grill 共识（2026-09-21）：舞台隐喻「打字带动显示器」；不管手机触控；空闲一次性打字邀请（不循环）；记事本可测；页壳克制暗台并对齐 HUD 黑白预设色。
- 视觉参考：`design/website/proto.png`（构图与文案语气的权威参考；实现不必像素复刻）。

### Proto 对齐 / 差额

| 对齐 | 差额（待决策或实现时收敛） |
|------|----------------------------|
| 品牌在上 + 短 tagline；中显示器；下键鼠；底 Download | 下层键鼠 **初版 A**：复用 Full 示意图 + 青激活/细线缆装饰；proto 插画或 3D 键鼠留后续 |
| 屏内浅色可编辑面 + 中心邀请句 | 横线纸纹理 **非要求**（可纯浅底） |
| 暗纯黑页壳、白字、青强调色 | 青强调（约 `#80FFFF` 量级）写入气质；克制光晕但仍允许 proto 级线缆/激活青 |
| 底栏：Download + 版本/桌面键鼠说明一句 | Proto 左上角屏内小部件≠最终 Lite 形态；实现用真 `HudView` Lite 替换 |

## Confirmed facts (repo)

- 站点入口：`website/src/routes/+page.svelte`；适配器：`website/src/lib/dom-input-adapter.ts`（聚焦根节点后才捕获；wheel `preventDefault`）。
- 共享包已导出 `HudView`、`KeyboardMap`、`MouseSchematic`、`createHudSlots`、`HUD_COLOR_PRESETS`（dark `#0f172a`/`#f8fafc`，light `#f4f4f5`/`#18181b`）。
- `createHudSlots`：仅 `hudPreset === "full"` 时 `activeKeyIds` / 鼠键高亮非空；Lite 与 Full **不能**靠单实例同时驱动角上 Lite 时间线与下层键鼠图。

## Requirements

### R1 — 首屏舞台构图

- 构图追随 `design/website/proto.png`：品牌在上 → 显示器 → 台下键鼠 → 底栏 Download。
- 品牌 `z-key-cast` 英雄级字号；默认 tagline 采用 proto：*Show your keystrokes, without the noise.*（可微调，不另起叙事）。
- 主 CTA：白字深底 **Download**；旁注版本/「Desktop keyboard & mouse visualization only」类一句（与现有 version/边界文案合并，勿堆两段）。
- 记事本不印 logo；无坞、无图标墙、无伪 OS。

### R2 — 双表面联动（真键鼠）

- 输入：仅真实键盘/鼠标/滚轮（桌面）；**不做**触控点按虚拟键、**不**以手机为验收目标。
- 显示器角上：**Lite** `HudView`，默认 **dark** 色预设。
- 下层：**初版 A** — Full `KeyboardMap` + `MouseSchematic`（同源组件）；可加青激活态与细线缆装饰贴 proto 气质；**不**重画营销键帽 / 3D（后续可参考 proto 或引入 3D）。
- 同一用户/剧本事件必须同时驱动 Lite 与下层高亮。

### R3 — 记事本（假桌面内容）

- 屏内为可聚焦编辑面：浅色纸面即可（近 light 预设纸色）；**不要求**横线纸纹理。
- 空闲：**一次性**打字写出邀请；默认定稿句对齐 proto：*Press any key to take control.*（同步 Lite + 下层键位）；**不循环**；真输入到达即停剧本并交权。
- 接管后：继续可插入字符、退格、点击放入光标、滚轮滚正文；滚轮与点击同时驱动 HUD。
- 不做：真选区排版、拖放、多窗口、右键菜单。

### R4 — 视觉气质

- 页壳：近纯黑暗台（proto）；品牌白字。
- 强调色：单枚 **青/cyan**（proto 线缆、激活键、鼠标点缀）；**无**紫霓虹；光晕克制、只服务激活与线缆。
- HUD 黑白预设仍用于 Lite 面板与纸面底；青是舞台装饰/激活，不替换 `HUD_COLOR_PRESETS` 合同色。
- 字体：有性格的无衬线（避免 Inter / 系统默认栈作为品牌展示字）。
- Black/White 切换器不做。

### R5 — 首屏以下（MVP）

- Downloads（现有 `latest.json` / `/downloads/` 行为不回归）+ 能力边界 1–2 句（非 OS 全局捕获）+ 页脚链接。
- 不做：Text/Lite/Full 专节、竞品长文、FAQ 长页（预留日后 B）。

### R6 — 工程约束

- 不复制第二套键盘 UI；视图来自 `z-key-cast-hud-view`。
- 下载/`site:sync-web`/`website:build` 路径保持可用。
- 若需双 `createHudSlots`（lite + full）fan-out 同一 chip 流，属允许方案；优先避免改共享包合同，除非验收卡住。

## Out of scope

- 触控/手机体验、循环演示、伪 OS、色预设切换器
- Proto 级营销键帽插画、3D 键鼠（后续迭代）
- 屏内横线纸纹理（非验收项）
- 公网托管/SEO 定稿、多语言站点引擎
- App overlay / 设置面板改版
- 竞品对比页、完整营销长滚动

## Acceptance Criteria

- [x] 首屏呈现「显示器 + 下层键鼠」一构图；品牌为英雄级信号，非仅 nav 字；整体神似 `design/website/proto.png`（非像素复刻）
- [x] 空闲自动打出邀请句一次；真键鼠后剧本停止且不再循环
- [x] 真键盘驱动：记事本写入 + Lite chip + 下层键位高亮同步
- [x] 真鼠标点击/滚轮：记事本聚焦或滚正文 + Lite/下层鼠滚反馈同步（在裁剪范围内）
- [x] Lite 默认 dark 预设色；记事本浅色；页壳暗台；青强调用于激活/线缆装饰
- [x] Downloads / version / 边界文案仍可用；无 manifest 时不崩
- [x] `pnpm website:check` 与 `pnpm website:build` 通过
- [x] 无第二套手绘键盘；`KeyboardMap` / `MouseSchematic` / Lite 视图来自共享包

## Open questions

无。实现中补充：开机/关机会话捕获；跨区域正交 cable + 按输入一次电流包；Lite `timelineMax: 8` 铺满屏宽。
