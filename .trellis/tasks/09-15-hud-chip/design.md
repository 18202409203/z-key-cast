# Design: HudChip contract + text HUD

## Boundaries

| In | Out |
|----|-----|
| Rust：raw → chip 状态机；精确 key id 映射 | 展示皮肤、设置面板大改 |
| 对外 `HudChip` serde + TS 守卫 | 对外 raw 双写 |
| overlay 单条 text + 1s idle fade | 历史 N 可配置 |
| main 日志改订 chip | Win/Linux 钩子 |

## Contracts

### `HudChip`（拟）

```ts
type KeyRef = { id: string; label: string };

type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef }
  | { kind: "mouse"; button: "left" | "right" | "middle" };
```

- `id`：跨平台逻辑名（如 `MetaLeft`, `ShiftRight`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`）
- `label`：text 模式短展示（左右 Meta 均可 `"⌘"`）
- Channel：沿用 `cast://event`，载荷从 `CastEvent` 切换为 `HudChip`（破坏性；hooks 已 archive，可接受）
- `cast://hook-status` 不变

### 状态机（Rust）

```
raw down/up
  → drop autorepeat / 既有刷屏过滤
  → if modifier-only down/up: 更新修饰状态，不 emit
  → if key down (non-mod): snapshot mods + key → emit HudChip::Key
  → if key up: no emit
  → if mouse down: emit HudChip::Mouse
  → if mouse up: no emit
```

内部可保留现有 `CastEvent` 形态作中间表示，或直接从 CGEvent 归一化到 `KeyRef`；**不 emit raw**。

### 前端

- overlay：`listen` → 校验 `HudChip` → 用 mods/key labels 拼 text（或 `formatHudLabel`）→ 替换唯一 chip → `setTimeout(1000)` 清除，每次新事件 `clearTimeout`+重设
- main 日志：同样守卫 + 一行摘要；hook-status 逻辑保留

## Data flow

```
CGEvent → normalize(id,label,phase)
       → ChipReducer
       → emit cast://event (HudChip)
            ├─ overlay (1 chip + fade)
            └─ main log
```

## Tradeoffs

| 选项 | 取舍 |
|------|------|
| 改 `cast://event` vs 新 channel | 改同 channel，避免双订阅残骸；文档标明破坏性 |
| fade 在 Rust vs 前端 | 前端：纯展示计时，不污染捕获层 |
| 扁平 keys[] vs mods+key | mods+key：全键盘/key card 更清晰 |

## Compatibility / rollout

- 一次切换 TS `cast.ts` + Rust emit + 两边 listen；无迁移期双写
- 更新 `design/index.md`、`.trellis/spec/tauri/cast-events.md`

## Rollback

- 回退 commit 即可恢复 raw `CastEvent`；无持久化设置依赖本任务
