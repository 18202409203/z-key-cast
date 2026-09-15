<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    formatHudLabel,
    isHookStatus,
    isHudChip,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_STYLE_CHANNEL,
    getHudStyleSettings,
    hudBackgroundCss,
    isHudStyleSettings,
    type HudStyleSettings,
  } from "$lib/settings";

  let chipLabel = $state<string | null>(null);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function applyStyle(next: HudStyleSettings) {
    style = next;
    if (chipLabel !== null) {
      // Restart dwell with the new duration while a chip is visible.
      showChip(chipLabel);
    }
  }

  function showChip(label: string) {
    chipLabel = label;
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      chipLabel = null;
      idleTimer = null;
    }, style.dwellMs);
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const loaded = await getHudStyleSettings();
        if (!cancelled) applyStyle(loaded);
      } catch {
        // Keep defaults when invoke is unavailable (browser-only).
      }

      const unlistenStyle = await listen(HUD_STYLE_CHANNEL, (event) => {
        if (!isHudStyleSettings(event.payload)) return;
        applyStyle(event.payload);
      });
      if (cancelled) {
        unlistenStyle();
        return;
      }
      unsubs.push(unlistenStyle);

      const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
        if (!isHudChip(event.payload)) return;
        showChip(formatHudLabel(event.payload));
      });
      if (cancelled) {
        unlistenEvent();
        return;
      }
      unsubs.push(unlistenEvent);

      const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
        if (!isHookStatus(event.payload)) return;
        if (!event.payload.ok) {
          showChip(`Hook offline · ${event.payload.reason ?? "denied"}`);
        }
      });
      if (cancelled) {
        unlistenStatus();
        return;
      }
      unsubs.push(unlistenStatus);
    })();

    return () => {
      cancelled = true;
      clearIdleTimer();
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<div class="hud" aria-live="polite">
  {#if chipLabel}
    <div
      class="chip"
      style:font-size={`${style.fontSizePx}px`}
      style:color={style.textColor}
      style:background={hudBackgroundCss(
        style.backgroundColor,
        style.backgroundOpacity,
      )}
      transition:fade={{ duration: 200 }}
    >
      {chipLabel}
    </div>
  {/if}
</div>

<style>
  :global(html, body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  :global(body) {
    background: transparent !important;
  }

  .hud {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 10px;
    pointer-events: none;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .chip {
    max-width: 100%;
    padding: 10px 14px;
    border-radius: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(2, 6, 23, 0.35);
  }
</style>
