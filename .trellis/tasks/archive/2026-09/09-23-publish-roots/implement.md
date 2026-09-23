# Implement

1. [x] Point publish scripts, serve, env example, gitignore, and website READMEs at the two roots.
2. [x] Move existing `website/publish/` artifacts into `website/publish-test/`.
3. [x] Set `PUBLIC_UPDATE_BASE_URL` in `website/.env`.
4. [x] Sync current site pages into `website/publish/` only.
5. [x] Update `.trellis/spec/guides/site-updater.md`.

## Validation

```bash
pnpm site:publish-artifacts -- --dry-run
pnpm site:publish-test -- --dry-run --skip-build
```

Confirm dry-run bases and directories, and that `publish-test/updates/latest.json` still contains the LAN host while `publish/downloads/` has no version folders.

Do not run a real `site:publish-test` (it rebuilds the app) or upload to Cloudflare.
