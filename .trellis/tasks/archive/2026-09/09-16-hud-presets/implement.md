# Implement: HUD presets Text · Lite · Full

## Checklist

1. **Contract (Rust)** — Add `phase` to serialized `HudChip`; change `ChipReducer` to emit bare-mod and ups; update unit tests in `chip.rs` (and any emit path tests).
2. **Contract (TS)** — Update `$lib/cast.ts` (or equivalent) `HudChip` type + any guards/formatters for log labels including phase.
3. **Settings model** — Rust + TS: `hudPreset`; remove `keyboardDisplayMode`, `mouseDisplayMode`, `persistVisible`; clamp/normalize/default `"text"`; best-effort legacy read; roundtrip tests.
4. **Settings UI** — Segmented/radio Text·Lite·Full; remove dual selects + persist; hide dwell when Full; i18n en/zh.
5. **MouseSchematic** — Multi-button active API; update Lite + Full call sites.
6. **Overlay** — Derive surfaces from preset; Text/Lite keep slot+dwell (ignore up / bare mod); Full pin + held-sets; status exclusivity; preset hot-update via existing style channel.
7. **Main Log** — Show down and up.
8. **Spec / product docs** — `.trellis/spec/tauri/cast-events.md`, frontend type-safety notes, `design/index.md` chip sketch as needed.
9. **Smoke** — Text default fade; Lite key-card+schematic; Full empty pin, chord hold, mouse multi-button, bare ⌘ light; dwell hidden on Full; log shows ups.

## Validation

```bash
# Rust unit tests (chip / settings)
cd src-tauri && cargo test

# Frontend check (project’s usual script)
npm test   # or pnpm / vitest if present — use repo standard
npm run check  # svelte-check / tsc if present
```

Manual:

- [ ] Toggle Text → Lite → Full live; overlay updates without restart.
- [ ] Full: no keys → board+mouse visible; hold ⌘S → both lit; release S → ⌘ remains; release ⌘ → clear.
- [ ] Full: left+right mouse both lit when both held.
- [ ] Text/Lite: bare ⌘ alone does not show a bar chip; ups do not flash the bar.
- [ ] Log: downs and ups both listed.

## Review gates

- No remaining UI or types for independent display modes / persistVisible.
- Full path does not use dwell for highlight clear.
- Emit path does not gate ups on preset (consumer-side only).

## Rollback

Revert the task branch/commit; users with new `hudPreset`-only JSON fall back to defaults on old builds if they downgrade (acceptable).

## Order note

Do contract + settings types before overlay UI so TypeScript/Rust stay compilable at each step; ship only when AC8 (Full+held-set) is done.
