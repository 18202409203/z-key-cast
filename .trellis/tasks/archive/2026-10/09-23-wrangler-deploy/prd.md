# Wrangler deploy after site publish

## Goal

`pnpm release` should upload `website/publish/` to the existing Worker `z-key-cast` after the publish tree is written, so the public site at `https://z-key-cast.1224777638.workers.dev` updates on the same machine that already releases.

## Background

- Public document root is `website/publish/` (`site:publish`). LAN test stays on `website/publish-test/` and is not uploaded.
- `release.config.mjs` `build.command` is `pnpm tauri build && pnpm website:build`. `hooks.postrelease` then runs `pnpm site:publish`. release-kit runs hook array entries in order and skips shell execution when `dryRun` is set (`execShell` returns before `execSync`). Default hook `onError` is `fail`. Default hook timeout is 10 minutes unless the hook sets `timeout`.
- There is no Wrangler config in the repo. Docs still say Cloudflare upload is manual (`website/README.md`, `website/README.zh-CN.md`, `.trellis/spec/guides/site-updater.md`).
- Worker name in production is `z-key-cast`. `UPDATE_BASE_URL` is `https://z-key-cast.1224777638.workers.dev`.
- Marketing routes are prerendered (`/` and `/zh/`) with `trailingSlash = "always"` and no SPA fallback (`website/svelte.config.js`).
- Workers static assets: one file max **25 MiB**. Current `website/publish/` has `index.html` and `zh/index.html` and no `.dmg` / `.app.tar.gz`. A live deploy of that tree would replace the Worker without installers.

## Requirements

1. Repo-root Wrangler config names Worker `z-key-cast` and sets the static asset directory to `website/publish/`. No Worker script. HTML handling stays the default that serves `zh/index.html` at `/zh/` and does not SPA-fallback missing paths to English `index.html`.
2. `wrangler` is a root devDependency. The release hook invokes it via `pnpm exec wrangler deploy` so the command does not depend on a global binary.
3. On this machine, complete `wrangler login` once. OAuth stays in the user Wrangler config. Do not commit credentials, `.env` tokens, or `.wrangler/`.
4. In `release.config.mjs` `hooks.postrelease`, append `wrangler deploy` **after** `pnpm site:publish`. Hook failure fails the release (`onError` stays `fail`). Dry-run still prints the command and does not upload.
5. `pnpm site:dist`, `pnpm site:publish` alone, and `pnpm site:publish-test` do not deploy.
6. Document the 25 MiB per-file limit on the release path. Do not add a separate size checker.
7. Do not run a real `wrangler deploy` in this task. The local publish tree has no installers.

## Acceptance Criteria

- [x] Repo-root Wrangler config points `assets.directory` at `website/publish` and `name` is `z-key-cast`, with no `main` script and no SPA `not_found_handling`.
- [x] `.wrangler/` is gitignored. No credential file is added.
- [x] `wrangler` is listed in root `devDependencies`, and the lockfile is updated.
- [x] `postrelease` order is `pnpm site:publish`, then `pnpm exec wrangler deploy`.
- [x] `website/README.md` and `website/README.zh-CN.md` say `pnpm release` uploads after publish, and that a `.dmg` or `.app.tar.gz` over 25 MiB fails that upload. `pnpm site:dist` remains local-only.
- [x] `wrangler login` has succeeded on this machine (user OAuth, not a token in git).
- [x] Validation is `pnpm exec wrangler deploy --dry-run` only. No live deploy.

## Out of Scope

- Custom domains, Workers routes other than the existing `workers.dev` Worker, or account_id hardcoding.
- Deploying `website/publish-test/`.
- A preflight that rejects files over 25 MiB before Wrangler runs.
- Running `pnpm release` or a live `wrangler deploy`.
- Gitee Release upload.
