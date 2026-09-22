<script lang="ts">
  import { t, type UiLocale } from "$lib/i18n";
  import type { MacDownload } from "../fetch-mac-download";

  type Props = {
    locale: UiLocale;
    macDownload: MacDownload;
    versionLabel: string;
  };
  let { locale, macDownload, versionLabel }: Props = $props();
</script>

<section
  id="downloads"
  class="panel panel-download"
  aria-label={t("downloads.aria", locale)}
>
  <div class="download-inner">
    <h2 class="download-title">{t("download.panel.title", locale)}</h2>
    <p class="download-lead">{t("download.panel.lead", locale)}</p>

    <div class="cta-row">
      <a class="download-btn" href={macDownload.href}
        >{t("download.panel.cta", locale)}</a
      >
      <!-- Future: Windows sibling button in this flex row -->
    </div>
    <p class="download-footnote">
      <span class="ver"
        >{t("cta.latest", locale, { version: versionLabel })}</span
      >
      · {macDownload.note}
    </p>
  </div>

  <!-- Lang footer lives in panel 3 — mandatory snap rejects content after the last snap target. -->
  <footer class="site-footer">
    <nav class="lang" aria-label={t("lang.switch", locale)}>
      <a href="/" aria-current={locale === "en" ? "page" : undefined}
        >{t("lang.en", locale)}</a
      >
      <span class="lang-sep" aria-hidden="true">|</span>
      <a href="/zh/" aria-current={locale === "zh" ? "page" : undefined}
        >{t("lang.zh", locale)}</a
      >
    </nav>
  </footer>
</section>

<style>
  .panel-download {
    justify-content: space-between;
    padding-bottom: 1.5rem;
  }

  .panel-download .download-inner {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
  }

  .site-footer {
    flex: 0 0 auto;
    width: 100%;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
    text-align: center;
  }

  .lang {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
  }

  .lang a {
    color: var(--fg-muted);
    text-decoration: none;
  }

  .lang a:hover {
    color: var(--fg);
  }

  .lang a[aria-current="page"] {
    color: var(--accent);
  }

  .lang-sep {
    color: #52525b;
    opacity: 0.7;
  }

  .download-inner {
    width: 100%;
    max-width: 36rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
  }

  .download-title {
    margin: 0;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 800;
    /* Keep one line on common laptop widths; shrink before wrapping. */
    font-size: clamp(1.85rem, 5.2vw, 3.25rem);
    letter-spacing: -0.04em;
    line-height: 1.05;
    color: #fff;
    font-style: italic;
    white-space: nowrap;
  }

  .download-lead {
    margin: 0;
    max-width: 28rem;
    font-size: clamp(0.95rem, 2vw, 1.1rem);
    color: var(--fg-muted);
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.85rem 1rem;
    margin-top: 0.35rem;
  }

  .download-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 12rem;
    padding: 0.85rem 1.6rem;
    border: 1px solid rgba(255, 255, 255, 0.92);
    border-radius: 0.45rem;
    background: #fff;
    color: #0a0a0a;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 700;
    font-size: 0.98rem;
    letter-spacing: 0.01em;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease,
      color 160ms ease;
  }

  .download-btn:hover {
    border-color: var(--accent);
    background: #0a0a0a;
    color: #fff;
    box-shadow: 0 0 18px var(--accent-dim);
  }

  .download-footnote {
    margin: 0;
    max-width: 26rem;
    font-size: 0.85rem;
    color: var(--fg-muted);
    line-height: 1.45;
  }

  .download-footnote .ver {
    color: var(--fg);
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  @media (max-width: 640px) {
    .download-footnote {
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .download-inner {
      animation: none;
    }
  }
</style>
