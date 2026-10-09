# Implement wrangler deploy

User asked to create this task and implement it. Do not run a live deploy.

## Checklist

- [x] Add `wrangler` as a root devDependency (`pnpm add -D wrangler`). Commit the lockfile change with the rest of the task later; do not commit in the implement step unless the parent asks.
- [x] Add repo-root `wrangler.jsonc` per `design.md` (`name` `z-key-cast`, `assets.directory` `./website/publish`, `html_handling` `auto-trailing-slash`, no `main`, no SPA not-found handling).
- [x] Gitignore `.wrangler/`.
- [x] In `release.config.mjs`, after the `site:publish` hook, add `{ name: 'wrangler:deploy', run: 'pnpm exec wrangler deploy', timeout: '15m' }`. Update the comments that say upload stays manual.
- [x] Update `website/README.md`, `website/README.zh-CN.md`, `README.md`, and `README.zh-CN.md` so the release path uploads after `site:publish`, `site:dist` does not, and a `.dmg` or `.app.tar.gz` over 25 MiB fails `wrangler deploy`.
- [x] Parent session (interactive): `pnpm exec wrangler login` on this machine. Do not write tokens into the repo.
- [x] Validate with `pnpm exec wrangler deploy --dry-run` only.

## Validation

```bash
pnpm exec wrangler deploy --dry-run
```

Do not run `pnpm release` or `wrangler deploy` without `--dry-run`. `website/publish/` currently has HTML and no installers; a live deploy would replace the Worker without downloads.

## Rollback

Delete `wrangler.jsonc`, the postrelease hook, and the devDependency if the config is wrong. The last uploaded Worker version remains live.
