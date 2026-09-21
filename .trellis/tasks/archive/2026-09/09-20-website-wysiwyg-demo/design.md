# Design — 官网所见即所得（parent）

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  packages/hud-view (name TBD)                            │
│  HudView · KeyCard · KeyboardMap · MouseSchematic        │
│  createHudSlots · HudChip types · legends/layout/style   │
│  (no @tauri-apps/*)                                      │
└───────────────┬─────────────────────────┬───────────────┘
                │                         │
     ┌──────────▼──────────┐   ┌──────────▼──────────────┐
     │ App (Tauri host)    │   │ website (SvelteKit)     │
     │ native hook →       │   │ DOM key/mouse/wheel →   │
     │ HudChip → slots →   │   │ HudChip → slots →       │
     │ HudView             │   │ HudView (Full only MVP) │
     └─────────────────────┘   └─────────────────────────┘
```

**原则**：视图与 slots 状态机共享；**仅事件源不同**。

## Boundaries

| 进共享包 | 留在 App | 留在 website |
|----------|----------|--------------|
| `HudView`、展示组件、`createHudSlots` | Tauri `listen`/`invoke`、settings 持久化、panels、overlay 窗路由 | 极简单页壳、下载/`latest.json` 逻辑 |
| `HudChip` 类型与纯校验/展示格式化 | IPC channel 常量与 invoke 封装 | DOM → `HudChip` 适配器 |
| Full/Lite/Text 所需 legend、layout、HUD style **类型与默认值/CSS helpers** | Capture ignore、权限、托盘 | Demo 焦点/「点击后试玩」壳（若需要） |
| i18n 中 HUD 标签所需的最小子集（或由 host 注入 `t`/locale） | 完整 settings UI i18n | 营销文案（英/中均可，本期不定多语言站） |

## Data flow

### App（不变语义）

1. Rust hook → `cast://event` (`HudChip`)
2. Overlay 订阅 → `createHudSlots().ingest(chip)`（或现有等价 API）
3. `HudView` 读 slots 状态渲染

### Website（新）

1. Demo 容器聚焦时监听 DOM keyboard / pointer / wheel
2. 映射为 `HudChip`（key id 尽量对齐 App `KeyRef.id` 约定，如 `KeyS`、`MetaLeft`）
3. 同一 `createHudSlots` → `HudView`（`isFull=true`，关闭 place mode）

## Contracts

- **Chip 合同**：与 `design/index.md` / Rust 侧对齐的 `HudChip`；Web 适配器不得发明第二套 chip 形状。
- **共享包导出**：Svelte 组件 + TS 类型/纯函数；peer 依赖 `svelte`（与两端版本兼容）。
- **禁止**：共享包 import `@tauri-apps/*`；website 复制一份 KeyboardMap。

## Trade-offs

| 选择 | 取舍 |
|------|------|
| 整套 HudView 一次抽出 | 重构面大，避免后续三档切换再搬一次 |
| DOM → HudChip 而非直接改 held-set | 保证「只差事件源」；Web 上部分键码/浏览器快捷键可能不全，能力边界文案消化 |
| Parent 不直接写码 | 验收落在 children + 集成 AC |

## Compatibility / rollback

- Child ① 完成前 website 可不依赖新包；若抽包失败，App 可回退到抽出前的 `src/lib` 路径（git revert）。
- Child ② 失败不影响 App；官网可暂回下载壳。
- `website/publish/` 部署根与 updater 清单路径不变。

## Out of design scope

- 品牌视觉系统、三档切换 UI、全局 Web 捕获、生产托管。
