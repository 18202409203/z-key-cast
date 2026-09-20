# Site + Updater (LAN / release boundary)

> Contracts for `website/publish`, internal vs public Tauri builds, and updater signing.

---

## 1. Scope / Trigger

Apply when changing:

- `website/` layout, publish/serve scripts, or `UPDATE_BASE_URL`
- `tauri-plugin-updater` / `internal-updater` feature / About update UI
- release-kit hooks that call `site:publish-*`

## 2. Signatures

| Surface | Contract |
|---|---|
| Deploy root | `website/publish/` = sole HTTP document root (pages + `downloads/` + `updates/`) |
| Manifest | `GET {UPDATE_BASE_URL}/updates/latest.json` |
| Artifacts | `{UPDATE_BASE_URL}/downloads/<version>/…` |
| Internal build | `pnpm tauri:build:internal` → feature `internal-updater` + merge `tauri.internal.conf.json` |
| Public build | `pnpm tauri build` → **no** updater feature, **no** test pubkey, **no** updater ACL |
| Test publish | `pnpm site:publish-test` bumps `website/.site-test-version` only (not package/Cargo/tauri.conf) |
| Release publish | `pnpm site:publish-artifacts` (release-kit `postrelease`); Gitee upload stays **manual** |

## 3. Contracts

### Env (`website/.env`, from `env.example`)

- `UPDATE_BASE_URL` — absolute origin matching `site:serve` (no trailing slash). Baked into internal app endpoints and absolute URLs in `latest.json`.

### Keys

- Public: `website/keys/updater.test.key.pub` (committed for LAN tests)
- Private: `website/keys/*.key` (**gitignore**; never commit)
- Production: new keypair when enabling public updater; do not reuse test private key

### About UI

- Check → show available version → user confirms → `downloadAndInstall` → relaunch
- Never auto-install on check alone

## 4. Validation & Error Matrix

| Case | Expected |
|---|---|
| `/downloads/` with no `index.html` | LAN `site:serve` returns directory listing (not bare 404) |
| Public build invokes updater UI | `is_updater_enabled` false; status “not enabled” |
| `.env` IP changed after install | Old app still has old endpoint — rebuild+reinstall internal baseline |
| Bump `.site-test-version` without rebuild | Invalid — version must be embedded via internal build |

## 5. Good / Base / Bad

- **Good**: `website/` holds src + scripts + keys + `publish/`; root stays app-focused; pnpm workspace includes `.` + `website`
- **Base**: LAN C-loop on macOS; Windows download placeholder OK
- **Bad**: Enabling updater on public `tauri build`; committing private key; using root `site/` as second deploy root; linking `/downloads/` without listing or real file

## 6. Tests Required

- `pnpm check` + `pnpm website:check`
- `cargo check` (public tree must not require updater crates linked)
- `cargo check --features internal-updater`
- Manual: macOS C-loop once (check → confirm → download → verify → install → relaunch)

## 7. Wrong vs Correct

| Wrong | Correct |
|---|---|
| `website/` + repo-root `site/` both as deploy roots | Only `website/publish/` |
| Nested `website/pnpm-lock.yaml` as second install | Root `pnpm install` via `pnpm-workspace.yaml` |
| Check-for-updates immediately installs | Confirm with version first |
| Public release embeds test pubkey | Public build updater-free until prod keys + HTTPS |

---

**Related**: [Release Conventions](./release.md) (changelog ownership; do not hand-edit CHANGELOG for site work).
