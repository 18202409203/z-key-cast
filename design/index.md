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

- 全局捕获：按键 / 鼠标（Rust 侧合并为 chip；始终带 `phase`；Text/Lite 不把裸修饰占条）
- 角落 HUD：Text · Lite · Full 三档预设；Text/Lite 空闲 dwell 淡出；Full 常驻板 + 真实按住高亮
- 托盘：开关 HUD、打开设置、退出

## 架构

```
Rust core
  ├─ 平台输入钩子（macOS CGEvent / Win Raw Input·hook / Linux evdev·X11）
  ├─ raw 归一化 → ChipReducer → HudChip（含 phase）
  ├─ 节流（autorepeat / 短 debounce）
  └─ emit → Overlay + Main
       └─ （可选）mouse down → cast://mouse-ripple → Ripple 窗

Overlay window（透明、置顶、点击穿透）
  └─ 角落 HUD 渲染与动画

Ripple window（独立主屏全屏、透明、点击穿透；默认不创建）
  └─ 点击圆环动画（macOS 一期）

Settings + Tray
  └─ 位置、样式、开关、权限引导
```

### 统一事件（对外）

`cast://event` 载荷为 **`HudChip`**（含 `phase`；raw 仅内部）：

```ts
type KeyRef = { id: string; label: string };

type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef; phase: "down" | "up" }
  | { kind: "mouse"; button: "left" | "right" | "middle"; phase: "down" | "up" };
```

- `id`：稳定逻辑名（如 `MetaLeft`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`）
- `label`：text HUD 短展示（左右 Meta 均可 `"⌘"`）
- 发射端：主键 / 裸修饰 / 鼠标均发 down 与 up；消费者决定如何展示
- Text/Lite：忽略 `up` 与裸修饰；down 占条 + dwell
- Full：held-set 驱动全键盘 / 多键鼠标高亮；忽略 dwell
- Log：记录 down 与 up

## HUD 约定

- 默认右下角，可改左下 / 左上 / 右上；避开 Dock / 任务栏
- Overlay：透明 + always-on-top + click-through（角落 HUD；**不**全屏化）
- 预设：`hudPreset` = `text` | `lite` | `full`（默认 `text`）
- Text/Lite：键、鼠各最多 1 条可见；可同时显示；同类新事件替换同侧并重置该侧空闲淡出；两侧独立计时（共享 `dwellMs`）
- Full：空板常驻；高亮随物理按住；Status 仍独占（遮住 pin）
- Status（如 hook offline）独占：清掉键/鼠两槽与 held-set 后单独 dwell
- 点击涟漪（可选）：独立主屏全屏透明层（非 HUD overlay）；默认关；与 `captureMouse` 解耦；一期仅 macOS

## MVP

**做**

- 三平台全局键鼠（Linux Wayland 可标实验性）
- 角落 HUD + 基础样式
- 托盘开关 / 退出
- macOS Accessibility 引导；Win/Linux 失败时有明确提示
- macOS 主屏点击涟漪（独立开关 + 独立层；Windows 另开任务）

**不做（二期）**

- 皮肤市场、按应用过滤、历史回放
- 鼠标轨迹 / 位置指示器；外接屏涟漪；Windows/Linux 涟漪
- 输入法候选与死键完美还原
- 滚轮滚动事件（避免刷屏）

## 风险

- **Linux Wayland** 全局捕获碎片化 → X11 / 有 portal 的环境优先；Wayland 实验性
- **权限**：macOS Accessibility 为硬前置；部分 Win 提权进程可能捕获不到
- **性能**：Rust 侧过滤合并后再推前端，避免逐事件狂刷 DOM
