# Split public and test publish roots

## Goal

Keep the LAN updater loop and the public Cloudflare site from sharing one document root. Test packages and `latest.json` stay on the LAN tree. The public tree is what gets uploaded to `https://z-key-cast.1224777638.workers.dev`.

## Requirements

- `website/publish-test/` is the LAN document root: pages, `downloads/`, and `updates/latest.json`.
- `website/publish/` is the public document root with the same shape.
- Existing contents of `website/publish/` (pages plus `downloads/1.5.4`–`1.5.7` and the LAN `latest.json`) move into `website/publish-test/`. Those files must not remain in `website/publish/`.
- Unsuffixed commands are the public path: `pnpm tauri build`, `pnpm website:build`, `pnpm site:publish`. `pnpm site:dist` runs that sequence and fills `website/publish/`.
- `pnpm site:dist-test` bumps the test version, runs `tauri:build-test`, `website:build`, then `site:publish-test --skip-build`, and fills `website/publish-test/`.
- Test commands use a `-test` suffix: `pnpm tauri:build-test`, `pnpm site:publish-test`, `pnpm site:serve-test`, `pnpm site:sync-test`. `website:build` stays shared.
- `pnpm site:publish-test` and `pnpm site:serve-test` use only `website/publish-test/` and `UPDATE_BASE_URL_TEST` (`http://192.168.16.129:4173`).
- `pnpm site:publish` uses only `website/publish/` and `UPDATE_BASE_URL`.
- `UPDATE_BASE_URL` is `https://z-key-cast.1224777638.workers.dev` (no trailing slash) in `website/.env` and `website/env.example`.
- Public publish refuses to write a manifest unless `UPDATE_BASE_URL` is an `https://` origin.
- Syncing website pages into either root keeps that root's `downloads/` and `updates/` intact.
- Both trees are gitignored except `.gitkeep`.
- `pnpm tauri:build-test` keeps using `UPDATE_BASE_URL_TEST` and the test key. `pnpm tauri build` enables the updater with `website/keys/updater.key` and `UPDATE_BASE_URL`. `pnpm tauri:build-once` is the build with no updater.

## Out of scope

- Uploading `website/publish/` to Cloudflare in this task.
- Production updater keypair, or enabling the updater on public builds.
- A Wrangler project file or deploy script.

## Acceptance Criteria

- [x] `website/publish-test/updates/latest.json` still points at `http://192.168.16.129:4173/downloads/…`, and those version folders live under `website/publish-test/downloads/`.
- [x] `website/publish/` has no `downloads/<version>/` artifacts and no LAN `latest.json`.
- [x] `website/.env` sets `UPDATE_BASE_URL=https://z-key-cast.1224777638.workers.dev` and `UPDATE_BASE_URL_TEST` to the LAN origin.
- [x] `pnpm site:publish -- --dry-run` names `website/publish/` and the Workers origin.
- [x] `pnpm site:publish-test -- --dry-run` names `website/publish-test/` and the LAN origin.
- [x] `.trellis/spec/guides/site-updater.md` describes the two roots and the two base URLs.
