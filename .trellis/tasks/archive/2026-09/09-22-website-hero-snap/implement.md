# Implement — Website hero scroll snap

## Checklist

1. [x] 三 `section.panel-*`；语言 footer **融入** Download 面板（mandatory 不能区外沉底）
2. [x] snap：`y mandatory` + `scroll-snap-stop: always`；reduced-motion 关闭；Brand/Stage 滚动暗示
3. [x] Brand：h1 + tagline
4. [x] Stage：高度预算 + rig scale；Desk 右上角电源键；首次入视口自动开一次；进页默认关
5. [x] Download：示意风标题（nowrap）+ macOS CTA；去掉 Windows / 冗长 meta
6. [x] `i18n.ts` en/zh 键
7. [x] 手动验：三区停靠、首屏可滚、Stage 开关、电源键（用户会话内迭代验收）
8. [x] `pnpm website:check` && `pnpm website:build`

## Validation

```bash
pnpm website:check
pnpm website:build
# Brand scroll free; Stage first-enter auto-on once; power ⏻ + outside click off
```

## Rollback

Revert `website/src/lib/marketing-page.svelte`, `i18n.ts`, `dom-input-adapter.ts`; restore `site-updater.md` marketing section if needed.
