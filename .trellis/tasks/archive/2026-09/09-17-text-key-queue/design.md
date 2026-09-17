# Design: Text / Lite operation timeline

## Boundaries

| Layer | Change |
|-------|--------|
| Overlay slots (`hud-slots.svelte.ts`) | Replace Text/Lite dual `keySlot`/`mouseSlot` with one `timeline: TimelineItem[]` (max 5); per-item timers; scroll tail-refresh |
| Overlay view (`HudView.svelte`) | Text/Lite render horizontal timeline; Lite maps key→KeyCard, mouse/scroll→compact schematic frames; Full path unchanged |
| `MouseSchematic` | Add compact/timeline sizing + single-state frame mode for queue chips; keep board mode for Full |
| Settings UI (`HudPanel`) | Show `keyMouseLayout` only when `hudPreset === "full"`; update preset hints / schematic cards for Lite |
| i18n | Hint copy: Text = text sequence; Lite = styled sequence (KeyCard + mouse/wheel glyphs) |
| Rust / `HudChip` | **No contract change** |

## Data model (overlay)

```ts
type TimelineItem = {
  id: string; // stable for keyed each + timers
  chip: Extract<HudChip, { kind: "key" | "mouse" | "scroll" }>;
};
// queue length ≤ 5; oldest at left (index 0), newest at right
```

## Flow

1. `showChip` on Text/Lite (non-Full):
   - ignore `phase === "up"`; ignore bare-mod key downs
   - clear status; if status was showing, end exclusivity as today
   - if `scroll` and tail is same-direction `scroll` → reset that item’s dwell timer only
   - else push item; if length > 5, drop index 0 and clear its timer
   - arm per-item `dwellMs` timeout → remove item by `id`
2. status path: clear all timeline items + timers; show status; arm status dwell
3. preset → Full: clear timeline; resume held-set path. Full → Text/Lite: clear held-sets; start empty timeline
4. Full scroll: keep existing `armScrollPulse` (orthogonal). Text/Lite scroll: timeline only (no pulse)

## Lite mouse/wheel frames

Reuse **existing `MouseSchematic` visual language** (same SVG shell / seam / wheel well), not abstract icons.

| Timeline chip | Fixed frame |
|---------------|-------------|
| `mouse` left | soft tint on left + **L** mark (not solid fg/bg half) |
| `mouse` right | soft tint on right + **R** mark |
| `mouse` middle | wheel/middle lit only |
| `scroll` down | wheel-tick **down** pulse pose (static or one-shot; no continuous Full pulse loop required) |
| `scroll` up | wheel-tick **up** pose |

Constraints:
- **Scale** down so chip height matches KeyCard row (drive from shared `fontSizePx` / explicit mini scale).
- **Theme / HUD colors**: same props as today — `textColor` + `backgroundCss` → `--m-fg` / `--m-bg` (identical to KeyCard’s `--cap-fg` / `--cap-bg` source). Do not hard-code light/dark greys.
- Prefer extracting a `size: "timeline" | "board"` (or `compact`) mode on `MouseSchematic`, or a thin wrapper that sets one of the five frames — avoid forking a second mouse SVG.
- Timeline **scroll-up / scroll-down** frames use a **filled arrow on the wheel** (not tick offset) so direction stays readable at KeyCard scale; Full board keeps tick pulse.
- Lite timeline **does not** mount a persistent multi-button board; each queue item is one of these five frames.

## Settings / docs

- Persist `keyMouseLayout` always; UI gate = Full only.
- `design/03.md` + preset cards: Lite no longer “keycaps + mouse diagram”.

## Trade-offs

- Unified timeline vs dual slots: matches Text/Lite product story; breaks old “key doesn’t reset mouse dwell” — acceptable under new model (one sequence).
- Scroll tail-refresh vs always-push: needed given ~64ms coalesce still allowing multi-emit bursts.
- Drop MouseSchematic on Lite: avoids dual-channel; Full keeps simulation.

## Rollback

Revert overlay to dual slots; restore Lite schematic+pulse wiring; re-show layout for all presets; restore i18n hints.
