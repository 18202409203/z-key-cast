# Design: Scroll wheel HUD + mouse ignore (updated)

## Pivot (post-ship discussion)

- **Remove** `captureScroll` as a peer master toggle.
- **Keep** `captureMouse` as master for all pointer HUD chips (buttons + scroll).
- **Add** `ignoredMouseActions: ("left" | "right" | "middle" | "scroll")[]` — default `[]`.
- Capture UI: **Keyboard** section vs **Mouse** section.

Legacy: JSON with `captureScroll: false` → migrate into `ignoredMouseActions` including `"scroll"` once on load.

## Contract (unchanged scroll chip)

```ts
| { kind: "scroll"; direction: "up" | "down" }
```

## Gate / filter

1. `allows_chip`: Key → keyboard; Mouse|Scroll → `captureMouse` only.
2. After reduce: drop Mouse if `button` ∈ ignored; drop Scroll if `"scroll"` ∈ ignored.
3. Key ignore list unchanged.

## Capture panel layout

**Mouse** (first — short, stays in view): listen mouse → ignore L/M/R/Scroll → click ripple  
**Keyboard** (below — long board/list): listen keyboard → has numpad → ignore key categories + board  

When listen keyboard/mouse off, grey out that section’s ignore controls (still visible).

## HUD / coalesce / platforms

Unchanged from prior scroll design (vertical only, coalesce, tick pulse, Text ↑/↓).
