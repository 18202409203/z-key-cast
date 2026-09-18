# Cast Events (Rust ↔ Overlay)

> Wire contract for global input capture → Tauri emit → Svelte listen.

---

## Scenario: platform input hooks emit HudChip

### 1. Scope / Trigger

- Trigger: Cross-layer payload (`HudChip` / `HookStatus` / ignore-capture `KeyRef`) crosses Rust emit and Svelte listen
- Owners:
  - Rust: `src-tauri/src/input/event.rs` (+ `chip.rs` / `macos.rs` / `windows.rs` / `stub.rs` / `filter.rs`) + `settings/` (`capture` / `ripple` / `store`: ignore list + arm + `mouseClickRipple` / ripple window)
  - TS: `src/lib/cast.ts` (types, channel constants, formatters, type guards); `$lib/settings.ts`; `$lib/key-ignore-presets.ts`; `$lib/key-legends.ts` (`displayLabelForKeyId`); `/ripple` listens to `cast://mouse-ripple` only
- Do **not** redefine the payload inline in route components

### 2. Signatures

```rust
// src-tauri/src/input/mod.rs
pub fn start(AppHandle);
// cfg: macos | windows | stub (non-macOS non-Windows)

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
export function formatHudLabel(chip: HudChip, legendLayout?: KeyboardLegendLayoutId, locale?: UiLocale): string;
```

### 3. Contracts

**`cast://event` → `HudChip`** (`key`/`mouse` include `phase`; `scroll` has no phase; emitter always sends precise down/up for keys/mouse)

| Variant | Fields | Notes |
|---------|--------|-------|
| `key` | `mods: KeyRef[]`, `key: KeyRef`, `phase: "down" \| "up"` | Bare modifiers and primary keys both emit; consumers filter |
| `mouse` | `mods: KeyRef[]`, `button: "left" \| "right" \| "middle"`, `phase: "down" \| "up"` | Button down **and** up; `mods` = held modifiers at reduce time |
| `scroll` | `mods: KeyRef[]`, `direction: "up" \| "down"` | Vertical only; coalesced bursts; **no** `phase`; `mods` = held modifiers |

`KeyRef = { id: string }` (**breaking** — no `label` on the wire)

- `id`: stable logical name (`MetaLeft`, `ShiftRight`, `KeyS`, `Digit1`, `Numpad1`, `Backspace`, `ForwardDelete`, …). Never OS-specific ids like `WinLeft`.
- Display: keys via `displayLabelForKeyId(id, legendLayout)`; mouse/scroll Text chips via mods label + line-art mouse/scroll icon beside `formatHudPointerBody` (`LMB`/`Scr↑` en · `左键`/`滚↑` zh; arrow keys stay `↑`/`↓`) — icon after mods, not before; full string still via `formatHudLabel` for Log
- Bare mod: `key` = that modifier; `mods` = other currently held modifiers (**exclude self**)
- Mouse/scroll: `mods` snapshots `ChipReducer` held-mods (⌃ ⌥ ⇧ ⌘ order; left/right ids)

**`cast://mouse-ripple` → `MouseRippleEvent`** (not part of `HudChip`; do not put coords on mouse chips)

| Field | Type | Notes |
|-------|------|-------|
| `x` | `number` | Logical/CSS px from **primary** monitor top-left |
| `y` | `number` | Same top-left space as `x` (CGEvent global; no Y flip) |
| `button` | `"left" \| "right" \| "middle"` | Mouse **down** only |

- Emit only when `mouseClickRipple` is on; **ignores** `captureMouse` / `allows_chip`
- Drop clicks whose CG location is outside the primary display bounds
- **macOS emit path only**; Windows does **not** emit ripple in the Windows hooks task (reuse channel later)
- Frontend: `$lib/cast` `isMouseRippleEvent`; route `/ripple` listens — do not redefine in other routes

**`cast://hook-status` → `HookStatus`**

| Field | Type | Notes |
|-------|------|-------|
| `ok` | `boolean` | Required |
| `reason` | `string?` | Omit when ok; examples: `accessibility_denied`, `tap_create_failed`, `keyboard_hook_failed`, `mouse_hook_failed`, `unsupported_platform` |

