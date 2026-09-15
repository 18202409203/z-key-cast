<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    formatLabel,
    isCastEvent,
    isHookStatus,
  } from "$lib/cast";

  type HudItem = {
    id: number;
    label: string;
  };

  const MAX_CHIPS = 3;

  let items = $state<HudItem[]>([]);
  let nextId = 0;

  function pushChip(label: string) {
    nextId += 1;
    items = [...items, { id: nextId, label }].slice(-MAX_CHIPS);
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
        if (!isCastEvent(event.payload)) return;
        pushChip(formatLabel(event.payload));
      });
      if (cancelled) {
        unlistenEvent();
        return;
      }
      unsubs.push(unlistenEvent);

      const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
        if (!isHookStatus(event.payload)) return;
        if (!event.payload.ok) {
          pushChip(`Hook offline · ${event.payload.reason ?? "denied"}`);
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
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<div class="hud" aria-live="polite">
  {#each items as item (item.id)}
    <div class="chip">{item.label}</div>
  {/each}
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
    animation: rise 220ms ease-out;
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
