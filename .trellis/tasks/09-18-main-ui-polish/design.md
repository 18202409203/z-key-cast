# Design — Main window UI polish

## Boundaries

In: Capture hook status UI + i18n; `--app-success` / `--app-danger` (+ optional soft); `--radius-lg`; panel horizontal padding.  
Out: Overlay; new settings; changing shell vertical padding / tab chrome beyond inset.

## Approach

### P1 — Hook status

- Keep fail copy (`settings.captureFailed*`).
- Add short status strings: waiting / ok (en/zh), e.g. `settings.captureStatusWaiting`, `settings.captureStatusOk`.
- Markup: always render `<p class="hook-status" class:ok=… class:error=…>` above sections.
- Colors: `--app-success` / `--app-danger` on `:root` / `[data-appearance]` (dark: soft greens/reds; light: stronger/darker for contrast). Prefer tokens over `#fca5a5`.

### P2 — Radius

```css
--radius-lg: 12px;
```

`FormSection` `.form-group { border-radius: var(--radius-lg); }`

### P3 — Panel inset

- Single shared value, e.g. `--panel-pad-x: 16px` on shell, or duplicate `padding-inline: 16px` on each `.panel` (prefer shell token consumed by panels).
- Tabs stay in `.top` without that inset (full bleed). About may keep vertical centering with same inline pad.

## Trade-offs

| Choice | Why |
|--------|-----|
| Always-on status | design/02 asked for color; fail-only hides “healthy” |
| Token success/danger | Light mode needs different values than dark pastels |
| Pad panels not shell | Keeps tabs edge-to-edge after user’s `padding: 0` shell |
