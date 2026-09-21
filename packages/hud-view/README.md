# z-key-cast-hud-view

English | [简体中文](./README.zh-CN.md)

Shared **HUD view layer** for z-key-cast: Text / Lite / Full presentation, key/mouse primitives, and slot state. Used by the Tauri app overlay and the website live demo.

**No `@tauri-apps/*` dependency.** Hosts differ only in how they produce `HudChip` events (native hooks vs DOM).

Package name: `z-key-cast-hud-view` · path: `packages/hud-view`

## Layout

```text
src/
  components/   # HudView, KeyCard, KeyboardMap, MouseSchematic
  model/        # HudChip, style, legends, layout, i18n slice
  state/        # createHudSlots (timeline / held-set / scroll pulse)
  index.ts      # public exports
```

Import only from the package root:

```ts
import {
  HudView,
  createHudSlots,
  type HudChip,
} from "z-key-cast-hud-view";
```

## Consumers

| Host | Event source | Notes |
|------|----------------|------|
| App (`src/routes/overlay`) | Tauri `cast://event` → `HudChip` | Full Text/Lite/Full presets |
| Website (`website/`) | DOM key / mouse / wheel → `HudChip` | MVP: Full only |

Wire Vite so the workspace package is not prebundled away from Svelte:

- `optimizeDeps.exclude: ["z-key-cast-hud-view"]`
- `ssr.noExternal: ["z-key-cast-hud-view"]`

## Contract

- Chip shape stays aligned with repo `design/index.md` and Rust input events.
- Peer: `svelte` ^5.

## Out of scope

- Native / DOM input adapters (live in App or `website/`)
- Settings persistence, Tauri IPC, tray, ripple, custom cursor
