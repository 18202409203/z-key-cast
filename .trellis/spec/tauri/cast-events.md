# Cast Events (Rust ↔ Overlay)

> Wire contract for global input capture → Tauri emit → Svelte listen.

---

## Scenario: macOS input hooks emit HudChip

### 1. Scope / Trigger

- Trigger: Cross-layer payload (`HudChip` / `HookStatus` / ignore-capture `KeyRef`) crosses Rust emit and Svelte listen
- Owners:
  - Rust: `src-tauri/src/input/event.rs` (+ `chip.rs` / `macos.rs` / `stub.rs` / `filter.rs`) + `settings.rs` (ignore list + arm)
  - TS: `src/lib/cast.ts` (types, channel constants, formatters, type guards); `$lib/settings.ts`; `$lib/key-ignore-presets.ts`
- Do **not** redefine the payload inline in route components

### 2. Signatures

```rust
// src-tauri/src/input/mod.rs
pub fn start(app: AppHandle);

// Channels
pub const EVENT_CHANNEL: &str = "cast://event";
pub const HOOK_STATUS_CHANNEL: &str = "cast://hook-status";
pub const IGNORE_KEY_CAPTURED_CHANNEL: &str = "cast://ignore-key-captured";
```

```ts
// src/lib/cast.ts
export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";
export const IGNORE_KEY_CAPTURED_CHANNEL = "cast://ignore-key-captured";
export function isHudChip(value: unknown): value is HudChip;
export function isHookStatus(value: unknown): value is HookStatus;
export function isIgnoreKeyCaptured(value: unknown): value is KeyRef;
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
| Primary `key.id` ∈ `ignoredKeyIds` | After reduce, drop whole key chip before emit |
| Mod `id` ∈ `ignoredKeyIds` | Strip that mod from `mods` (may leave empty `mods`); primary still emits |
| Ignore list + mouse | Mouse chips ignore `ignoredKeyIds` |
| Ignore-key capture armed + key/mod **down** | Emit `cast://ignore-key-captured` (`KeyRef`); suppress that raw’s `cast://event`; still `reduce` held mods; Escape adds Escape (does not cancel) |
| Ignore-key capture + mouse | Mouse still follows normal emit path; does not disarm |
| Frontend receives unknown payload | `isHudChip` / `isHookStatus` / `isIgnoreKeyCaptured` reject; ignore |

### Capture settings commands

| Command | Args | Returns | Notes |
|---------|------|---------|-------|
| `get_capture_settings` | — | `CaptureSettings` | Reads process atomics + ignored-id list (loaded from `app_config_dir/settings.json` at setup) |
| `set_capture_settings` | `{ settings: CaptureSettings }` | `CaptureSettings` | Apply runtime **then** persist; dedupe `ignoredKeyIds` (preserve order, drop empties); on disk failure revert and return `Err` |
| `arm_ignore_key_capture` | — | — | Arm next key/mod down for ignore list |
| `cancel_ignore_key_capture` | — | — | Disarm without changing the list |

```ts
type CaptureSettings = {
  captureKeyboard: boolean; // default true
  captureMouse: boolean; // default true
  ignoredKeyIds: string[]; // default []; flat id list only (category presets are frontend sugar)
};
```

**`cast://ignore-key-captured` → `KeyRef`** — once per successful arm consume.

- Owners: Rust `src-tauri/src/settings.rs`; TS `$lib/settings.ts` + `$lib/key-ignore-presets.ts` (category → id[])
- Hot path (macOS tap, after `EventFilter`, after/around `ChipReducer::reduce`): ignore-capture consume → `filter_key_chip` → `allows_chip` → `emit(EVENT_CHANNEL)`
- Forbidden: gating reduce on capture toggles or ignore list (would desync held mods); filtering only on the frontend; cancelling capture with Escape

### 5. Good / Base / Bad Cases

- **Good**: `{ "kind":"key","mods":[{"id":"MetaLeft","label":"⌘"},{"id":"ShiftLeft","label":"⇧"}],"key":{"id":"KeyS","label":"S"} }`
- **Base**: `{ "kind":"mouse","button":"left" }`
- **Bad**: payloads with `phase`; scroll/wheel; inventing `kind:"combo"`; emitting bare `MetaLeft` as a chip; Win/Linux fake success without a real hook

### 6. Tests Required

- `cargo check` (+ `cargo test` for chip reducer + `settings::{allows_chip,filter_key_chip,ignore capture}` unit tests)
- `npm run check` (guards + listeners + `$lib/settings` / `$lib/key-ignore-presets` typecheck)
- Manual: denied Accessibility → main log shows failed hook-status; grant → key + mouse HUD slots can show together (keyboard above mouse); bare mods silent; each side idle-fades on its own `dwellMs`; hold key → no repeat spam; toggle keyboard/mouse independently → only that side’s chips stop/resume without restart; ignore primary / strip ignored mod; category toggles; Add key (incl. Escape) + Cancel-only exit; capture press neither HUD nor log; hook-status fail → clears both slots and shows exclusive status banner

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

### Ignore key list (filter after reduce)

