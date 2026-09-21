# Implement — 官网 live HUD demo

## Preconditions

- [ ] Sibling `09-21-shared-hud-view-package` AC 已满足

## Checklist

1. [x] `website/package.json` 依赖共享包；`pnpm install`
2. [x] 实现 DOM → `HudChip` 适配器 + 焦点/wheel 策略
3. [x] 重写 `+page.svelte`：Hero Full demo + 边界说明 + Downloads + Version
4. [x] 接 `createHudSlots` + `HudView`（Full only）
5. [x] `pnpm website:check` / `website:build` / `site:sync-web`
6. [ ] 浏览器手动试玩 + 点下载链接

## Validation

```bash
pnpm website:check
pnpm website:build
pnpm site:sync-web
pnpm site:serve   # 手动验 demo + downloads
```

## Risky files

- `website/src/routes/+page.svelte`
- 新建 adapter 模块
- `website/vite.config` / SvelteKit 对 workspace 包的预构建配置（若遇）

## Done when

- Child PRD AC 全勾；提请 parent 集成验收（AC3/AC4）。
