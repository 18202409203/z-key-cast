# Design — HUD 键鼠按 corner 贴边

## Boundaries

- **In**: Overlay content anchor derived from `HudPositionSettings`; `HudView` layout + Text/Lite timeline enter/exit mirror; live sync when position changes.
- **Out**: custom 内容锚点 UI（后续 C）；改 `keyMouseLayout`；改 Rust 窗口 `corner_position` 数学；表单分区任务。

## Content anchor derivation

```ts
function contentCorner(pos: HudPositionSettings): HudCorner {
  return pos.mode === "corner" ? pos.corner : "br"; // custom → br
}
```

| Corner | Main axis (column) | Cross (row items) | Timeline grow / enter |
|--------|--------------------|-------------------|------------------------|
| br | flex-end / end | bottom align | right → left (current) |
| bl | flex-end / start | bottom align | left → right |
| tr | flex-start / end | top align | right → left |
| tl | flex-start / start | top align | left → right |

CSS: class on `.hud` e.g. `hud-anchor-br` … drive `justify-content` / `align-items` on `.hud`, `.timeline`, `.card-row`, `.km-group`. Left anchors use timeline `flex-direction: row-reverse` + `justify-content: flex-end` so newest sits on the left grow edge.

## Live sync (required for AC)

Today position saves move the window but **do not emit** to overlay — no `cast://hud-position` channel. Overlay must learn corner changes without restart.

**Approach**: add `cast://hud-position` (mirror `cast://hud-style` pattern):

1. TS: `HUD_POSITION_CHANNEL` + payload = `HudPositionSettings` (already guarded by `isHudPositionSettings`).
2. Rust: emit after successful `set_hud_position_settings` and `end_hud_place_mode` (custom still → content br).
3. Overlay `+page.svelte`: `getHudPositionSettings` on mount + listen → pass `contentCorner` into `HudView`.

No change to window placement math beyond existing `apply_hud_position`.

## HudView changes

- New prop `contentCorner: HudCorner` (default `"br"`).
- `timelineIn` / `timelineOut` take horizontal sign from left vs right anchor (mirror translateX).
- `timelineOut` fixed-position pin stays; direction of exit slide mirrors.
- place affordance / status chips stay in `.hud` flex flow (auto-follow).

## Tradeoffs

| Choice | Why |
|--------|-----|
| Emit position channel vs only get on mount | AC requires instant corner switch |
| custom → fixed br | Locked; avoids quadrant jump / new settings field |
| Mirror timeline vs keep 右入左移 everywhere | Left corners look wrong without mirror |

## Rollout / rollback

- Frontend + small emit in `settings/hud.rs` + channel constant/ACL if emit needs listen permission (overlay already listens other cast channels).
- Revert channel + HudView + overlay page together.
