# Cast Events (Rust ↔ Overlay)

> Wire contract for global input capture → Tauri emit → Svelte listen.

---

## Scenario: macOS input hooks emit CastEvent

### 1. Scope / Trigger

- Trigger: Cross-layer payload (`CastEvent` / `HookStatus`) crosses Rust emit and Svelte listen
- Owners:
  - Rust: `src-tauri/src/input/event.rs` (+ `macos.rs` / `stub.rs` / `filter.rs`)
  - TS: `src/lib/cast.ts` (types, channel constants, formatters, type guards)
- Do **not** redefine the payload inline in route components

### 2. Signatures

```rust
// src-tauri/src/input/mod.rs
pub fn start(app: AppHandle);

// Channels
pub const EVENT_CHANNEL: &str = "cast://event";
pub const HOOK_STATUS_CHANNEL: &str = "cast://hook-status";
```

```ts
// src/lib/cast.ts
export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";
export function isCastEvent(value: unknown): value is CastEvent;
export function isHookStatus(value: unknown): value is HookStatus;
```

### 3. Contracts

**`cast://event` → `CastEvent`**

| Variant | Fields | Notes |
|---------|--------|-------|
| `key` | `key: string`, `mods: string[]`, `phase: "down" \| "up"` | `mods` use macOS symbols `⌃ ⌥ ⇧ ⌘`; modifier itself may be `key` |
| `mouse` | `button: "left" \| "right" \| "middle"`, `phase: "down" \| "up"` | No scroll / wheel delta events |

**`cast://hook-status` → `HookStatus`**

| Field | Type | Notes |
|-------|------|-------|
| `ok` | `boolean` | Required |
| `reason` | `string?` | Omit when ok; examples: `accessibility_denied`, `tap_create_failed`, `unsupported_platform` |

### 4. Validation & Error Matrix

| Condition | Behavior |
|-----------|----------|
| macOS, Accessibility denied | Emit `{ ok: false, reason: "accessibility_denied" }`; do not start tap; app stays up |
| macOS, tap create / runloop fails | Emit failed status with reason; log to stderr |
| Non-macOS | Stub emits `{ ok: false, reason: "unsupported_platform" }` |
| Key autorepeat (`KEYBOARD_EVENT_AUTOREPEAT`) | Drop before emit |
| Same key-down within ~35ms | Drop in `EventFilter` |
| Frontend receives unknown payload | `isCastEvent` / `isHookStatus` reject; ignore |

### 5. Good / Base / Bad Cases

- **Good**: `{ "type":"key","key":"S","mods":["⌘"],"phase":"down" }`
- **Base**: `{ "type":"mouse","button":"left","phase":"up" }`
- **Bad**: scroll/wheel payloads; inventing `type:"combo"`; Win/Linux fake success without a real hook

### 6. Tests Required

- `cargo check` on macOS host
- `pnpm check` (guards + listeners typecheck)
- Manual: denied Accessibility → main log shows failed hook-status; grant → HUD chips for key/mouse; hold key → no repeat spam

### 7. Wrong vs Correct

#### Wrong

```ts
void listen(EVENT_CHANNEL, (event) => {
  const key = (event.payload as { key?: string }).key;
  // local cast — drifts from Rust contract
});
```

#### Correct

```ts
void listen(EVENT_CHANNEL, (event) => {
  if (!isCastEvent(event.payload)) return;
  pushChip(formatLabel(event.payload));
});
```

---

## Design Decisions

### Platform boundary

- **Decision**: CGEventTap on macOS only; `stub.rs` elsewhere
- **Why**: Permission model is clear; Windows Raw Input lands later without changing `CastEvent`
- **Forbidden**: Shipping a no-op that reports `ok: true` on unsupported platforms

### Filtering scope

- **Decision**: Drop autorepeat + short same-key debounce only
- **Out of scope**: Full combo merge into one HUD chip (follow-up task)

### Mods encoding

- **Decision**: macOS symbols (`⌘`, `⇧`, …) for HUD-friendly labels
- **Keep aligned**: Rust `modifier_symbols` ↔ TS `formatLabel`
