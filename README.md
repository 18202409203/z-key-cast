# z-key-cast

English | [简体中文](./README.zh-CN.md)

Corner HUD that shows keyboard and mouse actions during screen recording.

- **Repository:** https://gitee.com/zhupengji/z-key-cast
- **Releases:** https://gitee.com/zhupengji/z-key-cast/releases

## Features

- **Corner HUD** — Text · Lite · Full presets; corner placement with drag-to-place
- **Global capture** — keyboard and mouse (macOS / Windows; Linux by platform support)
- **Tray** — open settings, quit (HUD stays on while the app runs; X hides Settings)
- **Click rings** — optional click ripple on the macOS / Windows primary display
- **i18n** — English / Chinese UI

## Stack

- Tauri 2
- SvelteKit + TypeScript
- pnpm

## Develop

```bash
pnpm install
pnpm tauri dev
```

| Window | Route | Role |
|---|---|---|
| `main` | `/` | Settings / Log / About |
| `overlay` | `/overlay` | Transparent corner HUD |

Build:

```bash
pnpm tauri build
```

## Docs

- Product & architecture → [`design/index.md`](./design/index.md)
- UI notes → [`design/02-ui.md`](./design/02-ui.md)
- Changelog → [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT
