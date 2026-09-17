<script lang="ts">
  import { getName, getVersion } from "@tauri-apps/api/app";
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    IGNORE_KEY_CAPTURED_CHANNEL,
    getHookStatus,
    isHookStatus,
    isHudChip,
    isIgnoreKeyCaptured,
    summarizeHookStatus,
    summarizeHudChip,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_POSITION,
    DEFAULT_HUD_STYLE,
    HUD_COLOR_PRESETS,
    armIgnoreKeyCapture,
    cancelIgnoreKeyCapture,
    colorsFromHudPreset,
    cornerSelectValue,
    endHudPlaceMode,
    getCaptureSettings,
    getHudPositionSettings,
    getHudStyleSettings,
    getUiLocaleSettings,
    hudBackgroundCss,
    isHudCorner,
    isHudPositionSettings,
    isKeyMouseLayout,
    matchHudColorPreset,
    normalizeHudStyleSettings,
    setCaptureSettings,
    setHudPositionSettings,
    setHudStyleSettings,
    setUiLocaleSettings,
    startHudPlaceMode,
    type CaptureSettings,
    type HudColorPresetId,
    type HudPositionSettings,
    type HudPreset,
    type HudStyleSettings,
  } from "$lib/settings";
  import {
    resolveKeyboardLegendLayout,
    type KeyboardLegendPreference,
  } from "$lib/key-legends";
  import { KEYBOARD_MAP_FONT_PX, LAYOUT_KEY_IDS } from "$lib/keyboard-layout";
  import KeyboardMap from "$lib/KeyboardMap.svelte";
  import {
    IGNORE_CATEGORIES,
    addCategoryIds,
    categoryToggleState,
    labelForKeyId,
    offBoardIgnoredIds,
    removeCategoryIds,
    type IgnoreCategoryId,
  } from "$lib/key-ignore-presets";
  import {
    categoryLabelKey,
    guessLocaleFromSystem,
    isUiLocale,
    t,
    type UiLocale,
  } from "$lib/i18n";
  type MainTab = "hud" | "settings" | "capture" | "log" | "about";

  const MAX_LOG_LINES = 100;
  const STICK_BOTTOM_PX = 48;
  const FALLBACK_APP_NAME = "z-key-cast";
  const FALLBACK_APP_VERSION = "1.0.0";

  let locale = $state<UiLocale>("en");
  let localeReady = $state(false);
  let localeSaving = $state(false);

  const TABS = $derived<{ id: MainTab; label: string }[]>([
    { id: "hud", label: t("nav.hud", locale) },
    { id: "settings", label: t("nav.settings", locale) },
    { id: "capture", label: t("nav.capture", locale) },
    { id: "log", label: t("nav.log", locale) },
    { id: "about", label: t("nav.about", locale) },
  ]);

  let activeTab = $state<MainTab>("hud");
  let logLines = $state<string[]>([]);
  let hookOk = $state<boolean | null>(null);
  let logEl = $state<HTMLDivElement | null>(null);
  let stickToBottom = $state(true);
  let captureKeyboard = $state(true);
  let captureMouse = $state(true);
  let mouseClickRipple = $state(false);
  let ignoredKeyIds = $state<string[]>([]);
  let ignoreCapturing = $state(false);
  let captureReady = $state(false);
  let captureSaving = $state(false);
  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let hudReady = $state(false);
  let hudSaving = $state(false);
  let hudPosition = $state<HudPositionSettings>({ ...DEFAULT_HUD_POSITION });
  let positionReady = $state(false);
  let positionSaving = $state(false);
  let placeModeActive = $state(false);
  /** When true, color pickers stay visible even if colors still match a preset. */
  let forceCustomAppearance = $state(false);
  let appName = $state(FALLBACK_APP_NAME);
  let appVersion = $state(FALLBACK_APP_VERSION);

  const colorPresetSelect = $derived(
    forceCustomAppearance || matchHudColorPreset(hudStyle) === "custom"
      ? "custom"
      : matchHudColorPreset(hudStyle),
  );
  const showCustomColors = $derived(colorPresetSelect === "custom");
  const showLegendLayout = $derived(
    hudStyle.hudPreset === "lite" || hudStyle.hudPreset === "full",
  );
  const showDwellMs = $derived(hudStyle.hudPreset !== "full");
  const showFontSize = $derived(showDwellMs);
  const showPlaceControls = $derived(
    placeModeActive || hudPosition.mode === "custom",
  );
  const cornerSelectDisplay = $derived(
    placeModeActive || hudPosition.mode === "custom"
      ? "custom"
      : cornerSelectValue(hudPosition),
  );
  const ignoredIdSet = $derived(new Set(ignoredKeyIds));
  const offBoardIgnoredKeyIds = $derived(
    offBoardIgnoredIds(ignoredKeyIds, LAYOUT_KEY_IDS),
  );
  const ignoreBoardBackground = $derived(
    hudBackgroundCss(hudStyle.backgroundColor, hudStyle.backgroundOpacity),
  );
  const ignoreBoardLegendLayout = $derived(
    resolveKeyboardLegendLayout(hudStyle.keyboardLegendLayout),
  );
  const ignoreBoardDisabled = $derived(
    !captureReady || captureSaving || ignoreCapturing,
  );

  /** Host OS for Capture hook-failed copy (navigator best-effort). */
  function isWindowsHost(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || "").toLowerCase();
    return platform.includes("win") || ua.includes("windows");
  }

  function isMacHost(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || "").toLowerCase();
    return (
      platform.includes("mac") ||
      ua.includes("mac os") ||
      ua.includes("macintosh")
    );
  }

  const captureFailedMessage = $derived(
    isMacHost()
      ? t("settings.captureFailedMac", locale)
      : isWindowsHost()
        ? t("settings.captureFailedWin", locale)
        : t("settings.captureFailedOther", locale),
  );

  function isNearBottom(el: HTMLDivElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_BOTTOM_PX;
  }

  function onLogScroll() {
    if (!logEl) return;
    stickToBottom = isNearBottom(logEl);
  }

  function appendLog(line: string) {
    const stamp = new Date().toLocaleTimeString();
    logLines = [...logLines, `${stamp}  ${line}`].slice(-MAX_LOG_LINES);
  }

  function clearLog() {
    logLines = [];
    stickToBottom = true;
  }

  async function persistCapture(
    next: CaptureSettings,
    previous: CaptureSettings,
  ) {
    captureKeyboard = next.captureKeyboard;
    captureMouse = next.captureMouse;
    mouseClickRipple = next.mouseClickRipple;
    ignoredKeyIds = [...next.ignoredKeyIds];
    captureSaving = true;
    try {
      const saved = await setCaptureSettings(next);
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
      mouseClickRipple = saved.mouseClickRipple;
      ignoredKeyIds = [...saved.ignoredKeyIds];
    } catch (err) {
      captureKeyboard = previous.captureKeyboard;
      captureMouse = previous.captureMouse;
      mouseClickRipple = previous.mouseClickRipple;
      ignoredKeyIds = [...previous.ignoredKeyIds];
      appendLog(`settings save failed: ${String(err)}`);
    } finally {
      captureSaving = false;
    }
  }

  function currentCapture(): CaptureSettings {
    return {
      captureKeyboard,
      captureMouse,
      mouseClickRipple,
      ignoredKeyIds: [...ignoredKeyIds],
    };
  }

  function onCaptureKeyboardChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = currentCapture();
    void persistCapture(
      { ...previous, captureKeyboard: checked },
      previous,
    );
  }

  function onCaptureMouseChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = currentCapture();
    void persistCapture({ ...previous, captureMouse: checked }, previous);
  }

  function onMouseClickRippleChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = currentCapture();
    void persistCapture(
      { ...previous, mouseClickRipple: checked },
      previous,
    );
  }

  function onIgnoreCategoryChange(categoryId: IgnoreCategoryId, event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const category = IGNORE_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;
    const previous = currentCapture();
    const nextIds = checked
      ? addCategoryIds(previous.ignoredKeyIds, category.ids)
      : removeCategoryIds(previous.ignoredKeyIds, category.ids);
    void persistCapture({ ...previous, ignoredKeyIds: nextIds }, previous);
  }

  function removeIgnoredKey(id: string) {
    const previous = currentCapture();
    if (!previous.ignoredKeyIds.includes(id)) return;
    void persistCapture(
      {
        ...previous,
        ignoredKeyIds: previous.ignoredKeyIds.filter((x) => x !== id),
      },
      previous,
    );
  }

  function onToggleIgnoredKey(id: string) {
    if (ignoreBoardDisabled) return;
    const previous = currentCapture();
    const nextIds = previous.ignoredKeyIds.includes(id)
      ? previous.ignoredKeyIds.filter((x) => x !== id)
      : [...previous.ignoredKeyIds, id];
    void persistCapture({ ...previous, ignoredKeyIds: nextIds }, previous);
  }

  async function onAddIgnoreKey() {
    if (ignoreCapturing || !captureReady || captureSaving) return;
    try {
      await armIgnoreKeyCapture();
      ignoreCapturing = true;
    } catch (err) {
      appendLog(`ignore capture arm failed: ${String(err)}`);
    }
  }

  async function onCancelIgnoreKey() {
    try {
      await cancelIgnoreKeyCapture();
    } catch (err) {
      appendLog(`ignore capture cancel failed: ${String(err)}`);
    } finally {
      ignoreCapturing = false;
    }
  }

  function bindCategoryCheckbox(
    node: HTMLInputElement,
    state: "checked" | "unchecked" | "indeterminate",
  ) {
    const apply = (s: typeof state) => {
      node.checked = s === "checked";
      node.indeterminate = s === "indeterminate";
    };
    apply(state);
    return {
      update(s: typeof state) {
        apply(s);
      },
    };
  }

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

  function onDwellMsChange(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    if (!Number.isFinite(value)) return;
    patchHud({ dwellMs: value });
  }

  function onHudPresetChange(event: Event) {
    const value = (event.currentTarget as HTMLInputElement).value;
    if (value !== "text" && value !== "lite" && value !== "full") return;
    patchHud({ hudPreset: value as HudPreset });
  }

  function onKeyMouseLayoutChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isKeyMouseLayout(value)) return;
    patchHud({ keyMouseLayout: value });
  }

  function onKeyboardLegendLayoutChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "auto" && value !== "mac-us" && value !== "win-us") return;
    patchHud({ keyboardLegendLayout: value as KeyboardLegendPreference });
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

  async function onLocaleChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (!isUiLocale(value)) return;
    const previous = locale;
    locale = value;
    localeSaving = true;
    try {
      locale = await setUiLocaleSettings(value);
    } catch (err) {
      locale = previous;
      appendLog(`locale save failed: ${String(err)}`);
    } finally {
      localeSaving = false;
    }
  }

  function selectTab(tab: MainTab) {
    activeTab = tab;
  }

  function onTabListKeydown(event: KeyboardEvent) {
    const current = TABS.findIndex((tab) => tab.id === activeTab);
    if (current < 0) return;

    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (current + 1) % TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (current - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = TABS[next];
    if (!nextTab) return;
    selectTab(nextTab.id);
    queueMicrotask(() => {
      document.getElementById(`tab-${nextTab.id}`)?.focus();
    });
  }

  $effect(() => {
    logLines;
    activeTab;
    if (activeTab !== "log" || !stickToBottom || !logEl) return;
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    });
  });

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const [name, version] = await Promise.all([getName(), getVersion()]);
        if (!cancelled) {
          if (name) appName = name;
          if (version) appVersion = version;
        }
      } catch {
        // Keep package fallbacks when not running under Tauri.
      }

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
            } catch (err) {
              appendLog(`locale save failed: ${String(err)}`);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          locale = guessLocaleFromSystem();
          appendLog(`locale load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) localeReady = true;
      }

      try {
        const settings = await getCaptureSettings();
        if (cancelled) return;
        captureKeyboard = settings.captureKeyboard;
        captureMouse = settings.captureMouse;
        mouseClickRipple = settings.mouseClickRipple;
        ignoredKeyIds = [...settings.ignoredKeyIds];
      } catch (err) {
        if (!cancelled) {
          appendLog(`settings load failed: ${String(err)}`);
        }
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
        const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
          if (!isHookStatus(event.payload)) return;
          hookOk = event.payload.ok;
          appendLog(summarizeHookStatus(event.payload));
        });
        if (cancelled) {
          unlistenStatus();
          return;
        }
        unsubs.push(unlistenStatus);

        const cachedStatus = await getHookStatus();
        if (!cancelled && cachedStatus && hookOk === null) {
          hookOk = cachedStatus.ok;
          appendLog(summarizeHookStatus(cachedStatus));
        }

        const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
          if (!isHudChip(event.payload)) return;
          appendLog(summarizeHudChip(event.payload, ignoreBoardLegendLayout));
        });
        if (cancelled) {
          unlistenEvent();
          return;
        }
        unsubs.push(unlistenEvent);

        const unlistenIgnoreCapture = await listen(
          IGNORE_KEY_CAPTURED_CHANNEL,
          (event) => {
            if (!isIgnoreKeyCaptured(event.payload)) return;
            ignoreCapturing = false;
            const { id } = event.payload;
            const previous = currentCapture();
            if (previous.ignoredKeyIds.includes(id)) return;
            void persistCapture(
              { ...previous, ignoredKeyIds: [...previous.ignoredKeyIds, id] },
              previous,
            );
          },
        );
        if (cancelled) {
          unlistenIgnoreCapture();
          return;
        }
        unsubs.push(unlistenIgnoreCapture);
      } catch (err) {
        if (!cancelled) {
          appendLog(`event listen failed: ${String(err)}`);
        }
      } finally {
        // After ignore-capture listener bind attempt (success or fail).
        if (!cancelled) captureReady = true;
      }
    })();

    return () => {
      cancelled = true;
      ignoreCapturing = false;
      void cancelIgnoreKeyCapture().catch(() => {
        // Best-effort disarm if the window tears down mid-capture.
      });
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<main class="shell">
  <header class="top">
    <p class="brand">{appName}</p>
    <div class="tabs" role="tablist" aria-label={t("nav.aria", locale)}>
      {#each TABS as tab (tab.id)}
        <button
          type="button"
          class="tab"
          class:active={activeTab === tab.id}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          id={`tab-${tab.id}`}
          role="tab"
          tabindex={activeTab === tab.id ? 0 : -1}
          onclick={() => selectTab(tab.id)}
          onkeydown={onTabListKeydown}
        >
          {tab.label}
        </button>
      {/each}
    </div>
  </header>

  <div class="panels">
    {#if activeTab === "hud"}
      <div
        class="panel settings-panel"
        id="panel-hud"
        role="tabpanel"
        aria-labelledby="tab-hud"
      >
        <section>
          <h2>{t("settings.presentation", locale)}</h2>
          <div class="field">
            <span class="field-label" id="hud-preset-label"
              >{t("settings.hudPreset", locale)}</span
            >
            <div
              class="segmented"
              role="radiogroup"
              aria-labelledby="hud-preset-label"
            >
              <label class="segment">
                <input
                  type="radio"
                  name="hud-preset"
                  value="text"
                  checked={(hudStyle.hudPreset ?? "text") === "text"}
                  disabled={!hudReady || hudSaving}
                  onchange={onHudPresetChange}
                />
                <span>{t("settings.hudPreset.text", locale)}</span>
              </label>
              <label class="segment">
                <input
                  type="radio"
                  name="hud-preset"
                  value="lite"
                  checked={hudStyle.hudPreset === "lite"}
                  disabled={!hudReady || hudSaving}
                  onchange={onHudPresetChange}
                />
                <span>{t("settings.hudPreset.lite", locale)}</span>
              </label>
              <label class="segment">
                <input
                  type="radio"
                  name="hud-preset"
                  value="full"
                  checked={hudStyle.hudPreset === "full"}
                  disabled={!hudReady || hudSaving}
                  onchange={onHudPresetChange}
                />
                <span>{t("settings.hudPreset.full", locale)}</span>
              </label>
            </div>
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
          <div class="field">
            <span class="field-label" id="hud-km-layout-label"
              >{t("settings.keyMouseLayout", locale)}</span
            >
            <select
              id="hud-km-layout"
              value={hudStyle.keyMouseLayout ?? "key-left-mouse-right"}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-km-layout-label"
              onchange={onKeyMouseLayoutChange}
            >
              <option value="key-left-mouse-right"
                >{t("settings.keyMouseLayout.keyLeftMouseRight", locale)}</option
              >
              <option value="key-right-mouse-left"
                >{t("settings.keyMouseLayout.keyRightMouseLeft", locale)}</option
              >
              <option value="key-top-mouse-bottom"
                >{t("settings.keyMouseLayout.keyTopMouseBottom", locale)}</option
              >
              <option value="key-bottom-mouse-top"
                >{t("settings.keyMouseLayout.keyBottomMouseTop", locale)}</option
              >
            </select>
          </div>
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
                <option value="auto"
                  >{t("settings.legendLayout.auto", locale)}</option
                >
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
    {:else if activeTab === "settings"}
      <div
        class="panel settings-panel"
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-settings"
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
              <option value="custom"
                >{t("settings.corner.custom", locale)}</option
              >
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
              onchange={onLocaleChange}
            >
              <option value="en">{t("settings.language.en", locale)}</option>
              <option value="zh">{t("settings.language.zh", locale)}</option>
            </select>
          </div>
        </section>
      </div>
    {:else if activeTab === "capture"}
      <div
        class="panel settings-panel"
        id="panel-capture"
        role="tabpanel"
        aria-labelledby="tab-capture"
      >
        <section>
          <h2>{t("settings.capture", locale)}</h2>
          {#if hookOk === false}
            <p class="muted error">{captureFailedMessage}</p>
          {/if}
          <div class="field field-toggle">
            <input
              id="capture-keyboard"
              type="checkbox"
              checked={captureKeyboard}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureKeyboardChange}
            />
            <label for="capture-keyboard"
              >{t("settings.listenKeyboard", locale)}</label
            >
          </div>
          <div class="field field-toggle">
            <input
              id="capture-mouse"
              type="checkbox"
              checked={captureMouse}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureMouseChange}
            />
            <label for="capture-mouse"
              >{t("settings.listenMouse", locale)}</label
            >
          </div>
          <div class="field field-toggle">
            <input
              id="mouse-click-ripple"
              type="checkbox"
              checked={mouseClickRipple}
              disabled={!captureReady || captureSaving}
              onchange={onMouseClickRippleChange}
            />
            <label for="mouse-click-ripple"
              >{t("settings.mouseClickRipple", locale)}</label
            >
          </div>
          <p class="muted ignore-hint">
            {t("settings.mouseClickRippleHint", locale)}
          </p>

          <div class="ignore-block">
            <p class="field-label">{t("settings.ignoreKeys", locale)}</p>
            <p class="muted ignore-hint">{t("settings.ignoreHint", locale)}</p>
            <div
              class="category-grid"
              role="group"
              aria-label={t("settings.ignoreCategories", locale)}
            >
              {#each IGNORE_CATEGORIES as category (category.id)}
                {@const state = categoryToggleState(ignoredKeyIds, category.ids)}
                {@const labelKey = categoryLabelKey(category.id)}
                <label class="category-toggle">
                  <input
                    type="checkbox"
                    disabled={!captureReady || captureSaving || ignoreCapturing}
                    use:bindCategoryCheckbox={state}
                    onchange={(e) => onIgnoreCategoryChange(category.id, e)}
                  />
                  <span
                    >{labelKey
                      ? t(labelKey, locale)
                      : category.label}</span
                  >
                </label>
              {/each}
            </div>

            <div class="ignore-board">
              <KeyboardMap
                ignoredIds={ignoredIdSet}
                interactive={true}
                disabled={ignoreBoardDisabled}
                textColor={hudStyle.textColor}
                backgroundCss={ignoreBoardBackground}
                fontSizePx={KEYBOARD_MAP_FONT_PX}
                legendLayout={ignoreBoardLegendLayout}
                onToggleKey={onToggleIgnoredKey}
              />
            </div>

            <div class="ignore-actions">
              {#if ignoreCapturing}
                <button
                  type="button"
                  class="clear"
                  disabled={!captureReady || captureSaving}
                  onclick={() => void onCancelIgnoreKey()}
                >
                  {t("settings.cancel", locale)}
                </button>
                <span class="muted">{t("settings.pressKey", locale)}</span>
              {:else}
                <button
                  type="button"
                  class="clear"
                  disabled={!captureReady || captureSaving}
                  onclick={() => void onAddIgnoreKey()}
                >
                  {t("settings.addKey", locale)}
                </button>
              {/if}
            </div>

            {#if offBoardIgnoredKeyIds.length > 0}
              <ul class="ignore-list">
                {#each offBoardIgnoredKeyIds as id (id)}
                  <li class="ignore-item">
                    <span class="ignore-label"
                      >{labelForKeyId(id, ignoreBoardLegendLayout)}</span
                    >
                    <code class="ignore-id">{id}</code>
                    <button
                      type="button"
                      class="clear ignore-remove"
                      disabled={!captureReady || captureSaving || ignoreCapturing}
                      aria-label={t("settings.removeAria", locale, { id })}
                      onclick={() => removeIgnoredKey(id)}
                    >
                      {t("settings.remove", locale)}
                    </button>
                  </li>
                {/each}
              </ul>
            {:else if ignoredKeyIds.length === 0}
              <p class="muted">{t("settings.noIgnoredKeys", locale)}</p>
            {/if}
          </div>
        </section>
      </div>
    {:else if activeTab === "log"}
      <div
        class="panel log-panel"
        id="panel-log"
        role="tabpanel"
        aria-labelledby="tab-log"
      >
        <div class="log-header">
          <h2>{t("log.title", locale)}</h2>
          <button type="button" class="clear" onclick={clearLog}
            >{t("log.clear", locale)}</button
          >
        </div>
        <div
          class="log"
          role="log"
          aria-live="polite"
          bind:this={logEl}
          onscroll={onLogScroll}
        >
          {#if logLines.length === 0}
            <p class="muted empty">{t("log.empty", locale)}</p>
          {:else}
            {#each logLines as line, i (i)}
              <div class="log-line">{line}</div>
            {/each}
          {/if}
        </div>
      </div>
    {:else}
      <div
        class="panel about-panel"
        id="panel-about"
        role="tabpanel"
        aria-labelledby="tab-about"
      >
        <h1 class="about-name">{appName}</h1>
        <p class="about-version"
          >{t("about.version", locale, { version: appVersion })}</p
        >
        <p class="lead">{t("about.blurb", locale)}</p>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(html, body) {
    margin: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.18), transparent 42%),
      radial-gradient(circle at 88% 12%, rgba(251, 146, 60, 0.16), transparent 36%),
      linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0b1220 100%);
    color: #e2e8f0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .shell {
    --radius-sm: 8px;
    --radius-md: 10px;
    /* Content column: 560 + 40 pad ≈ 600 default window; stays centered if wider / fullscreen. */
    --shell-max: 560px;
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    max-width: var(--shell-max);
    margin-inline: auto;
    padding: 20px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-x: hidden;
    overflow-y: hidden;
  }

  .top {
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .brand {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7dd3fc;
  }

  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid #334155;
    padding-bottom: 0;
  }

  .tab {
    appearance: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: #94a3b8;
    font: inherit;
    font-size: 14px;
    font-weight: 550;
    padding: 8px 12px;
    cursor: pointer;
    transition: color 120ms ease, border-color 120ms ease;
  }

  .tab:hover {
    color: #e2e8f0;
  }

  .tab.active {
    color: #e2e8f0;
    border-bottom-color: #38bdf8;
  }

  .panels {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

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

  .panel::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .settings-panel section {
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

  .field > label,
  .field-label {
    color: #e2e8f0;
  }

  .field-hint {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.4;
  }

  .field-toggle {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
  }

  .field-toggle input {
    width: 16px;
    height: 16px;
    accent-color: #38bdf8;
  }

  .segmented {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
  }

  .segment {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 36px;
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid #334155;
    background: #0f172a;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .segment:has(input:checked) {
    border-color: #38bdf8;
    background: color-mix(in srgb, #0ea5e9 18%, #0f172a);
    color: #e0f2fe;
  }

  .segment:has(input:disabled) {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .segment input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .ignore-block {
    display: grid;
    gap: 10px;
    margin-top: 4px;
  }

  .ignore-hint {
    font-size: 13px;
  }

  .category-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
  }

  .ignore-board {
    overflow-x: auto;
    max-width: 100%;
  }

  .category-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #e2e8f0;
    cursor: pointer;
  }

  .category-toggle input {
    width: 14px;
    height: 14px;
    accent-color: #38bdf8;
  }

  .ignore-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ignore-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }

  .ignore-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid #1e293b;
    font-size: 13px;
  }

  .ignore-label {
    color: #e2e8f0;
    font-weight: 550;
  }

  .ignore-id {
    color: #64748b;
    font-family: "IBM Plex Mono", "SF Mono", ui-monospace, monospace;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ignore-remove {
    justify-self: end;
  }

  select,
  input[type="number"],
  input[type="color"],
  input[type="range"] {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  select,
  input[type="number"] {
    border: 1px solid #334155;
    border-radius: var(--radius-md);
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  input[type="color"] {
    min-height: 40px;
    border: 1px solid #334155;
    border-radius: var(--radius-md);
    background: #0f172a;
    padding: 4px;
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

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
  }

  .muted.error {
    color: #fca5a5;
  }

  .log-panel {
    gap: 10px;
    overflow: hidden;
  }

  .log-header {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .clear {
    border: 1px solid #334155;
    border-radius: var(--radius-sm);
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

  .log {
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    border: 1px solid #334155;
    border-radius: var(--radius-md);
    background: rgba(15, 23, 42, 0.9);
    padding: 10px 12px;
    font-family: "IBM Plex Mono", "SF Mono", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.45;
  }

  .log::-webkit-scrollbar {
    width: 0;
    height: 0;
  }

  .log-line {
    color: #cbd5e1;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .empty {
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .about-panel {
    justify-content: center;
    gap: 10px;
    overflow: auto;
  }

  .about-name {
    margin: 0;
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .about-version {
    margin: 0;
    color: #7dd3fc;
    font-size: 13px;
    letter-spacing: 0.04em;
  }

  .lead {
    margin: 6px 0 0;
    max-width: 32ch;
    color: #94a3b8;
    line-height: 1.5;
  }
</style>
