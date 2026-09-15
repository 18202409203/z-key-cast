# Implement: key listen/ignore filter

## Checklist

1. **Rust settings**
   - Add `ignored_key_ids: Vec<String>` to `CaptureSettings` + `AppSettings` (`serde(default)`)
   - Runtime set + `filter_key_chip(chip) -> Option<HudChip>` (drop primary / strip mods)
   - Wire into `macos.rs` emit path after reduce, with `allows_chip`
   - Commands: `arm_ignore_key_capture`, `cancel_ignore_key_capture`; channel `cast://ignore-key-captured`
   - Unit tests: filter primary, strip mod, empty ignore, capture arm suppress emit (if testable without tap)

2. **TS settings / cast**
   - Extend `CaptureSettings` type + defaults
   - Category id map module (e.g. `src/lib/key-ignore-presets.ts`)
   - Channel constant + narrow type for capture payload in `cast.ts`

3. **Main Settings UI (`+page.svelte`)**
   - Capture section: category toggles, ignored list + remove, Add key / Cancel
   - Arm → listen capture channel → persist; Cancel → disarm
   - Load/save via existing capture persist helpers

4. **Validate**
   - `cargo test` (settings/filter)
   - `npm run check` / project lint+typecheck
   - Manual: ignore KeyA; ignore MetaLeft strip; category Letters; Add Esc; Cancel without add

## Validation commands

```bash
cd src-tauri && cargo test
npm run check
```

## Risky points

- Capture must not break held-mod reducer when suppressing emit
- Deduping `ignoredKeyIds` on set; category off must not wipe unrelated ids
- Autorepeat / EventFilter: capture should still see first down

## Rollback

Revert settings field + UI section; old clients ignore unknown JSON fields on next write if reverted carefully — prefer keep `ignoredKeyIds` default `[]` if partial ship.
