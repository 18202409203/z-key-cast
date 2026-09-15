<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import KeyboardMap from "$lib/KeyboardMap.svelte";
  import KeyCard from "$lib/KeyCard.svelte";
  import { toKeyCardVisual } from "$lib/key-card";
  import { resolveKeyboardLegendLayout } from "$lib/key-legends";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    formatHudLabel,
    hudCards,
    isHookStatus,
    isHudChip,
    type HudChip,
    type KeyRef,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_STYLE_CHANNEL,
    getHudStyleSettings,
    hudBackgroundCss,
    isHudStyleSettings,
    normalizeHudStyleSettings,
    type HudStyleSettings,
  } from "$lib/settings";

  type ActiveHud =
    | { kind: "chip"; chip: HudChip }
    | { kind: "message"; text: string };

  let active = $state<ActiveHud | null>(null);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const legendLayout = $derived(
    resolveKeyboardLegendLayout(style.keyboardLegendLayout),
  );

  const activeKeyIds = $derived.by(() => {
    const ids = new Set<string>();
    if (active?.kind === "chip" && active.chip.kind === "key") {
      for (const card of hudCards(active.chip)) {
        ids.add(card.id);
      }
    }
    return ids;
  });

  const chipBackground = $derived(
    hudBackgroundCss(style.backgroundColor, style.backgroundOpacity),
  );

  function clearIdleTimer() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  function armIdle() {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      active = null;
      idleTimer = null;
    }, style.dwellMs);
  }

  function applyStyle(next: HudStyleSettings) {
    style = normalizeHudStyleSettings(next);
    if (active !== null) {
      armIdle();
    }
  }

  function showChip(chip: HudChip) {
    active = { kind: "chip", chip };
    armIdle();
  }

  function showMessage(text: string) {
    active = { kind: "message", text };
    armIdle();
  }

  function cardsForActive(): KeyRef[] {
    if (!active) return [];
    if (active.kind === "message") {
      return [{ id: "message", label: active.text }];
    }
    return hudCards(active.chip);
  }

  function textForActive(): string {
    if (!active) return "";
    if (active.kind === "message") return active.text;
    return formatHudLabel(active.chip);
  }

  const showKeyboardMap = $derived(
    style.keyboardDisplayMode === "keyboard" &&
      active?.kind === "chip" &&
      active.chip.kind === "key",
  );

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
        showChip(event.payload);
      });
      if (cancelled) {
        unlistenEvent();
        return;
      }
      unsubs.push(unlistenEvent);

      const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
        if (!isHookStatus(event.payload)) return;
        if (!event.payload.ok) {
          showMessage(`Hook offline · ${event.payload.reason ?? "denied"}`);
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
  {#if active}
    {#if showKeyboardMap}
      <div transition:fade={{ duration: 200 }}>
        <KeyboardMap
          activeIds={activeKeyIds}
          textColor={style.textColor}
          backgroundCss={chipBackground}
          fontSizePx={style.fontSizePx}
          legendLayout={legendLayout}
        />
      </div>
    {:else if style.keyboardDisplayMode === "key-card"}
      <div
        class="card-row"
        style:--cap-scale={`${style.fontSizePx}px`}
        transition:fade={{ duration: 200 }}
      >
        {#each cardsForActive() as card (card.id)}
          <KeyCard
            visual={toKeyCardVisual(card, legendLayout)}
            fontSizePx={style.fontSizePx}
            textColor={style.textColor}
            backgroundCss={chipBackground}
          />
        {/each}
      </div>
    {:else}
      <div
        class="chip"
        style:font-size={`${style.fontSizePx}px`}
        style:color={style.textColor}
        style:background={chipBackground}
        transition:fade={{ duration: 200 }}
      >
        {textForActive()}
      </div>
    {/if}
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
    padding: 12px;
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

  .card-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 10px;
    max-width: 100%;
  }
</style>
