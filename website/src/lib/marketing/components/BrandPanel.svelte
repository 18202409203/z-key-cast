<script lang="ts">
  import { t, type UiLocale } from "$lib/i18n";
  import { PRODUCT_NAME } from "../constants";

  type Props = { locale: UiLocale };
  let { locale }: Props = $props();
</script>

<section
  id="brand"
  class="panel panel-brand"
  aria-label={PRODUCT_NAME}
>
  <header class="brand">
    <h1>{PRODUCT_NAME}</h1>
    <p class="tagline">{t("brand.tagline", locale)}</p>
  </header>
</section>

<style>
  .panel-brand {
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .brand {
    text-align: center;
  }

  h1 {
    margin: 0;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 800;
    font-size: clamp(2.35rem, 6vw, 3.35rem);
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: #fff;
  }

  .tagline {
    margin: 0.55rem 0 0;
    font-size: clamp(0.95rem, 2.2vw, 1.1rem);
    font-weight: 400;
    color: var(--fg-muted);
    letter-spacing: 0.01em;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      /* `none` — leave no transform containing block (breaks HUD fixed/absolute outro). */
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel-brand {
      animation: none;
    }
  }
</style>
