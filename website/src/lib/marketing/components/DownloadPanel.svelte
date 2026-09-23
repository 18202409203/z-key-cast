<script lang="ts">
  import { onDestroy } from "svelte";
  import { t, type UiLocale } from "$lib/i18n";
  import type { MacDownload } from "../fetch-mac-download";

  const QUARANTINE_CMD =
    "xattr -dr com.apple.quarantine /Applications/z-key-cast.app";

  type Props = {
    locale: UiLocale;
    macDownload: MacDownload;
    versionLabel: string;
  };
  let { locale, macDownload, versionLabel }: Props = $props();

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copyCommand() {
    const ok = await writeClipboard(QUARANTINE_CMD);
    if (!ok) return;
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copied = false;
    }, 1500);
  }

  async function writeClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // LAN http is not a secure context; fall through.
    }
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  onDestroy(() => clearTimeout(copyTimer));
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
      · {t("download.panel.platform", locale)}
      {#if macDownload.sizeLabel}
        · {macDownload.sizeLabel}
      {/if}
    </p>
    <div class="download-hint">
      <p class="download-note">{t("download.panel.quarantine", locale)}</p>
      <div class="download-cmd">
      <button
        type="button"
        class="copy-cmd"
        aria-label={copied
          ? t("download.panel.copied", locale)
          : t("download.panel.copy", locale)}
        onclick={copyCommand}
      >
        {#if copied}
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M3.5 8.5 6.5 11.5 12.5 4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <rect
              x="5.5"
              y="5.5"
              width="8"
              height="8"
              rx="1.2"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <path
              d="M4.5 10.5H3.2A1.2 1.2 0 0 1 2 9.3V3.2A1.2 1.2 0 0 1 3.2 2H9.3a1.2 1.2 0 0 1 1.2 1.2V4.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
        {/if}
      </button>
        <code>{QUARANTINE_CMD}</code>
      </div>
    </div>
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
    animation: fade 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
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

  .download-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    max-width: 34rem;
  }

  .download-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--fg-muted);
    line-height: 1.5;
  }

  .download-cmd {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    max-width: 100%;
  }

  .download-cmd code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
    color: var(--fg);
    white-space: nowrap;
    overflow-x: auto;
  }

  .copy-cmd {
    flex: 0 0 auto;
    display: inline-flex;
    padding: 0;
    border: 0;
    background: none;
    color: var(--fg-muted);
    cursor: pointer;
  }

  .copy-cmd:hover,
  .copy-cmd:focus-visible {
    color: var(--fg);
  }

  .copy-cmd svg {
    width: 14px;
    height: 14px;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
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
