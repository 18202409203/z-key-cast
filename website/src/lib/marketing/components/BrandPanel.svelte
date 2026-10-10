<script lang="ts">
  import { t, type MessageKey, type UiLocale } from "$lib/i18n";
  import { PANEL_NAV, PRODUCT_NAME, SOURCE_REPO_URL } from "../constants";

  type Props = {
    locale: UiLocale;
    onSelectPanel: (index: number) => void;
  };
  let { locale, onSelectPanel }: Props = $props();

  const stageIndex = PANEL_NAV.findIndex((item) => item.id === "stage");
  const downloadIndex = PANEL_NAV.findIndex((item) => item.id === "downloads");

  type FeatureBase = {
    key: MessageKey;
    lead: MessageKey;
    icon: "offline" | "size" | "oss";
  };
  type Feature =
    | (FeatureBase & { panel: number; href?: undefined })
    | (FeatureBase & { href: string; panel?: undefined });

  const features: Feature[] = [
    {
      key: "brand.feature.offline",
      lead: "brand.feature.offline.lead",
      icon: "offline",
      panel: stageIndex,
    },
    {
      key: "brand.feature.size",
      lead: "brand.feature.size.lead",
      icon: "size",
      panel: downloadIndex,
    },
    {
      key: "brand.feature.oss",
      lead: "brand.feature.oss.lead",
      icon: "oss",
      href: SOURCE_REPO_URL,
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

  {#snippet featureBody(feature: Feature)}
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
  {/snippet}

  <ul class="features" aria-label={t("brand.features.aria", locale)}>
    {#each features as feature (feature.key)}
      <li>
        {#if feature.href}
          <a
            class="feature"
            href={feature.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {@render featureBody(feature)}
          </a>
        {:else}
          <button
            type="button"
            class="feature"
            onclick={() => {
              if (feature.panel !== undefined) onSelectPanel(feature.panel);
            }}
          >
            {@render featureBody(feature)}
          </button>
        {/if}
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

  .features > li {
    display: flex;
    min-width: 0;
  }

  .feature {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    appearance: none;
    font: inherit;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.7rem;
    min-height: 5.9rem;
    padding: 1.05rem 0.75rem;
    text-align: center;
    border: 1px solid color-mix(in srgb, var(--accent) 72%, transparent);
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      color 160ms ease;
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

  .feature:hover {
    border-color: var(--accent);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent),
      0 0 26px var(--accent-dim),
      inset 0 1px 0 color-mix(in srgb, var(--accent) 28%, transparent);
  }

  .feature:hover .icon {
    color: color-mix(in srgb, var(--accent) 35%, white);
  }

  .feature:active {
    border-color: var(--accent);
    box-shadow:
      0 0 0 1px var(--accent),
      0 0 10px var(--accent-dim),
      inset 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .feature:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 3px;
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
    transition: color 160ms ease;
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

    .feature,
    .icon {
      transition: none;
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
