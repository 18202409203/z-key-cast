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

## Marketing page (`website/` hero)

Three **scroll-snap** panels (`mandatory` + `scroll-snap-stop: always` on `html`): Brand → Stage → Download. Language footer lives **inside** Download (not after the last snap — mandatory would bounce content back). A fixed **left page rail** (3 dots) shows the active panel and jump-clicks via `scrollToPanel`; `prefers-reduced-motion` disables snap. Wheel/trackpad is **throttled** (~700ms, one adjacent panel per tick) because macOS inertia can skip `scroll-snap-stop`; stage **powered** still owns wheel via the DOM adapter.

Demo-first desk (monitor Lite + Full schematics). Capture is an explicit **power session**, not hover-target:

| State | Behavior |
|---|---|
| On | Document-level key / wheel → chips; **mouse** chips cover the whole Stage panel (`getPointerRoot`), except `[data-stage-pointer-exempt]` (page rail, blind cord). Typing parks on notepad. Wheel is captured — page cannot scroll while on (use ⏻ or leave Stage). |
| Off | Normal page UI; stage clicks / outside clicks / idle keys do **not** power on |
| Desk power | Top-right ⏻ is the **only** manual toggle (`[data-stage-power]`); adapter must not emit mouse chips for that control |
| Boot | Page loads **off** on Brand. Stage ~≥45% in view → auto `powerOn`; Stage leaves view → auto `powerOff`. ⏻ still toggles while parked on Stage; leave/re-enter re-arms. |

Do not gate mouse chips on “pointer over screen only”. Dual `createHudSlots` (lite + full) fan-out; cable packet animations are one-shot per input toward the monitor. Blind cord toggles room light / HUD colors only — never power.

Notepad shows the locale invite sentence as **static initial text** (no intro typewriter / simulated chip script).

Visual references: `design/website/proto.png` (desk likeness); `design/website/scroll.jpeg` (three-panel scroll intent).

### Marketing i18n (en / zh static HTML)

| Surface | Contract |
|---|---|
| Copy | Hand-rolled `website/src/lib/i18n.ts` (`UiLocale` + `t()`); do **not** share app `src/lib/i18n.ts` |
| Routes | `/` → en; `/zh/` → zh; shared `MarketingPage` + locale prop; language switch = footer links **in Download panel** |
| Build | SSR prerender (`ssr` + `prerender`); output `build/index.html` and `build/zh/index.html` with correct `lang` / copy in first HTML |
| Adapter | No SPA `fallback: "index.html"` that can swallow `/zh/` |
| Serve | `site:serve` must hit real `zh/index.html`; missing `/zh…` → **404**, never English root fallback |
| Shared | `/downloads/` and `/updates/latest.json` are language-agnostic |
| Download UI | macOS-only primary CTA for now; layout reserves a flex row for a future Windows sibling |
| Out | No `Accept-Language` / `navigator.language` auto-redirect; Brand feature cards deferred |

**Wrong**: boot `powerOn` while Brand is showing (steals wheel → looks like broken scroll); outside-click power-off that also kills blind-cord clicks; putting lang footer after the last snap panel under `mandatory`; client-only locale flip with empty prerender shell; serve falling back `/zh/` → root English `index.html`.

---

**Related**: [Release Conventions](./release.md) (changelog ownership; do not hand-edit CHANGELOG for site work).
