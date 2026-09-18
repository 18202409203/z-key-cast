# Design — Main window appearance + Settings IA

## Boundaries

| In | Out |
|----|-----|
| Persist `uiAppearance`; get/set + channel | Overlay / ripple visual themes |
| Main-window CSS tokens + `data-appearance` | Native titlebar / vibrancy |
| Rename Settings → Appearance; move Theme + Position → HUD | Extra skins; unrelated 1.5 features |
| i18n keys for nav + options | Changing HUD color preset semantics |

## Contracts

### Persisted field

```ts
type UiAppearance = "system" | "dark" | "light";
// AppSettings.uiAppearance?: UiAppearance — omit → treat as "system"
```

Mirror `ui_locale`:

- Rust: `UiAppearance` enum (`serde` lowercase), `Option` on `AppSettings`, runtime lock in `store`, `appearance.rs` (or extend `locale.rs` → prefer **new `appearance.rs`** to keep locale module single-purpose).
- Commands: `get_ui_appearance_settings` → `Option<UiAppearance>`; `set_ui_appearance_settings` → persist + emit.
- Channel: `cast://ui-appearance` → `{ appearance: UiAppearance }` (camelCase payload).
- Permissions: allow get/set next to locale in `capture.toml` (or settings ACL file in use).
- Every `AppSettings { … }` reconstruct in capture/hud/locale must **preserve** the new field (same footgun as locale).

### Frontend resolve

```ts
function resolveAppearance(stored: UiAppearance | null): "dark" | "light" {
  const mode = stored ?? "system";
  if (mode === "dark" || mode === "light") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
```

- Shell (`+page.svelte`) owns: load stored → set `data-appearance` on `document.documentElement` (or `html`); subscribe to channel; when mode is `system`, `matchMedia(...).addEventListener("change", …)`.
- Appearance panel owns persist (like locale); shell mirrors via callback **or** listens to channel only — prefer **channel + initial get** so one source of truth (overlay does not need this channel).

### CSS tokens

Define on `:root` / `[data-appearance="dark"]` / `[data-appearance="light"]`:

| Token | Role |
|-------|------|
| `--app-bg` | page wash — **flat**, no radial brand washes |
| `--app-fg` / `--app-muted` / `--app-faint` | text ladder |
| `--app-accent` | focus / selected (system-blue–like; tune per mode for contrast) |
| `--app-inset` | grouped list card fill |
| `--app-hairline` | row separators inside groups |
| `--app-control-bg` / `--app-control-border` | inputs, selects, buttons |
| `--radius-sm` / `--radius-md` | Settings-like grouping (~10–12px groups) |

**Depth ladder (both modes):** three steps so chrome doesn’t flatten.

| Step | Dark | Light |
|------|------|-------|
| Page `--app-bg` | deepest (`#1c1c1e`) | whitest (`#ffffff`) |
| Group `--app-inset` | elevated (`#2c2c2e`) | soft recessed (`#f2f2f7`) |
| Control `--app-control-bg` | further elevated (`#3a3a3c`) | floated white (`#ffffff`) |

Light is **not** Mac’s gray-page + white-card; it mirrors dark’s outer-extreme → inner step so both themes feel isomorphic. Brand mark stays quiet.

### IA / files

| Today | After |
|-------|--------|
| `nav.settings` Settings / 设置 | Appearance / 外观 |
| Tab id `"settings"` | `"appearance"` |
| `SettingsPanel.svelte` | Rename → `AppearancePanel.svelte` (props: locale + appearance callbacks as needed) |
| Theme + Position blocks in Settings | Move markup + wire into `HudPanel` after Presentation |
| Language only at bottom of Settings | Appearance section (SegmentedControl or `<select>`) **then** Language |

**Control UI:** `SegmentedControl` for the three appearance modes (Mac-like); Language stays `<select>`.

HUD section order: Presentation → Theme → Position.

## Data flow

```
AppearancePanel set → Rust persist → cast://ui-appearance
                                    ↓
                         Main shell resolve → data-appearance → CSS
system + OS flip → matchMedia → re-resolve (no persist)
```

## Compatibility

- Missing `uiAppearance` in `settings.json` → `system` (no migration rewrite required).
- Unknown string on parse → reject / default `system` (match other enums’ style in `types.rs`).
- Tab id rename is local UI only.

## Trade-offs

| Choice | Why |
|--------|-----|
| Separate `appearance.rs` | Parallel to locale; avoids bloating locale module |
| `data-appearance` resolved dark\|light only | CSS stays two themes; `system` is a resolve rule |
| IA move in same task | Naming collision fix is why Appearance tab exists |
| Mac Settings both modes | User: redesign dark too; drop 1.4 atmospheric shell |

## Rollback

- Revert persistence module + panel IA + token CSS together.
- Users who saved `uiAppearance` keep a harmless unknown field if rolled back without parser (or ignore unknown via serde if field removed).
