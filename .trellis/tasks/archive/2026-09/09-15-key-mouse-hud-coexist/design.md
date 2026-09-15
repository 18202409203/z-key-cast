# Design: key + mouse HUD coexist

## Boundary

- **In**: overlay 前端双槽状态机与布局；更新相关 spec / design 文案（「同时最多 1 条」→ 键鼠各最多 1 条）
- **Out**: Rust reducer / emit 形状；捕获开关；历史 N

## State model

```ts
type ActiveHud =
  | { kind: "chip"; chip: HudChip }
  | { kind: "message"; text: string };

// Replace single `active` with:
let keyHud: ActiveHud | null;   // only key chips (or null)
let mouseHud: ActiveHud | null; // only mouse chips (or null)
let statusHud: { text: string } | null; // exclusive banner
```

Practical simplification:

- `keySlot: HudChip & { kind:"key" } | null`
- `mouseSlot: HudChip & { kind:"mouse" } | null`
- `statusText: string | null`
- When `statusText !== null`, do not render key/mouse slots (slots may be cleared on show)

## Event routing

| Payload | Action |
|---------|--------|
| `HudChip` key | set `keySlot`, arm **key** idle timer; leave `mouseSlot` |
| `HudChip` mouse | set `mouseSlot`, arm **mouse** idle timer; leave `keySlot` |
| hook status fail | clear both slots + both timers; set `statusText`; arm **status** idle timer |
| key idle fire | `keySlot = null` only |
| mouse idle fire | `mouseSlot = null` only |
| status idle fire | `statusText = null` |

Shared `dwellMs` from `HudStyleSettings` for all three timers (independent countdowns).

## Layout

`.hud` remains `flex-direction: column; justify-content: flex-end; align-items: flex-end`.

Render order (bottom-aligned column, so first child is above):

1. If status → single text chip only
2. Else: keyboard visual (if `keySlot`) then mouse visual (if `mouseSlot`)

Each side picks renderer from existing mode flags (`keyboardDisplayMode` / `mouseDisplayMode`).

## Compatibility

- Log window still listens to same `EVENT_CHANNEL`; no change required for coexist (log is append-only)
- Window size: full-keyboard already enlarged overlay; dual stack may need no resize for text/schematic; verify keyboard+schematic still fits — if clipped, prefer documenting known limit over expanding window in this task unless trivial

## Spec touchpoints

- `.trellis/spec/tauri/cast-events.md` — overlay single-chip wording
- `design/index.md` — 「同时最多 1 条」条款

## Tradeoffs

| Option | Pros | Cons |
|--------|------|------|
| Dual frontend slots | No Rust change; matches emit model | Overlay state slightly richer |
| Merge key+mouse in Rust | Single payload | Couples unrelated events; harder timers |

Chosen: dual frontend slots.
