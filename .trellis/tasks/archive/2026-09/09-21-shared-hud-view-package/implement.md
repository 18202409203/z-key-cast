# Implement — 共享 HUD 视图包

## Checklist

1. [x] 列出迁入文件清单（对照 parent `design.md` Boundaries）
2. [x] 创建 `packages/hud-view` + 写入 `pnpm-workspace.yaml`
3. [x] 拆 `cast` / HUD `settings`：纯逻辑进包，IPC 留 App
4. [x] 迁组件与 `createHudSlots`；配置导出入口
5. [x] 根 App `package.json` 依赖共享包；改 overlay / panels import
6. [x] 删除重复实现；`$lib/key-{legends,card}` / `keyboard-layout` 仅薄 re-export（删期限：website sibling 落地后）
7. [x] `pnpm install` + `pnpm check`
8. [ ] 手动：overlay Text / Lite / Full + 键鼠

## Validation

```bash
pnpm install
pnpm check
pnpm tauri dev   # 手动验 overlay
```

## Risky files

- `src/lib/cast.ts`、`src/lib/settings.ts`（Tauri 耦合）
- `src/routes/overlay/+page.svelte`
- `src/lib/overlay/*`、`src/lib/components/Key*.svelte`、`MouseSchematic.svelte`

## Done when

- Child PRD AC 全勾；可通知 sibling 官网任务开工.

## Transitional re-exports (delete after website sibling)

- `src/lib/key-legends.ts`
- `src/lib/key-card.ts`
- `src/lib/keyboard-layout.ts`

App `cast.ts` / `settings.ts` keep intentional host wrappers (IPC + re-export of pure types).
