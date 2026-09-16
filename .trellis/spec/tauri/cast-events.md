# Cast Events (Rust ↔ Overlay)

> Wire contract for global input capture → Tauri emit → Svelte listen.

---

## Scenario: macOS input hooks emit HudChip

### 1. Scope / Trigger

- Trigger: Cross-layer payload (`HudChip` / `HookStatus` / ignore-capture `KeyRef`) crosses Rust emit and Svelte listen
- Owners:
  - Rust: `src-tauri/src/input/event.rs` (+ `chip.rs` / `macos.rs` / `stub.rs` / `filter.rs`) + `settings.rs` (ignore list + arm + `mouseClickRipple` / ripple window)
  - TS: `src/lib/cast.ts` (types, channel constants, formatters, type guards); `$lib/settings.ts`; `$lib/key-ignore-presets.ts`; `/ripple` listens to `cast://mouse-ripple` only
- Do **not** redefine the payload inline in route components

### 2. Signatures

```rust
// src-tauri/src/input/mod.rs
pub fn start(app: AppHandle);

// Channels
pub const EVENT_CHANNEL: &str = "cast://event";
pub const HOOK_STATUS_CHANNEL: &str = "cast://hook-status";
pub const IGNORE_KEY_CAPTURED_CHANNEL: &str = "cast://ignore-key-captured";
pub const MOUSE_RIPPLE_CHANNEL: &str = "cast://mouse-ripple";
```

```ts
// src/lib/cast.ts
export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";
export const IGNORE_KEY_CAPTURED_CHANNEL = "cast://ignore-key-captured";
export const MOUSE_RIPPLE_CHANNEL = "cast://mouse-ripple";
export function isHudChip(value: unknown): value is HudChip;
export function isHookStatus(value: unknown): value is HookStatus;
export function isIgnoreKeyCaptured(value: unknown): value is KeyRef;
export function isMouseRippleEvent(value: unknown): value is MouseRippleEvent;
export function formatHudLabel(chip: HudChip): string;
```

### 3. Contracts

**`cast://event` → `HudChip`** (includes `phase`; emitter always sends precise down/up)

| Variant | Fields | Notes |
|---------|--------|-------|
| `key` | `mods: KeyRef[]`, `key: KeyRef`, `phase: "down" \| "up"` | Bare modifiers and primary keys both emit; consumers filter |
| `mouse` | `button: "left" \| "right" \| "middle"`, `phase: "down" \| "up"` | Button down **and** up |

`KeyRef = { id: string; label: string }`

