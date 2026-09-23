# Design

## Roots

| Tree | Path | Writer | Base URL | Reader |
|---|---|---|---|---|
| LAN test | `website/publish-test/` | `site:publish-test` | `UPDATE_BASE_URL_TEST` | `site:serve-test`, `tauri:build-test` |
| Public | `website/publish/` | `site:publish` | `UPDATE_BASE_URL` | Cloudflare upload of this directory |

Page HTML is identical in both trees. `downloads/` and `updates/latest.json` are not shared. Manifest `url` fields stay absolute and are baked from that tree's base URL at publish time. The marketing page still requests `/updates/latest.json` and uses the path portion of installer URLs.

## Env

`website/scripts/site-env.mjs` loads both URLs and exports `publishRoot` plus `publishTestRoot`. Trailing slashes are stripped. `UPDATE_BASE_URL` has no localhost default. `site:publish` exits if the public URL is missing or is not `https://`. Unsuffixed commands are public. Test commands use a `-test` suffix (`tauri:build-test`, `site:publish-test`, `site:serve-test`, `site:sync-test`). `website:build` is shared.

`scripts/tauri-build-internal.mjs` keeps reading `UPDATE_BASE_URL` only.

## Sync

`site-sync-web.mjs` takes `--test`, `--public`, or both (default). Each call deletes page files in the target root and copies `website/build/`, skipping `downloads/`, `updates/`, and `.gitkeep`.

`site:publish-test` syncs `--test`. `site:publish` syncs `--public`. `site:serve-test` serves `publish-test` and, when `index.html` is missing, syncs `--test`.

## Migration

Move the current `website/publish/` page files, `downloads/`, and `updates/` into `website/publish-test/`. Leave `website/publish/.gitkeep`, then sync pages into the empty public root so it can be uploaded without the LAN manifest.