### 4. Validation & Error Matrix

| Condition | Behavior |
|-----------|----------|
| macOS, Accessibility denied | Emit `{ ok: false, reason: "accessibility_denied" }`; do not start tap; app stays up |
| macOS, tap create / runloop fails | Emit failed status with reason; log to stderr |
| Windows, `SetWindowsHookEx` fails | Emit `{ ok: false, reason: "keyboard_hook_failed" \| "mouse_hook_failed" }` |
| Non-macOS non-Windows | Stub emits `{ ok: false, reason: "unsupported_platform" }` |
| Key autorepeat | Drop before chip reduce (macOS autorepeat field; Windows held-primary set) |
| Same primary key-down within ~35ms | Drop in `EventFilter` |
| Modifier-only down/up | Update held-mod state **and** emit `HudChip::Key` with `phase` |
| Left/right same-mod FlagsChanged (shared flag bit, macOS) | Phase via `modifier_transition(flag_on, was_held)` so releasing one side while the other stays held clears only that `KeyRef` |
| Key / mouse up | Emit with `phase: "up"` (same shape as down) |
| `captureKeyboard == false` | After reduce, drop `HudChip::Key` before emit (held-mod state still updates) |
| `captureMouse == false` | After reduce, drop `HudChip::Mouse` **and** `HudChip::Scroll` before emit |
| Mouse `button` ∈ `ignoredMouseActions` | After reduce, drop that mouse chip before emit |
| `"scroll"` ∈ `ignoredMouseActions` | After reduce, drop `HudChip::Scroll` before emit |
| Primary `key.id` ∈ `ignoredKeyIds` | After reduce, drop whole key chip before emit |
| Mod `id` ∈ `ignoredKeyIds` | Strip that mod from `mods` (may leave empty `mods`); primary still emits |
| Ignore list + mouse | Key ignore list does not affect mouse/scroll; mouse ignore list does not affect keys |
| Ignore-key capture armed + key/mod **down** | Emit `cast://ignore-key-captured` (`KeyRef` id-only); suppress that raw’s `cast://event`; still `reduce` held mods; Escape adds Escape (does not cancel) |
| Ignore-key capture + mouse | Mouse still follows normal emit path; does not disarm |
| Frontend receives unknown payload | `isHudChip` / `isHookStatus` / `isIgnoreKeyCaptured` / `isMouseRippleEvent` reject; ignore |

### Capture settings commands

| Command | Args | Returns | Notes |
|---------|------|---------|-------|
| `get_hook_status` | — | `HookStatus \| null` | Last emitted hook status (null until first emit). Late subscribers / HMR use this after `listen(cast://hook-status)` |
| `get_capture_settings` | — | `CaptureSettings` | Reads process atomics + ignored-id list (loaded from `app_config_dir/settings.json` at setup) |
| `set_capture_settings` | `{ settings: CaptureSettings }` | `CaptureSettings` | Apply runtime **then** persist; dedupe `ignoredKeyIds` (preserve order, drop empties); sync ripple window show/hide; emit `cast://capture-settings` with saved payload; on disk failure revert and return `Err` |
| `arm_ignore_key_capture` | — | — | Arm next key/mod down for ignore list |
| `cancel_ignore_key_capture` | — | — | Disarm without changing the list |

```ts
type CaptureSettings = {
  captureKeyboard: boolean; // default true
  captureMouse: boolean; // default true; gates mouse **and** scroll chips
  mouseClickRipple: boolean; // default false; omit → false; independent of captureMouse
  hasNumpad: boolean; // default false; omit → false; UI board only — does not gate chips/ignore
  ignoredKeyIds: string[]; // default []; flat id list only (category presets are frontend sugar)
  ignoredMouseActions: ("left" | "right" | "middle" | "scroll")[]; // default []; drop matching mouse/scroll chips after reduce
};
```

**Legacy**: JSON with `captureScroll: false` migrates on load into `ignoredMouseActions` including `"scroll"` (field is not written back).

