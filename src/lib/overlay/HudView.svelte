<script lang="ts">
  import { fade } from "svelte/transition";
  import KeyboardMap from "$lib/components/KeyboardMap.svelte";
  import {
    KEYBOARD_MAP_FONT_PX,
    KEYBOARD_MAP_WIDTH_PX,
  } from "$lib/keyboard-layout";
  import KeyCard from "$lib/components/KeyCard.svelte";
  import MouseSchematic from "$lib/components/MouseSchematic.svelte";
  import { toKeyCardVisual } from "$lib/key-card";
  import { resolveKeyboardLegendLayout } from "$lib/key-legends";
  import { formatHudLabel, hudCards, type HudChip, type KeyRef } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    hudBackgroundCss,
    type HudStyleSettings,
  } from "$lib/settings";
  import { t, type UiLocale } from "$lib/i18n";

  type KeyChip = Extract<HudChip, { kind: "key" }>;
  type MouseChip = Extract<HudChip, { kind: "mouse" }>;
  type MouseButton = MouseChip["button"];

  type Props = {
    style: HudStyleSettings;
    locale: UiLocale;
    placeMode: boolean;
    keySlot: KeyChip | null;
    mouseSlot: MouseChip | null;
    statusActive: boolean;
    activeKeyIds: ReadonlySet<string>;
    mouseActiveButtons: ReadonlySet<MouseButton>;
    showKmGroup: boolean;
    showKeySide: boolean;
    showMouseSide: boolean;
    showKeyboardMap: boolean;
    showKeyCards: boolean;
    showMouseSchematic: boolean;
    isFull: boolean;
    onPlacePointerDown: (event: PointerEvent) => void;
  };

  let {
    style,
    locale,
    placeMode,
    keySlot,
    mouseSlot,
    statusActive,
    activeKeyIds,
    mouseActiveButtons,
    showKmGroup,
    showKeySide,
    showMouseSide,
    showKeyboardMap,
    showKeyCards,
    showMouseSchematic,
    isFull,
    onPlacePointerDown,
  }: Props = $props();

  const statusText = $derived(
    statusActive ? t("overlay.captureUnavailable", locale) : null,
  );

  const legendLayout = $derived(
    resolveKeyboardLegendLayout(style.keyboardLegendLayout),
  );

  const chipBackground = $derived(
    hudBackgroundCss(style.backgroundColor, style.backgroundOpacity),
  );

  function keyCards(): KeyRef[] {
    return keySlot ? hudCards(keySlot) : [];
  }

  function keyText(): string {
    return keySlot ? formatHudLabel(keySlot, legendLayout) : "";
  }

  function mouseText(): string {
    return mouseSlot ? formatHudLabel(mouseSlot, legendLayout) : "";
  }
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