- **Decision**: Flat persisted `ignoredKeyIds`; runtime `HashSet` lookup; `filter_key_chip` drops ignored primaries and strips ignored mods; category presets expand on the frontend only
- **Add-key capture**: Arm via command; next key/mod down emits `cast://ignore-key-captured` and suppresses that raw’s `cast://event`; Cancel disarms; Escape is data
- **Capture UI (frontend only)**: Shared `$lib/KeyboardMap.svelte` — Overlay is display-only (`activeIds` / `.key.active`); Capture uses `interactive` + muted `.key.ignored` click-toggle. Main ignore path is board click; **Add key** discovers ids not in `LAYOUT_KEY_IDS`; under-board list shows only that off-board set difference. Do not reuse `.active` for ignore state. Rust contract unchanged.
- **Forbidden**: Skipping `reduce` while armed; using Escape to cancel; wiping non-category ids when a category is unchecked

### HUD style settings

- **Channel**: `cast://hud-style` → `HudStyleSettings` (`fontSizePx`, `textColor`, `backgroundColor`, `backgroundOpacity`, `dwellMs`, `persistVisible`)
- **Commands**: `get_hud_style_settings` / `set_hud_style_settings` (persist in same `settings.json` as capture; never wipe sibling fields)
- **Overlay**: load on mount + `listen`; dual slots (`keySlot` / `mouseSlot`) with independent idle timers sharing `dwellMs`; status message is exclusive (clears both slots); defaults match MVP (`dwellMs=1000`, `persistVisible=false`)
- **`persistVisible`**: omit → `false`. Pins full-keyboard / mouse-schematic **surfaces** (empty board/mouse can show); idle still clears slots so highlights follow `dwellMs`. Text / key-card skip hide timers (last chip stays). Status still exclusive (covers pins while shown).
- **`persistVisible` pin vs slot**: `pinKey = persist && keyboardDisplayMode==="keyboard"`; `pinMouse = persist && mouseDisplayMode==="schematic"`. Idle timeout sets `keySlot`/`mouseSlot` to `null` (unhighlight) but does not unmount a pin. `MouseSchematic.button` is optional (`null` = unpressed).
- **`persistVisible` follow-on**: later persist up/down must keep writing slots — do **not** fork a second highlight store. This task does not emit key/mouse up (`HudChip` still down-only).
- **`persistVisible` tests**: omit JSON → `false`; clamp must not reset `true` → `false`; serialize/parse roundtrip keeps sibling capture/position/locale fields.
- **Wrong**: persist hides the schematic after dwell, or persist keeps last key highlighted forever on the full keyboard. **Correct**: board/mouse stay; highlights follow `dwellMs`.
- **Clamp**: font 10–48, dwell 200–5000, opacity 0–1, colors `#rgb`/`#rrggbb`
- **`keyboardDisplayMode`**: `text` | `key-card` | `keyboard`
- **`mouseDisplayMode`**: `text` | `schematic` (independent; schematic is a cropped pebble mouse-head with no palm stub; resting body uses HUD background like keycaps; pressed L/M/R uses HUD `textColor` solid fill on `MouseSchematic`, not stroke-only highlight)
- **`keyboardLegendLayout`**: `auto` (OS guess) | `mac-us` | `win-us` — dual-glyph legends from `$lib/key-legends.ts` (US ANSI `!`/`1` etc.); key-card + full keyboard consume the resolved layout

### HUD position settings

- **Persist**: `hudPosition` in `settings.json` as
  `{ mode: "corner", corner: "br"|"bl"|"tr"|"tl" }` **or** `{ mode: "custom", x, y }` (physical pixels)
- **Default**: `{ mode: "corner", corner: "br" }` when missing
- **Commands**: `get_hud_position_settings` / `set_hud_position_settings` (apply immediately); `start_hud_place_mode` / `end_hud_place_mode` (toggle overlay `ignore_cursor_events`; Done persists `custom` from `outer_position`)
- **Channel**: `cast://hud-place-mode` → `{ active: boolean }` for overlay drag chrome + `startDragging`
- **Margins** (corner): ~24× / 48y CSS-px × monitor scale (same as prior hardcoded BR)
- **Exit safety**: closing Settings / app quit while placing calls `abandon_hud_place_mode` (restore click-through, clear flag, snap back to persisted position — no custom persist without Done)

### UI locale settings

- **Persist**: optional `uiLocale` in `settings.json` as `"en"` | `"zh"` (omit until first resolve)
- **Commands**: `get_ui_locale_settings` → `Option<"en"|"zh">`; `set_ui_locale_settings` → persist + emit
- **Channel**: `cast://ui-locale` → `{ locale: "en" | "zh" }` so overlay hot-updates status/place chrome
- **Boot**: if unset, frontend guesses from `navigator.language` (`zh*` → `zh`, else `en`) and persists once; user choice then sticks
- **Scope**: main Settings/Log/About + overlay status/place strings via `$lib/i18n` `t()`; do **not** translate `HudChip.id` / `label` or `summarizeHudChip` log lines

### Mods encoding

- **Decision**: `KeyRef` with left/right `id` and HUD-friendly `label` symbols
- **Keep aligned**: Rust `ChipReducer` held-mods ↔ TS `formatHudLabel`