**`cast://capture-settings` → `CaptureSettings`** — emitted after successful `set_capture_settings` so Overlay Full `showNumpad` hot-updates (mirror `cast://hud-style`).
**`cast://ignore-key-captured` → `KeyRef`** — once per successful arm consume (`{ id }` only).

- Owners: Rust `src-tauri/src/settings/` (`capture` + `store`); TS `$lib/settings.ts` + `$lib/key-ignore-presets.ts` (category → id[])
- Hot path (macOS tap / Windows LL hooks, after `EventFilter`, after/around `ChipReducer::reduce`): ignore-capture consume → `filter_key_chip` (keys + ignored mouse/scroll) → `allows_chip` → `emit(EVENT_CHANNEL)`
- Forbidden: gating reduce on capture toggles or ignore list (would desync held mods); filtering only on the frontend; cancelling capture with Escape

### 5. Good / Base / Bad Cases

- **Good**: `{ "kind":"key","mods":[{"id":"MetaLeft"},{"id":"ShiftLeft"}],"key":{"id":"KeyS"},"phase":"down" }`
- **Base**: `{ "kind":"mouse","mods":[],"button":"left","phase":"down" }`
- **Base (scroll)**: `{ "kind":"scroll","mods":[{"id":"MetaLeft"}],"direction":"up" }`
- **Bad**: missing `phase` on key/mouse; missing `mods` on mouse/scroll; inventing `kind:"combo"`; shipping `label` as required; Win/Linux fake success without a real hook; `WinLeft` ids; overloading `mouse.phase` for scroll direction

### 6. Tests Required

- `cargo check` (+ Windows target when toolchain available) (+ `cargo test` for chip reducer + `settings::{allows_chip,filter_key_chip,ignore capture}` unit tests)
- `pnpm check` (guards + listeners + `$lib/settings` / `$lib/key-ignore-presets` typecheck)
- Manual: denied Accessibility → main log shows failed hook-status; grant → key + mouse HUD can show together; Text/Lite deferred bare mods (down silent; unconsumed up shows; companion consumes); Full board lights mods on down; Text/Lite queue idle-fades per item on `dwellMs`; Full pin ignores dwell; hold key → no repeat spam; toggle keyboard/mouse independently → only that side’s chips stop/resume without restart; ignore primary / strip ignored mod; category toggles; Add key (incl. Escape) + Cancel-only exit; capture press neither HUD nor log; hook-status fail → clears timeline/held sets and shows exclusive status banner; Log lists down and up (mouse/scroll include mods); **Windows live smoke deferred**

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
  showChip(formatHudLabel(event.payload, legendLayout));
});
```

---

## Design Decisions

### Platform boundary

- **Decision**: CGEventTap on macOS; `WH_KEYBOARD_LL` + `WH_MOUSE_LL` on Windows; `stub.rs` elsewhere (`unsupported_platform`)
- **Why**: Shared `RawInput` → filter → `ChipReducer` → `cast://event`; display stays in Svelte
- **Forbidden**: Shipping a no-op that reports `ok: true` on unsupported platforms; inventing `WinLeft` ids

### Chip reduce scope

- **Decision**: Emit precise down/up for primary keys, bare modifiers, and mouse; snapshot `held_mods` onto mouse/scroll; autorepeat / short debounce still drop before reduce
- **Consumers**: Text/Lite defer modifier downs; companion key/mouse/scroll enqueue with mods and mark those mod ids consumed; unconsumed modifier ups synthesize a display `key` chip (`phase: "down"`); consumed ups silent; shared operation timeline (`timelineMax`, default 5, clamp 1–10; fixed LTR right-enter — newest on right; same-direction scroll at tail refreshes dwell only when mods multiset matches). Full maintains held-sets + scroll pulse (may ignore mouse/scroll `mods`). Log records both phases and mods on mouse/scroll.
- **Out of scope**: AxN combo badges; Caps Lock as chord modifier

### Capture toggles (filter after reduce)

