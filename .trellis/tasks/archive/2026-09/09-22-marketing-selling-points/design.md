# Design: Brand selling-point cards

## Architecture

Keep Brand as a single snap panel. Extend `BrandPanel.svelte` (or extract a tiny sibling under `components/` only if the file gets noisy).

```
$lib/marketing/components/
  BrandPanel.svelte          # title + tagline + feature row (preferred default)
  # optional only if BrandPanel bloats:
  # FeatureCards.svelte      # presentational list; props: locale
```

No new page-level state. No changes to `MarketingPage` snap / wheel / download wiring.

## Layout

```
.panel-brand
  header.brand (h1 + tagline)   # existing
  ul.features                   # NEW — 3 items, role=list
    li.feature
      span.icon[aria-hidden]    # inline SVG
      span.label                # t("brand.feature.N")
```

- Desktop: 3 equal columns in one row (`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))`).
- Narrow: wrap to column or `repeat(auto-fit, minmax(9rem, 1fr))` so cards stay readable.
- Card chrome: cyan HUD frame — bright accent border + soft `accent-dim` glow + inset top edge + corner ticks (match Stage/Download tech read, `scroll.jpeg`).
- Icon above title + one-line lead. 36px stroke SVGs: local screen (offline), stacked chip (size), code brackets (free/OSS). Leads in `brand.feature.*.lead`. `drop-shadow` on icon; reduced-motion strips glow.

## i18n contract

Add three keys to `website/src/lib/i18n.ts` (both `en` and `zh`):

| Key | en | zh |
|-----|----|----|
| `brand.feature.offline` | Runs offline | 离线可用 |
| `brand.feature.size` | Under 3 MB | 不到 3 MB |
| `brand.feature.oss` | 100% Free | 100% 免费 |
| `brand.feature.oss.lead` | Open source, yours to use | 开源代码，可自由使用 |

Optional: `brand.features.aria` = "Product highlights" / "产品卖点" for the list `aria-label`.

## Icons (I1)

Hand-written inline SVG in the component (or tiny const map of SVG snippets). Motifs:

1. Offline — unplugged plug **or** cloud with slash (pick one, keep stroke style consistent)
2. Size — small parcel / box
3. OSS — diamond / branch fork

Decorative only: `aria-hidden="true"` on icon wrappers; list text carries meaning.

## Boundaries

| Owns | Must not |
|------|----------|
| `BrandPanel` (+ optional FeatureCards) | Page snap, Stage power, download fetch |
| `i18n.ts` website catalog | App `$lib/i18n.ts` |
| Static copy for size claim | Reading DMG size at runtime |

## Compatibility / rollback

- Additive UI + i18n keys; revert BrandPanel + i18n keys restores prior Brand.
- After ship: update `site-updater.md` Out line — remove "Brand feature cards deferred".

## Trade-offs

| Choice | Why |
|--------|-----|
| Cards in BrandPanel vs new snap | Spec keeps 3 panels; cards are Brand content |
| Static "Under 3 MB" | Honest vs current ~2.81 MB; no CI coupling |
| Inline SVG vs icon pack | Zero dep; matches marketing accent strokes |
