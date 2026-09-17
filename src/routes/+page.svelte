<script lang="ts">
  import { getName } from "@tauri-apps/api/app";
  import { onMount } from "svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import AboutPanel from "$lib/panels/AboutPanel.svelte";
  import CapturePanel from "$lib/panels/CapturePanel.svelte";
  import HudPanel from "$lib/panels/HudPanel.svelte";
  import LogPanel from "$lib/panels/LogPanel.svelte";
  import SettingsPanel from "$lib/panels/SettingsPanel.svelte";
  import { guessLocaleFromSystem, t, type UiLocale } from "$lib/i18n";

  type MainTab = "hud" | "settings" | "capture" | "log" | "about";

  const MAX_LOG_LINES = 100;
  const FALLBACK_APP_NAME = "z-key-cast";

  let locale = $state<UiLocale>(guessLocaleFromSystem());
  let activeTab = $state<MainTab>("hud");
  let logLines = $state<string[]>([]);
  let appName = $state(FALLBACK_APP_NAME);

  const TABS = $derived<{ id: MainTab; label: string }[]>([
    { id: "hud", label: t("nav.hud", locale) },
    { id: "settings", label: t("nav.settings", locale) },
    { id: "capture", label: t("nav.capture", locale) },
    { id: "log", label: t("nav.log", locale) },
    { id: "about", label: t("nav.about", locale) },
  ]);

  function appendLog(line: string) {
    const stamp = new Date().toLocaleTimeString();
    logLines = [...logLines, `${stamp}  ${line}`].slice(-MAX_LOG_LINES);
  }

  function clearLog() {
    logLines = [];
  }

  function onLocaleChange(next: UiLocale) {
    locale = next;
  }

  onMount(() => {
    let cancelled = false;
    void (async () => {
      try {
        const name = await getName();
        if (!cancelled && name) appName = name;
      } catch {
        // Keep package fallback when not running under Tauri.
      }
    })();
    return () => {
      cancelled = true;
    };
  });
</script>

<main class="shell">
  <header class="top">
    <p class="brand">{appName}</p>
    <Tabs
      items={TABS}
      value={activeTab}
      ariaLabel={t("nav.aria", locale)}
      onChange={(id) => (activeTab = id as MainTab)}
    />
  </header>

  <div class="panels">
    <HudPanel
      active={activeTab === "hud"}
      {locale}
      {appendLog}
    />
    <SettingsPanel
      active={activeTab === "settings"}
      {locale}
      {appendLog}
      {onLocaleChange}
    />
    <CapturePanel
      active={activeTab === "capture"}
      {locale}
      {appendLog}
    />
    <LogPanel
      active={activeTab === "log"}
      {locale}
      {logLines}
      {appendLog}
      onClear={clearLog}
    />
    <AboutPanel active={activeTab === "about"} {locale} />
  </div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.18), transparent 42%),
      radial-gradient(circle at 88% 12%, rgba(251, 146, 60, 0.16), transparent 36%),
      linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0b1220 100%);
    color: #e2e8f0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .shell {
    --radius-sm: 8px;
    --radius-md: 10px;
    /* Content column: 560 + 40 pad ≈ 600 default window; stays centered if wider / fullscreen. */
    --shell-max: 560px;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    max-width: var(--shell-max);
    margin-inline: auto;
    padding: 20px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-x: hidden;
    overflow-y: hidden;
  }

  .top {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .brand {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7dd3fc;
  }

  .panels {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panels :global(.panel) {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }
</style>
