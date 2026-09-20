<script lang="ts">
  import { getName, getVersion } from "@tauri-apps/api/app";
  import { invoke } from "@tauri-apps/api/core";
  import type { Update } from "@tauri-apps/plugin-updater";
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
  let updaterEnabled = $state(false);
  let checking = $state(false);
  let installing = $state(false);
  let pendingUpdate = $state<Update | null>(null);
  let statusKey = $state<
    | null
    | "about.update.checking"
    | "about.update.upToDate"
    | "about.update.available"
    | "about.update.downloading"
    | "about.update.installing"
    | "about.update.restarting"
    | "about.update.error"
    | "about.update.unavailable"
  >(null);
  let statusDetail = $state("");
  let availableVersion = $state("");

  onMount(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [name, version, enabled] = await Promise.all([
          getName(),
          getVersion(),
          invoke<boolean>("is_updater_enabled").catch(() => false),
        ]);
        if (!cancelled) {
          if (name) appName = name;
          if (version) appVersion = version;
          updaterEnabled = enabled === true;
          if (!updaterEnabled) statusKey = "about.update.unavailable";
        }
      } catch {
        // Keep package fallbacks when not running under Tauri.
        if (!cancelled) statusKey = "about.update.unavailable";
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  async function onCheckForUpdates() {
    if (!updaterEnabled || checking || installing) return;
    checking = true;
    statusDetail = "";
    availableVersion = "";
    pendingUpdate = null;
    statusKey = "about.update.checking";
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      if (!update) {
        statusKey = "about.update.upToDate";
        return;
      }
      pendingUpdate = update;
      availableVersion = update.version;
      statusKey = "about.update.available";
    } catch (err) {
      pendingUpdate = null;
      statusKey = "about.update.error";
      statusDetail = err instanceof Error ? err.message : String(err);
    } finally {
      checking = false;
    }
  }

  function onDismissUpdate() {
    if (installing) return;
    pendingUpdate = null;
    availableVersion = "";
    statusKey = null;
    statusDetail = "";
  }

  async function onConfirmUpdate() {
    const update = pendingUpdate;
    if (!update || installing) return;
    installing = true;
    statusDetail = "";
    try {
      statusKey = "about.update.downloading";
      await update.downloadAndInstall((event) => {
        if (event.event === "Started" || event.event === "Progress") {
          statusKey = "about.update.downloading";
        } else if (event.event === "Finished") {
          statusKey = "about.update.installing";
        }
      });
      statusKey = "about.update.restarting";
      pendingUpdate = null;
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      statusKey = "about.update.error";
      statusDetail = err instanceof Error ? err.message : String(err);
    } finally {
      installing = false;
    }
  }
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

  <div class="update-block">
    {#if updaterEnabled}
      <button
        type="button"
        class="clear"
        disabled={checking || installing}
        onclick={() => void onCheckForUpdates()}
      >
        {t("about.update.check", locale)}
      </button>
    {/if}
    {#if statusKey}
      <p class="update-status" role="status">
        {#if statusKey === "about.update.available"}
          {t(statusKey, locale, { version: availableVersion || "…" })}
        {:else}
          {t(statusKey, locale)}
        {/if}
        {#if statusDetail}
          <span class="update-detail"> {statusDetail}</span>
        {/if}
      </p>
    {/if}
    {#if pendingUpdate && statusKey === "about.update.available"}
      <div class="update-actions">
        <button
          type="button"
          class="clear primary"
          disabled={installing}
          onclick={() => void onConfirmUpdate()}
        >
          {t("about.update.install", locale)}
        </button>
        <button
          type="button"
          class="clear"
          disabled={installing}
          onclick={onDismissUpdate}
        >
          {t("about.update.later", locale)}
        </button>
      </div>
    {/if}
  </div>
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
    padding-inline: var(--panel-pad-x);
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
    color: var(--app-accent);
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .lead {
    margin: 6px 0 0;
    color: var(--app-muted);
    line-height: 1.5;
  }

  .update-block {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .update-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .update-status {
    margin: 0;
    color: var(--app-muted);
    font-size: 13px;
    line-height: 1.4;
  }

  .update-detail {
    color: var(--app-muted);
  }

  .clear {
    appearance: none;
    border: 1px solid color-mix(in srgb, var(--app-fg) 18%, transparent);
    background: color-mix(in srgb, var(--app-fg) 6%, transparent);
    color: var(--app-fg);
    border-radius: 8px;
    padding: 6px 12px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }

  .clear.primary {
    border-color: color-mix(in srgb, var(--app-accent) 45%, transparent);
    background: color-mix(in srgb, var(--app-accent) 16%, transparent);
  }

  .clear:hover:not(:disabled) {
    background: color-mix(in srgb, var(--app-fg) 10%, transparent);
  }

  .clear.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--app-accent) 24%, transparent);
  }

  .clear:disabled {
    opacity: 0.55;
    cursor: default;
  }
</style>
