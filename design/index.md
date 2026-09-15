# z-key-cast

录屏时在屏幕角落显示键鼠操作的跨平台小工具。

## 产品决策

| 项 | 选择 |
|----|------|
| 壳 | Tauri 2 |
| 平台 | macOS / Windows / Linux（一期） |
| 展示 | 角落 HUD（非跟随光标） |
| 前端 | 轻量 Web（Svelte） |

## 核心功能

- 全局捕获：按键按下 / 松开、鼠标左键 / 右键 / 滚轮点击（中键）
- 角落 HUD：组合键合并展示、短时淡出、可配置角落
- 托盘：开关 HUD、打开设置、退出

## 架构

```
Rust core
  ├─ 平台输入钩子（macOS CGEvent / Win Raw Input·hook / Linux evdev·X11）
  ├─ 事件归一化 → CastEvent
  ├─ 组合键状态机 + 节流
  └─ emit → Overlay

Overlay window（透明、置顶、点击穿透）
  └─ 角落 HUD 渲染与动画

Settings + Tray
  └─ 位置、样式、开关、权限引导
```

### 统一事件

```ts
type CastEvent =
  | { type: "key"; key: string; mods: string[]; phase: "down" | "up" }
  | { type: "mouse"; button: "left" | "right" | "middle"; phase: "down" | "up" }
```

## HUD 约定

- 默认右下角，可改左下 / 左上 / 右上；避开 Dock / 任务栏
- Overlay：透明 + always-on-top + click-through
- 组合键合并为一条（如 `⌘ + Shift + S`）；替换当前条 + 短历史
- 鼠标按键进同一条流，不做光标涟漪

## MVP

**做**

- 三平台全局键鼠 down/up（Linux Wayland 可标实验性）
- 角落 HUD + 基础样式
- 托盘开关 / 退出
- macOS Accessibility 引导；Win/Linux 失败时有明确提示

**不做（二期）**

- 皮肤市场、按应用过滤、历史回放
- 鼠标轨迹 / 点击涟漪
- 输入法候选与死键完美还原
- 滚轮滚动事件（避免刷屏）

## 风险

- **Linux Wayland** 全局捕获碎片化 → X11 / 有 portal 的环境优先；Wayland 实验性
- **权限**：macOS Accessibility 为硬前置；部分 Win 提权进程可能捕获不到
- **性能**：Rust 侧过滤合并后再推前端，避免逐事件狂刷 DOM
