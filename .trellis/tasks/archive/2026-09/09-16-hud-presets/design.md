# Design: HUD presets Text · Lite · Full

## Boundaries

| Layer | Change |
|-------|--------|
| Rust `HudChip` / `ChipReducer` | Emit `phase`; emit bare-mod and mouse/key ups |
| Rust + TS `HudStyleSettings` | `hud_preset` / `hudPreset`; drop display modes + `persist_visible` |
| Overlay | Preset-derived surfaces; Full held-sets; Text/Lite down+dwell |
| `MouseSchematic` | Multi-button active set (not single `button \| null`) |
| Main Settings | Segmented preset; hide dwell on Full; i18n |
| Spec / design docs | Align `cast-events`, frontend type-safety, `design/index.md` chip sketch |

No new Tauri commands. Reuse `get_hud_style_settings` / `set_hud_style_settings` + `HUD_STYLE_CHANNEL`.

## Settings contract

```ts
type HudPreset = "text" | "lite" | "full";

type HudStyleSettings = {
  fontSizePx: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  dwellMs: number;
  hudPreset: HudPreset; // default "text"
  keyMouseLayout?: KeyMouseLayout; // unchanged
  keyboardLegendLayout?: KeyboardLegendLayout; // unchanged
};
```

Derived (not persisted):

| Preset | keyboard | mouse | pin |
|--------|----------|-------|-----|
| text | text | text | false |
| lite | key-card | schematic | false |
| full | keyboard | schematic | true |

## Event contract

```ts
type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef; phase: "down" | "up" }
  | { kind: "mouse"; button: "left" | "right" | "middle"; phase: "down" | "up" };
```

### ChipReducer (breaking vs today)

- Bare modifier down/up → emit `kind:"key"` with `key` = that modifier; `mods` = other currently held modifiers (exclude self or include — pick one and keep consistent; recommend **exclude self** so `key` is the actor).
- Primary key down/up → emit with current held mods snapshot (on up, mods = still-held after removing the key if it was tracked as mod — primary non-mod: mods unchanged set).
- Mouse down/up → emit with `phase`.
- Autorepeat: keep existing down-dedupe behavior; do not spam identical downs.

Breaking: any subscriber assuming no `phase` / down-only must be updated (overlay, main log, tests, specs).

### Consumer rules

| Consumer | Rule |
|----------|------|
| Overlay Text/Lite | Ignore `phase:"up"`. Ignore key chips whose `key` is a modifier id (bare mod). Replace slot on down; arm `dwellMs` hide. |
| Overlay Full | Maintain `Set` of held key ids and `Set` of held mouse buttons from down/up. Drive `KeyboardMap.activeIds` and multi-button schematic. No dwell clear for highlights. Surfaces always mounted (pin). |
| Main Log | Append down and up (label phase). |

## Overlay Full held-set

Do **not** invent a second highlight store parallel forever: held sets *are* the Full highlight source. Text/Lite may keep `keySlot` / `mouseSlot` as today.

On preset switch away from Full: clear held sets. On switch to Full: start empty (missed physical holds OK).

Status exclusive: unchanged — status branch hides km group including Full pins.

## MouseSchematic

Change API from `button: MouseButton | null` to e.g. `activeButtons: Iterable<MouseButton>` or `left/middle/right: boolean`. Resting body still HUD background; each pressed zone fills `textColor`.

Lite continues to pass at most one active button from the last mouse down until dwell clear (single-slot behavior).

## Settings UI

- Replace dual `<select>` + persist checkbox with one radio/segmented group bound to `hudPreset`.
- Conditionally omit dwell field when `hudPreset === "full"`.
- Hints: Text = minimal; Lite = keycaps + mouse diagram; Full = always-on board, follows hold/release.

## Compatibility / migration

User waived migration quality. Implement minimal read path:

1. If `hudPreset` present and valid → use it.
2. Else if legacy `keyboardDisplayMode` present → map keyboard-primary (`text`→text, `key-card`→lite, `keyboard`→full).
3. Else → `text`.

Strip unknown legacy fields on next write.

## Trade-offs

- Always-emit up increases event volume; Log will be noisier by design (user chose precision).
- Full ignores dwell → hide control to avoid false affordance.
- One delivery couples settings redesign to input contract; avoids shipping a lying Full mode.

## Rollout / rollback

- Feature is settings + overlay + reducer; rollback = revert commit / restore previous settings shape in code.
- No feature flag required for MVP of this task.
