<script lang="ts">
  import { getName, getVersion } from "@tauri-apps/api/app";
  import { onMount } from "svelte";
  import { t, type UiLocale } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
  };

  let { active, locale }: Props = $props();

  const FALLBACK_APP_NAME = "z-key-cast";
  const FALLBACK_APP_VERSION = "1.0.0";

  let appName = $state(FALLBACK_APP_NAME);
  let appVersion = $state(FALLBACK_APP_VERSION);

  onMount(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [name, version] = await Promise.all([getName(), getVersion()]);
        if (!cancelled) {
          if (name) appName = name;
          if (version) appVersion = version;
        }
      } catch {
        // Keep package fallbacks when not running under Tauri.
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<div
  class="panel about-panel"
  id="panel-about"
  role="tabpanel"
  aria-labelledby="tab-about"
  hidden={!active}
  inert={!active}
>
  <h1 class="about-name">{appName}</h1>
  <p class="about-version"
    >{t("about.version", locale, { version: appVersion })}</p
  >
  <p class="lead">{t("about.blurb", locale)}</p>
</div>

<style>
  .panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 10px;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .panel[hidden] {
    display: none;
  }

  .panel::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .about-name {
    margin: 0;
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .about-version {
    margin: 0;
    color: #7dd3fc;
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .lead {
    margin: 6px 0 0;
    max-width: 32ch;
    color: #94a3b8;
    line-height: 1.5;
  }
</style>
