# Design: UI i18n (en / zh)

## Boundaries

| Layer | Owns |
|-------|------|
| TS `src/lib/i18n.ts` (or similar) | Locale type, message catalogs, `t(key)`, system-locale guess |
| Rust `settings` | Persist `uiLocale: "en" \| "zh"` (optional field; omit = unresolved → frontend guesses once then saves) |
| Main + overlay Svelte | Replace user-visible strings with `t(...)`; language `<select>` in Settings |
| Overlay | Subscribe to locale channel or re-read settings on change |

## Locale contract

```ts
type UiLocale = "en" | "zh";

// AppSettings / dedicated get-set:
// uiLocale?: UiLocale  — absent until first resolve
```

**Boot:**
1. Load settings; if `uiLocale` set → use it
2. Else guess: `navigator.language` / Tauri locale if easy → `zh*` → `zh`, else `en`; optionally persist immediately so next launch stable

**Change:** Settings select → `set` + emit `cast://ui-locale` `{ locale }` so overlay updates without reload.

## Message catalog

Flat keys, e.g. `settings.corner`, `capture.listenKeyboard`, `hook.denied`, …

```ts
const messages = { en: { ... }, zh: { ... } };
function t(key: MessageKey, locale = current): string
```

No ICU plurals needed for MVP. Missing key → fall back to `en` then key string.

## What is NOT translated

- `HudChip.id`, `HudChip.label`, mouse button enums in payload
- `summarizeHudChip` log lines
- Category preset **ids**; category **UI labels** are translated

## Settings UI

Add Language field (Display or top of Settings): English / 中文.

## Trade-offs

| Choice | Why |
|--------|-----|
| Hand-rolled map | ~one screen of strings; zero deps |
| Keys language-agnostic | Matches recording UX; avoids Rust label fork |
| Channel for overlay | Overlay is separate webview |
