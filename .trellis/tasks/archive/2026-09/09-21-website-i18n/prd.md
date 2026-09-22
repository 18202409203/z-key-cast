# Website en/zh copy dictionary

## Goal

为 `website/` 营销页提供 **简单 en/zh 文案字典**；源码同构，构建出 **两份独立静态 HTML**（`/` 英文、`/zh/` 中文）。语言切换靠链接跳转；**不做**浏览器语言自动跳转、不做 i18n 框架、不做第三语言。

## Background

- 前序 `09-21-website-marketing-visual` 将多语言站与色切换器标为 out of scope；页内文案英文；Lite `HudView` `locale="en"`。
- 桌面端字典模式可参考：`src/lib/i18n.ts` / `packages/hud-view/src/model/i18n.ts`（抄模式，不跨包装文件）。
- 同会话 `09-21-website-theme` 占位 defer；本任务不含主题。
- Grill（2026-09-21）定稿：
  1. 文案 = 手写 en/zh catalog + `t()`。
  2. 交付 = 同构页面 + 独立静态 HTML（非仅客户端翻文案）。
  3. `/` 固定 en；`/zh/` 为 zh；页内互链；**不**按 `navigator.language` 自动跳转。

## Confirmed facts (repo)

- 页面：`website/src/routes/+page.svelte`；邀请句：`website/src/lib/intro-typewriter.ts` 的 `INTRO_INVITE`。
- `+layout.ts`：`prerender = true` 且 **`ssr = false`** → 当前预渲染多为 SPA 壳。要满足「首屏 HTML 已是对应语言」，须改为可 SSR 预渲染（见 design）。
- `adapter-static` 现有 `fallback: "index.html"`；`site:serve` 对缺失路径回落根 `index.html`（`/downloads` `/updates` 除外）。`/zh/` 必须产出真实 `zh/index.html`。
- 用户可见串：tagline、舞台 on/off、Download / Latest / 能力边界、Downloads/Version、下载 note、aria-label、placeholder。
- 产品名 / 平台名 / 路径 / `CHANGELOG.md` 不译。

## Requirements

### R1 — Catalog

- `website/src/lib/i18n.ts`：`UiLocale = "en" | "zh"`、手写 en/zh、`t(key, locale, vars?)`。
- 不引入第三方 i18n 框架；不复用桌面端 i18n 源文件。

### R2 — 同构双 HTML

- 一份页面实现，由路由注入 `locale`。
- 构建产物：`build/index.html`（en）与 `build/zh/index.html`（zh）；首屏 HTML 含该语言可见文案（非空壳后再翻）。
- 语言切换 = `<a href="/">` / `<a href="/zh/">`（或相对等价）；不以单页 `localStorage` 为主路径。
- `/downloads/`、`/updates/latest.json` 两语言页共用。

### R3 — 入口策略

- `/` 永远英文；`/zh/` 永远中文。
- **不**根据浏览器语言或 `Accept-Language` 自动重定向。

### R4 — 覆盖

- 访客可见文案 + 相关 `aria-label`；`HudView` 的 `locale` 跟页面。
- 不译：产品名、OS 名、URL/path、changelog 文件名；note 里的 CLI 命令可保留英文。

### R5 — Intro

- 中文邀请句进字典；typewriter 按该页 locale 全文驱动。
- 不要求中文 IME/键位完美；至少写出中文邀请句且 Lite 有 chip。

### R6 — 工程

- `pnpm website:check` / `pnpm website:build` 通过；`site:sync-web` 后 `publish/zh/index.html` 可被 `site:serve` 直接命中。
- 收紧 fallback / serve 回落，避免缺失 zh 时假 200 英文页。

## Acceptance Criteria

- [x] 构建产出独立 en / zh HTML；打开 `/` 与 `/zh/` 时首屏即为对应语言
- [x] 源码同构（共享组件 + 字典）；无第三方 i18n 框架
- [x] 页内互链（Footer）；无自动语言跳转；downloads / updater 路径共用
- [x] 访客可见文案无残留硬编码英文（产品名/平台名/路径除外）
- [x] Intro 随页 locale；真输入后停、不循环；`HudView` locale 一致
- [x] `pnpm website:check` 与 `pnpm website:build` 通过；`site:serve` 的 `/zh/` 不为英文 fallback

## Out of scope

- 页壳黑白主题（→ `09-21-website-theme`）
- SEO 体系定稿（可选 `hreflang` 非阻塞）、`Accept-Language` 协商
- README / 桌面 App 文案；第三语言；完整 IME 还原
