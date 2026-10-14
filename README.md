# z-key-cast

English | [简体中文](./README.zh-CN.md)

Corner HUD that shows keyboard and mouse actions during screen recording.

- **Website:** https://z-key-cast.1224777638.workers.dev/

<p align="center">
  <img src="./docs/screenshots/black.png" alt="Full HUD on light background" width="420" />
  &nbsp;
  <img src="./docs/screenshots/white.png" alt="Full HUD on dark background" width="420" />
</p>
<p align="center">
  <img src="./docs/screenshots/lite.png" alt="Lite preset timeline chips" width="520" />
</p>

## Install

macOS on Apple Silicon. The app is not notarized. If macOS says it is damaged, move `z-key-cast.app` to Applications and run:

```bash
xattr -dr com.apple.quarantine /Applications/z-key-cast.app
```

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

`git push` updates Gitee (`origin`). Copy the current branch to GitHub with `git push github HEAD`.

| Window | Route | Role |
|---|---|---|
| `main` | `/` | Settings / Log / About |
| `overlay` | `/overlay` | Transparent corner HUD |

Build:

```bash
pnpm tauri build
```

### Site publish

See [`website/README.md`](./website/README.md) ([简体中文](./website/README.zh-CN.md)).

| Path | Command | Directory |
|---|---|---|
| Public | `pnpm site:dist` | Writes `website/publish/` only. Does not deploy. |
| Release | `pnpm release` | Tag, write `website/publish/`, then `wrangler deploy` |
| Test | `pnpm site:dist-test` | `website/publish-test/` |

`pnpm tauri build` includes auto-update. A one-off package without it is `pnpm tauri:build-once`. `pnpm site:publish` alone does not deploy. `pnpm release` uploads `website/publish/` with Wrangler after `site:publish`. A `.dmg` or `.app.tar.gz` over 25 MiB fails `wrangler deploy`. Gitee Releases stay manual. Updater keys: [`updater-keys/README.md`](./updater-keys/README.md).

## Docs

- Product & architecture → [`design/index.md`](./design/index.md)
- UI notes → [`design/02-ui.md`](./design/02-ui.md)
- Changelog → [`CHANGELOG.md`](./CHANGELOG.md)

## License

MIT
