<script lang="ts">
  import { t, type UiLocale } from "$lib/i18n";
  import { PRODUCT_NAME } from "../constants";

  type Props = { locale: UiLocale };
  let { locale }: Props = $props();

  const features = [
    {
      key: "brand.feature.offline" as const,
      lead: "brand.feature.offline.lead" as const,
      icon: "offline",
    },
    {
      key: "brand.feature.size" as const,
      lead: "brand.feature.size.lead" as const,
      icon: "size",
    },
    {
      key: "brand.feature.oss" as const,
      lead: "brand.feature.oss.lead" as const,
      icon: "oss",
    },
  ];
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

  <ul class="features" aria-label={t("brand.features.aria", locale)}>
    {#each features as feature (feature.key)}
      <li class="feature">
        <span class="feature-frame" aria-hidden="true"></span>
        <span class="icon" aria-hidden="true">
          {#if feature.icon === "offline"}
            <!-- Local screen — runs on this machine -->
            <svg
              viewBox="0 0 32 32"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="5.5" y="6" width="21" height="14.5" rx="1.8" />
              <circle cx="16" cy="13.2" r="1.7" fill="currentColor" stroke="none" />
              <path d="M16 20.5v3.3" />
              <path d="M11.2 23.8h9.6" />
            </svg>
          {:else if feature.icon === "size"}
            <!-- Stacked chip layers — small footprint -->
            <svg
              viewBox="0 0 32 32"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="8" y="5.2" width="16" height="6.2" rx="1.2" stroke-opacity="0.4" />
              <rect x="8" y="11.6" width="16" height="6.2" rx="1.2" stroke-opacity="0.7" />
              <rect x="8" y="18" width="16" height="6.2" rx="1.2" />
              <path d="M12 24.2v2.1M16 24.2v2.1M20 24.2v2.1" />
            </svg>
          {:else}
            <!-- Code mark — open source, free to use -->
            <svg
              viewBox="0 0 32 32"
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12.2 8.2 6 16l6.2 7.8" />
              <path d="M19.8 8.2 26 16l-6.2 7.8" />
              <path d="M17.8 6.8 14.2 25.2" />
            </svg>
          {/if}
        </span>
        <span class="copy">
          <span class="label">{t(feature.key, locale)}</span>
          <span class="lead">{t(feature.lead, locale)}</span>
        </span>
      </li>
    {/each}
  </ul>
</section>

<style>
  .panel-brand {
    gap: 2.35rem;
    animation: fade 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .brand {
    text-align: center;
  }

  h1 {
    margin: 0;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 800;
    font-size: clamp(2.1rem, 5.5vw, 3.35rem);
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: #fff;
  }

  .tagline {
    margin: 0.45rem 0 0;
    font-size: clamp(0.9rem, 2vw, 1.1rem);
    font-weight: 400;
    color: var(--fg-muted);
    letter-spacing: 0.01em;
  }

  .features {
    list-style: none;
    margin: 0;
    padding: 0;
    width: min(100%, 46rem);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.15rem;
  }

  .feature {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    min-height: 5.9rem;
    padding: 1.05rem 0.75rem;
    text-align: center;
    border: 1px solid color-mix(in srgb, var(--accent) 72%, transparent);
    border-radius: 0.35rem;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--accent) 7%, transparent),
        transparent 42%
      ),
      color-mix(in srgb, #000 72%, var(--bg-elev));
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent),
      0 0 18px var(--accent-dim),
      inset 0 1px 0 color-mix(in srgb, var(--accent) 18%, transparent);
  }

  /* HUD corner ticks — scroll.jpeg tech frame read */
  .feature-frame {
    position: absolute;
    inset: 0.28rem;
    pointer-events: none;
    border-radius: 0.15rem;
    background:
      linear-gradient(var(--accent), var(--accent)) top left / 0.42rem 1px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) top left / 1px 0.42rem
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) top right / 0.42rem 1px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) top right / 1px 0.42rem
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) bottom left / 0.42rem 1px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) bottom left / 1px 0.42rem
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) bottom right / 0.42rem 1px
        no-repeat,
      linear-gradient(var(--accent), var(--accent)) bottom right / 1px 0.42rem
        no-repeat;
    opacity: 0.85;
  }

  .icon {
    position: relative;
    z-index: 1;
    display: inline-flex;
    color: var(--accent);
    line-height: 0;
    filter: drop-shadow(0 0 5px var(--accent-dim));
  }

  .copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.28rem;
    max-width: 16rem;
  }

  .label {
    max-width: 12rem;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-size: clamp(0.92rem, 2vw, 1.08rem);
    font-weight: 700;
    letter-spacing: 0.03em;
    line-height: 1.28;
    color: #fff;
    text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 22%, transparent);
    text-wrap: balance;
  }

  .lead {
    font-size: clamp(0.72rem, 1.45vw, 0.82rem);
    font-weight: 400;
    line-height: 1.35;
    color: var(--fg-muted);
    text-wrap: balance;
  }

  @media (max-width: 560px) {
    .features {
      grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
      width: 100%;
    }
  }

  /* Short laptop viewports (e.g. 1366×768) — keep name + tagline + cards uncropped. */
  @media (max-height: 820px) {
    .panel-brand {
      gap: 1.65rem;
    }

    h1 {
      font-size: clamp(1.85rem, 4.8vw, 2.75rem);
    }

    .tagline {
      margin-top: 0.35rem;
      font-size: clamp(0.85rem, 1.8vw, 1rem);
    }

    .features {
      gap: 0.95rem;
    }

    .feature {
      min-height: 5rem;
      padding: 0.75rem 0.55rem;
      gap: 0.5rem;
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent),
        0 0 12px var(--accent-dim),
        inset 0 1px 0 color-mix(in srgb, var(--accent) 14%, transparent);
    }

    .label {
      font-size: clamp(0.84rem, 1.7vw, 0.98rem);
      letter-spacing: 0.025em;
    }

    .lead {
      font-size: 0.7rem;
    }
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel-brand {
      animation: none;
    }

    .icon {
      filter: none;
    }

    .label {
      text-shadow: none;
    }

    .feature {
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent),
        inset 0 1px 0 color-mix(in srgb, var(--accent) 14%, transparent);
    }
  }
</style>
