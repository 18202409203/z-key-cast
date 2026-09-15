# Implement: macOS hooks → CastEvent → overlay

## Checklist

1. [ ] 加 `CastEvent` + serde（`input/event.rs`），对齐 `design/index.md`
2. [ ] 实现 `filter.rs`：丢弃 key repeat；可选对同键极短间隔去抖
3. [ ] 实现 `macos.rs`：Accessibility 检测、CGEventTap、归一化（含 `mods`）、鼠标左/右/中
4. [ ] `input::start(app)`：成功 emit `cast://hook-status` ok；失败 reason + log；非 macOS stub
5. [ ] 在 `lib.rs` `setup` 中启动钩子（勿阻塞 UI 线程不当用法——tap 回调内只做轻量工作与 emit）
6. [ ] 按需更新 `Cargo.toml`（如 `core-graphics` / `objc2` 等）与 capabilities
7. [ ] Overlay：`listen("cast://event")` + `listen("cast://hook-status")`；去掉静态 demo 依赖；简要 `formatLabel`
8. [ ] Main：简易日志区订阅同上两路事件；环形缓冲；替换 “hooks not wired” 文案
9. [ ] 手动验：授权前后、键鼠、按住不狂刷；main 日志可见状态与事件摘要

## Validation

```bash
cd src-tauri && cargo check
pnpm build
# 交互：pnpm tauri dev
# - 未授权：可见 hook-status / 日志
# - 授权后：overlay 显示真实按键与鼠标
```

## Risk / rollback

| 风险 | 缓解 |
|------|------|
| Tap 未获信任静默无事件 | 显式 AX 检测 + `cast://hook-status` |
| 回调线程 emit | 使用 `AppHandle` 线程安全 emit；避免在 tap 里重活 |
| 权限/私有 API 纠缠 | 不改现有 `macos-private-api` overlay 路径；钩子走 Accessibility |

回滚：删除/禁用 `input::start`，overlay 恢复 stub。

## Follow-up tasks (do not implement here)

- Windows 钩子
- 完整组合合并 + 短历史 HUD 状态机
- Accessibility 引导 UI
- 托盘 / 设置

## Gate before `task.py start`

- [x] `prd.md` 已收敛
- [x] `design.md` / `implement.md` 已写
- [ ] `implement.jsonl` / `check.jsonl` 已填真实条目
- [ ] 用户确认可 start
