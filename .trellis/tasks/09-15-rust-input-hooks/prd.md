# Rust global input hooks emit CastEvent

## Goal

在 **macOS** 上接入全局键鼠捕获，归一化为 `CastEvent`，经轻量过滤后 Tauri emit 到 overlay，驱动 HUD（替换 demo chips）。

## Background

Scaffold（`09-15-tauri-scaffold`）已提供透明 click-through overlay + HUD stub，并明确排除 input hooks。`CastEvent` 合同仅见于 `design/index.md`；仓库尚无 Rust 类型、OS 钩子或 `emit`/`listen`。

## Decisions

| 项 | 选择 |
|----|------|
| 平台 | 仅 macOS |
| Windows | 后续任务 |
| Linux | 暂不支持 |
| 组合/节流 | 轻量：`mods` + 过滤 key repeat / 明显刷屏；完整「单条 chip 合并 + 短历史」→ 后续任务 |
| Accessibility | 检测 + 可观察失败反馈；完整引导 UI → 后续任务 |
| Main 日志区 | **要**：简易滚动日志（hook 状态 + CastEvent 摘要）；非完整调试控制台 |

## Requirements

- **R1** Rust `CastEvent`（serde）与 `design/index.md` 合同对齐
- **R2** macOS 全局捕获键 down/up、鼠标左/右/中键 down/up；滚轮滚动不捕获
- **R3** 归一化时附带当前 modifiers → `mods`
- **R4** 过滤 key repeat 与明显刷屏后再 emit
- **R5** Tauri emit 到 overlay；overlay `listen` 替换 demo chips，用事件驱动简要 label
- **R6** 启动时检测 Accessibility；未授权时日志 + 向前端发可观察状态，钩子不静默挂死
- **R7** `cfg` / 模块拆分为后续 Windows 留边界；本任务不实现 Win/Linux
- **R8** Main 窗口加简易日志区：订阅 `cast://hook-status` 与 `cast://event`，追加只读行（有上限，避免无限增长）

## Out of scope / Follow-ups

- Windows 钩子；Linux（含 Wayland）暂不支持
- 完整组合键合并 → 单条 HUD chip + 短历史
- Accessibility 引导 UI / 打开系统设置
- 托盘、完整设置交互、皮肤、按应用过滤、历史回放、光标涟漪、滚轮滚动
- 可导出/可过滤的专业级日志控制台

## Acceptance Criteria

- [ ] **AC1** `pnpm tauri build`（或 `cargo check` + `pnpm build`）在 macOS 通过
- [ ] **AC2** 授予 Accessibility 后，键盘 down/up 与鼠标左/右/中键在 overlay 以 HUD chip 显示（非 demo 静态数据）
- [ ] **AC3** 发出的 payload 符合 `CastEvent` 合同（含 `mods` / `phase`）
- [ ] **AC4** 按住产生的 key repeat 不导致 HUD / main 日志狂刷
- [ ] **AC5** 未授权 Accessibility 时 main 日志区（或等价）可见失败状态，且应用不崩溃
- [ ] **AC6** 非 macOS 目标可编译跳过钩子（或明确 `cfg` 空实现），无 Linux/Win 假实现冒充完成
- [ ] **AC7** Main 窗口日志区能看到 hook 状态行与至少若干条 CastEvent 摘要行
