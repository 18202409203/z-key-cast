# Wrangler deploy design

## Boundary

release-kit already sequences build, then `postrelease`. This task only adds an assets-only Wrangler project and one hook after `site:publish`. Test publish and one-shot `site:dist` stay offline.

```
pnpm release
  build: pnpm tauri build && pnpm website:build
  postrelease[0]: pnpm site:publish          → writes website/publish/
  postrelease[1]: pnpm exec wrangler deploy  → uploads that directory
```

`runHooks` walks the array in order and throws on hook failure (`onError` default `fail`). Dry-run sets `dry` on `execShell`, which prints the command and returns before `execSync`. The tag already exists before `postrelease`; a failed deploy does not untag. That matches `site:publish` today.

## Config

`wrangler.jsonc` at the repo root:

- `name`: `z-key-cast` (updates the existing Worker; does not create a second name)
- `compatibility_date`: `2026-09-23`
- `assets.directory`: `./website/publish`
- `assets.html_handling`: `auto-trailing-slash` (explicit default). `/zh/` serves `website/publish/zh/index.html`.
- Omit `not_found_handling` so it stays `none`. Missing paths 404. Do not set `single-page-application`.
- Omit `main` and `assets.binding`.

`$schema` may point at `node_modules/wrangler/config-schema.json` after the devDependency is installed.

## Auth and ignore

- `pnpm exec wrangler login` once on this machine. Token lives in the user Wrangler config directory, outside the repo.
- Gitignore `.wrangler/` (local cache created next to the config).
- Do not set `account_id`. The logged-in account is the one that already owns `z-key-cast`.

## Hook

```js
{
  name: 'wrangler:deploy',
  run: 'pnpm exec wrangler deploy',
  timeout: '15m',
}
```

15 minutes covers uploading installers that are still under the 25 MiB file cap. The release-kit default hook timeout is 10 minutes and is not tied to `build.timeout` (`45m`).

## Docs

Replace “upload is manual / this command does not upload” on the **release** path only:

- `website/README.md`, `website/README.zh-CN.md`
- root `README.md`, `README.zh-CN.md` release row

State the 25 MiB per-file limit (`.dmg` or `.app.tar.gz`). `pnpm site:dist` still only fills `website/publish/`.

Spec text in `.trellis/spec/guides/site-updater.md` is updated in Phase 3, not as a drive-by during planning.

## Rollback

Remove the postrelease entry and `wrangler.jsonc`. The Worker keeps its last successful upload. Local `website/publish/` is unchanged by deleting the hook.

## Tradeoff

Pinned `wrangler` via pnpm, invoked with `pnpm exec`, instead of a global `wrangler` on `PATH`. Login still uses the same user OAuth store, and the release command works on a machine that only has pnpm.
