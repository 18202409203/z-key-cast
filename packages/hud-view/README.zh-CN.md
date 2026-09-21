# z-key-cast-hud-view

[English](./README.md) | 简体中文

z-key-cast 的 **共享 HUD 视图层**：Text / Lite / Full 展示、键鼠组件与 slot 状态。供 Tauri App overlay 与官网 live demo 共用。

**不依赖 `@tauri-apps/*`。** 两端差异只在如何产出 `HudChip`（原生 hook vs DOM）。

包名：`z-key-cast-hud-view` · 路径：`packages/hud-view`

## 目录

```text
src/
  components/   # HudView, KeyCard, KeyboardMap, MouseSchematic
  model/        # HudChip、样式、图例、布局、HUD 用 i18n 切片
  state/        # createHudSlots（时间线 / held-set / 滚轮脉冲）
  index.ts      # 对外导出
```

只从包根导入：

```ts
import {
  HudView,
  createHudSlots,
  type HudChip,
} from "z-key-cast-hud-view";
```

## 消费者

| 宿主 | 事件来源 | 说明 |
|------|----------|------|
| App（`src/routes/overlay`） | Tauri `cast://event` → `HudChip` | 完整 Text/Lite/Full |
| Website（`website/`） | DOM 键 / 鼠 / 滚轮 → `HudChip` | MVP：仅 Full |

Vite 需把 workspace 包排除预构建，避免弄丢 Svelte：

- `optimizeDeps.exclude: ["z-key-cast-hud-view"]`
- `ssr.noExternal: ["z-key-cast-hud-view"]`

## 合同

- Chip 形状与仓库 `design/index.md`、Rust 输入事件对齐。
- Peer：`svelte` ^5。

## 不在本包

- 原生 / DOM 输入适配（在 App 或 `website/`）
- 设置持久化、Tauri IPC、托盘、涟漪、自定义光标
