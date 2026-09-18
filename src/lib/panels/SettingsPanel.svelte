<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
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
    getUiLocaleSettings,
    isHudCorner,
    isHudPositionSettings,
    isHudStyleSettings,
    matchHudColorPreset,
    normalizeHudStyleSettings,
    setHudPositionSettings,
    setHudStyleSettings,
    setUiLocaleSettings,
    startHudPlaceMode,
    type HudColorPresetId,
    type HudPositionSettings,
    type HudStyleSettings,
  } from "$lib/settings";
  import {
    guessLocaleFromSystem,
    isUiLocale,
    t,
    type UiLocale,
  } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
    appendLog: (line: string) => void;
    onLocaleChange: (locale: UiLocale) => void;
  };

  let { active, locale, appendLog, onLocaleChange }: Props = $props();

  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let hudReady = $state(false);
  let hudSaving = $state(false);
  let forceCustomAppearance = $state(false);
  let hudPosition = $state<HudPositionSettings>({ ...DEFAULT_HUD_POSITION });
  let positionReady = $state(false);
  let positionSaving = $state(false);
  let placeModeActive = $state(false);
  let localeReady = $state(false);
  let localeSaving = $state(false);

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

  async function onLocaleSelect(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isUiLocale(value)) return;
    const previous = locale;
    onLocaleChange(value);
    localeSaving = true;
    try {
      const saved = await setUiLocaleSettings(value);
      onLocaleChange(saved);
    } catch (err) {
      onLocaleChange(previous);
      appendLog(`locale save failed: ${String(err)}`);
    } finally {
      localeSaving = false;
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
            onLocaleChange(stored);
          } else {
            const guessed = guessLocaleFromSystem();
            onLocaleChange(guessed);
            try {
              await setUiLocaleSettings(guessed);
            } catch (err) {
              appendLog(`locale save failed: ${String(err)}`);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          onLocaleChange(guessLocaleFromSystem());
          appendLog(`locale load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) localeReady = true;
      }

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
  class="panel settings-panel"
  id="panel-settings"
  role="tabpanel"
  aria-labelledby="tab-settings"
  hidden={!active}
  inert={!active}
>
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

  <FormSection
    title={t("settings.language", locale)}
    titleId="setting-language-heading"
  >
    <FormRow>
      <select
        id="setting-language"
        value={locale}
        disabled={!localeReady || localeSaving}
        aria-labelledby="setting-language-heading"
        onchange={onLocaleSelect}
      >
        <option value="en">{t("settings.language.en", locale)}</option>
        <option value="zh">{t("settings.language.zh", locale)}</option>
      </select>
    </FormRow>
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
    border: 1px solid #334155;
    border-radius: 8px;
    background: #0f172a;
    color: #94a3b8;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
  }

  .clear:hover {
    color: #e2e8f0;
    border-color: #475569;
    background: #1e293b;
  }
</style>
