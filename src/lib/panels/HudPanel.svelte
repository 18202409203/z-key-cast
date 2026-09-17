<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import ChoiceCardGroup from "$lib/components/ChoiceCardGroup.svelte";
  import {
    DEFAULT_HUD_STYLE,
    HUD_STYLE_CHANNEL,
    getHudStyleSettings,
    isHudStyleSettings,
    isKeyMouseLayout,
    normalizeHudStyleSettings,
    setHudStyleSettings,
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

  const showLegendLayout = $derived(
    hudStyle.hudPreset === "lite" || hudStyle.hudPreset === "full",
  );
  const showKeyMouseLayout = $derived(hudStyle.hudPreset === "full");
  const showDwellMs = $derived(hudStyle.hudPreset !== "full");
  const showFontSize = $derived(showDwellMs);

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
  id="panel-hud"
  role="tabpanel"
  aria-labelledby="tab-hud"
  hidden={!active}
  inert={!active}
>
  <section>
    <h2>{t("settings.presentation", locale)}</h2>
    <div class="field">
      <span class="field-label" id="hud-preset-label"
        >{t("settings.hudPreset", locale)}</span
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
      <p class="field-hint" id="hud-preset-hint">
        {#if hudStyle.hudPreset === "lite"}
          {t("settings.hudPreset.liteHint", locale)}
        {:else if hudStyle.hudPreset === "full"}
          {t("settings.hudPreset.fullHint", locale)}
        {:else}
          {t("settings.hudPreset.textHint", locale)}
        {/if}
      </p>
    </div>
    {#if showKeyMouseLayout}
      <div class="field">
        <span class="field-label" id="hud-km-layout-label"
          >{t("settings.keyMouseLayout", locale)}</span
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
      </div>
    {/if}
    {#if showLegendLayout}
      <div class="field">
        <span class="field-label" id="hud-legend-layout-label"
          >{t("settings.legendLayout", locale)}</span
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
      </div>
    {/if}
    {#if showFontSize}
      <div class="field">
        <span class="field-label" id="hud-font-size-label"
          >{t("settings.fontSize", locale, {
            n: hudStyle.fontSizePx,
          })}</span
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
      </div>
    {/if}
    {#if showDwellMs}
      <div class="field">
        <span class="field-label" id="hud-dwell-ms-label"
          >{t("settings.dwellMs", locale)}</span
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
        <p class="field-hint" id="hud-dwell-ms-hint"
          >{t("settings.dwellMsHint", locale)}</p
        >
      </div>
    {/if}
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

  .field-hint {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  select,
  input[type="number"],
  input[type="range"] {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  select,
  input[type="number"] {
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  input[type="range"] {
    accent-color: #38bdf8;
  }

  select:disabled,
  input:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
