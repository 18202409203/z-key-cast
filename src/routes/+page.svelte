<script lang="ts">
  import { getName, getVersion } from "@tauri-apps/api/app";
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    IGNORE_KEY_CAPTURED_CHANNEL,
    isHookStatus,
    isHudChip,
    isIgnoreKeyCaptured,
    summarizeHookStatus,
    summarizeHudChip,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_COLOR_PRESETS,
    armIgnoreKeyCapture,
    cancelIgnoreKeyCapture,
    colorsFromHudPreset,
    getCaptureSettings,
    getHudStyleSettings,
    matchHudColorPreset,
    normalizeHudStyleSettings,
    setCaptureSettings,
    setHudStyleSettings,
    type CaptureSettings,
    type HudColorPresetId,
    type HudStyleSettings,
    type KeyboardDisplayMode,
    type MouseDisplayMode,
  } from "$lib/settings";
  import type { KeyboardLegendPreference } from "$lib/key-legends";
  import {
    IGNORE_CATEGORIES,
    addCategoryIds,
    categoryToggleState,
    labelForKeyId,
    removeCategoryIds,
    type IgnoreCategoryId,
  } from "$lib/key-ignore-presets";
  type MainTab = "settings" | "log" | "about";

  const MAX_LOG_LINES = 100;
  const STICK_BOTTOM_PX = 48;
  const FALLBACK_APP_NAME = "z-key-cast";
  const FALLBACK_APP_VERSION = "1.0.0";
  const PRODUCT_BLURB =
    "Corner HUD for keyboard and mouse actions while screen recording.";

  const TABS: { id: MainTab; label: string }[] = [
    { id: "settings", label: "Settings" },
    { id: "log", label: "Log" },
    { id: "about", label: "About" },
  ];

  let activeTab = $state<MainTab>("log");
  let logLines = $state<string[]>([]);
  let hookOk = $state<boolean | null>(null);
  let logEl = $state<HTMLDivElement | null>(null);
  let stickToBottom = $state(true);
  let captureKeyboard = $state(true);
  let captureMouse = $state(true);
  let ignoredKeyIds = $state<string[]>([]);
  let ignoredKeyLabels = $state<Record<string, string>>({});
  let ignoreCapturing = $state(false);
  let captureReady = $state(false);
  let captureSaving = $state(false);
  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let hudReady = $state(false);
  let hudSaving = $state(false);
  let appName = $state(FALLBACK_APP_NAME);
  let appVersion = $state(FALLBACK_APP_VERSION);

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
    ignoredKeyIds = [...next.ignoredKeyIds];
    captureSaving = true;
    try {
      const saved = await setCaptureSettings(next);
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
      ignoredKeyIds = [...saved.ignoredKeyIds];
    } catch (err) {
      captureKeyboard = previous.captureKeyboard;
      captureMouse = previous.captureMouse;
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
    hudStyle = next;
    hudSaving = true;
    try {
      hudStyle = await setHudStyleSettings(next);
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
    patchHud({ fontSizePx: value });
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

  function onKeyboardDisplayModeChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "text" && value !== "key-card" && value !== "keyboard") return;
    patchHud({ keyboardDisplayMode: value as KeyboardDisplayMode });
  }

  function onMouseDisplayModeChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "text" && value !== "schematic") return;
    patchHud({ mouseDisplayMode: value as MouseDisplayMode });
  }

  function onKeyboardLegendLayoutChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value !== "auto" && value !== "mac-us" && value !== "win-us") return;
    patchHud({ keyboardLegendLayout: value as KeyboardLegendPreference });
  }

  function onColorPresetChange(event: Event) {
    const value = (event.currentTarget as HTMLSelectElement).value;
    if (value === "custom") return;
    if (value !== "dark" && value !== "light") return;
    patchHud(colorsFromHudPreset(value as HudColorPresetId));
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
        const settings = await getCaptureSettings();
        if (cancelled) return;
        captureKeyboard = settings.captureKeyboard;
        captureMouse = settings.captureMouse;
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

        const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
          if (!isHudChip(event.payload)) return;
          appendLog(summarizeHudChip(event.payload));
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
            const { id, label } = event.payload;
            ignoredKeyLabels = { ...ignoredKeyLabels, [id]: label };
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
    <div class="tabs" role="tablist" aria-label="Main sections">
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
    {#if activeTab === "settings"}
      <div
        class="panel settings-panel"
        id="panel-settings"
        role="tabpanel"
        aria-labelledby="tab-settings"
      >
        <section>
          <h2>Display</h2>
          <div class="field">
            <span class="field-label" id="setting-corner-label">Corner</span>
            <select id="setting-corner" aria-labelledby="setting-corner-label" disabled>
              <option selected>Bottom right</option>
              <option>Bottom left</option>
              <option>Top right</option>
              <option>Top left</option>
            </select>
          </div>
        </section>

        <section>
          <h2>HUD appearance</h2>
          <div class="field">
            <span class="field-label" id="hud-keyboard-mode-label"
              >Keyboard display</span
            >
            <select
              id="hud-keyboard-mode"
              value={hudStyle.keyboardDisplayMode}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-keyboard-mode-label"
              onchange={onKeyboardDisplayModeChange}
            >
              <option value="text">Text</option>
              <option value="key-card">Key cards</option>
              <option value="keyboard">Full keyboard</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label" id="hud-mouse-mode-label">Mouse display</span>
            <select
              id="hud-mouse-mode"
              value={hudStyle.mouseDisplayMode ?? "text"}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-mouse-mode-label"
              onchange={onMouseDisplayModeChange}
            >
              <option value="text">Text</option>
              <option value="schematic">Schematic</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label" id="hud-legend-layout-label"
              >Key legend layout</span
            >
            <select
              id="hud-legend-layout"
              value={hudStyle.keyboardLegendLayout ?? "auto"}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-legend-layout-label"
              onchange={onKeyboardLegendLayoutChange}
            >
              <option value="auto">Auto (guess from OS)</option>
              <option value="mac-us">Mac US ANSI</option>
              <option value="win-us">Windows US ANSI</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label" id="hud-font-size-label"
              >Font size ({hudStyle.fontSizePx}px)</span
            >
            <input
              id="hud-font-size"
              type="range"
              min="10"
              max="48"
              step="1"
              value={hudStyle.fontSizePx}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-font-size-label"
              onchange={onFontSizeChange}
            />
          </div>
          <div class="field">
            <span class="field-label" id="hud-color-preset-label">Color preset</span>
            <select
              id="hud-color-preset"
              value={matchHudColorPreset(hudStyle)}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-color-preset-label"
              onchange={onColorPresetChange}
            >
              {#each HUD_COLOR_PRESETS as preset (preset.id)}
                <option value={preset.id}>{preset.label}</option>
              {/each}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label" id="hud-text-color-label">Text color</span>
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
            <span class="field-label" id="hud-bg-color-label">Background color</span>
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
              >Background opacity ({hudStyle.backgroundOpacity.toFixed(2)})</span
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
          <div class="field">
            <span class="field-label" id="hud-dwell-ms-label">Dwell (ms)</span>
            <input
              id="hud-dwell-ms"
              type="number"
              min="200"
              max="5000"
              step="50"
              value={hudStyle.dwellMs}
              disabled={!hudReady || hudSaving}
              aria-labelledby="hud-dwell-ms-label"
              onchange={onDwellMsChange}
            />
          </div>
        </section>

        <section>
          <h2>Capture</h2>
          <p class="muted">
            {#if hookOk === true}
              Input hook is active.
            {:else if hookOk === false}
              Input hook failed — grant Accessibility in System Settings, then
              restart.
            {:else}
              Waiting for hook status…
            {/if}
          </p>
          <div class="field field-toggle">
            <input
              id="capture-keyboard"
              type="checkbox"
              checked={captureKeyboard}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureKeyboardChange}
            />
            <label for="capture-keyboard">Listen to keyboard</label>
          </div>
          <div class="field field-toggle">
            <input
              id="capture-mouse"
              type="checkbox"
              checked={captureMouse}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureMouseChange}
            />
            <label for="capture-mouse">Listen to mouse</label>
          </div>

          <div class="ignore-block">
            <p class="field-label">Ignore keys</p>
            <p class="muted ignore-hint">
              Ignored primaries never show; ignored modifiers are stripped from
              chords.
            </p>
            <div class="category-grid" role="group" aria-label="Ignore categories">
              {#each IGNORE_CATEGORIES as category (category.id)}
                {@const state = categoryToggleState(ignoredKeyIds, category.ids)}
                <label class="category-toggle">
                  <input
                    type="checkbox"
                    disabled={!captureReady || captureSaving || ignoreCapturing}
                    use:bindCategoryCheckbox={state}
                    onchange={(e) => onIgnoreCategoryChange(category.id, e)}
                  />
                  <span>{category.label}</span>
                </label>
              {/each}
            </div>

            <div class="ignore-actions">
              {#if ignoreCapturing}
                <button
                  type="button"
                  class="clear"
                  disabled={!captureReady || captureSaving}
                  onclick={() => void onCancelIgnoreKey()}
                >
                  Cancel
                </button>
                <span class="muted">Press a key to ignore…</span>
              {:else}
                <button
                  type="button"
                  class="clear"
                  disabled={!captureReady || captureSaving}
                  onclick={() => void onAddIgnoreKey()}
                >
                  Add key
                </button>
              {/if}
            </div>

            {#if ignoredKeyIds.length > 0}
              <ul class="ignore-list">
                {#each ignoredKeyIds as id (id)}
                  <li class="ignore-item">
                    <span class="ignore-label"
                      >{ignoredKeyLabels[id] ?? labelForKeyId(id)}</span
                    >
                    <code class="ignore-id">{id}</code>
                    <button
                      type="button"
                      class="clear ignore-remove"
                      disabled={!captureReady || captureSaving || ignoreCapturing}
                      aria-label={`Remove ${id}`}
                      onclick={() => removeIgnoredKey(id)}
                    >
                      Remove
                    </button>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="muted">No ignored keys.</p>
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
          <h2>Event log</h2>
          <button type="button" class="clear" onclick={clearLog}>Clear</button>
        </div>
        <div
          class="log"
          role="log"
          aria-live="polite"
          bind:this={logEl}
          onscroll={onLogScroll}
        >
          {#if logLines.length === 0}
            <p class="muted empty">No events yet.</p>
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
        <p class="about-version">Version {appVersion}</p>
        <p class="lead">{PRODUCT_BLURB}</p>
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
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    max-width: 100%;
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
    gap: 8px;
    min-width: 0;
    font-size: 14px;
  }

  .field > label,
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
    border-radius: 10px;
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
  }

  input[type="color"] {
    height: 40px;
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    padding: 4px;
  }

  input[type="range"] {
    accent-color: #38bdf8;
  }

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
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
  }

  .log {
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    overflow: auto;
    border: 1px solid #334155;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.72);
    padding: 10px 12px;
    font-family: "IBM Plex Mono", "SF Mono", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.45;
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
