# z-key-cast

Corner HUD that shows keyboard and mouse actions during screen recording.

## Stack

- Tauri 2
- SvelteKit + TypeScript
- pnpm

## Develop

```bash
pnpm install
pnpm tauri dev
```

- `main` window: settings stub (`/`)
- `overlay` window: transparent corner HUD (`/overlay`)

See `design/index.md` for product and architecture decisions.