- `id`: stable logical name (`MetaLeft`, `ShiftRight`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`, …)
- `label`: short text-HUD display (left/right Meta both `"⌘"`)
- Bare mod: `key` = that modifier; `mods` = other currently held modifiers (**exclude self**)

**`cast://mouse-ripple` → `MouseRippleEvent`** (not part of `HudChip`; do not put coords on mouse chips)

| Field | Type | Notes |
|-------|------|-------|
| `x` | `number` | Logical/CSS px from **primary** monitor top-left |
| `y` | `number` | Same top-left space as `x` (CGEvent global; no Y flip) |
| `button` | `"left" \| "right" \| "middle"` | Mouse **down** only |

- Emit only when `mouseClickRipple` is on; **ignores** `captureMouse` / `allows_chip`
- Drop clicks whose CG location is outside the primary display bounds
- macOS emit path only for now; Windows/Linux follow-up reuses the same channel
- Frontend: `$lib/cast` `isMouseRippleEvent`; route `/ripple` listens — do not redefine in other routes

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
| Modifier-only down/up | Update held-mod state **and** emit `HudChip::Key` with `phase` |
| Left/right same-mod FlagsChanged (shared flag bit) | Phase via `modifier_transition(flag_on, was_held)` so releasing one side while the other stays held clears only that `KeyRef` |
| Key / mouse up | Emit with `phase: "up"` (same shape as down) |
| `captureKeyboard == false` | After reduce, drop `HudChip::Key` before emit (held-mod state still updates) |
| `captureMouse == false` | After reduce, drop `HudChip::Mouse` before emit |
| Primary `key.id` ∈ `ignoredKeyIds` | After reduce, drop whole key chip before emit |
| Mod `id` ∈ `ignoredKeyIds` | Strip that mod from `mods` (may leave empty `mods`); primary still emits |
| Ignore list + mouse | Mouse chips ignore `ignoredKeyIds` |
| Ignore-key capture armed + key/mod **down** | Emit `cast://ignore-key-captured` (`KeyRef`); suppress that raw’s `cast://event`; still `reduce` held mods; Escape adds Escape (does not cancel) |
| Ignore-key capture + mouse | Mouse still follows normal emit path; does not disarm |
| Frontend receives unknown payload | `isHudChip` / `isHookStatus` / `isIgnoreKeyCaptured` / `isMouseRippleEvent` reject; ignore |

### Capture settings commands

| Command | Args | Returns | Notes |
|---------|------|---------|-------|
| `get_capture_settings` | — | `CaptureSettings` | Reads process atomics + ignored-id list (loaded from `app_config_dir/settings.json` at setup) |
| `set_capture_settings` | `{ settings: CaptureSettings }` | `CaptureSettings` | Apply runtime **then** persist; dedupe `ignoredKeyIds` (preserve order, drop empties); sync ripple window show/hide; on disk failure revert and return `Err` |
| `arm_ignore_key_capture` | — | — | Arm next key/mod down for ignore list |
| `cancel_ignore_key_capture` | — | — | Disarm without changing the list |

```ts
type CaptureSettings = {
  captureKeyboard: boolean; // default true
  captureMouse: boolean; // default true
  mouseClickRipple: boolean; // default false; omit → false; independent of captureMouse
  ignoredKeyIds: string[]; // default []; flat id list only (category presets are frontend sugar)
};
```

**`cast://ignore-key-captured` → `KeyRef`** — once per successful arm consume.

- Owners: Rust `src-tauri/src/settings.rs`; TS `$lib/settings.ts` + `$lib/key-ignore-presets.ts` (category → id[])
- Hot path (macOS tap, after `EventFilter`, after/around `ChipReducer::reduce`): ignore-capture consume → `filter_key_chip` → `allows_chip` → `emit(EVENT_CHANNEL)`
- Forbidden: gating reduce on capture toggles or ignore list (would desync held mods); filtering only on the frontend; cancelling capture with Escape

### 5. Good / Base / Bad Cases

- **Good**: `{ "kind":"key","mods":[{"id":"MetaLeft","label":"⌘"},{"id":"ShiftLeft","label":"⇧"}],"key":{"id":"KeyS","label":"S"},"phase":"down" }`
- **Base**: `{ "kind":"mouse","button":"left","phase":"down" }`
- **Bad**: missing `phase`; scroll/wheel; inventing `kind:"combo"`; Win/Linux fake success without a real hook

### 6. Tests Required

- `cargo check` (+ `cargo test` for chip reducer + `settings::{allows_chip,filter_key_chip,ignore capture}` unit tests)
- `npm run check` (guards + listeners + `$lib/settings` / `$lib/key-ignore-presets` typecheck)
- Manual: denied Accessibility → main log shows failed hook-status; grant → key + mouse HUD slots can show together; bare mods silent on Text/Lite bar but light Full board; each Text/Lite side idle-fades on its own `dwellMs`; Full pin ignores dwell; hold key → no repeat spam; toggle keyboard/mouse independently → only that side’s chips stop/resume without restart; ignore primary / strip ignored mod; category toggles; Add key (incl. Escape) + Cancel-only exit; capture press neither HUD nor log; hook-status fail → clears both slots and shows exclusive status banner; Log lists down and up

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

- **Decision**: Emit precise down/up for primary keys, bare modifiers, and mouse; autorepeat / short debounce still drop before reduce
- **Consumers**: Text/Lite ignore `up` and bare-mod-only downs for the bar; Full maintains held-sets; Log records both phases
- **Out of scope**: Multi-chip history, display skins beyond presets

### Capture toggles (filter after reduce)

- **Decision**: Independent `captureKeyboard` / `captureMouse` atomics; filter with `allows_chip` only at emit
- **Why**: Reducer must keep seeing raw downs so held-mod state stays correct while one side is off
- **Forbidden**: Skipping `reduce` when a toggle is off; filtering only on the frontend (overlay would still show chips)

### Mouse click ripple (separate layer)

- **Decision**: Peer toggle `mouseClickRipple` (omit → false); lazy primary-monitor fullscreen `ripple` webview; channel `cast://mouse-ripple` with `{ x, y, button }`
- **Why**: Keep HUD overlay at corner size; keep `HudChip` free of coordinates; allow rings while mouse HUD is off
- **Forbidden**: Extending `HudChip::Mouse` with coords; gating ripple on `captureMouse`; making the existing `overlay` window fullscreen for rings
- **Platform**: macOS emit only in this task; non-macOS stub unchanged (toggle may persist but no rings)

### Ignore key list (filter after reduce)

- **Decision**: Flat persisted `ignoredKeyIds`; runtime `HashSet` lookup; `filter_key_chip` drops ignored primaries and strips ignored mods; category presets expand on the frontend only
- **Add-key capture**: Arm via command; next key/mod down emits `cast://ignore-key-captured` and suppresses that raw’s `cast://event`; Cancel disarms; Escape is data
- **Capture UI (frontend only)**: Shared `$lib/KeyboardMap.svelte` — Overlay is display-only (`activeIds` / `.key.active`); Capture uses `interactive` + muted `.key.ignored` click-toggle. Main ignore path is board click; **Add key** discovers ids not in `LAYOUT_KEY_IDS`; under-board list shows only that off-board set difference. Do not reuse `.active` for ignore state. Rust contract unchanged.
- **Forbidden**: Skipping `reduce` while armed; using Escape to cancel; wiping non-category ids when a category is unchecked

### HUD style settings

- **Channel**: `cast://hud-style` → `HudStyleSettings` (`fontSizePx`, `textColor`, `backgroundColor`, `backgroundOpacity`, `dwellMs`, `hudPreset`)
- **Commands**: `get_hud_style_settings` / `set_hud_style_settings` (persist in same `settings.json` as capture; never wipe sibling fields)
- **`hudPreset`**: `"text"` | `"lite"` | `"full"` (default `"text"`). Replaces `keyboardDisplayMode` × `mouseDisplayMode` × `persistVisible`.
  | Preset | Keyboard | Mouse | Pin | Highlight |
  |--------|----------|-------|-----|-----------|
  | `text` | text chip | text chip | no | last down + `dwellMs` |
  | `lite` | key-card | schematic | no | last down + `dwellMs` |
  | `full` | keyboard map | schematic | always | held-set from down/up; ignore dwell |
- **Migration**: if `hudPreset` absent, map legacy `keyboardDisplayMode` (`text`→text, `key-card`→lite, `keyboard`→full); else `"text"`. Strip legacy fields on next write.
- **Overlay**: load on mount + `listen`; Text/Lite dual slots with independent idle timers sharing `dwellMs`; Full held key-id / mouse-button sets; status message is exclusive (clears slots + held sets); defaults `dwellMs=1000`, `hudPreset="text"`
- **Settings UI**: one segmented Text·Lite·Full; **hide** dwell when Full
- **`MouseSchematic`**: `activeButtons` iterable (multi-button for Full; Lite usually 0–1)
- **Clamp**: font 10–48, dwell 200–5000, opacity 0–1, colors `#rgb`/`#rrggbb`
- **`keyboardLegendLayout`**: `auto` (OS guess) | `mac-us` | `win-us` — dual-glyph legends from `$lib/key-legends.ts` (US ANSI `!`/`1` etc.); key-card + full keyboard consume the resolved layout. Prefer glyphs (`↵` enter, `⌫`/`⌦` delete pair, `⇥` tab, `⇧` shift); Caps is text `Caps` (avoid `⇪` vs `⇧` confusion at small size). `NumLock` → Clr/Num by layout.

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
