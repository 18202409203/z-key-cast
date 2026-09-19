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

- 全局捕获：按键 / 鼠标（Rust 侧合并为 chip；始终带 `phase`；Text/Lite 延迟提交裸修饰）
- 角落 HUD：Text · Lite · Full 三档预设；Text/Lite 空闲 dwell 淡出；Full 常驻板 + 真实按住高亮
- 托盘：开关 HUD、打开设置、退出

## 架构

```
Rust core
  ├─ 平台输入钩子（macOS CGEvent / Win Raw Input·hook / Linux evdev·X11）
  ├─ raw 归一化 → ChipReducer → HudChip（含 phase；mouse/scroll 快照 held mods）
  ├─ 节流（autorepeat / 短 debounce）
  └─ emit → Overlay + Main
       ├─ （可选）mouse down → cast://mouse-ripple → Ripple 窗
       └─ （可选）指针位置 → 自定义光标层（真换肤；见 `04-custom-cursor.md`；未开工）

Overlay window（透明、置顶、点击穿透）
  └─ 角落 HUD 渲染与动画

Ripple window（独立主屏全屏、透明、点击穿透；默认不创建）
  └─ 点击圆环动画（macOS / Windows 一期）

Cursor skin（规划中：主屏全屏透明层；藏系统光标 + 自绘预设；默认关）
  └─ 与涟漪同属可选装饰；不进 HudChip

Settings + Tray
  └─ 位置、样式、开关、权限引导
```

### 统一事件（对外）

`cast://event` 载荷为 **`HudChip`**（`key`/`mouse` 含 `phase`；`scroll` 无 phase；raw 仅内部）：

```ts
type KeyRef = { id: string };

type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef; phase: "down" | "up" }
  | { kind: "mouse"; mods: KeyRef[]; button: "left" | "right" | "middle"; phase: "down" | "up" }
  | { kind: "scroll"; mods: KeyRef[]; direction: "up" | "down" };
```

- `id`：稳定逻辑名（如 `MetaLeft`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`）；不发 OS 专用 id（如 `WinLeft`）
- 展示：UI 用 `id` + `keyboardLegendLayout`（auto → Mac/Win）解析短文案（Meta → `⌘` / `Win`）
- 发射端：主键 / 裸修饰 / 鼠标均发 down 与 up；纵向滚轮经短窗合并后发 `scroll`（无 phase）；mouse/scroll 快照当前 `held_mods`；消费者决定如何展示
- Text/Lite：修饰 **down 不入队**；伴随主键/鼠/滚入队并消费 mods；未消费的修饰 **up** 才合成展示用 `key` 条（`phase: "down"`）；已消费松手静默；操作时间线 + dwell；Text 鼠/滚标签 = mods + `LMB`/`Scr↑` 等；同向 scroll 且 mods 多重集合相同才刷新队尾 dwell
- Lite：键 = KeyCard 行；鼠/滚 = 修饰 KeyCard(s) + timeline MouseSchematic 定帧
- Lite/Full：滚轮刻度方向脉冲（固定短动画），与鼠标按键高亮不互斥；不进 Full held-set
- Full：held-set 驱动全键盘 / 多键鼠标高亮；忽略 dwell；可忽略 mouse/scroll 上的 `mods`
- Log：记录 down 与 up；scroll 记方向；mouse/scroll 行含 mods
- 平台：macOS CGEventTap（含 ScrollWheel）；Windows `WH_*_LL`（`WM_MOUSEWHEEL`；丢弃横向）；其它 stub `unsupported_platform`
## HUD 约定

- 默认右下角，可改左下 / 左上 / 右上；避开 Dock / 任务栏
- Overlay：透明 + always-on-top + click-through（角落 HUD；**不**全屏化）
- 预设：`hudPreset` = `text` | `lite` | `full`（默认 `text`）
- Text/Lite：共享操作时间线（`timelineMax` 默认 5，范围 1–10；右入左移）；每项独立 `dwellMs` 淡出
- Full：空板常驻；高亮随物理按住；Status 仍独占（遮住 pin）
- Status（如 hook offline）独占：清掉时间线与 held-set 后单独 dwell
- 点击涟漪（可选）：独立主屏全屏透明层（非 HUD overlay）；默认关；与 `captureMouse` 解耦；一期 macOS / Windows 主屏
- 自定义指针（**共识已锁、未开工**）：真换肤；细节 → [`04-custom-cursor.md`](./04-custom-cursor.md)

## MVP

**做**

- 三平台全局键鼠（Linux Wayland 可标实验性）
- 角落 HUD + 基础样式
- 托盘开关 / 退出
- macOS Accessibility 引导；Win/Linux 失败时有明确提示
- macOS / Windows 主屏点击涟漪（独立开关 + 独立层）
- 纵向滚轮方向反馈（合并后 `scroll` chip；受 `captureMouse` 总闸；可用 `ignoredMouseActions` 含 `"scroll"` 关闭）

**不做（二期）**

- 皮肤市场、按应用过滤、历史回放
- 跟班式鼠标轨迹 / 位置指示器（系统光标仍显示的旁路贴图）；外接屏涟漪；Linux 涟漪
- 输入法候选与死键完美还原
- 横向滚轮 / tilt-wheel；滚速档位或真实速度映射

**规划中（非当前 MVP 交付；grilling 已锁）**

- 自定义鼠标指针真换肤 → [`04-custom-cursor.md`](./04-custom-cursor.md)（macOS / Windows 主屏；独立开关；内置 2 预设）

## 风险

- **Linux Wayland** 全局捕获碎片化 → X11 / 有 portal 的环境优先；Wayland 实验性
- **权限**：macOS Accessibility 为硬前置；部分 Win 提权进程可能捕获不到
- **性能**：Rust 侧过滤合并后再推前端，避免逐事件狂刷 DOM
- **自定义指针（规划）**：全局 hide 计数 / 退出复位；主屏边界 unhide；藏失败硬关；见 `04-custom-cursor.md`
