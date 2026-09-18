<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getName } from "@tauri-apps/api/app";
  import { onMount } from "svelte";
  import Tabs from "$lib/components/Tabs.svelte";
  import AboutPanel from "$lib/panels/AboutPanel.svelte";
  import AppearancePanel from "$lib/panels/AppearancePanel.svelte";
  import CapturePanel from "$lib/panels/CapturePanel.svelte";
  import HudPanel from "$lib/panels/HudPanel.svelte";
  import LogPanel from "$lib/panels/LogPanel.svelte";
  import { guessLocaleFromSystem, t, type UiLocale } from "$lib/i18n";
  import {
    UI_APPEARANCE_CHANNEL,
    getUiAppearanceSettings,
    isUiAppearancePayload,
    resolveAppearance,
    type ResolvedAppearance,
    type UiAppearance,
  } from "$lib/settings";

  type MainTab = "hud" | "appearance" | "capture" | "log" | "about";

  const MAX_LOG_LINES = 100;
  const FALLBACK_APP_NAME = "z-key-cast";
  const SCHEME_QUERY = "(prefers-color-scheme: dark)";

  let locale = $state<UiLocale>(guessLocaleFromSystem());
  let appearance = $state<UiAppearance>("system");
  let resolvedAppearance = $state<ResolvedAppearance>("dark");
  let activeTab = $state<MainTab>("hud");
  let logLines = $state<string[]>([]);
  let appName = $state(FALLBACK_APP_NAME);

  const TABS = $derived<{ id: MainTab; label: string }[]>([
    { id: "hud", label: t("nav.hud", locale) },
    { id: "appearance", label: t("nav.appearance", locale) },
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

  function applyResolved(mode: UiAppearance) {
    const resolved = resolveAppearance(mode);
    resolvedAppearance = resolved;
    if (typeof document !== "undefined") {
      document.documentElement.dataset.appearance = resolved;
    }
  }

  function onAppearanceChange(next: UiAppearance) {
    appearance = next;
    applyResolved(next);
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];
    const media =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(SCHEME_QUERY)
        : null;

    const onSchemeChange = () => {
      if (appearance === "system") applyResolved("system");
    };

    void (async () => {
      try {
        const name = await getName();
        if (!cancelled && name) appName = name;
      } catch {
        // Keep package fallback when not running under Tauri.
      }

      try {
        const stored = await getUiAppearanceSettings();
        if (!cancelled) {
          onAppearanceChange(stored ?? "system");
        }
      } catch {
        if (!cancelled) onAppearanceChange("system");
      }

      try {
        const unlisten = await listen(UI_APPEARANCE_CHANNEL, (event) => {
          if (!isUiAppearancePayload(event.payload)) return;
          onAppearanceChange(event.payload.appearance);
        });
        if (cancelled) {
          unlisten();
          return;
        }
        unsubs.push(unlisten);
      } catch {
        // Channel optional outside Tauri.
      }
    })();

    if (media) {
      media.addEventListener("change", onSchemeChange);
    }
    applyResolved(appearance);

    return () => {
      cancelled = true;
      for (const unlisten of unsubs) {
        unlisten();
      }
      if (media) {
        media.removeEventListener("change", onSchemeChange);
      }
    };
  });
</script>

<main class="shell" data-appearance={resolvedAppearance}>
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
    <AppearancePanel
      active={activeTab === "appearance"}
      {locale}
      {appearance}
      {appendLog}
      {onLocaleChange}
      {onAppearanceChange}
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
  /* Interpolable tokens so dark↔light crossfades (WKWebView / Chromium). */
  @property --app-bg {
    syntax: "<color>";
    inherits: true;
    initial-value: #1c1c1e;
  }
  @property --app-fg {
    syntax: "<color>";
    inherits: true;
    initial-value: #f5f5f7;
  }
  @property --app-muted {
    syntax: "<color>";
    inherits: true;
    initial-value: #98989d;
  }
  @property --app-faint {
    syntax: "<color>";
    inherits: true;
    initial-value: #636366;
  }
  @property --app-accent {
    syntax: "<color>";
    inherits: true;
    initial-value: #0a84ff;
  }
  @property --app-accent-soft {
    syntax: "<color>";
    inherits: true;
    initial-value: #0a84ff38;
  }
  @property --app-inset {
    syntax: "<color>";
    inherits: true;
    initial-value: #2c2c2e;
  }
  @property --app-hairline {
    syntax: "<color>";
    inherits: true;
    initial-value: #ffffff14;
  }
  @property --app-hairline-strong {
    syntax: "<color>";
    inherits: true;
    initial-value: #ffffff24;
  }
  @property --app-control-bg {
    syntax: "<color>";
    inherits: true;
    initial-value: #3a3a3c;
  }
  @property --app-control-bg-hover {
    syntax: "<color>";
    inherits: true;
    initial-value: #48484a;
  }
  @property --app-control-border {
    syntax: "<color>";
    inherits: true;
    initial-value: #48484a;
  }

  :global(:root),
  :global([data-appearance="dark"]) {
    --app-bg: #1c1c1e;
    --app-fg: #f5f5f7;
    --app-muted: #98989d;
    --app-faint: #636366;
    --app-accent: #0a84ff;
    --app-accent-soft: color-mix(in srgb, #0a84ff 22%, transparent);
    --app-inset: #2c2c2e;
    --app-hairline: rgba(255, 255, 255, 0.08);
    --app-hairline-strong: rgba(255, 255, 255, 0.14);
    --app-control-bg: #3a3a3c;
    --app-control-bg-hover: #48484a;
    --app-control-border: #48484a;
    --radius-sm: 8px;
    --radius-md: 10px;
  }

  /* Light: white page → soft inset → floated controls (mirrors dark deep→shallow). */
  :global([data-appearance="light"]) {
    --app-bg: #ffffff;
    --app-fg: #1d1d1f;
    --app-muted: #6e6e73;
    --app-faint: #8e8e93;
    --app-accent: #007aff;
    --app-accent-soft: color-mix(in srgb, #007aff 16%, transparent);
    --app-inset: #f2f2f7;
    --app-hairline: rgba(0, 0, 0, 0.08);
    --app-hairline-strong: rgba(0, 0, 0, 0.14);
    --app-control-bg: #ffffff;
    --app-control-bg-hover: #e8e8ed;
    --app-control-border: #d1d1d6;
    --radius-sm: 8px;
    --radius-md: 10px;
  }

  :global(html) {
    transition:
      --app-bg 240ms ease,
      --app-fg 240ms ease,
      --app-muted 240ms ease,
      --app-faint 240ms ease,
      --app-accent 240ms ease,
      --app-accent-soft 240ms ease,
      --app-inset 240ms ease,
      --app-hairline 240ms ease,
      --app-hairline-strong 240ms ease,
      --app-control-bg 240ms ease,
      --app-control-bg-hover 240ms ease,
      --app-control-border 240ms ease,
      background-color 240ms ease,
      color 240ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      transition: none;
    }
  }

  :global(html, body) {
    margin: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: var(--app-bg);
    color: var(--app-fg);
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .shell {
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
    color: var(--app-fg);
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
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--app-muted);
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