- **Decision**: Independent `captureKeyboard` / `captureMouse` atomics; filter with `allows_chip` only at emit. Mouse **and** Scroll chips require `captureMouse`. Category drops use `ignoredMouseActions` (`left`/`right`/`middle`/`scroll`) after reduce (same layer as key ignore).
- **Why**: Reducer must keep seeing raw downs so held-mod state stays correct while one side is off
- **Scroll**: vertical wheel coalesced (~64ms) before emit; horizontal dropped at normalize; ignore via `"scroll"` in `ignoredMouseActions` (legacy `captureScroll: false` migrates to that)
- **Forbidden**: Skipping `reduce` when a toggle is off; filtering only on the frontend (overlay would still show chips); reintroducing a peer `captureScroll` master toggle

### Mouse click ripple (separate layer)

- **Decision**: Peer toggle `mouseClickRipple` (omit → false); lazy primary-monitor fullscreen `ripple` webview; channel `cast://mouse-ripple` with `{ x, y, button }`
- **Why**: Keep HUD overlay at corner size; keep `HudChip` free of coordinates; allow rings while mouse HUD is off
- **Forbidden**: Extending `HudChip::Mouse` with coords; gating ripple on `captureMouse`; making the existing `overlay` window fullscreen for rings
- **Platform**: macOS emit only; Windows hooks intentionally do **not** emit ripple yet

### Ignore key list (filter after reduce)

- **Decision**: Flat persisted `ignoredKeyIds`; runtime `HashSet` lookup; `filter_key_chip` drops ignored primaries and strips ignored mods; category presets expand on the frontend only
- **Add-key capture**: Arm via command; next key/mod down emits `cast://ignore-key-captured` (`{ id }`) and suppresses that raw’s `cast://event`; Cancel disarms; Escape is data
- **Capture UI (frontend only)**: Two sections — **Keyboard** (listen keyboard → has numpad → ignore key categories + `KeyboardMap`) and **Mouse** (listen mouse → ignore L/M/R/Scroll → click ripple). When listen keyboard/mouse is off, grey out that section’s ignore controls (ripple stays independent of `captureMouse` and of the mouse ignore list). Shared `$lib/components/KeyboardMap.svelte` — Overlay is display-only (`activeIds` / `.key.active`); Capture uses `interactive` + muted `.key.ignored` click-toggle. `showNumpad` / `hasNumpad` hides the numpad column only. Main ignore path is board click; **Add key** discovers ids not in `layoutKeyIds(hasNumpad)`; under-board list shows only that off-board set difference. Do not reuse `.active` for ignore state. Rust contract unchanged.
- **Forbidden**: Skipping `reduce` while armed; using Escape to cancel; wiping non-category ids when a category is unchecked

### HUD style settings

- **Channel**: `cast://hud-style` → `HudStyleSettings` (`fontSizePx`, `textColor`, `backgroundColor`, `backgroundOpacity`, `dwellMs`, `timelineMax`, `hudPreset`)
- **Commands**: `get_hud_style_settings` / `set_hud_style_settings` (persist in same `settings.json` as capture; never wipe sibling fields)
- **`hudPreset`**: `"text"` | `"lite"` | `"full"` (default `"text"`). Replaces `keyboardDisplayMode` × `mouseDisplayMode` × `persistVisible`.
  | Preset | Surface | Pin | Highlight |
  |--------|---------|-----|-----------|
