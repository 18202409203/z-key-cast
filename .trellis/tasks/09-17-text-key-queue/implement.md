# Implement: Text / Lite operation timeline

1. **Slots** — `hud-slots.svelte.ts`: timeline array + per-id timers; scroll tail-refresh; status clears all; preset switches clear appropriately; remove Text/Lite dual-slot mouse path for chips (Full pulse stays).
2. **HudView** — Text: row of text chips; Lite: KeyCard + mouse/scroll glyph components; keyed list + fade/short layout transition; Full branch untouched.
3. **Mouse frames** — extend `MouseSchematic` (or thin wrapper) with compact/timeline size + single-frame props for L/R/M/scroll↑/↓; colors via existing `textColor`/`backgroundCss`; height align with KeyCard.
4. **HudPanel + i18n** — `keyMouseLayout` visible iff Full; update Text/Lite hints; adjust preset schematic art if it still shows dual panes for Lite.
5. **Overlay page wiring** — pass timeline props instead of keySlot/mouseSlot for Text/Lite (or adapt derived).
6. **design/03.md** — lock timeline summary; note Lite surface change.
7. **Specs** — update `.trellis/spec/tauri/cast-events.md` consumer table (Text/Lite timeline vs Full); frontend notes if needed.
8. **Validate** — `pnpm check`; manual: Text/Lite queue, scroll refresh, status clear, Full unchanged, layout hidden on Text/Lite.

## Rollback

Git revert overlay/settings/i18n/docs commits for this task.

## Ready for start when

- [x] PRD converged (grilling locked)
- [x] design.md + implement.md present
- [ ] implement.jsonl + check.jsonl curated
- [ ] User reviewed artifacts → `task.py start`
