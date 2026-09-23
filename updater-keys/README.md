# Updater signing keys

[简体中文](./README.zh-CN.md)

Private keys (`*.key`) are gitignored. Public keys may be committed. Public and test builds use separate keypairs.

Commands are run from the **repo root**.

## Test

Used by `pnpm tauri:build-test` and `pnpm site:dist-test`. Empty password:

```bash
pnpm tauri signer generate --ci -w updater-keys/updater.test.key
```

| File | Role |
|---|---|
| `updater.test.key` | Test private key |
| `updater.test.key.pub` | Test public key, embedded in test builds |

## Public

Used by `pnpm tauri build` and `pnpm site:dist`. Set a password at the prompt:

```bash
pnpm tauri signer generate -w updater-keys/updater.key
```

| File | Role |
|---|---|
| `updater.key` | Public-build private key |
| `updater.key.pub` | Public-build public key, embedded in public builds. The command also prints this key |

Put a non-empty password in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. An empty password needs no variable; generate with the same `--ci` form as the test key:

```bash
pnpm tauri signer generate --ci -w updater-keys/updater.key
```
