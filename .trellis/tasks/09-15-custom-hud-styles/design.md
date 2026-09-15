# Design: Custom HUD styles and dwell time

## Approach

Extend durable `settings.json` beyond capture toggles into a single `AppSettings` document:

```ts
type HudStyleSettings = {
  fontSizePx: number;      // default 15
  textColor: string;       // default #f8fafc
  backgroundColor: string; // default #0f172a
  backgroundOpacity: number; // 0–1, default ~0.82
  dwellMs: number;         // default 1000
};

type AppSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  hud: HudStyleSettings;
};
```

## Hot update

- Rust: `get_hud_style_settings` / `set_hud_style_settings` (or unified get/set app settings).
- On set: persist + `emit("cast://hud-style", settings)` so overlay updates without restart.
- Overlay: load on mount + listen for style channel; apply CSS vars on `.chip`; use `dwellMs` for idle timer.
- Capture save must **preserve** hud fields (and vice versa) when rewriting JSON.

## UI

- Settings TAB: section “HUD appearance” with number/color/range inputs; sensible clamps (font 10–48, dwell 200–5000, opacity 0–1).

## Out

- Corner position, drag, skins.
