# Test updater signing keys

Generated with:

```bash
pnpm tauri signer generate --ci -w website/keys/updater.test.key
```

- **`updater.test.key.pub`** — safe to commit; embedded only via `tauri.internal.conf.json` for internal builds.
- **`updater.test.key`** — private; gitignored. Required for `pnpm tauri:build:internal` / `site:publish-test` signing.
- Production hosting must use a **new** keypair; do not reuse this test private key.
