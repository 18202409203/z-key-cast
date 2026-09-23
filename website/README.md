# Website

English | [简体中文](./README.zh-CN.md)

Static site: pages, installers, and `updates/latest.json`. This package is decoupled from the Tauri app under repo-root `src/`. Publish scripts, keys, and both deploy roots live under `website/`.

Run every command from the **repo root**. Pages are built once (`pnpm website:build` → `website/build/`) and copied into each tree. `downloads/` and `updates/latest.json` stay separate.

## Layout

```text
website/
  src/ …                 # SvelteKit source
  scripts/               # sync / publish / LAN serve
  keys/                  # test updater keys (pub committed; private gitignored)
  env.example            # copy → website/.env
  publish/               # public root (gitignored except .gitkeep)
    downloads/<version>/
    updates/latest.json  # absolute URLs from UPDATE_BASE_URL
  publish-test/          # LAN test root (gitignored except .gitkeep)
    downloads/<version>/
    updates/latest.json  # absolute URLs from UPDATE_BASE_URL_TEST
```

`website/.env`:

| Variable | Used by | Current value |
|---|---|---|
| `UPDATE_BASE_URL` | Public manifest. Must be `https://` or `site:publish` refuses to write | `https://z-key-cast.1224777638.workers.dev` |
| `UPDATE_BASE_URL_TEST` | Endpoint baked into test builds, and the `publish-test` manifest. Match the origin you use for `site:serve-test` | e.g. `http://192.168.16.129:4173` |

## Public publish

One shot fills `website/publish/`:

```bash
pnpm site:dist
```

Same as:

```bash
pnpm tauri build          # public app: updater on, pubkey updater.key.pub, endpoint UPDATE_BASE_URL
pnpm website:build        # site pages
pnpm site:publish         # copy into publish/downloads/<version>/ and write latest.json
```

Version comes from `package.json` (or release-kit env). This does not bump `.site-test-version`. `pnpm release` tags a clean tree, then runs `pnpm tauri build && pnpm website:build` (45 minute timeout) and `postrelease` `pnpm site:publish` into `website/publish/`. The binary is that tag.

After that, upload `website/publish/` to the Cloudflare Worker at `UPDATE_BASE_URL`. The command does not upload.

A package without auto-update is `pnpm tauri:build-once`. Key generation: [`keys/README.md`](./keys/README.md).

## Test publish

One shot fills `website/publish-test/`:

```bash
pnpm site:dist-test
```

Same as:

```bash
pnpm tauri:build-test -- --bump-test-version   # patch-bump .site-test-version and build the test app
pnpm website:build
pnpm site:publish-test -- --skip-build         # copy and write the manifest; do not compile again
```

The test app enables the updater, embeds the pubkey for `website/keys/updater.test.key`, and points at `UPDATE_BASE_URL_TEST`. It does not change `package.json`, Cargo, or `tauri.conf.json`.

Serve the test tree locally:

```bash
pnpm site:serve-test    # default 0.0.0.0:4173, document root = website/publish-test/
```

### LAN update loop (macOS)

1. Copy `website/env.example` → `website/.env` and set `UPDATE_BASE_URL_TEST` to this machine's LAN origin (for example `http://192.168.16.129:4173`).
2. Keep the test private key at `website/keys/updater.test.key` (gitignored). The public key is committed.
3. Install a lower build as the old app (this step does not bump the test version):

   ```bash
   pnpm tauri:build-test
   # install the .dmg / .app under src-tauri/target/release/bundle/
   ```

4. Publish a higher test version and serve it:

   ```bash
   pnpm site:dist-test
   pnpm site:serve-test
   ```

5. In the old app → **About** → **Check for updates** → download → install → relaunch.

## Step commands

Pieces of the two pipelines. `src-tauri/target/release/bundle/` is a single directory; the later build replaces the earlier one.

| Command | What it does |
|---|---|
| `pnpm website:dev` | Page dev server only (`http://localhost:5173`). No downloads or update manifest. |
| `pnpm website:build` | Build pages into `website/build/`. |
| `pnpm website:check` | `svelte-check` for the website package. |
| `pnpm tauri build` | Public app with auto-update. |
| `pnpm tauri:build-once` | One-off app with no auto-update and no update signature. |
| `pnpm tauri:build-test` | Test app. Does not bump `.site-test-version` unless `--bump-test-version` is passed. |
| `pnpm site:sync` | Copy pages into `website/publish/` and keep that tree's `downloads/` and `updates/`. |
| `pnpm site:sync-test` | Same copy into `website/publish-test/`. |
| `pnpm site:publish` | Copy the current bundle into the public root and write the manifest. Does not compile the app. |
| `pnpm site:publish-test` | Bump the test version, build the test app, write `publish-test/`. |
| `pnpm site:serve-test` | Serve `publish-test/` on the LAN. |

```bash
pnpm site:publish -- --dry-run
pnpm site:publish -- --skip-web              # skip page sync
pnpm site:publish-test -- --dry-run
pnpm site:publish-test -- --skip-build       # reuse the bundle; no bump, no second compile
```
