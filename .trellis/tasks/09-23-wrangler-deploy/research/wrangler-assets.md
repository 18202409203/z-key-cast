# Workers static assets (2026-09-23)

Sources: Cloudflare Workers limits, HTML handling, Pages-to-Workers migration.

## Assets-only config

A Worker with no script uses `assets.directory` and omits `main` and `assets.binding`. Recommended file is repo-root `wrangler.jsonc`:

```jsonc
{
  "name": "z-key-cast",
  "compatibility_date": "2026-09-23",
  "assets": {
    "directory": "./website/publish"
  }
}
```

`wrangler deploy` from the repo root uploads that directory to the named Worker.

## Routing defaults that match this site

- `html_handling` default is `auto-trailing-slash`. `/zh` redirects to `/zh/`; `/zh/` serves `zh/index.html`. That matches `website/src/routes/+layout.ts` `trailingSlash = "always"`.
- `not_found_handling` default is `none` (real 404). Do not set `single-page-application`. Site spec forbids an SPA shell that would serve English `index.html` for a missing `/zh/`.

## Limits

| Limit | Value |
|---|---|
| Individual static asset file | 25 MiB (Free and Paid) |
| Files per version | 20,000 Free / 100,000 Paid (Wrangler ≥ 4.34.0) |

A `.dmg` or `.app.tar.gz` over 25 MiB fails `wrangler deploy`. Existing manual uploads of this Worker imply current packages are under the cap. This task does not add a size preflight.

## Credentials

`wrangler login` stores OAuth outside the repo (user config, not a project file). Project `.wrangler/` is local cache and must stay gitignored. Do not commit tokens, `account_id` is optional; the logged-in account is the deploy target.
