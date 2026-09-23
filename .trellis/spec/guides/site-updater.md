# Site + Updater (LAN / release boundary)

> Contracts for `website/publish`, internal vs public Tauri builds, and updater signing.

---

## 1. Scope / Trigger

Apply when changing:

- `website/` layout, publish/serve scripts, `UPDATE_BASE_URL`, or `UPDATE_BASE_URL_TEST`
- `tauri-plugin-updater` / `updater` feature / About update UI
- release-kit hooks that call `site:publish-*`

## 2. Signatures

| Surface | Contract |
|---|---|
| LAN root | `website/publish-test/` = LAN HTTP document root (pages + test `downloads/` + test `updates/`). `pnpm site:serve-test` serves this tree. |
| Public root | `website/publish/` = Cloudflare document root (pages + release `downloads/` + release `updates/`). Upload this tree only. |
| Manifest | `GET {base}/updates/latest.json`. `base` is `UPDATE_BASE_URL_TEST` on the LAN tree and `UPDATE_BASE_URL` on the public tree. Platform objects keep `url` + `signature` for the updater. Optional `size` (bytes) is the updater archive. Optional `installer: { url, size }` is the user-facing package (macOS `.dmg`). The updater ignores unknown fields. Marketing footnote shows `installer.size` when the button links to that file. |
| Artifacts | `{base}/downloads/<version>/…` inside the same tree that owns that manifest |
| Test build | `pnpm tauri:build-test` → feature `updater` + merge `tauri.internal.conf.json`; endpoint from `UPDATE_BASE_URL_TEST`; signs with `website/keys/updater.test.key` |
| Public build | `pnpm tauri build` → feature `updater` + generated merge config; endpoint `{UPDATE_BASE_URL}/updates/latest.json`; pubkey `website/keys/updater.key.pub`; signs with `website/keys/updater.key` |
| Once build | `pnpm tauri:build-once` → no updater feature, no updater artifacts |
| Test publish | `pnpm site:publish-test` writes **only** `website/publish-test/` and bumps `website/.site-test-version` (not package/Cargo/tauri.conf) |
| Release publish | `pnpm site:publish` writes **only** `website/publish/` (release-kit `postrelease`); Gitee upload stays **manual**. |
| One-shot public | `pnpm site:dist` = `pnpm tauri build && pnpm website:build && pnpm site:publish` → `website/publish/` |
| One-shot test | `pnpm site:dist-test` = `pnpm tauri:build-test -- --bump-test-version && pnpm website:build && pnpm site:publish-test -- --skip-build` → `website/publish-test/`. One test-app build, one patch bump. |

## 3. Contracts

### Env (`website/.env`, from `env.example`)

- `UPDATE_BASE_URL` — `https://` origin (no trailing slash) baked into `website/publish/updates/latest.json`. `site:publish` refuses to write the public manifest when this is missing or not https. Current origin: `https://z-key-cast.1224777638.workers.dev`.
- `UPDATE_BASE_URL_TEST` — LAN origin matching `site:serve-test` (no trailing slash). Baked into test app endpoints and absolute URLs in `website/publish-test/updates/latest.json`.

### Keys

- Test public: `website/keys/updater.test.key.pub` (committed). Private: `website/keys/updater.test.key`
- Release public: `website/keys/updater.key.pub`. Private: `website/keys/updater.key`
- Private keys are gitignored. Do not sign a public build with the test private key. A non-empty key password is `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### About UI

- Check → show available version → user confirms → `downloadAndInstall` → relaunch
- Never auto-install on check alone

## 4. Validation & Error Matrix

| Case | Expected |
|---|---|
| `/downloads/` with no `index.html` | LAN `site:serve-test` returns directory listing (not bare 404) |
| `pnpm tauri:build-once` invokes updater UI | `is_updater_enabled` false; status “not enabled” |
| `pnpm tauri build` invokes updater UI | `is_updater_enabled` true; endpoint is `UPDATE_BASE_URL` |
| `.env` IP changed after install | Old app still has old endpoint — rebuild+reinstall internal baseline |
| Bump `.site-test-version` without rebuild | Invalid — version must be embedded via internal build |

## 5. Good / Base / Bad

- **Good**: `website/` holds src + scripts + keys + `publish/` + `publish-test/`; root stays app-focused; pnpm workspace includes `.` + `website`; the two trees never share `downloads/` or `latest.json`
- **Base**: LAN C-loop on macOS; Windows download placeholder OK
- **Bad**: Signing the public build with the test private key; committing a private key; using root `site/` as second deploy root; linking `/downloads/` without listing or real file

## 6. Tests Required

- `pnpm check` + `pnpm website:check`
- `cargo check` (`tauri:build-once` tree; updater crates not required)
- `cargo check --features updater`
- Manual: macOS C-loop once (check → confirm → download → verify → install → relaunch)

## 7. Wrong vs Correct

| Wrong | Correct |
|---|---|
| `website/` + repo-root `site/` both as deploy roots | Only `website/publish/` (public) and `website/publish-test/` (LAN) |
| One `publish/` tree for LAN test packages and the Cloudflare upload | Test publish writes `publish-test/` with `UPDATE_BASE_URL_TEST`; release publish writes `publish/` with `UPDATE_BASE_URL` |
| Nested `website/pnpm-lock.yaml` as second install | Root `pnpm install` via `pnpm-workspace.yaml` |
| Check-for-updates immediately installs | Confirm with version first |
| Public release embeds the test pubkey | `pnpm tauri build` embeds `updater.key.pub` and `UPDATE_BASE_URL` only |

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
| Serve | `site:serve-test` must hit real `zh/index.html`; missing `/zh…` → **404**, never English root fallback |
| Shared | `/downloads/` and `/updates/latest.json` are language-agnostic |
| Download UI | macOS-only primary CTA. Footnote is `Latest: {version}` plus the linked package size when `latest.json` has `installer.size` (formatted MB). No second version string. |
| Brand | Three outlined cards under the tagline: local screen / stacked chip / code mark. Titles: Runs offline, Under 3 MB, 100% Free (zh: 离线可用, 不到 3 MB, 100% 免费). One muted lead line each. Icons are decorative. |
| Stage boot | Blinds start **closed** (dark room, dark HUD). Cord still toggles light. |
| Out | No `Accept-Language` / `navigator.language` auto-redirect |

**Wrong**: boot `powerOn` while Brand is showing (steals wheel → looks like broken scroll); outside-click power-off that also kills blind-cord clicks; putting lang footer after the last snap panel under `mandatory`; client-only locale flip with empty prerender shell; serve falling back `/zh/` → root English `index.html`.

---

**Related**: [Release Conventions](./release.md) (changelog ownership; do not hand-edit CHANGELOG for site work).
