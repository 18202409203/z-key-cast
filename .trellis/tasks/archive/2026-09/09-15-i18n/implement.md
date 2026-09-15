# Implement: UI i18n

## Checklist

1. [x] **Catalog + runtime** — `src/lib/i18n.ts`: locales, messages en/zh, `t`, `guessLocale`, reactive current locale helper if needed
2. [x] **Persist** — `uiLocale` on settings (Rust + TS); get/set; channel `cast://ui-locale`
3. [x] **Main `+page.svelte`** — Language select; replace visible strings with `t(...)`
4. [x] **Overlay** — Listen locale channel + initial load; translate status strings only
5. [x] **Validate** — `npm run check`; `cargo test`; manual switch + restart

## Validation commands

```bash
cd src-tauri && cargo test
npm run check
```

## Risky points

- Missed hardcoded string in +page (large file) — sweep twice
- Overlay stale locale if channel miss — also read on mount
- Don’t translate chip labels by accident

## Rollback

Remove locale field (default omit) and revert string wiring.
