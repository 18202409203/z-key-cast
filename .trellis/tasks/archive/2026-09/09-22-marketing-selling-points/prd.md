# Marketing brand selling points

## Goal

在营销页 Brand 区（第一 snap 屏）补上 **三枚卖点卡**（图标 + 文案 + 描边框），落实 `design/website/scroll.jpeg` 与 `09-22-website-hero-snap` 后补的 Brand feature cards，使首屏在品牌名 + tagline 之外能一眼读到核心价值。

## Background

- 结构：`MarketingPage` 三区 snap — Brand → Stage → Download（`$lib/marketing/`）。
- Brand 现状：`BrandPanel.svelte` 仅有产品名 + `brand.tagline`。
- 文案：`website/src/lib/i18n.ts`（en/zh）；不与 app `src/lib/i18n.ts` 共用。
- 体积依据：macOS `.dmg` / `.app.tar.gz` ≈ 2.81 MB（`website/publish/downloads/1.5.7`）。
- Spec：`site-updater.md` 仍写 Brand feature cards deferred — 本任务交付后应更新该条。

## Decisions

| 项 | 决定 |
|----|------|
| 文案 | 见下表 |
| 视觉 | **V2**：每卡小图标 + 文字 + 描边框 |
| 图标母题 **I1** | 离线：插头断开或云打叉；体积：小包裹/压缩箱；开源：开源菱形或分支 |
| 图标实现 | 手写细线 SVG（accent/fg 描边）；不引图标库 |
| 否决 | Blazing fast；约/~ 3 MB；V1/V3；I2/I3；图标字体依赖 |

**定稿文案**

| # | en | zh | 图标母题 |
|---|----|-----|----------|
| 1 | Runs offline | 离线可用 | 插头断开 / 云打叉 |
| 2 | Under 3 MB | 不到 3 MB | 小包裹 / 压缩箱 |
| 3 | 100% Free | 100% 免费 | 代码符号 `</>`；开源放副标题 |

## Requirements

### Must

1. Brand 区在标题 + tagline **下方**展示恰好三枚卖点卡；文案与上表一致（en/zh）。
2. 每卡含小图标 + 文案 + 描边框；三卡图标风格统一；图标装饰性（`aria-hidden`），可读主信息在文案。
3. 文案进 `website/src/lib/i18n.ts`；`/` 与 `/zh/` 共用 `BrandPanel`。
4. 视觉从属现有营销 chrome（深底、accent `#80ffff`、Syne / IBM Plex）；无新主题色、无多层阴影堆叠。
5. 矮本视口（如 1366×768）下 Brand 关键内容完整可读；可收紧间距/字号，不另开第四 snap。
6. `prefers-reduced-motion: reduce` 下无额外难受动效。
7. 卖点 1 不承诺「永不请求网络」（站点仍可拉 `latest.json`）。
8. 卖点 2 为静态营销上限（不到 3 MB），不接动态测体积；涨破 3 MB 另开任务改文案。
9. 横排三卡，窄屏可折行；非 hero 浮动徽章/贴纸。

### Out of scope

- 改 Stage / Download 分区职责或新增第四 snap
- Windows 下载按钮
- 包体体积 CI / 自动读产物 size
- App / HUD 行为变更；黑白主题

## Acceptance Criteria

- [ ] AC1: Brand 区三枚卖点卡（图标+文案）；en/zh 与定稿表一致（含 Under 3 MB / 不到 3 MB）
- [ ] AC2: 主流电脑视口（含矮本）Brand 关键内容完整可读
- [ ] AC3: Stage / Download 行为与分区不变；`pnpm website:check` 通过
