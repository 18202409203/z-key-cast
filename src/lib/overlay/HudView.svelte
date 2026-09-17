<script lang="ts">
  import { cubicOut } from "svelte/easing";
  import { fade } from "svelte/transition";
  import { flip } from "svelte/animate";
  import KeyboardMap from "$lib/components/KeyboardMap.svelte";
  import {
    KEYBOARD_MAP_FONT_PX,
    KEYBOARD_MAP_WIDTH_PX,
  } from "$lib/keyboard-layout";
  import KeyCard from "$lib/components/KeyCard.svelte";
  import MouseSchematic from "$lib/components/MouseSchematic.svelte";
  import { toKeyCardVisual } from "$lib/key-card";
  import { resolveKeyboardLegendLayout } from "$lib/key-legends";
  import {
    formatHudLabel,
    formatHudModsLabel,
    formatHudPointerBody,
    hudCards,
    type HudChip,
    type ScrollDirection,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    hudBackgroundCss,
    type HudStyleSettings,
  } from "$lib/settings";
  import { t, type UiLocale } from "$lib/i18n";
  import type { TimelineItem } from "$lib/overlay/hud-slots.svelte";

  type MouseButton = Extract<HudChip, { kind: "mouse" }>["button"];
  type MouseFrame = MouseButton | "scroll-up" | "scroll-down";

  const TIMELINE_IN_MS = 180;
  const TIMELINE_OUT_MS = 280;
  const TIMELINE_FLIP_MS = 220;

  /** Enter from the right (timeline grows toward the right edge). */
  function timelineIn(
    _node: Element,
    { duration = TIMELINE_IN_MS }: { duration?: number } = {},
  ) {
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        const x = (1 - t) * 28;
        const s = 0.94 + t * 0.06;
        return `opacity: ${t}; transform: translateX(${x}px) scale(${s});`;
      },
    };
  }

  /** Exit: pin to viewport so flex-end reflow cannot drag the outro to the right. */
  function timelineOut(
    node: Element,
    { duration = TIMELINE_OUT_MS }: { duration?: number } = {},
  ) {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return {
      duration,
      easing: cubicOut,
      css: (t: number) => {
        // outro: t goes 1 → 0
        const x = (1 - t) * -22;
        const s = 0.88 + t * 0.12;
        return [
          "position: fixed",
          `left: ${rect.left}px`,
          `top: ${rect.top}px`,
          `width: ${rect.width}px`,
          `height: ${rect.height}px`,
          "margin: 0",
          "box-sizing: border-box",
          "pointer-events: none",
          "z-index: 20",
          `opacity: ${t}`,
          `transform: translateX(${x}px) scale(${s})`,
          "transform-origin: center center",
        ].join(";");
      },
    };
  }

  type Props = {
    style: HudStyleSettings;
    locale: UiLocale;
    placeMode: boolean;
    timeline: TimelineItem[];
    statusActive: boolean;
    activeKeyIds: ReadonlySet<string>;
    mouseActiveButtons: ReadonlySet<MouseButton>;
    scrollDirection?: ScrollDirection | null;
    scrollPulseNonce?: number;
    showKmGroup: boolean;
    showKeyboardMap: boolean;
    showMouseSchematic: boolean;
    isFull: boolean;
    isLite: boolean;
    showNumpad?: boolean;
    onPlacePointerDown: (event: PointerEvent) => void;
  };

  let {
    style,
    locale,
    placeMode,
    timeline,
    statusActive,
    activeKeyIds,
    mouseActiveButtons,
    scrollDirection = null,
    scrollPulseNonce = 0,
    showKmGroup,
    showKeyboardMap,
    showMouseSchematic,
    isFull,
    isLite,
    showNumpad = true,
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

  function mouseFrame(chip: TimelineItem["chip"]): MouseFrame | null {
    if (chip.kind === "mouse") return chip.button;
    if (chip.kind === "scroll") {
      return chip.direction === "up" ? "scroll-up" : "scroll-down";
    }
    return null;
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
    {#if isFull}
      <div
        class="km-group"
        class:km-klmr={(style.keyMouseLayout ?? "key-left-mouse-right") ===
          "key-left-mouse-right"}
        class:km-krml={style.keyMouseLayout === "key-right-mouse-left"}
        class:km-ktmb={style.keyMouseLayout === "key-top-mouse-bottom"}
        class:km-kbmt={style.keyMouseLayout === "key-bottom-mouse-top"}
      >
        {#if showKeyboardMap}
          <div class="km-key">
            <div
              class="full-board"
              style:width={`${KEYBOARD_MAP_WIDTH_PX}px`}
              style:max-width="100%"
              transition:fade={{ duration: 200 }}
            >
              <KeyboardMap
                activeIds={activeKeyIds}
                showNumpad={showNumpad}
                textColor={style.textColor}
                backgroundCss={chipBackground}
                fontSizePx={KEYBOARD_MAP_FONT_PX}
                legendLayout={legendLayout}
              />
            </div>
          </div>
        {/if}

        {#if showMouseSchematic}
          <div class="km-mouse">
            <div transition:fade={{ duration: 200 }}>
              <MouseSchematic
                activeButtons={mouseActiveButtons}
                scrollDirection={scrollDirection}
                scrollPulseNonce={scrollPulseNonce}
                textColor={style.textColor}
                backgroundCss={chipBackground}
                fontSizePx={DEFAULT_HUD_STYLE.fontSizePx}
                size="board"
              />
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <div class="timeline" transition:fade={{ duration: 150 }}>
        {#each timeline as item (item.id)}
          <div
            class="timeline-item"
            animate:flip={{ duration: TIMELINE_FLIP_MS, easing: cubicOut }}
            in:timelineIn
            out:timelineOut
          >
            {#if isLite}
              {#if item.chip.kind === "key"}
                <div
                  class="card-row"
                  style:--cap-scale={`${style.fontSizePx}px`}
                >
                  {#each hudCards(item.chip) as card (card.id)}
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
                  class="card-row"
                  style:--cap-scale={`${style.fontSizePx}px`}
                >
                  {#each item.chip.mods as mod (mod.id)}
                    <KeyCard
                      visual={toKeyCardVisual(mod, legendLayout)}
                      fontSizePx={style.fontSizePx}
                      textColor={style.textColor}
                      backgroundCss={chipBackground}
                    />
                  {/each}
                  <MouseSchematic
                    textColor={style.textColor}
                    backgroundCss={chipBackground}
                    fontSizePx={style.fontSizePx}
                    size="timeline"
                    frame={mouseFrame(item.chip)}
                  />
                </div>
              {/if}
            {:else}
              <div
                class="chip"
                class:chip-pointer={item.chip.kind !== "key"}
                style:font-size={`${style.fontSizePx}px`}
                style:color={style.textColor}
                style:background={chipBackground}
              >
                {#if item.chip.kind === "key"}
                  <span class="chip-label"
                    >{formatHudLabel(item.chip, legendLayout, locale)}</span
                  >
                {:else}
                  {#if item.chip.mods.length > 0}
                    <span class="chip-label"
                      >{formatHudModsLabel(
                        item.chip.mods,
                        legendLayout,
                      )}</span
                    >
                    <span class="chip-sep" aria-hidden="true">+</span>
                  {/if}
                  <span class="chip-action">
                    <span class="chip-icon" aria-hidden="true">
                      {#if item.chip.kind === "scroll"}
                        <svg
                          class="chip-icon-svg"
                          viewBox="0 0 16 16"
                          width="1em"
                          height="1em"
                        >
                          <path
                            class="chip-icon-stroke"
                            d="M8 1.75c-2.35 0-4.25 1.15-4.25 3.35v5.15c0 2.35 1.9 4.25 4.25 4.25s4.25-1.9 4.25-4.25V5.1c0-2.2-1.9-3.35-4.25-3.35Z"
                          />
                          <path
                            class="chip-icon-stroke"
                            d="M8 2.6v4.4"
                          />
                          {#if item.chip.direction === "up"}
                            <path
                              class="chip-icon-fill"
                              d="M8 8.8 9.55 10.9H6.45Z"
                            />
                          {:else}
                            <path
                              class="chip-icon-fill"
                              d="M8 10.9 9.55 8.8H6.45Z"
                            />
                          {/if}
                        </svg>
                      {:else}
                        <svg
                          class="chip-icon-svg"
                          viewBox="0 0 16 16"
                          width="1em"
                          height="1em"
                        >
                          <path
                            class="chip-icon-stroke"
                            d="M8 1.75c-2.35 0-4.25 1.15-4.25 3.35v5.15c0 2.35 1.9 4.25 4.25 4.25s4.25-1.9 4.25-4.25V5.1c0-2.2-1.9-3.35-4.25-3.35Z"
                          />
                          <path
                            class="chip-icon-stroke"
                            d="M8 2.6v4.4"
                          />
                          {#if item.chip.button === "left"}
                            <path
                              class="chip-icon-fill"
                              d="M3.9 2.9h3.95v3.9H3.9Z"
                              opacity="0.35"
                            />
                          {:else if item.chip.button === "right"}
                            <path
                              class="chip-icon-fill"
                              d="M8.15 2.9H12.1v3.9H8.15Z"
                              opacity="0.35"
                            />
                          {:else}
                            <rect
                              class="chip-icon-fill"
                              x="6.85"
                              y="3.35"
                              width="2.3"
                              height="3.4"
                              rx="1.15"
                              opacity="0.55"
                            />
                          {/if}
                        </svg>
                      {/if}
                    </span>
                    <span class="chip-label"
                      >{formatHudPointerBody(
                        item.chip,
                        locale,
                      )}</span
                    >
                  </span>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
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

  .timeline {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 8px;
    max-width: 100%;
    overflow: visible;
  }

  .timeline-item {
    flex: 0 0 auto;
    display: flex;
    align-items: flex-end;
    /* Transforms owned by in:/out:/flip — avoid CSS fighting Svelte transitions. */
    will-change: transform, opacity;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    max-width: 100%;
    padding: 10px 14px;
    border-radius: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1.2;
    backdrop-filter: blur(10px);
    white-space: nowrap;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  }

  /* Same shell as keys; icon sits with the pointer action, after mods. */
  .chip-pointer {
    gap: 0.35em;
  }

  .chip-sep {
    flex: 0 0 auto;
    opacity: 0.85;
  }

  .chip-action {
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    min-height: 1.2em;
  }

  .chip-icon {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 1em;
    height: 1em;
    line-height: 0;
  }

  .chip-icon-svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .chip-icon-stroke {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.25;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .chip-icon-fill {
    fill: currentColor;
    stroke: none;
  }

  .chip-label {
    min-width: 0;
  }

  .card-row {
    display: flex;
    flex-wrap: nowrap;
    justify-content: flex-end;
    align-items: flex-end;
    gap: 6px;
    max-width: 100%;
  }
</style>
