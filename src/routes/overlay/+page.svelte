<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import KeyboardMap from "$lib/KeyboardMap.svelte";
  import KeyCard from "$lib/KeyCard.svelte";
  import MouseSchematic from "$lib/MouseSchematic.svelte";
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
    HUD_PLACE_MODE_CHANNEL,
    HUD_STYLE_CHANNEL,
    getHudStyleSettings,
    hudBackgroundCss,
    isHudPlaceModePayload,
    isHudStyleSettings,
    normalizeHudStyleSettings,
    type HudStyleSettings,
  } from "$lib/settings";

  type KeyChip = Extract<HudChip, { kind: "key" }>;
  type MouseChip = Extract<HudChip, { kind: "mouse" }>;

  let keySlot = $state<KeyChip | null>(null);
  let mouseSlot = $state<MouseChip | null>(null);
  let statusText = $state<string | null>(null);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let placeMode = $state(false);
  let keyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let mouseIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let statusIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const legendLayout = $derived(
    resolveKeyboardLegendLayout(style.keyboardLegendLayout),
  );

  const activeKeyIds = $derived.by(() => {
    const ids = new Set<string>();
    if (keySlot) {
      for (const card of hudCards(keySlot)) {
        ids.add(card.id);
      }
    }
    return ids;
  });

  const chipBackground = $derived(
    hudBackgroundCss(style.backgroundColor, style.backgroundOpacity),
  );

  const showKeyboardMap = $derived(
    keySlot !== null && style.keyboardDisplayMode === "keyboard",
  );

  const showKeyCards = $derived(
    keySlot !== null && style.keyboardDisplayMode === "key-card",
  );

  const showMouseSchematic = $derived(
    mouseSlot !== null && style.mouseDisplayMode === "schematic",
  );

  function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer !== null) clearTimeout(timer);
  }

  function clearKeyIdleTimer() {
    clearTimer(keyIdleTimer);
    keyIdleTimer = null;
  }

  function clearMouseIdleTimer() {
    clearTimer(mouseIdleTimer);
    mouseIdleTimer = null;
  }

  function clearStatusIdleTimer() {
    clearTimer(statusIdleTimer);
    statusIdleTimer = null;
  }

  function clearAllIdleTimers() {
    clearKeyIdleTimer();
    clearMouseIdleTimer();
    clearStatusIdleTimer();
  }

  function armKeyIdle() {
    clearKeyIdleTimer();
    keyIdleTimer = setTimeout(() => {
      keySlot = null;
      keyIdleTimer = null;
    }, style.dwellMs);
  }

  function armMouseIdle() {
    clearMouseIdleTimer();
    mouseIdleTimer = setTimeout(() => {
      mouseSlot = null;
      mouseIdleTimer = null;
    }, style.dwellMs);
  }

  function armStatusIdle() {
    clearStatusIdleTimer();
    statusIdleTimer = setTimeout(() => {
      statusText = null;
      statusIdleTimer = null;
    }, style.dwellMs);
  }

  function applyStyle(next: HudStyleSettings) {
    style = normalizeHudStyleSettings(next);
    if (keySlot !== null) armKeyIdle();
    if (mouseSlot !== null) armMouseIdle();
    if (statusText !== null) armStatusIdle();
  }

  function showChip(chip: HudChip) {
    if (chip.kind === "key") {
      clearStatusIdleTimer();
      statusText = null;
      keySlot = chip;
      armKeyIdle();
      return;
    }
    clearStatusIdleTimer();
    statusText = null;
    mouseSlot = chip;
    armMouseIdle();
  }

  function showMessage(text: string) {
    keySlot = null;
    mouseSlot = null;
    clearKeyIdleTimer();
    clearMouseIdleTimer();
    statusText = text;
    armStatusIdle();
  }

  function keyCards(): KeyRef[] {
    return keySlot ? hudCards(keySlot) : [];
  }

  function keyText(): string {
    return keySlot ? formatHudLabel(keySlot) : "";
  }

  function mouseText(): string {
    return mouseSlot ? formatHudLabel(mouseSlot) : "";
  }

  async function onPlacePointerDown(event: PointerEvent) {
    if (!placeMode) return;
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore when not running under Tauri.
    }
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

      const unlistenPlace = await listen(HUD_PLACE_MODE_CHANNEL, (event) => {
        if (!isHudPlaceModePayload(event.payload)) return;
        placeMode = event.payload.active;
      });
      if (cancelled) {
        unlistenPlace();
        return;
      }
      unsubs.push(unlistenPlace);

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
      clearAllIdleTimers();
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<div
  class="hud"
  class:placing={placeMode}
  role="application"
  aria-label={placeMode ? "HUD place mode — drag to move" : "Key cast HUD"}
  aria-live="polite"
  onpointerdown={onPlacePointerDown}
>
  {#if placeMode}
    <div class="place-affordance" transition:fade={{ duration: 150 }}>
      Drag to move · Done in Settings
    </div>
  {/if}

  {#if statusText}
    <div
      class="chip"
      style:font-size={`${style.fontSizePx}px`}
      style:color={style.textColor}
      style:background={chipBackground}
      transition:fade={{ duration: 200 }}
    >
      {statusText}
    </div>
  {:else}
    {#if keySlot}
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
      {:else if showKeyCards}
        <div
          class="card-row"
          style:--cap-scale={`${style.fontSizePx}px`}
          transition:fade={{ duration: 200 }}
        >
          {#each keyCards() as card (card.id)}
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
          {keyText()}
        </div>
      {/if}
    {/if}

    {#if mouseSlot}
      {#if showMouseSchematic}
        <div transition:fade={{ duration: 200 }}>
          <MouseSchematic
            button={mouseSlot.button}
            textColor={style.textColor}
            backgroundCss={chipBackground}
            fontSizePx={style.fontSizePx}
          />
        </div>
      {:else}
        <div
          class="chip"
          style:font-size={`${style.fontSizePx}px`}
          style:color={style.textColor}
          style:background={chipBackground}
          transition:fade={{ duration: 200 }}
        >
          {mouseText()}
        </div>
      {/if}
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

  .hud.placing {
    pointer-events: auto;
    cursor: grab;
    border: 1px dashed rgba(56, 189, 248, 0.7);
    background: rgba(15, 23, 42, 0.18);
  }

  .hud.placing:active {
    cursor: grabbing;
  }

  .place-affordance {
    align-self: stretch;
    padding: 8px 12px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #e2e8f0;
    background: rgba(15, 23, 42, 0.82);
    border: 1px solid rgba(56, 189, 248, 0.45);
    text-align: center;
    user-select: none;
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
