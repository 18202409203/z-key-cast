# Design — Website hero scroll snap

## Boundaries

| In | Out |
|----|-----|
| `website/src/lib/marketing-page.svelte` 分区壳 + 视口适配 + snap | App / Tauri / HUD 共享包 API |
| `website/src/lib/i18n.ts` ③ 区标题/CTA 文案 | Brand 卖点卡、Windows 按钮启用 |
| Stage 区高度约束 / scale `.rig` | 主题切换（`09-21-website-theme`） |
| 参考 `design/website/scroll.jpeg` 分区意图 | 逐像素描图、手机优先 |

## Architecture

```
html / body (overflow scroll)
  └── main.page
        scroll-snap-type: y mandatory   (off if prefers-reduced-motion)
        panels: scroll-snap-stop: always
        Brand/Stage: .scroll-hint → next panel (#stage / #downloads)
        ├── section.panel-brand     min-height: 100dvh; snap-align: start
        │     brand h1 + tagline
        ├── section.panel-stage     min-height: 100dvh; snap-align: start
        │     .stage → .rig (height-budget scale) + status
        ├── section.panel-download  min-height: 100dvh; snap-align: start
        │     id=downloads
        │     title + macOS CTA (+ boundary/version muted)
        │     footer.site-footer (lang) — inside panel 3
```

**原则**：三个面板各占一视口；语言 footer 融入 ③ 底部（`mandatory` 无法稳定展示末区之后内容）。首屏不再塞 brand+stage 同屏（以示意图三区为准）。

## Stage height budget

问题：`.screen { aspect-ratio: 16/10 }` 使 stage 高度随宽增长，矮视口溢出。

做法（二选一或组合，实现时取更稳的）：

1. **CSS 优先**：对 `.panel-stage` 建 containment；`.rig` 宽 = `min(100%, 48rem, f(可用高度))`，可用高度 ≈ `100dvh − status − panel padding`。
2. **Scale 兜底**：`ResizeObserver` 量 panel 与 rig 自然高度，若溢出则对 `.rig` 设 `transform: scale(s)`，并用 spacer / `height` 消化占位，避免下方空洞或重叠；**scale 仅作用在 `.rig` 内层包装**，动画结束态仍 `transform: none` 于会成为 HUD containing block 的祖先（遵守 frontend spec）。

Cable `layoutCables` 已 observe `rigEl` — scale 后几何会变，保持现有 RO 重算即可。

## Download panel

- 文案：示意风大标题 + 主按钮（macOS href，来自现有 `latest.json` / placeholder `/downloads/`）。
- UI：单一主按钮居中；外层 `.cta-row` 用 flex，**日后**加 Windows 时 `gap` 并排即可；本任务不渲染 Windows。
- 去掉首屏旧 `cta-bar`；boundary / version 可收入本区次要字号，或压缩为一行说明。
- 移除 Windows placeholder 列表项（manifest 分支同步只推 macOS + 可选 browse）。
- **语言 footer 在本面板底部**（`space-between`），不作为第四屏或区外内容。

## Snap / a11y

| 规则 | 值 |
|------|-----|
| 默认 | `scroll-snap-type: y mandatory` on `html`（滚动根） |
| 子项 | `.panel-* { scroll-snap-align: start; scroll-snap-stop: always }` |
| 暗示 | Brand / Stage 底栏 `.scroll-hint` 链到下一区；Download 无暗示 |
| reduced-motion | `@media (prefers-reduced-motion: reduce) { scroll-snap-type: none; hint animation none }` |
| 锚点 | `#stage` / `#downloads`；hash 与 hint 链接可滚到对应区 |

## Contracts

- Locale / 路由 / prerender：不变（`site-updater.md` marketing i18n）。
- Stage power session / DomInputAdapter：不变。
- Manifest URL 形状：不变；UI 只暴露 macOS。

## Trade-offs

| 选择 | 理由 | 代价 |
|------|------|------|
| 三区分屏（非 brand+stage 同屏） | 对齐示意图；Stage 独享视口更易装下 | 多一次滚动才见 demo |
| `proximity` → **`mandatory` + `stop: always`** | 用户反馈停在交接区 | 滚轮更「幻灯」 |
| Footer 融入 ③ | 区外 footer 会被 mandatory 吸回 | 第三屏略挤；矮屏需注意 |
| CSS 宽高预算 + 可选 scale | 矮本可验收 | scale 路径要测 cable/HUD |
| macOS-only CTA | 产品现状 | Windows 用户暂无入口 |

## Compatibility / rollback

- 仅 `website/`（marketing-page + i18n）。
- 回滚：还原两文件；publish 流程不变。
- 后补：卖点卡任务；Windows 并排按钮任务。
