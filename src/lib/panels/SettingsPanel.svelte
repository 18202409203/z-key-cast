<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
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
  <section>
    <h2>{t("settings.theme", locale)}</h2>
    <div class="field">
      <span class="field-label" id="hud-color-preset-label"
        >{t("settings.colorPreset", locale)}</span
      >
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
    </div>
    {#if showCustomColors}
      <div class="field">
        <span class="field-label" id="hud-text-color-label"
          >{t("settings.textColor", locale)}</span
        >
        <input
          id="hud-text-color"
          type="color"
          value={hudStyle.textColor}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-text-color-label"
          onchange={onTextColorChange}
        />
      </div>
      <div class="field">
        <span class="field-label" id="hud-bg-color-label"
          >{t("settings.bgColor", locale)}</span
        >
        <input
          id="hud-bg-color"
          type="color"
          value={hudStyle.backgroundColor}
          disabled={!hudReady || hudSaving}
          aria-labelledby="hud-bg-color-label"
          onchange={onBackgroundColorChange}
        />
      </div>
      <div class="field">
        <span class="field-label" id="hud-bg-opacity-label"
          >{t("settings.bgOpacity", locale, {
            n: hudStyle.backgroundOpacity.toFixed(2),
          })}</span
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
      </div>
    {/if}
  </section>

  <section>
    <h2>{t("settings.position", locale)}</h2>
    <div class="field">
      <span class="field-label" id="setting-corner-label"
        >{t("settings.corner", locale)}</span
      >
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
    </div>
    {#if showPlaceControls}
      <div class="field">
        <span class="field-label" id="setting-place-label"
          >{t("settings.hudPosition", locale)}</span
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
        {#if placeModeActive}
          <p class="muted">{t("settings.placeHint", locale)}</p>
        {/if}
      </div>
    {/if}
  </section>

  <section>
    <h2 id="setting-language-heading">{t("settings.language", locale)}</h2>
    <div class="field">
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
    </div>
  </section>
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

  section {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  h2 {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  .field {
    display: grid;
    gap: 10px;
    min-width: 0;
    font-size: 14px;
  }

  .field-label {
    color: #e2e8f0;
  }

  .clear {
    border: 1px solid #334155;
    border-radius: 8px;
    background: #0f172a;
    color: #94a3b8;
    font-size: 12px;
    padding: 6px 10px;
    cursor: pointer;
    justify-self: start;
  }

  .clear:hover {
    color: #e2e8f0;
    border-color: #475569;
    background: #1e293b;
  }

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
  }

  select,
  input[type="color"],
  input[type="range"] {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  select {
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  input[type="color"] {
    min-height: 40px;
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    padding: 4px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  input[type="range"] {
    accent-color: #38bdf8;
  }

  select:disabled,
  input:disabled,
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
