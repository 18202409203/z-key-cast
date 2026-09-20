# Website (internal LAN shell)

English | [简体中文](./README.zh-CN.md)

Minimal static marketing/download shell for **local / LAN updater rehearsals**. Visual design is intentionally unfinished.

This package is **decoupled** from the Tauri app under repo-root `src/`. Site publish/serve scripts, keys, and the deploy root all live under `website/`.

## Layout

```text
website/
  src/ …                 # SvelteKit source
  static/
  scripts/               # site-sync / publish / serve
  keys/                  # test updater keys (pub committed; private gitignored)
  env.example            # copy → website/.env
  publish/               # sole deploy / document root (gitignored except .gitkeep)
    index.html …
    downloads/<version>/
    updates/latest.json
  README.md
```

## Commands

All commands below are run from the **repo root**.

### Website (SvelteKit)

| Command | What it does |
|---|---|
| `pnpm website:dev` | Dev server for page source only (`http://localhost:5173`). No `publish/` downloads/updates. |
| `pnpm website:build` | Builds static pages into `website/build/`. |
| `pnpm website:check` | `svelte-check` for the website package. |

### Publish root (`website/publish/`)

| Command | What it does |
|---|---|
| `pnpm site:sync-web` | Syncs `website/build/` → `website/publish/` **pages only**. Keeps `downloads/` and `updates/` untouched. Builds the site first if `build/` is missing. |
| `pnpm site:serve` | Serves `website/publish/` as the HTTP document root (default port `4173`, LAN-reachable). Use this URL as `UPDATE_BASE_URL`. |
| `pnpm site:publish-artifacts` | Copies current Tauri bundle artifacts into `publish/downloads/<version>/` and writes `updates/latest.json`. Version comes from release-kit env / `package.json`. Does **not** bump test version. Wired from release-kit `postrelease` hook. |
| `pnpm site:publish-test` | **Test update path:** bumps gitignored `website/.site-test-version` (+patch), runs an internal Tauri rebuild with that version, then publishes into `publish/` + `latest.json`. Does **not** change `package.json` / Cargo / `tauri.conf.json`. |

Flags for publish:

```bash
pnpm site:publish-test -- --skip-build   # reuse existing bundle; no version bump rebuild
pnpm site:publish-test -- --dry-run      # print actions only
pnpm site:publish-artifacts -- --skip-web  # skip site sync step
```

### Internal desktop build (updater enabled)

| Command | What it does |
|---|---|
| `pnpm tauri:build:internal` | Builds a **debug/internal** app with updater + test pubkey + endpoint from `UPDATE_BASE_URL`. Writes into `src-tauri/target/release/bundle/`. Does **not** bump `.site-test-version` unless called with `--bump-test-version` (what `site:publish-test` does). |
| `pnpm tauri build` | **Public** build. Updater plugin/pubkey **not** enabled. Use for real Gitee releases (manual upload unchanged). |

### How they relate

```text
tauri:build:internal     →  produce installable internal .app/.dmg (baseline to install)
site:publish-test        →  bump test version + rebuild internal + copy to publish/ + latest.json
site:sync-web            →  pages only into publish/ (also used inside publish/serve)
site:serve               →  HTTP root = website/publish/  (== UPDATE_BASE_URL)
```

`UPDATE_BASE_URL` (in `website/.env`) must be the same origin users/apps use to reach `site:serve` (e.g. `http://192.168.x.x:4173`). It is baked into internal builds and into absolute URLs inside `latest.json`.

`.site-test-version` increments **only** when `site:publish-test` runs (via internal `--bump-test-version`). Fake test versions still require a real rebuild so the number is embedded in the binary.

## LAN C-loop (macOS)

1. Copy `website/env.example` → `website/.env` and set `UPDATE_BASE_URL` to the same host:port as `site:serve` (e.g. `http://192.168.16.129:4173`).
2. Keep the test private key at `website/keys/updater.test.key` (gitignored). Public key is committed.
3. Build + install an **older** internal baseline (no auto bump):

   ```bash
   pnpm tauri:build:internal
   # install the resulting .dmg / .app from src-tauri/target/release/bundle/
   ```

4. Publish a **higher** test version onto the static root:

   ```bash
   pnpm site:publish-test
   ```

5. Serve the publish root:

   ```bash
   pnpm site:serve
   ```

6. In the installed (older) app → **About** → **检查更新 / Check for updates** → download → install → relaunch.

### Manual verification checklist

- [ ] macOS C-loop once: check → download → signature verify → install → restart on new version
- [ ] `git status` shows no private key, no dmg/tar under `website/publish/`, no `website/.env`, no `website/.site-test-version`
- [ ] Default `pnpm tauri build` (no `--features internal-updater`, no `tauri.internal.conf.json`) does not embed updater pubkey / does not register the updater plugin

## Production later

When moving to a public host: upload the same `website/publish/` shape, switch `UPDATE_BASE_URL` to HTTPS, and generate a **new** production keypair (do not reuse the test private key).
