<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import ChoiceCardGroup from "$lib/components/ChoiceCardGroup.svelte";
  import FormRow from "$lib/components/FormRow.svelte";
  import FormSection from "$lib/components/FormSection.svelte";
  import {
    DEFAULT_HUD_POSITION,
    DEFAULT_HUD_STYLE,
    HUD_COLOR_PRESETS,
    HUD_STYLE_CHANNEL,
    colorsFromHudPreset,
    cornerSelectValue,
    endHudPlaceMode,
    getHudPositionSettings,
    getHudStyleSettings,
    isHudCorner,
    isHudPositionSettings,
    isHudStyleSettings,
    isKeyMouseLayout,
    matchHudColorPreset,
    normalizeHudStyleSettings,
    setHudPositionSettings,
    setHudStyleSettings,
    startHudPlaceMode,
    type HudColorPresetId,
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
  let hudSaving = $state(false);
  let forceCustomAppearance = $state(false);
  let hudPosition = $state<HudPositionSettings>({ ...DEFAULT_HUD_POSITION });
  let positionReady = $state(false);
  let positionSaving = $state(false);
  let placeModeActive = $state(false);

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
  const showPlaceControls = $derived(
    placeModeActive || hudPosition.mode === "custom",
  );
  const cornerSelectDisplay = $derived(
    placeModeActive || hudPosition.mode === "custom"
      ? "custom"
      : cornerSelectValue(hudPosition),
  );

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
    hudSaving = true;
    try {
      hudStyle = normalizeHudStyleSettings(await setHudStyleSettings(cleaned));
    } catch (err) {
      hudStyle = previous;
      appendLog(`hud style save failed: ${String(err)}`);
    } finally {
      hudSaving = false;
    }
  }

  function patchHud(partial: Partial<HudStyleSettings>) {
    const previous = { ...hudStyle };
    void persistHud({ ...hudStyle, ...partial }, previous);
  }

  function onFontSizeChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    patchHud({ fontSizePx: Math.max(12, Math.min(48, value)) });
  }

  function onDwellMsChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    patchHud({ dwellMs: value });
  }

  function onTimelineMaxChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
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

  function onBackgroundOpacityChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
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
      hudPosition = isHudPositionSettings(saved)
        ? saved
        : { ...DEFAULT_HUD_POSITION };
    } catch (err) {
      hudPosition = previous;
      appendLog(`hud position save failed: ${String(err)}`);
    } finally {
      positionSaving = false;
    }
  }

  function onCornerChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "custom") {
      if (!placeModeActive) void onTogglePlaceMode();
      return;
    }
    if (!isHudCorner(value)) return;
    const previous =
      hudPosition.mode === "custom"
        ? { mode: "custom" as const, x: hudPosition.x, y: hudPosition.y }
        : { mode: "corner" as const, corner: hudPosition.corner };
    void (async () => {
      if (placeModeActive) {
        positionSaving = true;
        try {
          await endHudPlaceMode();
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
        const saved = await endHudPlaceMode();
        hudPosition = isHudPositionSettings(saved)
          ? saved
          : { ...DEFAULT_HUD_POSITION };
        placeModeActive = false;
      } catch (err) {
        appendLog(`end place mode failed: ${String(err)}`);
      } finally {
        positionSaving = false;
      }
      return;
    }

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
          hudPosition = isHudPositionSettings(position)
            ? position
            : { ...DEFAULT_HUD_POSITION };
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
        disabled={!hudReady || hudSaving}
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
          disabled={!hudReady || hudSaving}
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
          disabled={!hudReady || hudSaving}
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
        <input
          id="hud-font-size"
          type="range"
          min="12"
          max="48"
          step="1"
          value={hudStyle.fontSizePx}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-font-size-label"
          onchange={onFontSizeChange}
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
          disabled={!hudReady || hudSaving}
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
        <input
          id="hud-timeline-max"
          type="range"
          min="1"
          max="10"
          step="1"
          value={hudStyle.timelineMax ?? 5}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-timeline-max-label"
          aria-describedby="hud-timeline-max-hint"
          title={t("settings.timelineMaxHint", locale)}
          onchange={onTimelineMaxChange}
        />
      </FormRow>
    {/if}
  </FormSection>

  <FormSection title={t("settings.theme", locale)}>
    <FormRow label={t("settings.colorPreset", locale)} labelId="hud-color-preset-label">
      <select
        id="hud-color-preset"
        value={colorPresetSelect}
        disabled={!hudReady || hudSaving}
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
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-text-color-label"
          onchange={onTextColorChange}
        />
      </FormRow>
      <FormRow label={t("settings.bgColor", locale)} labelId="hud-bg-color-label">
        <input
          id="hud-bg-color"
          type="color"
          value={hudStyle.backgroundColor}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-bg-color-label"
          onchange={onBackgroundColorChange}
        />
      </FormRow>
      <FormRow
        label={t("settings.bgOpacity", locale, {
          n: hudStyle.backgroundOpacity.toFixed(2),
        })}
        labelId="hud-bg-opacity-label"
      >
        <input
          id="hud-bg-opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={hudStyle.backgroundOpacity}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-bg-opacity-label"
          onchange={onBackgroundOpacityChange}
        />
      </FormRow>
    {/if}
  </FormSection>

  <FormSection title={t("settings.position", locale)}>
    <FormRow label={t("settings.corner", locale)} labelId="setting-corner-label">
      <select
        id="setting-corner"
        value={cornerSelectDisplay}
        disabled={!positionReady || positionSaving}
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
