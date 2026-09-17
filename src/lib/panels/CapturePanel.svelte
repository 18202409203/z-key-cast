<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import KeyboardMap from "$lib/components/KeyboardMap.svelte";
  import {
    HOOK_STATUS_CHANNEL,
    IGNORE_KEY_CAPTURED_CHANNEL,
    getHookStatus,
    isHookStatus,
    isIgnoreKeyCaptured,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_STYLE_CHANNEL,
    armIgnoreKeyCapture,
    cancelIgnoreKeyCapture,
    getCaptureSettings,
    getHudStyleSettings,
    hudBackgroundCss,
    isHudStyleSettings,
    normalizeHudStyleSettings,
    setCaptureSettings,
    type CaptureSettings,
    type HudStyleSettings,
  } from "$lib/settings";
  import { resolveKeyboardLegendLayout } from "$lib/key-legends";
  import {
    KEYBOARD_MAP_FONT_PX,
    layoutKeyIds,
  } from "$lib/keyboard-layout";
  import {
    IGNORE_CATEGORIES,
    addCategoryIds,
    categoryToggleState,
    labelForKeyId,
    offBoardIgnoredIds,
    removeCategoryIds,
    type IgnoreCategoryId,
  } from "$lib/key-ignore-presets";
  import { categoryLabelKey, t, type UiLocale } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
    appendLog: (line: string) => void;
  };

  let { active, locale, appendLog }: Props = $props();

  let captureKeyboard = $state(true);
  let captureMouse = $state(true);
  let mouseClickRipple = $state(false);
  let hasNumpad = $state(false);
  let ignoredKeyIds = $state<string[]>([]);
  let ignoreCapturing = $state(false);
  let captureReady = $state(false);
  let captureSaving = $state(false);
  let hookOk = $state<boolean | null>(null);
  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });

  const ignoredIdSet = $derived(new Set(ignoredKeyIds));
  const visibleLayoutIds = $derived(layoutKeyIds(hasNumpad));
  const offBoardIgnoredKeyIds = $derived(
    offBoardIgnoredIds(ignoredKeyIds, visibleLayoutIds),
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

  async function persistCapture(
    next: CaptureSettings,
    previous: CaptureSettings,
  ) {
    captureKeyboard = next.captureKeyboard;
    captureMouse = next.captureMouse;
    mouseClickRipple = next.mouseClickRipple;
    hasNumpad = next.hasNumpad;
    ignoredKeyIds = [...next.ignoredKeyIds];
    captureSaving = true;
    try {
      const saved = await setCaptureSettings(next);
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
      mouseClickRipple = saved.mouseClickRipple;
      hasNumpad = saved.hasNumpad;
      ignoredKeyIds = [...saved.ignoredKeyIds];
    } catch (err) {
      captureKeyboard = previous.captureKeyboard;
      captureMouse = previous.captureMouse;
      mouseClickRipple = previous.mouseClickRipple;
      hasNumpad = previous.hasNumpad;
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
      hasNumpad,
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

  function onHasNumpadChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = currentCapture();
    void persistCapture({ ...previous, hasNumpad: checked }, previous);
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

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const settings = await getCaptureSettings();
        if (cancelled) return;
        captureKeyboard = settings.captureKeyboard;
        captureMouse = settings.captureMouse;
        mouseClickRipple = settings.mouseClickRipple;
        hasNumpad = settings.hasNumpad;
        ignoredKeyIds = [...settings.ignoredKeyIds];
      } catch (err) {
        if (!cancelled) {
          appendLog(`settings load failed: ${String(err)}`);
        }
      }

      try {
        const style = await getHudStyleSettings();
        if (!cancelled) hudStyle = normalizeHudStyleSettings(style);
      } catch {
        // Ignore board falls back to DEFAULT_HUD_STYLE colors.
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

        const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
          if (!isHookStatus(event.payload)) return;
          hookOk = event.payload.ok;
        });
        if (cancelled) {
          unlistenStatus();
          return;
        }
        unsubs.push(unlistenStatus);

        const cachedStatus = await getHookStatus();
        if (!cancelled && cachedStatus && hookOk === null) {
          hookOk = cachedStatus.ok;
        }

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

<div
  class="panel settings-panel"
  id="panel-capture"
  role="tabpanel"
  aria-labelledby="tab-capture"
  hidden={!active}
  inert={!active}
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
      <label for="capture-mouse">{t("settings.listenMouse", locale)}</label>
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
    <div class="field field-toggle">
      <input
        id="has-numpad"
        type="checkbox"
        checked={hasNumpad}
        disabled={!captureReady || captureSaving}
        onchange={onHasNumpadChange}
      />
      <label for="has-numpad">{t("settings.hasNumpad", locale)}</label>
    </div>
    <p class="muted ignore-hint">{t("settings.hasNumpadHint", locale)}</p>

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
              >{labelKey ? t(labelKey, locale) : category.label}</span
            >
          </label>
        {/each}
      </div>

      <div class="ignore-board">
        <KeyboardMap
          ignoredIds={ignoredIdSet}
          interactive={true}
          showNumpad={hasNumpad}
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

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
  }

  .muted.error {
    color: #fca5a5;
  }

  input:disabled,
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
