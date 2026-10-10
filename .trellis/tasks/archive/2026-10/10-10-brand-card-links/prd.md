# Brand cards link to panels and source

## Goal

官网首屏三张卖点卡可以点。离线卡进入演示屏，小体积卡进入下载屏，开源卡在新标签打开 Gitee。访客从卖点直接走到对应的下一件事，不用先找侧边圆点。

## Background

- 营销页是三块 snap：Brand → Stage → Download。`MarketingPage.svelte` 把它们排成 `.page` 的直接子节点；`PANEL_NAV` 顺序是 `brand`、`stage`、`downloads`。
- 屏间跳转已有：`panel-scroll.ts` 的 `scrollToPanel`，侧边 `PageRail` 用它。
- 三张卡在 `BrandPanel.svelte`，现在是不可点的 `<li>`。文案在 `website/src/lib/i18n.ts`，`/` 与 `/zh/` 共用这一组件。
- 定稿文案来自 `09-22-marketing-selling-points`：英文 Runs offline / Under 3 MB / 100% Free，副文案 Open source, yours to use；中文 离线可用 / 不到 3 MB / 100% 免费，副文案 开源代码，可自由使用。
- 仓库远程只有 Gitee：`https://gitee.com/zhupengji/z-key-cast`。页脚只在下载屏，且只有语言切换。

## Decisions

| 项 | 决定 |
|----|------|
| 命中区域 | 三张卡整卡可点，不是只点副文案 |
| 离线卡 | 滚到第 2 屏（Stage，`scrollToPanel` 索引 1） |
| 小体积卡 | 滚到第 3 屏（Download，索引 2） |
| 开源卡 | 新标签打开 `https://gitee.com/zhupengji/z-key-cast`，当前官网页留着 |
| 外观 | 三张卡仍是同一套卖点样式。不加外链图标，不加「新标签」字样（含不可见文案） |
| 悬停 | 三张卡相同：指针、边框更亮、现有光晕稍强、图标颜色抬高。不位移、不缩放。时长对齐下载按钮（约 160ms） |
| 按下 | 边框再收紧，跳转前有回应 |
| 焦点 | 可见焦点环 |
| 减少动效 | 只留颜色变化，不做过渡 |
| 文案 | 不改主副文案；点击是附加动作。无障碍名称用现有主副文案 |
| 页脚 | 不加源码链接 |

## Requirements

1. 离线、小体积走现有 `scrollToPanel`，不另写滚动。开源卡在新标签打开上述 Gitee 地址，不替换当前官网页。
2. 可见文案保持现有 en/zh 卖点。悬停是指针、更亮的边框、稍强的现有光晕、图标颜色抬高，不位移、不缩放。按下时边框再收紧。键盘焦点可见。图标仍是装饰（`aria-hidden`）。`prefers-reduced-motion: reduce` 时只保留颜色变化，去掉过渡。
3. `/` 与 `/zh/` 行为一致。不新增第四 snap，不改 Stage / Download 的职责，不改侧边圆点的跳转。
4. 屏间滚动与侧边圆点同一条路径。

## Out of scope

- 页脚、语言切换、下载按钮
- 改卖点文案或图标，或给开源卡单独加离开本站的标记
- 点离线卡时自动打开演示电源
- 部署、`wrangler deploy`、发版
- App / HUD 行为

## Acceptance Criteria

- [x] AC1: 点离线卡进入演示屏；点小体积卡进入下载屏；两条都经过 `scrollToPanel`
- [x] AC2: 点开源卡在新标签打开 `https://gitee.com/zhupengji/z-key-cast`，当前官网页仍在；卡片上看不到外链图标或「新标签」字样
- [x] AC3: en/zh 可见文案与现稿一致；悬停变亮且不位移；按下有边框反馈；键盘焦点可见；减少动效时无过渡
- [x] AC4: 侧边圆点、Stage、Download 原有行为仍在；`pnpm website:check` 通过
