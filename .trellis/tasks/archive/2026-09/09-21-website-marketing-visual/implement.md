# Implement — Website marketing visual redesign

## Checklist

1. **Scaffold hero shell** — 在 `website/src/routes/+page.svelte`（可拆 `website/src/lib/components/`）搭：品牌 + tagline + 显示器框 + 记事本表面 + 台下 KM 区 + Download CTA；暗台 CSS 变量；保留 downloads/version/boundary 区块。
2. **Dual slots wiring** — `createHudSlots` ×2（lite dark / full）；`attachDomInputAdapter` 对 focus root；chip fan-out；dispose 时两边 `clearAllIdleTimers`。
3. **Compose surfaces** — 屏内 `HudView`（lite props）；台下直接 `KeyboardMap` + `MouseSchematic`（或 Full `HudView` 仅 KM 可见，优先直接组件以免双时间线）。
4. **Notepad buffer** — 可编辑浅色本；点击聚焦；字符/退格；wheel 滚正文且不与页滚打架（沿用 adapter 聚焦策略）。
5. **Intro script** — 一次性打字邀请 → 写入本子 + 模拟/驱动 chip；真实输入 `cancelIntro`；不循环。
6. **Visual polish** — 桌面微噪点/弱光；字体；Lite/记事本配色对齐 `HUD_COLOR_PRESETS`；动效 2–3 个（如 intro caret、chip 入场已有、CTA/舞台入场择一）。
7. **Regression** — `latest.json` 下载填充逻辑保持；边界文案更新为新舞台语义（仍非全局捕获）。

## Validation

```bash
pnpm website:check
pnpm website:build
# manual: website:dev or site:serve — intro types once; type/click/scroll notepad; Lite + KM sync; Download anchor
```

## Risky files / rollback

| Path | Risk |
|------|------|
| `website/src/routes/+page.svelte` | 主重写点；保留 downloads fetch 逻辑块 |
| `website/src/lib/dom-input-adapter.ts` | 仅在 focus root / wheel 与记事本冲突时改；保持 chip 合同 |
| `packages/hud-view/**` | 默认不动；若 fan-out 不够再最小补丁并单测 |

Rollback：git revert 本任务 website 提交；共享包无改则零影响 App。

## Before `task.py start`

- [x] `prd.md` 收敛（grill 共识）
- [x] `design.md` / `implement.md` 齐全
- [x] `implement.jsonl` / `check.jsonl` 真条目
- [ ] 用户审阅规划并批准 start（**批准建任务 ≠ 批准开工**）
