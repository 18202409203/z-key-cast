<script lang="ts">
  import { t, type UiLocale } from "$lib/i18n";
  import { PANEL_NAV } from "../constants";

  type Props = {
    locale: UiLocale;
    activePanel: number;
    onSelect: (index: number) => void;
  };
  let { locale, activePanel, onSelect }: Props = $props();
</script>

<nav
  class="page-rail"
  data-stage-pointer-exempt
  aria-label={t("nav.aria", locale)}
>
  {#each PANEL_NAV as item, i}
    <button
      type="button"
      class="page-rail-dot"
      class:active={activePanel === i}
      aria-label={t(item.label, locale)}
      aria-current={activePanel === i ? "true" : undefined}
      onclick={() => onSelect(i)}
    ></button>
  {/each}
</nav>

<style>
  /* Left section rail — current step + click-to-jump (replaces bottom scroll arrows). */
  .page-rail {
    position: fixed;
    left: max(0.65rem, env(safe-area-inset-left, 0px));
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, #0a0a0a 55%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .page-rail-dot {
    box-sizing: border-box;
    width: 0.4rem;
    height: 0.4rem;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fg) 35%, transparent);
    cursor: pointer;
    transition:
      height 0.25s ease,
      background 0.2s ease,
      box-shadow 0.2s ease;
  }

  .page-rail-dot:hover {
    background: color-mix(in srgb, var(--fg) 65%, transparent);
  }

  .page-rail-dot:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 3px;
  }

  .page-rail-dot.active {
    height: 1.15rem;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent-dim);
  }

  @media (prefers-reduced-motion: reduce) {
    .page-rail-dot {
      transition: none;
    }
  }
</style>
