# Implement — Website en/zh static pages

## Checklist

1. [x] Add `website/src/lib/i18n.ts`（en/zh catalog + `t()`；覆盖 PRD 所列可见串与 aria）
2. [x] Extract shared marketing page component（从 `+page.svelte` 抽出，接收 `locale`）
3. [x] Wire `routes/+page.svelte` → `locale="en"`；新增 `routes/zh/+page.svelte` → `locale="zh"` + Footer 互链
4. [x] Enable SSR prerender for marketing HTML（调整 `+layout.ts` / 页面 `ssr`；browser API 留在 `onMount`）
5. [x] Locale-aware intro invite + typewriter（`intro-typewriter.ts`）
6. [x] Pass `locale` into Lite `HudView`
7. [x] Verify / tighten static fallback：`build/zh/index.html` 存在；`site:serve` `/zh/` 不回落英文
8. [x] `pnpm website:check` && `pnpm website:build`；抽查 `build/index.html` 与 `build/zh/index.html` 含各语言关键句（如 tagline / 邀请句）

## Validation

```bash
pnpm website:check
pnpm website:build
# After sync (optional for local):
# pnpm site:sync-web && curl -s localhost:4173/zh/ | head  # expect Chinese copy, not EN-only shell
```

Manual: open `/` and `/zh/`；点语言链；确认 downloads 区与版本逻辑仍可用；intro 各语言各跑一次。

## Risky files / rollback points

| Area | Risk |
|------|------|
| `+layout.ts` ssr 开关 | 可能暴露 `window` 在模块顶层 — 开建前扫一遍 |
| `adapter-static` fallback | 错配导致 `/zh/` 假英文 |
| `+page.svelte` 大文件拆分 | 冲突面大；先抽组件再改路由 |

Rollback：见 `design.md` Rollback。

## Before `task.py start`

- [x] `prd.md` 已收敛（无未决 Open questions）
- [x] `design.md` / `implement.md` 已写
- [ ] User reviews artifacts / approves implementation
- [x] `implement.jsonl` / `check.jsonl` 含真实条目（非 seed）
