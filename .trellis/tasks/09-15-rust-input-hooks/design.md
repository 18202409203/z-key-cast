# Design: macOS input hooks → CastEvent → overlay

## Boundaries

| Layer | Owns | Does not own |
|-------|------|--------------|
| `src-tauri` input module | CGEventTap（或等价）捕获、归一化、`mods`、repeat 过滤、emit | HUD 动画细节、托盘、权限引导页 |
| Overlay (`/overlay`) | `listen`、把 `CastEvent` 格式化为简要 label、替换 demo chips | 组合键合并状态机（后续） |
| Main (`/`) | 简易只读日志区：hook 状态 + CastEvent 摘要行 | 完整设置交互、权限引导、日志导出 |

## Module layout (Rust)

```
src-tauri/src/
  lib.rs                 # setup: 启钩子 + 既有 overlay 定位
  input/
    mod.rs               # pub start(app_handle); cfg 路由
    event.rs             # CastEvent + serde
    filter.rs            # key-repeat / spam gate
    macos.rs             # #[cfg(target_os = "macos")] tap + AX check
    stub.rs              # #[cfg(not(macos))] no-op + status
```

Windows 后续在同目录加 `windows.rs`，不改 `CastEvent` / emit 合同。

## Contracts

### CastEvent (wire JSON)

与 `design/index.md` 一致：

```ts
type CastEvent =
  | { type: "key"; key: string; mods: string[]; phase: "down" | "up" }
  | { type: "mouse"; button: "left" | "right" | "middle"; phase: "down" | "up" }
```

- `key`：可读短名（如 `S`、`Return`、`Escape`）；修饰键本身可作为 `key` 发出
- `mods`：稳定集合，建议符号或统一名：`["⌘","⇧"]` 或 `["Meta","Shift"]`——实现时选定一种并在前后端一致（推荐 macOS 符号，贴近 HUD）
- 不发滚轮 `scroll` 事件

### Tauri channels

| Event | Payload | Target |
|-------|---------|--------|
| `cast://event` | `CastEvent` | overlay（可用 `emit` 全局；overlay 订阅即可） |
| `cast://hook-status` | `{ ok: boolean, reason?: string }` | overlay + **main**（全局 emit，两端订阅） |

未授权示例：`{ ok: false, reason: "accessibility_denied" }`。

### Main 日志区（简）

- 位置：`src/routes/+page.svelte` Capture 区下方（或替换 “hooks not wired”）
- 行为：`listen` 两路事件；每行一行文本（时间可选 + 摘要）；环形缓冲（建议 ≤100 行）
- 不做：搜索、级别过滤、导出、清屏可有可无（有 Clear 按钮更好，非必须）

## Data flow

```
CGEventTap (macOS)
  → normalize → CastEvent
  → filter (drop key-repeat / spam)
  → app.emit("cast://event", event)
       ↓
overlay listen → formatLabel → items[] chips
```

并行：`AXIsProcessTrusted` → 失败则 `cast://hook-status` + log，不启动 tap（或不在未信任时假装成功）。

## Hook implementation choice

**选用 macOS 原生 CGEventTap**（`core-graphics` / Accessibility），而非先绑跨平台 `rdev`：

- 本任务仅 macOS，原生 API 权限模型清晰
- 平台模块边界已要求 `cfg` 拆分；Win 后续用 Raw Input/hook，不强行共用 crate
- 风险：需在辅助功能信任后 tap 才稳定；开发态用 `pnpm tauri dev` 测

## Frontend behavior (minimal)

- 移除静态 demo 初始项（或仅在未收到任何事件且 hook ok 前显示占位）
- 收到 `CastEvent`：生成 label（如 `⌘ + S` / `Mouse · Left`），追加/替换当前条；可保留极简短历史（≤2–3）但**不做**完整组合合并状态机
- 收到 `hook-status` 失败：一条非 demo 的状态 chip 或 console，保证可观察

## Compatibility / rollback

- 能力：`core:default` 已覆盖 listen；若 emit 需额外 ACL，补 `capabilities/default.json`
- 回滚：去掉 `input::start` 与 overlay listen 即可回到 stub HUD
- 不改动 overlay 窗口几何与 click-through 行为

## Trade-offs

| 选择 | 利 | 弊 |
|------|----|----|
| 轻量过滤、完整合并后续 | 本任务可验收、主线清晰 | HUD 暂不如 KeyCastr「一条组合」优雅 |
| 原生 CGEventTap | macOS 可控 | Win 不能复用同一实现 |
| 状态事件而非引导 UI | 范围小 | 用户需自行开权限 |
