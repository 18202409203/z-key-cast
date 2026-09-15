# Implement: HudChip contract + text HUD

## Checklist

1. [x] 在 `input/event.rs`（或新文件）定义 `HudChip` / `KeyRef`；保留内部 raw 类型若需要
2. [x] 实现 ChipReducer（裸修饰、down 出条、丢 up、鼠标对称）
3. [x] 修正 macos keycode → `id`/`label`（Backspace、ForwardDelete、Digit vs Numpad、左右修饰）
4. [x] emit 改为 `HudChip`；确认 stub/非 macOS cfg 仍编译
5. [x] 更新 `src/lib/cast.ts`：类型、`isHudChip`、`formatHudLabel`；移除或降级旧 `CastEvent` 对外 API
6. [x] overlay：单条 + 1s idle fade（重置计时）
7. [x] main 日志页改订 chip 摘要
8. [x] 更新 `design/index.md` + `.trellis/spec/tauri/cast-events.md`
9. [x] 自测：组合键、裸修饰、鼠标、淡出、混淆键抽样（unit + typecheck；manual via `pnpm tauri dev`）

## Validation

```bash
cd src-tauri && cargo check
cd src-tauri && cargo test
pnpm check
pnpm tauri dev   # manual: Accessibility on, exercise AC1–AC7
```

## Review gates

- PRD AC1–AC8 全部可演示或可指出对应代码路径
- 无对外 raw `phase` 残留订阅

## Rollback points

- 合同切换前：仅 Rust reducer 未接线时可弃
- 合同切换后：整任务 revert；勿只回前端