| `text` | operation timeline of text chips (key + mouse + scroll, length = `timelineMax`) | no | per-item `dwellMs`; deferred mod commit |
| `lite` | same timeline: KeyCard + compact MouseSchematic five frames (mods KeyCards precede mouse/scroll frame) | no | per-item `dwellMs`; deferred mod commit |
| `full` | keyboard map + MouseSchematic board | always | held-set from down/up; scroll pulse; ignore dwell; ignore mouse/scroll `mods` |
- **Migration**: if `hudPreset` absent, map legacy `keyboardDisplayMode` (`text`→text, `key-card`→lite, `keyboard`→full); else `"text"`. Strip legacy fields on next write. Legacy `timelineGrow` is ignored (removed; fixed LTR).
- **Overlay**: load on mount + `listen`; Text/Lite unified timeline (always LTR right-enter: newest on right; strip pack from content corner — left corner = origin/oldest at left, newest grows toward center; right corner = live edge at right; drop oldest when full or when `timelineMax` shrinks; scroll tail-refresh when direction **and** mods multiset match; deferred modifier chord commit via `consumedModIds`); Full held key-id / mouse-button sets + scroll pulse; status message is exclusive (clears timeline + held sets + consumed mods); defaults `dwellMs=1000`, `timelineMax=5`, `hudPreset="text"`
- **Settings UI**: ChoiceCardGroup Text·Lite·Full; **hide** dwell / `timelineMax` when Full; **hide** `keyMouseLayout` unless Full (value still persisted)
- **`MouseSchematic`**: `size` `"board"` \| `"timeline"`; board uses `activeButtons` + scroll pulse; timeline uses fixed `frame` (L/R/M/scroll-up/scroll-down)
- **Clamp**: font 10–48, dwell 200–5000, `timelineMax` 1–10 (omit → 5), opacity 0–1, colors `#rgb`/`#rrggbb`
- **`keyboardLegendLayout`**: `auto` (OS guess) | `mac-us` | `win-us` — dual-glyph legends from `$lib/key-legends.ts` (US ANSI `!`/`1` etc.); key-card + full keyboard + Text/Log consume the resolved layout. Prefer glyphs (`↵` enter, `⌫`/`⌦` delete pair, `⇥` tab, `⇧` shift); Caps is text `Caps` (avoid `⇪` vs `⇧` confusion at small size). `NumLock` → Clr/Num by layout. Meta → `⌘` (mac-us) / `Win` (win-us).

### HUD position settings

- **Persist**: `hudPosition` in `settings.json` as
  `{ mode: "corner", corner: "br"|"bl"|"tr"|"tl" }` **or** `{ mode: "custom", x, y }` (physical pixels)
- **Default**: `{ mode: "corner", corner: "br" }` when missing
- **Commands**: `get_hud_position_settings` / `set_hud_position_settings` (apply immediately); `start_hud_place_mode` / `end_hud_place_mode` (toggle overlay `ignore_cursor_events`; Done persists `custom` from `outer_position`)
- **Channel**: `cast://hud-position` → `HudPositionSettings` after successful `set_hud_position_settings` / `end_hud_place_mode` so overlay content-anchor hot-updates (mirror `cast://hud-style`); `cast://hud-place-mode` → `{ active: boolean }` for overlay drag chrome + `startDragging`
- **Content anchor**: corner mode → that corner; custom → fixed `"br"`; Text/Lite timeline enter/exit is always right-enter (strip horizontal pack follows content corner only)
- **Margins** (corner): ~24× / 48y CSS-px × monitor scale (same as prior hardcoded BR)
- **Exit safety**: closing Settings / app quit while placing calls `abandon_hud_place_mode` (restore click-through, clear flag, snap back to persisted position — no custom persist without Done)

### UI locale settings

- **Persist**: optional `uiLocale` in `settings.json` as `"en"` | `"zh"` (omit until first resolve)
- **Commands**: `get_ui_locale_settings` → `Option<"en"|"zh">`; `set_ui_locale_settings` → persist + emit
- **Channel**: `cast://ui-locale` → `{ locale: "en" | "zh" }` so overlay hot-updates status/place chrome
- **Boot**: if unset, frontend guesses from `navigator.language` (`zh*` → `zh`, else `en`) and persists once; user choice then sticks
- **Scope**: main Settings/Log/About + overlay status/place strings via `$lib/i18n` `t()`; do **not** translate `HudChip.id` or `summarizeHudChip` log lines; Capture failure copy is user-facing and platform-specific (`settings.captureFailedMac` / `captureFailedWin` / `captureFailedOther`); success/waiting hook status stays in the Log tab only (`summarizeHookStatus`)

### Mods encoding

- **Decision**: `KeyRef` is id-only; left/right `Meta*` / `Shift*` / …; HUD glyphs from legend/OS helpers
- **Keep aligned**: Rust `ChipReducer` held-mods ↔ TS `formatHudLabel(…, legendLayout)`
