# Implement: Text/Lite modifier chord commit

## Checklist

1. [x] **Rust contract** — `event.rs`: `Mouse`/`Scroll` 加 `mods`；`chip.rs` reduce 快照 `held_mods`；单测：held Shift 时 mouse/scroll 含 `Shift*`；更新 `settings/capture.rs` 等构造 `HudChip::Scroll`/`Mouse` 的测试辅助。
2. [x] **TS contract** — `cast.ts`: 类型；`isHudChip` 要求 mouse/scroll 的 `mods` 数组；`formatHudLabel` / log / `hudCards`（scroll/mouse 的 mods 在前，schematic/卡片 id 逻辑保持）。
3. [x] **Text/Lite slots** — `hud-slots.svelte.ts`: `consumedModIds`；修饰 down 清消费并 return；修饰 up 按 design 合成或静默；伴随入队后 `consume`；scroll 合并比 mods；清除 timeline/status 时重置 consumed。
4. [x] **Lite UI** — `HudView.svelte`: mouse/scroll 项 = mods KeyCards + `MouseSchematic` frame。
5. [x] **Docs** — `design/index.md` HudChip + Text/Lite 语义；`.trellis/spec/tauri/cast-events.md`；`.trellis/spec/frontend/type-safety.md`（废除 ignore bare-mod downs 表述）。
6. [x] **Validate** — `pnpm check`；`cargo test -p`（或项目惯用 input/chip 测试命令）。

## Validation

```bash
pnpm check
cd src-tauri && cargo test chip::
```

（若 package 名不同，以 workspace 实际为准。）

## Risky files / rollback

- `hud-slots.svelte.ts` — 时间线语义中心；回滚时整文件逻辑易错，优先测 AC1–AC4。
- `event.rs` / `cast.ts` — 线合同必须同步，否则 `isHudChip` 丢弃全部 mouse/scroll。

## Review gate before `task.py start`

- [x] PRD 决策已收敛（up-only；叠修饰合成；按住期间每次滚轮带 mods）
- [x] design + implement 已写
- [ ] jsonl 非 seed-only
- [ ] 用户审阅同意开工
