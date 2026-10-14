<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import ChoiceCardGroup from "$lib/components/ChoiceCardGroup.svelte";
  import FormRow from "$lib/components/FormRow.svelte";
  import FormSection from "$lib/components/FormSection.svelte";
  import RangeSlider from "$lib/components/RangeSlider.svelte";
  import {
    DEFAULT_HUD_POSITION,
    DEFAULT_HUD_STYLE,
    HUD_COLOR_PRESETS,
    HUD_FONT_SIZE_PX_MAX,
    HUD_FONT_SIZE_PX_MIN,
    HUD_PLACE_MODE_CHANNEL,
    HUD_STYLE_CHANNEL,
    clampHudFontSizePx,
    colorsFromHudPreset,
    cornerSelectValue,
    endHudPlaceMode,
    enterHudCustomMode,
    getHudPositionSettings,
    getHudStyleSettings,
    isHudCorner,
    isHudPlaceModePayload,
    isHudStyleSettings,
    isKeyMouseLayout,
    matchHudColorPreset,
    normalizeHudPositionSettings,
    normalizeHudStyleSettings,
    setHudCustomContentCorner,
    setHudPositionSettings,
    setHudStyleSettings,
    startHudPlaceMode,
    type HudColorPresetId,
    type HudCorner,
    type HudPositionSettings,
    type HudPreset,
    type HudStyleSettings,
  } from "$lib/settings";
  import type { KeyboardLegendPreference } from "$lib/key-legends";
  import { t, type UiLocale } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
    appendLog: (line: string) => void;
  };

  let { active, locale, appendLog }: Props = $props();

  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let hudReady = $state(false);
  let hudSaveSeq = 0;
  let forceCustomAppearance = $state(false);
  let hudPosition = $state<HudPositionSettings>({ ...DEFAULT_HUD_POSITION });
  let positionReady = $state(false);
  let positionSaving = $state(false);
  let placeModeActive = $state(false);
  /** Draft content anchor while placing from corner (Done writes it). */
  let draftContentCorner = $state<HudCorner>("br");

  const showLegendLayout = $derived(
    hudStyle.hudPreset === "lite" || hudStyle.hudPreset === "full",
  );
  const showKeyMouseLayout = $derived(hudStyle.hudPreset === "full");
  const showDwellMs = $derived(hudStyle.hudPreset !== "full");
  const showFontSize = $derived(showDwellMs);
  const showTimelineMax = $derived(showDwellMs);

  const colorPresetSelect = $derived(
    forceCustomAppearance || matchHudColorPreset(hudStyle) === "custom"
      ? "custom"
      : matchHudColorPreset(hudStyle),
  );
  const showCustomColors = $derived(colorPresetSelect === "custom");
  const showPlaceControls = $derived(hudPosition.mode === "custom");
  const cornerSelectDisplay = $derived(
    hudPosition.mode === "custom"
      ? "custom"
      : cornerSelectValue(hudPosition),
  );
  const contentCornerSelect = $derived(
    placeModeActive
      ? draftContentCorner
      : hudPosition.mode === "custom"
        ? hudPosition.contentCorner
        : draftContentCorner,
  );
  /** Place-drag: lock presentation + corner; only Done + content corner stay live. */
  const placeUiLocked = $derived(placeModeActive);

  const presetHint = $derived(
    hudStyle.hudPreset === "lite"
      ? t("settings.hudPreset.liteHint", locale)
      : hudStyle.hudPreset === "full"
        ? t("settings.hudPreset.fullHint", locale)
        : t("settings.hudPreset.textHint", locale),
  );

  const presetItems = $derived([
    {
      value: "text",
      label: t("settings.hudPreset.text", locale),
      schematic: "hud-text" as const,
    },
    {
      value: "lite",
      label: t("settings.hudPreset.lite", locale),
      schematic: "hud-lite" as const,
    },
    {
      value: "full",
      label: t("settings.hudPreset.full", locale),
      schematic: "hud-full" as const,
    },
  ]);

  const keyMouseLayoutItems = $derived([
    {
      value: "key-left-mouse-right",
      label: t("settings.keyMouseLayout.keyLeftMouseRight", locale),
      schematic: "km-klmr" as const,
    },
    {
      value: "key-right-mouse-left",
      label: t("settings.keyMouseLayout.keyRightMouseLeft", locale),
      schematic: "km-krml" as const,
    },
    {
      value: "key-top-mouse-bottom",
      label: t("settings.keyMouseLayout.keyTopMouseBottom", locale),
      schematic: "km-ktmb" as const,
    },
    {
      value: "key-bottom-mouse-top",
      label: t("settings.keyMouseLayout.keyBottomMouseTop", locale),
      schematic: "km-kbmt" as const,
    },
  ]);

  async function persistHud(
    next: HudStyleSettings,
    previous: HudStyleSettings,
  ) {
    const cleaned = normalizeHudStyleSettings(next);
    hudStyle = cleaned;
    const seq = ++hudSaveSeq;
    try {
      const saved = normalizeHudStyleSettings(await setHudStyleSettings(cleaned));
      if (seq !== hudSaveSeq) return;
      hudStyle = saved;
    } catch (err) {
      if (seq !== hudSaveSeq) return;
      hudStyle = previous;
      appendLog(`hud style save failed: ${String(err)}`);
    }
  }

  function patchHud(partial: Partial<HudStyleSettings>) {
    const previous = { ...hudStyle };
    void persistHud({ ...hudStyle, ...partial }, previous);
  }

  function onFontSizeChange(value: number) {
    if (!Number.isFinite(value)) return;
    patchHud({ fontSizePx: clampHudFontSizePx(value) });
  }

  function onDwellMsChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    patchHud({ dwellMs: value });
  }

  function onTimelineMaxChange(value: number) {
    if (!Number.isFinite(value)) return;
    patchHud({ timelineMax: Math.max(1, Math.min(10, Math.round(value))) });
  }

  function onHudPresetChange(value: string) {
    if (value !== "text" && value !== "lite" && value !== "full") return;
    patchHud({ hudPreset: value as HudPreset });
  }

  function onKeyMouseLayoutChange(value: string) {
    if (!isKeyMouseLayout(value)) return;
    patchHud({ keyMouseLayout: value });
  }

  function onKeyboardLegendLayoutChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "auto" && value !== "mac-us" && value !== "win-us") return;
    patchHud({ keyboardLegendLayout: value as KeyboardLegendPreference });
  }

  function onTextColorChange(event: Event) {
    patchHud({ textColor: (event.currentTarget as HTMLInputElement).value });
  }

  function onBackgroundColorChange(event: Event) {
    patchHud({
      backgroundColor: (event.currentTarget as HTMLInputElement).value,
    });
  }

  function onBackgroundOpacityChange(value: number) {
    if (!Number.isFinite(value)) return;
    patchHud({ backgroundOpacity: value });
  }

  function onColorPresetChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "custom") {
      forceCustomAppearance = true;
      return;
    }
    if (value !== "dark" && value !== "light") return;
    forceCustomAppearance = false;
    patchHud(colorsFromHudPreset(value as HudColorPresetId));
  }

  async function persistPosition(
    next: HudPositionSettings,
    previous: HudPositionSettings,
  ) {
    hudPosition = next;
    positionSaving = true;
    try {
      const saved = await setHudPositionSettings(next);
      hudPosition = normalizeHudPositionSettings(saved) ?? {
        ...DEFAULT_HUD_POSITION,
      };
      if (hudPosition.mode === "custom") {
        draftContentCorner = hudPosition.contentCorner;
      }
    } catch (err) {
      hudPosition = previous;
      appendLog(`hud position save failed: ${String(err)}`);
    } finally {
      positionSaving = false;
    }
  }

  function seedDraftContentCorner(position: HudPositionSettings) {
    draftContentCorner =
      position.mode === "custom" ? position.contentCorner : position.corner;
  }

  function onContentCornerChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isHudCorner(value)) return;
    draftContentCorner = value;
    if (hudPosition.mode !== "custom") return;
    const previous = hudPosition;
    positionSaving = true;
    void (async () => {
      try {
        const saved = await setHudCustomContentCorner(value);
        hudPosition = saved;
        if (saved.mode === "custom") {
          draftContentCorner = saved.contentCorner;
        }
      } catch (err) {
        hudPosition = previous;
        if (previous.mode === "custom") {
          draftContentCorner = previous.contentCorner;
        }
        appendLog(`content corner save failed: ${String(err)}`);
      } finally {
        positionSaving = false;
      }
    })();
  }

  function onCornerChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "custom") {
      if (hudPosition.mode === "custom") return;
      seedDraftContentCorner(hudPosition);
      const previous = hudPosition;
      const corner =
        previous.mode === "corner" ? previous.corner : draftContentCorner;
      draftContentCorner = corner;
      void (async () => {
        positionSaving = true;
        try {
          const saved = await enterHudCustomMode(corner);
          hudPosition = saved;
          if (saved.mode === "custom") {
            draftContentCorner = saved.contentCorner;
          }
        } catch (err) {
          hudPosition = previous;
          appendLog(`enter custom failed: ${String(err)}`);
        } finally {
          positionSaving = false;
        }
      })();
      return;
    }
    if (!isHudCorner(value)) return;
    const previous =
      hudPosition.mode === "custom"
        ? {
            mode: "custom" as const,
            x: hudPosition.x,
            y: hudPosition.y,
            contentCorner: hudPosition.contentCorner,
          }
        : { mode: "corner" as const, corner: hudPosition.corner };
    void (async () => {
      if (placeModeActive) {
        positionSaving = true;
        try {
          await endHudPlaceMode(draftContentCorner);
          placeModeActive = false;
        } catch (err) {
          appendLog(`end place mode failed: ${String(err)}`);
        } finally {
          positionSaving = false;
        }
      }
      await persistPosition({ mode: "corner", corner: value }, previous);
    })();
  }

  async function onTogglePlaceMode() {
    if (placeModeActive) {
      positionSaving = true;
      try {
        const saved = await endHudPlaceMode(draftContentCorner);
        hudPosition = normalizeHudPositionSettings(saved) ?? {
          ...DEFAULT_HUD_POSITION,
        };
        if (hudPosition.mode === "custom") {
          draftContentCorner = hudPosition.contentCorner;
        }
        placeModeActive = false;
      } catch (err) {
        appendLog(`end place mode failed: ${String(err)}`);
      } finally {
        positionSaving = false;
      }
      return;
    }

    seedDraftContentCorner(hudPosition);
    positionSaving = true;
    try {
      await startHudPlaceMode();
      placeModeActive = true;
    } catch (err) {
      appendLog(`start place mode failed: ${String(err)}`);
    } finally {
      positionSaving = false;
    }
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const style = await getHudStyleSettings();
        if (!cancelled) hudStyle = normalizeHudStyleSettings(style);
      } catch (err) {
        if (!cancelled) {
          appendLog(`hud style load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) hudReady = true;
      }

      try {
        const position = await getHudPositionSettings();
        if (!cancelled) {
          hudPosition = normalizeHudPositionSettings(position) ?? {
            ...DEFAULT_HUD_POSITION,
          };
          if (hudPosition.mode === "custom") {
            draftContentCorner = hudPosition.contentCorner;
          }
        }
      } catch (err) {
        if (!cancelled) {
          appendLog(`hud position load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) positionReady = true;
      }

      try {
        const unlistenStyle = await listen(HUD_STYLE_CHANNEL, (event) => {
          if (!isHudStyleSettings(event.payload)) return;
          hudStyle = normalizeHudStyleSettings(event.payload);
        });
        if (cancelled) {
          unlistenStyle();
          return;
        }
        unsubs.push(unlistenStyle);
      } catch {
        // Channel optional for panel sync.
      }

      try {
        const unlistenPlace = await listen(HUD_PLACE_MODE_CHANNEL, (event) => {
          if (!isHudPlaceModePayload(event.payload)) return;
          placeModeActive = event.payload.active;
        });
        if (cancelled) {
          unlistenPlace();
          return;
        }
        unsubs.push(unlistenPlace);
      } catch {
        // Channel optional outside Tauri.
      }
    })();

    return () => {
      cancelled = true;
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<div
  class="panel hud-panel"
  id="panel-hud"
  role="tabpanel"
  aria-labelledby="tab-hud"
  hidden={!active}
  inert={!active}
>
  <FormSection title={t("settings.presentation", locale)}>
    <FormRow
      label={t("settings.hudPreset", locale)}
      labelId="hud-preset-label"
      hint={presetHint}
      hintId="hud-preset-hint"
      stack
    >
      <ChoiceCardGroup
        name="hud-preset"
        value={hudStyle.hudPreset ?? "text"}
        items={presetItems}
        disabled={!hudReady || placeUiLocked}
        labelledBy="hud-preset-label"
        columns={3}
        onChange={onHudPresetChange}
      />
    </FormRow>
    {#if showKeyMouseLayout}
      <FormRow
        label={t("settings.keyMouseLayout", locale)}
        labelId="hud-km-layout-label"
        stack
      >
        <ChoiceCardGroup
          name="hud-km-layout"
          value={hudStyle.keyMouseLayout ?? "key-left-mouse-right"}
          items={keyMouseLayoutItems}
          disabled={!hudReady || placeUiLocked}
          labelledBy="hud-km-layout-label"
          columns={4}
          onChange={onKeyMouseLayoutChange}
        />
      </FormRow>
    {/if}
    {#if showLegendLayout}
      <FormRow
        label={t("settings.legendLayout", locale)}
        labelId="hud-legend-layout-label"
      >
        <select
          id="hud-legend-layout"
          value={hudStyle.keyboardLegendLayout ?? "auto"}
          disabled={!hudReady || placeUiLocked}
          aria-labelledby="hud-legend-layout-label"
          onchange={onKeyboardLegendLayoutChange}
        >
          <option value="auto">{t("settings.legendLayout.auto", locale)}</option>
          <option value="mac-us"
            >{t("settings.legendLayout.macUs", locale)}</option
          >
          <option value="win-us"
            >{t("settings.legendLayout.winUs", locale)}</option
          >
        </select>
      </FormRow>
    {/if}
    {#if showFontSize}
      <FormRow
        label={t("settings.fontSize", locale, {
          n: hudStyle.fontSizePx,
        })}
        labelId="hud-font-size-label"
      >
        <RangeSlider
          id="hud-font-size"
          min={HUD_FONT_SIZE_PX_MIN}
          max={HUD_FONT_SIZE_PX_MAX}
          step="1"
          value={hudStyle.fontSizePx}
          disabled={!hudReady || placeUiLocked}
          labelledBy="hud-font-size-label"
          format={(n) => String(Math.round(n))}
          onChange={onFontSizeChange}
        />
      </FormRow>
    {/if}
    {#if showDwellMs}
      <FormRow
        label={t("settings.dwellMs", locale)}
        labelId="hud-dwell-ms-label"
        hint={t("settings.dwellMsHint", locale)}
        hintId="hud-dwell-ms-hint"
      >
        <input
          id="hud-dwell-ms"
          type="number"
          min="200"
          max="5000"
          step="50"
          value={hudStyle.dwellMs}
          disabled={!hudReady || placeUiLocked}
          aria-labelledby="hud-dwell-ms-label"
          aria-describedby="hud-dwell-ms-hint"
          title={t("settings.dwellMsHint", locale)}
          onchange={onDwellMsChange}
        />
      </FormRow>
    {/if}
    {#if showTimelineMax}
      <FormRow
        label={t("settings.timelineMax", locale, {
          n: hudStyle.timelineMax ?? 5,
        })}
        labelId="hud-timeline-max-label"
        hint={t("settings.timelineMaxHint", locale)}
        hintId="hud-timeline-max-hint"
      >
        <RangeSlider
          id="hud-timeline-max"
          min={1}
          max={10}
          step="1"
          value={hudStyle.timelineMax ?? 5}
          disabled={!hudReady || placeUiLocked}
          labelledBy="hud-timeline-max-label"
          describedBy="hud-timeline-max-hint"
          title={t("settings.timelineMaxHint", locale)}
          format={(n) => String(Math.round(n))}
          onChange={onTimelineMaxChange}
        />
      </FormRow>
    {/if}
  </FormSection>

  <FormSection title={t("settings.theme", locale)}>
    <FormRow label={t("settings.colorPreset", locale)} labelId="hud-color-preset-label">
      <select
        id="hud-color-preset"
        value={colorPresetSelect}
        disabled={!hudReady || placeUiLocked}
        aria-labelledby="hud-color-preset-label"
        onchange={onColorPresetChange}
      >
        {#each HUD_COLOR_PRESETS as preset (preset.id)}
          <option value={preset.id}
            >{preset.id === "dark"
              ? t("settings.colorPreset.dark", locale)
              : t("settings.colorPreset.light", locale)}</option
          >
        {/each}
        <option value="custom"
          >{t("settings.colorPreset.custom", locale)}</option
        >
      </select>
    </FormRow>
    {#if showCustomColors}
      <FormRow label={t("settings.textColor", locale)} labelId="hud-text-color-label">
        <input
          id="hud-text-color"
          type="color"
          value={hudStyle.textColor}
          disabled={!hudReady || placeUiLocked}
          aria-labelledby="hud-text-color-label"
          onchange={onTextColorChange}
        />
      </FormRow>
      <FormRow label={t("settings.bgColor", locale)} labelId="hud-bg-color-label">
        <input
          id="hud-bg-color"
          type="color"
          value={hudStyle.backgroundColor}
          disabled={!hudReady || placeUiLocked}
          aria-labelledby="hud-bg-color-label"
          onchange={onBackgroundColorChange}
        />
      </FormRow>
    {/if}
    <FormRow
      label={t("settings.bgOpacity", locale, {
        n: hudStyle.backgroundOpacity.toFixed(2),
      })}
      labelId="hud-bg-opacity-label"
    >
      <RangeSlider
        id="hud-bg-opacity"
        min={0}
        max={1}
        step="0.01"
        value={hudStyle.backgroundOpacity}
        disabled={!hudReady || placeUiLocked}
        labelledBy="hud-bg-opacity-label"
        format={(n) => n.toFixed(2)}
        onChange={onBackgroundOpacityChange}
      />
    </FormRow>
  </FormSection>

  <FormSection title={t("settings.position", locale)}>
    <FormRow label={t("settings.corner", locale)} labelId="setting-corner-label">
      <select
        id="setting-corner"
        value={cornerSelectDisplay}
        disabled={!positionReady || positionSaving || placeUiLocked}
        aria-labelledby="setting-corner-label"
        onchange={onCornerChange}
      >
        <option value="br">{t("settings.corner.br", locale)}</option>
        <option value="bl">{t("settings.corner.bl", locale)}</option>
        <option value="tr">{t("settings.corner.tr", locale)}</option>
        <option value="tl">{t("settings.corner.tl", locale)}</option>
        <option value="custom">{t("settings.corner.custom", locale)}</option>
      </select>
    </FormRow>
    {#if showPlaceControls}
      <FormRow
        label={t("settings.contentCorner", locale)}
        labelId="setting-content-corner-label"
      >
        <select
          id="setting-content-corner"
          value={contentCornerSelect}
          disabled={!positionReady || positionSaving}
          aria-labelledby="setting-content-corner-label"
          onchange={onContentCornerChange}
        >
          <option value="br">{t("settings.corner.br", locale)}</option>
          <option value="bl">{t("settings.corner.bl", locale)}</option>
          <option value="tr">{t("settings.corner.tr", locale)}</option>
          <option value="tl">{t("settings.corner.tl", locale)}</option>
        </select>
      </FormRow>
      <FormRow
        label={t("settings.hudPosition", locale)}
        labelId="setting-place-label"
        hint={placeModeActive ? t("settings.placeHint", locale) : undefined}
      >
        <button
          type="button"
          class="clear"
          id="setting-place"
          disabled={!positionReady || positionSaving}
          aria-labelledby="setting-place-label"
          onclick={() => void onTogglePlaceMode()}
        >
          {placeModeActive
            ? t("settings.done", locale)
            : t("settings.moveHud", locale)}
        </button>
      </FormRow>
    {/if}
  </FormSection>
</div>

<style>
  .panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding-inline: var(--panel-pad-x);
    overflow-x: hidden;
    overflow-y: auto;
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

  .clear {
    border: 1px solid var(--app-control-border);
    border-radius: var(--radius-sm);
    background: var(--app-control-bg);
    color: var(--app-muted);
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
  }

  .clear:hover {
    color: var(--app-fg);
    border-color: var(--app-hairline-strong, var(--app-control-border));
    background: var(--app-control-bg-hover, var(--app-control-bg));
  }
</style>
