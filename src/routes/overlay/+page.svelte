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

  const IDLE_MS = 1000;

  let chipLabel = $state<string | null>(null);
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function showChip(label: string) {
    chipLabel = label;
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      chipLabel = null;
      idleTimer = null;
    }, IDLE_MS);
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
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
    <div class="chip" transition:fade={{ duration: 200 }}>{chipLabel}</div>
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
    background: rgba(15, 23, 42, 0.82);
    color: #f8fafc;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    backdrop-filter: blur(10px);
    box-shadow: 0 10px 30px rgba(2, 6, 23, 0.35);
  }
</style>
