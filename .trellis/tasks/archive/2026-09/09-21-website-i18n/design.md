# Design — Website en/zh static pages

## Boundaries

| In | Out |
|----|-----|
| `website/` 字典、路由、预渲染双 HTML、语言互链 | App / Tauri UI i18n |
| Intro 邀请句随 locale | 自动语言重定向、SEO 定稿 |
| Serve/fallback 不吞 `/zh/` | `09-21-website-theme` |

## Architecture

```
website/src/lib/i18n.ts          en/zh catalogs + t()
website/src/lib/marketing-page.svelte   (or keep logic in shared module)
        ▲
        │ locale prop
┌───────┴────────┐
│ routes/+page   │  locale=en   → build/index.html
│ routes/zh/+page│  locale=zh   → build/zh/index.html
└────────────────┘
        │
        ├─ downloads / updates (shared static paths)
        └─ HudView locale={locale}
```

**原则**：字典与 UI 同构；locale 只从路由进入，不写客户端「翻文案」主路径。

## SSR / prerender (critical)

当前 `+layout.ts` 为 `ssr = false`。要满足「独立 HTML 首屏已是对语言」：

- 对营销页启用 SSR 预渲染：布局或页面改为 `ssr = true`（或删除 `ssr = false`），保持 `prerender = true`。
- Browser-only 逻辑（`attachDomInputAdapter`、`onMount` intro、caret 测量）继续放在 `onMount` / `browser` 守卫；SSR 只输出品牌、文案、CTA、结构骨架。
- 若整站改 SSR 有回归，可用路由级 `+page.ts` 覆盖，但默认优先简单：整站 `ssr = true` + prerender。

## Routing

- `/` → en（现有 `routes/+page.svelte` 改为薄包装或改挂共享组件）。
- `/zh/` → zh（新增 `routes/zh/+page.svelte`，同构渲染，`locale="zh"`）。
- 不使用 `[[lang]]` 可选段（避免根路径歧义）；不使用 query `?lang=`。

## Locale switch UX

- 页脚 Footer：`English` | `中文` 链接（当前页对应项可 `aria-current`）；不放品牌区，避免挡首屏观感。
- 无 `localStorage` 偏好、无自动跳转。

## Intro typewriter

- `INTRO_INVITE` 改为按 locale 取字典键（或 `inviteFor(locale)`）。
- 英文：保持现有 char→code 映射。
- 中文：允许简化——逐字写入记事本 + 发通用/可映射 chip；不阻塞验收的 IME 保真。

## Static adapter / serve

- 确认 `build/zh/index.html`（或 `zh.html`，优先目录 `zh/index.html`）存在。
- 评估 `fallback: "index.html"`：若仍需要 SPA fallback，serve 侧对「已知预渲染路径」优先真文件（已有目录 index 逻辑）；文档注明 `/zh/` 必须先 build。
- 可选：`fallback` 改为 `undefined` / 关闭，若无客户端路由深链需求（当前营销站几乎无）——实现时以「`/zh/` 不被英文吞」为准做最小改动。

## Contracts

```ts
type UiLocale = "en" | "zh";
function t(key: MessageKey, locale: UiLocale, vars?: Record<string, string | number>): string;
```

- `HudView`：`locale` 传入页面 locale（共享包已支持）。
- 不改 updater / `latest.json` URL 形状。

## Trade-offs

| 选择 | 利 | 弊 |
|------|----|----|
| 双静态 HTML + 链接 | 可分享、首屏语言正确、实现直观 | 两份 HTML 体积微增；改文案需 rebuild |
| 不开自动跳转 | 可预期、无缓存惊喜 | 中文用户多点一次 |
| 启 SSR 预渲染 | 满足独立 HTML AC | 需把浏览器 API 挡在 `onMount` |

## Rollback

- 删除 `routes/zh/`、恢复单页硬编码英文、恢复 `ssr = false`（若改过）；`site:sync-web` 重发。
