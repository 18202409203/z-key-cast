<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { fade } from "svelte/transition";
  import { onMount } from "svelte";
  import KeyboardMap from "$lib/KeyboardMap.svelte";
  import {
    KEYBOARD_MAP_FONT_PX,
    KEYBOARD_MAP_WIDTH_PX,
  } from "$lib/keyboard-layout";
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
    isModifierKeyId,
    type HudChip,
    type KeyRef,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_PLACE_MODE_CHANNEL,
    HUD_STYLE_CHANNEL,
    UI_LOCALE_CHANNEL,
    getHudStyleSettings,
    getUiLocaleSettings,
    hudBackgroundCss,
    isHudPlaceModePayload,
    isHudStyleSettings,
    isUiLocalePayload,
    normalizeHudStyleSettings,
    setUiLocaleSettings,
    type HudPreset,
    type HudStyleSettings,
  } from "$lib/settings";
  import {
    guessLocaleFromSystem,
    t,
    type UiLocale,
  } from "$lib/i18n";

  type KeyChip = Extract<HudChip, { kind: "key" }>;
  type MouseChip = Extract<HudChip, { kind: "mouse" }>;
  type MouseButton = MouseChip["button"];

  let keySlot = $state<KeyChip | null>(null);
  let mouseSlot = $state<MouseChip | null>(null);
  let heldKeyIds = $state<Set<string>>(new Set());
  let heldMouseButtons = $state<Set<MouseButton>>(new Set());
  /** When true, overlay shows hook-offline status (re-translated on locale change). */
  let statusActive = $state(false);
  /** Raw reason code; `null` while active → localized "denied" fallback. */
  let statusReason = $state<string | null>(null);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let placeMode = $state(false);
  let locale = $state<UiLocale>("en");
  let keyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let mouseIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let statusIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const statusText = $derived(
    statusActive
      ? t("overlay.hookOffline", locale, {
          reason: statusReason ?? t("overlay.denied", locale),
        })
      : null,
  );

  const legendLayout = $derived(
    resolveKeyboardLegendLayout(style.keyboardLegendLayout),
  );

  const hudPreset = $derived<HudPreset>(style.hudPreset ?? "text");
  const isFull = $derived(hudPreset === "full");
  const isLite = $derived(hudPreset === "lite");

  const activeKeyIds = $derived.by(() => {
    if (isFull) return heldKeyIds;
    const ids = new Set<string>();
    if (keySlot) {
      for (const card of hudCards(keySlot)) {
        ids.add(card.id);
      }
    }
    return ids;
  });

  const mouseActiveButtons = $derived.by(() => {
    if (isFull) return heldMouseButtons;
    if (mouseSlot) return new Set<MouseButton>([mouseSlot.button]);
    return new Set<MouseButton>();
  });

  const chipBackground = $derived(
    hudBackgroundCss(style.backgroundColor, style.backgroundOpacity),
  );

  const showKeyboardMap = $derived(isFull);
  const showKeyCards = $derived(isLite && keySlot !== null);
  const showMouseSchematic = $derived(isFull || (isLite && mouseSlot !== null));

  const showKeySide = $derived(
    showKeyboardMap || showKeyCards || (!isFull && !isLite && keySlot !== null),
  );

  const showMouseSide = $derived(
    showMouseSchematic || (!isFull && !isLite && mouseSlot !== null),
  );

  const showKmGroup = $derived(
    !statusActive &&
      (isFull ||
        keySlot !== null ||
        mouseSlot !== null),
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

  function clearHeldSets() {
    heldKeyIds = new Set();
    heldMouseButtons = new Set();
  }

  function armKeyIdle() {
    clearKeyIdleTimer();
    if (isFull) return;
    keyIdleTimer = setTimeout(() => {
      keySlot = null;
      keyIdleTimer = null;
    }, style.dwellMs);
  }

  function armMouseIdle() {
    clearMouseIdleTimer();
    if (isFull) return;
    mouseIdleTimer = setTimeout(() => {
      mouseSlot = null;
      mouseIdleTimer = null;
    }, style.dwellMs);
  }

  function clearStatus() {
    statusActive = false;
    statusReason = null;
  }

  function armStatusIdle() {
    clearStatusIdleTimer();
    statusIdleTimer = setTimeout(() => {
      clearStatus();
      statusIdleTimer = null;
    }, style.dwellMs);
  }

  function applyStyle(next: HudStyleSettings) {
    const previousPreset = style.hudPreset ?? "text";
    const normalized = normalizeHudStyleSettings(next);
    style = normalized;
    const nextPreset = normalized.hudPreset;

    if (previousPreset === "full" && nextPreset !== "full") {
      clearHeldSets();
    }
    if (previousPreset !== "full" && nextPreset === "full") {
      clearHeldSets();
      keySlot = null;
      mouseSlot = null;
      clearKeyIdleTimer();
      clearMouseIdleTimer();
    }

    // Use nextPreset (not derived `isFull`) so re-arming is deterministic in this sync path.
    if (nextPreset !== "full") {
      if (keySlot !== null) armKeyIdle();
      if (mouseSlot !== null) armMouseIdle();
    }
    if (statusActive) armStatusIdle();
  }

  function applyFullHeld(chip: HudChip) {
    if (chip.kind === "key") {
      const next = new Set(heldKeyIds);
      if (chip.phase === "down") next.add(chip.key.id);
      else next.delete(chip.key.id);
      heldKeyIds = next;
      return;
    }
    const next = new Set(heldMouseButtons);
    if (chip.phase === "down") next.add(chip.button);
    else next.delete(chip.button);
    heldMouseButtons = next;
  }

  function showChip(chip: HudChip) {
    if (isFull) {
      clearStatusIdleTimer();
      clearStatus();
      applyFullHeld(chip);
      return;
    }

    // Text / Lite: ignore ups and bare-modifier downs.
    if (chip.phase === "up") return;
    if (chip.kind === "key" && isModifierKeyId(chip.key.id)) return;

    if (chip.kind === "key") {
      clearStatusIdleTimer();
      clearStatus();
      keySlot = chip;
      armKeyIdle();
      return;
    }
    clearStatusIdleTimer();
    clearStatus();
    mouseSlot = chip;
    armMouseIdle();
  }

  function showHookOffline(reason: string | undefined) {
    keySlot = null;
    mouseSlot = null;
    clearHeldSets();
    clearKeyIdleTimer();
    clearMouseIdleTimer();
    statusActive = true;
    statusReason =
      reason === undefined || reason === "" ? null : reason;
    armStatusIdle();
  }

  function keyCards(): KeyRef[] {
    return keySlot ? hudCards(keySlot) : [];
  }

  function keyText(): string {
    return keySlot ? formatHudLabel(keySlot, legendLayout) : "";
  }

  function mouseText(): string {
    return mouseSlot ? formatHudLabel(mouseSlot, legendLayout) : "";
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
        const stored = await getUiLocaleSettings();
        if (!cancelled) {
          if (stored) {
            locale = stored;
          } else {
            const guessed = guessLocaleFromSystem();
            locale = guessed;
            try {
              await setUiLocaleSettings(guessed);
            } catch {
              // Main window may persist first; keep guessed locale in-memory.
            }
          }
        }
      } catch {
        if (!cancelled) locale = guessLocaleFromSystem();
      }

      try {
        const loaded = await getHudStyleSettings();
        if (!cancelled) applyStyle(loaded);
      } catch {
        // Keep defaults when invoke is unavailable (browser-only).
      }

      const unlistenLocale = await listen(UI_LOCALE_CHANNEL, (event) => {
        if (!isUiLocalePayload(event.payload)) return;
        locale = event.payload.locale;
      });
      if (cancelled) {
        unlistenLocale();
        return;
      }
      unsubs.push(unlistenLocale);

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
          showHookOffline(event.payload.reason);
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
  aria-label={placeMode
    ? t("overlay.placeAria", locale)
    : t("overlay.hudAria", locale)}
  aria-live="polite"
  onpointerdown={onPlacePointerDown}
>
  {#if placeMode}
    <div class="place-affordance" transition:fade={{ duration: 150 }}>
      {t("overlay.placeAffordance", locale)}
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
  {:else if showKmGroup}
    <div
      class="km-group"
      class:km-klmr={(style.keyMouseLayout ?? "key-left-mouse-right") ===
        "key-left-mouse-right"}
      class:km-krml={style.keyMouseLayout === "key-right-mouse-left"}
      class:km-ktmb={style.keyMouseLayout === "key-top-mouse-bottom"}
      class:km-kbmt={style.keyMouseLayout === "key-bottom-mouse-top"}
    >
      {#if showKeySide}
        <div class="km-key">
          {#if showKeyboardMap}
            <div
              class="full-board"
              style:width={`${KEYBOARD_MAP_WIDTH_PX}px`}
              style:max-width="100%"
              transition:fade={{ duration: 200 }}
            >
              <KeyboardMap
                activeIds={activeKeyIds}
                textColor={style.textColor}
                backgroundCss={chipBackground}
                fontSizePx={KEYBOARD_MAP_FONT_PX}
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
          {:else if keySlot}
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
        </div>
      {/if}

      {#if showMouseSide}
        <div class="km-mouse">
          {#if showMouseSchematic}
            <div transition:fade={{ duration: 200 }}>
              <MouseSchematic
                activeButtons={mouseActiveButtons}
                textColor={style.textColor}
                backgroundCss={chipBackground}
                fontSizePx={isFull
                  ? DEFAULT_HUD_STYLE.fontSizePx
                  : style.fontSizePx}
              />
            </div>
          {:else if mouseSlot}
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
        </div>
      {/if}
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

  .km-group {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    max-width: 100%;
  }

  .km-group.km-klmr,
  .km-group.km-krml {
    flex-direction: row;
  }

  .km-group.km-ktmb,
  .km-group.km-kbmt {
    flex-direction: column;
  }

  .km-key {
    order: 0;
  }

  .km-mouse {
    order: 1;
  }

  .km-group.km-krml .km-key,
  .km-group.km-kbmt .km-key {
    order: 1;
  }

  .km-group.km-krml .km-mouse,
  .km-group.km-kbmt .km-mouse {
    order: 0;
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
