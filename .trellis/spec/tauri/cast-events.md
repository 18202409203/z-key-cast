# Cast Events (Rust ↔ Overlay)

> Wire contract for global input capture → Tauri emit → Svelte listen.

---

## Scenario: macOS input hooks emit HudChip

### 1. Scope / Trigger

- Trigger: Cross-layer payload (`HudChip` / `HookStatus`) crosses Rust emit and Svelte listen
- Owners:
  - Rust: `src-tauri/src/input/event.rs` (+ `chip.rs` / `macos.rs` / `stub.rs` / `filter.rs`)
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
export function isHudChip(value: unknown): value is HudChip;
export function isHookStatus(value: unknown): value is HookStatus;
export function formatHudLabel(chip: HudChip): string;
```

### 3. Contracts

**`cast://event` → `HudChip`** (breaking vs older raw `CastEvent`; no `phase`)

| Variant | Fields | Notes |
|---------|--------|-------|
| `key` | `mods: KeyRef[]`, `key: KeyRef` | Emitted on primary key **down** only; bare modifiers do not emit |
| `mouse` | `button: "left" \| "right" \| "middle"` | Emitted on button **down** only |

`KeyRef = { id: string; label: string }`

- `id`: stable logical name (`MetaLeft`, `ShiftRight`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`, …)
- `label`: short text-HUD display (left/right Meta both `"⌘"`)

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
| Key autorepeat (`KEYBOARD_EVENT_AUTOREPEAT`) | Drop before chip reduce |
| Same primary key-down within ~35ms | Drop in `EventFilter` |
| Modifier-only down/up | Update held-mod state; **no** `HudChip` emit |
| Left/right same-mod FlagsChanged (shared flag bit) | Phase via `modifier_transition(flag_on, was_held)` so releasing one side while the other stays held clears only that `KeyRef` |
| Key / mouse up | No emit |
| `captureKeyboard == false` | After reduce, drop `HudChip::Key` before emit (held-mod state still updates) |
| `captureMouse == false` | After reduce, drop `HudChip::Mouse` before emit |
| Frontend receives unknown payload | `isHudChip` / `isHookStatus` reject; ignore |

### Capture settings commands

| Command | Args | Returns | Notes |
|---------|------|---------|-------|
| `get_capture_settings` | — | `CaptureSettings` | Reads process atomics (loaded from `app_config_dir/settings.json` at setup) |
| `set_capture_settings` | `{ settings: CaptureSettings }` | `CaptureSettings` | Apply atomics **then** persist; on disk failure revert atomics and return `Err` |

```ts
type CaptureSettings = { captureKeyboard: boolean; captureMouse: boolean }; // both default true
```

- Owners: Rust `src-tauri/src/settings.rs`; TS `$lib/settings.ts`
- Hot path: `settings::allows_chip(&chip)` in macOS tap **after** `ChipReducer::reduce`, **before** `emit(EVENT_CHANNEL)`
- Forbidden: gating reduce/filter on toggles (would desync held mods while a side is off)

### 5. Good / Base / Bad Cases

- **Good**: `{ "kind":"key","mods":[{"id":"MetaLeft","label":"⌘"},{"id":"ShiftLeft","label":"⇧"}],"key":{"id":"KeyS","label":"S"} }`
- **Base**: `{ "kind":"mouse","button":"left" }`
- **Bad**: payloads with `phase`; scroll/wheel; inventing `kind:"combo"`; emitting bare `MetaLeft` as a chip; Win/Linux fake success without a real hook

### 6. Tests Required

- `cargo check` (+ `cargo test -p z-key-cast` for chip reducer + `settings::allows_chip` unit tests)
- `pnpm check` (guards + listeners + `$lib/settings` typecheck)
- Manual: denied Accessibility → main log shows failed hook-status; grant → key + mouse HUD slots can show together (keyboard above mouse); bare mods silent; each side idle-fades on its own `dwellMs`; hold key → no repeat spam; toggle keyboard/mouse independently → only that side’s chips stop/resume without restart; hook-status fail → clears both slots and shows exclusive status banner

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
  if (!isHudChip(event.payload)) return;
  showChip(formatHudLabel(event.payload));
});
```

---

## Design Decisions

### Platform boundary

- **Decision**: CGEventTap on macOS only; `stub.rs` elsewhere
- **Why**: Permission model is clear; Windows Raw Input lands later without changing `HudChip`
- **Forbidden**: Shipping a no-op that reports `ok: true` on unsupported platforms

### Chip reduce scope

- **Decision**: Primary/mouse down → one chip; drop ups; bare mods update state only
- **Out of scope**: Multi-chip history, display skins

### Capture toggles (filter after reduce)

- **Decision**: Independent `captureKeyboard` / `captureMouse` atomics; filter with `allows_chip` only at emit
- **Why**: Reducer must keep seeing raw downs so held-mod state stays correct while one side is off
- **Forbidden**: Skipping `reduce` when a toggle is off; filtering only on the frontend (overlay would still show chips)

### HUD style settings

- **Channel**: `cast://hud-style` → `HudStyleSettings` (`fontSizePx`, `textColor`, `backgroundColor`, `backgroundOpacity`, `dwellMs`)
- **Commands**: `get_hud_style_settings` / `set_hud_style_settings` (persist in same `settings.json` as capture; never wipe sibling fields)
- **Overlay**: load on mount + `listen`; dual slots (`keySlot` / `mouseSlot`) with independent idle timers sharing `dwellMs`; status message is exclusive (clears both slots); defaults match MVP (`dwellMs=1000`)
- **Clamp**: font 10–48, dwell 200–5000, opacity 0–1, colors `#rgb`/`#rrggbb`
- **`keyboardDisplayMode`**: `text` | `key-card` | `keyboard`
- **`mouseDisplayMode`**: `text` | `schematic` (independent; schematic highlights L/M/R on `MouseSchematic`)
- **`keyboardLegendLayout`**: `auto` (OS guess) | `mac-us` | `win-us` — dual-glyph legends from `$lib/key-legends.ts` (US ANSI `!`/`1` etc.); key-card + full keyboard consume the resolved layout

### Mods encoding

- **Decision**: `KeyRef` with left/right `id` and HUD-friendly `label` symbols
- **Keep aligned**: Rust `ChipReducer` held-mods ↔ TS `formatHudLabel`
