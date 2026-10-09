<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import FormRow from "$lib/components/FormRow.svelte";
  import FormSection from "$lib/components/FormSection.svelte";
  import { KeyboardMap } from "z-key-cast-hud-view";
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
    IGNORED_MOUSE_ACTIONS,
    armIgnoreKeyCapture,
    cancelIgnoreKeyCapture,
    getCaptureSettings,
    getHudStyleSettings,
    isHudStyleSettings,
    normalizeHudStyleSettings,
    setCaptureSettings,
    type CaptureSettings,
    type HudStyleSettings,
    type IgnoredMouseAction,
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
  let ignoredMouseActions = $state<IgnoredMouseAction[]>([]);
  let ignoreCapturing = $state(false);
  let ignoreCandidateId = $state<string | null>(null);
  let ignoreConfirming = $state(false);
  let ignoreShake = $state(0);
  let ignoreFade = $state(0);
  let captureReady = $state(false);
  let hookOk = $state<boolean | null>(null);
  let hudStyle = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });

  const ignoredIdSet = $derived(new Set(ignoredKeyIds));
  const ignoredMouseSet = $derived(new Set(ignoredMouseActions));
  const visibleLayoutIds = $derived(layoutKeyIds(hasNumpad));
  const offBoardIgnoredKeyIds = $derived(
    offBoardIgnoredIds(ignoredKeyIds, visibleLayoutIds),
  );
  /** Main-window board chrome follows window appearance tokens, not HUD colors. */
  const ignoreBoardLegendLayout = $derived(
    resolveKeyboardLegendLayout(hudStyle.keyboardLegendLayout),
  );
  /** Do not disable controls during save — disabling a focused checkbox
   * drops focus (macOS/WebKit), so the next click only refocuses the window. */
  const keyboardControlsDisabled = $derived(
    !captureReady || !captureKeyboard,
  );
  const mouseIgnoreDisabled = $derived(!captureReady || !captureMouse);
  const ignoreBoardDisabled = $derived(
    keyboardControlsDisabled || ignoreCapturing,
  );
  const ignoreCandidateInvalid = $derived(
    ignoreCandidateId !== null && ignoredIdSet.has(ignoreCandidateId),
  );
  const ignoreConfirmDisabled = $derived(
    ignoreConfirming ||
      ignoreCandidateId === null ||
      ignoreCandidateInvalid,
  );
  const ignoreCandidateLabel = $derived(
    ignoreCandidateId
      ? labelForKeyId(ignoreCandidateId, ignoreBoardLegendLayout)
      : "",
  );

  function mouseActionLabelKey(
    action: IgnoredMouseAction,
  ): `settings.ignoreMouse.${IgnoredMouseAction}` {
    return `settings.ignoreMouse.${action}`;
  }

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

  let captureSaveSeq = 0;

  async function persistCapture(
    next: CaptureSettings,
    previous: CaptureSettings,
  ) {
    captureKeyboard = next.captureKeyboard;
    captureMouse = next.captureMouse;
    mouseClickRipple = next.mouseClickRipple;
    hasNumpad = next.hasNumpad;
    ignoredKeyIds = [...next.ignoredKeyIds];
    ignoredMouseActions = [...next.ignoredMouseActions];
    const seq = ++captureSaveSeq;
    try {
      const saved = await setCaptureSettings(next);
      if (seq !== captureSaveSeq) return;
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
      mouseClickRipple = saved.mouseClickRipple;
      hasNumpad = saved.hasNumpad;
      ignoredKeyIds = [...saved.ignoredKeyIds];
      ignoredMouseActions = [...saved.ignoredMouseActions];
    } catch (err) {
      if (seq !== captureSaveSeq) return;
      captureKeyboard = previous.captureKeyboard;
      captureMouse = previous.captureMouse;
      mouseClickRipple = previous.mouseClickRipple;
      hasNumpad = previous.hasNumpad;
      ignoredKeyIds = [...previous.ignoredKeyIds];
      ignoredMouseActions = [...previous.ignoredMouseActions];
      appendLog(`settings save failed: ${String(err)}`);
    }
  }

  function currentCapture(): CaptureSettings {
    return {
      captureKeyboard,
      captureMouse,
      mouseClickRipple,
      hasNumpad,
      ignoredKeyIds: [...ignoredKeyIds],
      ignoredMouseActions: [...ignoredMouseActions],
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

  function onIgnoreMouseActionChange(
    action: IgnoredMouseAction,
    event: Event,
  ) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = currentCapture();
    const nextActions = checked
      ? previous.ignoredMouseActions.includes(action)
        ? previous.ignoredMouseActions
        : [...previous.ignoredMouseActions, action]
      : previous.ignoredMouseActions.filter((a) => a !== action);
    void persistCapture(
      { ...previous, ignoredMouseActions: nextActions },
      previous,
    );
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
    if (ignoreCapturing || keyboardControlsDisabled) return;
    try {
      await armIgnoreKeyCapture();
      ignoreCapturing = true;
    } catch (err) {
      appendLog(`ignore capture arm failed: ${String(err)}`);
    }
  }

  async function discardIgnoreKey() {
    if (!ignoreCapturing || ignoreConfirming) return;
    ignoreCapturing = false;
    ignoreCandidateId = null;
    ignoreShake = 0;
    ignoreFade = 0;
    try {
      await cancelIgnoreKeyCapture();
    } catch (err) {
      appendLog(`ignore capture cancel failed: ${String(err)}`);
    }
  }

  async function onConfirmIgnoreKey() {
    const id = ignoreCandidateId;
    if (!id || ignoreConfirming || ignoredIdSet.has(id)) return;
    ignoreConfirming = true;
    const previous = currentCapture();
    const next: CaptureSettings = {
      ...previous,
      ignoredKeyIds: [...previous.ignoredKeyIds, id],
    };
    try {
      await cancelIgnoreKeyCapture();
    } catch (err) {
      ignoreConfirming = false;
      appendLog(`ignore capture cancel failed: ${String(err)}`);
      return;
    }
    try {
      const saved = await setCaptureSettings(next);
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
      mouseClickRipple = saved.mouseClickRipple;
      hasNumpad = saved.hasNumpad;
      ignoredKeyIds = [...saved.ignoredKeyIds];
      ignoredMouseActions = [...saved.ignoredMouseActions];
      ignoreCapturing = false;
      ignoreCandidateId = null;
      ignoreShake = 0;
      ignoreFade = 0;
    } catch (err) {
      appendLog(`settings save failed: ${String(err)}`);
      ignoreCandidateId = id;
      try {
        await armIgnoreKeyCapture();
        ignoreCapturing = true;
      } catch (armErr) {
        ignoreCapturing = false;
        ignoreCandidateId = null;
        ignoreShake = 0;
        ignoreFade = 0;
        appendLog(`ignore capture arm failed: ${String(armErr)}`);
      }
    } finally {
      ignoreConfirming = false;
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

  $effect(() => {
    if (active || !ignoreCapturing) return;
    void discardIgnoreKey();
  });

  $effect(() => {
    if (!ignoreCapturing) return;
    const swallow = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("keydown", swallow, true);
    window.addEventListener("keyup", swallow, true);
    return () => {
      window.removeEventListener("keydown", swallow, true);
      window.removeEventListener("keyup", swallow, true);
    };
  });

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
        ignoredMouseActions = [...settings.ignoredMouseActions];
      } catch (err) {
        if (!cancelled) {
          appendLog(`settings load failed: ${String(err)}`);
        }
      }

      try {
        const style = await getHudStyleSettings();
        if (!cancelled) hudStyle = normalizeHudStyleSettings(style);
      } catch {
        // Ignore board falls back to DEFAULT_HUD_STYLE for legend layout only.
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
            if (!ignoreCapturing || ignoreConfirming) return;
            if (!isIgnoreKeyCaptured(event.payload)) return;
            const id = event.payload.id;
            const sameId = id === ignoreCandidateId;
            const alreadyIgnored = ignoredIdSet.has(id);
            ignoreCandidateId = id;
            if (alreadyIgnored) ignoreShake += 1;
            if (!alreadyIgnored || !sameId) ignoreFade += 1;
          },
        );
        if (cancelled) {
          unlistenIgnoreCapture();
          return;
        }
        unsubs.push(unlistenIgnoreCapture);

        const unlistenFocus = await getCurrentWindow().onFocusChanged(
          ({ payload: focused }) => {
            if (!focused) void discardIgnoreKey();
          },
        );
        if (cancelled) {
          unlistenFocus();
          return;
        }
        unsubs.push(unlistenFocus);
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
      ignoreCandidateId = null;
      ignoreShake = 0;
      ignoreFade = 0;
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
  {#if hookOk === false}
    <p class="hook-status error">{captureFailedMessage}</p>
  {/if}

  <FormSection
    title={t("settings.mouseSection", locale)}
    titleId="capture-mouse-heading"
  >
    <FormRow label={t("settings.listenMouse", locale)} htmlFor="capture-mouse">
      <input
        id="capture-mouse"
        type="checkbox"
        checked={captureMouse}
        disabled={!captureReady}
        onchange={onCaptureMouseChange}
      />
    </FormRow>

    <FormRow
      label={t("settings.ignoreMouse", locale)}
      hint={t("settings.ignoreMouseHint", locale)}
      sublabel
      stack
    >
      <div
        class="ignore-stack"
        class:section-disabled={!captureMouse}
        role="group"
        aria-label={t("settings.ignoreMouse", locale)}
      >
        <div class="category-grid">
          {#each IGNORED_MOUSE_ACTIONS as action (action)}
            <label class="category-toggle">
              <input
                type="checkbox"
                checked={ignoredMouseSet.has(action)}
                disabled={mouseIgnoreDisabled}
                onchange={(e) => onIgnoreMouseActionChange(action, e)}
              />
              <span>{t(mouseActionLabelKey(action), locale)}</span>
            </label>
          {/each}
        </div>
      </div>
    </FormRow>

    <FormRow
      label={t("settings.mouseClickRipple", locale)}
      htmlFor="mouse-click-ripple"
      hint={t("settings.mouseClickRippleHint", locale)}
    >
      <input
        id="mouse-click-ripple"
        type="checkbox"
        checked={mouseClickRipple}
        disabled={!captureReady}
        onchange={onMouseClickRippleChange}
      />
    </FormRow>
  </FormSection>

  <FormSection
    title={t("settings.keyboardSection", locale)}
    titleId="capture-keyboard-heading"
  >
    <FormRow
      label={t("settings.listenKeyboard", locale)}
      htmlFor="capture-keyboard"
    >
      <input
        id="capture-keyboard"
        type="checkbox"
        checked={captureKeyboard}
        disabled={!captureReady}
        onchange={onCaptureKeyboardChange}
      />
    </FormRow>

    <FormRow
      label={t("settings.hasNumpad", locale)}
      htmlFor="has-numpad"
      hint={t("settings.hasNumpadHint", locale)}
    >
      <input
        id="has-numpad"
        type="checkbox"
        checked={hasNumpad}
        disabled={keyboardControlsDisabled}
        onchange={onHasNumpadChange}
      />
    </FormRow>

    <FormRow
      label={t("settings.ignoreKeys", locale)}
      hint={t("settings.ignoreHint", locale)}
      sublabel
      stack
    >
      <div
        class="ignore-stack"
        class:section-disabled={!captureKeyboard}
      >
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
                disabled={ignoreBoardDisabled}
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
            textColor="var(--app-fg)"
            backgroundCss="var(--app-control-bg)"
            fontSizePx={KEYBOARD_MAP_FONT_PX}
            legendLayout={ignoreBoardLegendLayout}
            onToggleKey={onToggleIgnoredKey}
          />
        </div>

        <div class="ignore-actions">
          <button
            type="button"
            class="clear"
            disabled={keyboardControlsDisabled || ignoreCapturing}
            onclick={() => void onAddIgnoreKey()}
          >
            {t("settings.addKey", locale)}
          </button>
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
                  disabled={ignoreBoardDisabled}
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
    </FormRow>
  </FormSection>
</div>

{#if ignoreCapturing}
  <div class="ignore-capture">
    <button
      type="button"
      class="ignore-capture-scrim"
      tabindex="-1"
      aria-label={t("settings.cancel", locale)}
      onclick={() => void discardIgnoreKey()}
    ></button>
    <div
      class="ignore-capture-card"
      role="dialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="ignore-capture-prompt"
    >
      <p id="ignore-capture-prompt" class="ignore-capture-prompt">
        {t(
          ignoreCandidateId === null
            ? "settings.pressKey"
            : "settings.pressKeyReplace",
          locale,
        )}
      </p>
      {#if ignoreCandidateId}
        <div
          class="ignore-capture-key"
          class:invalid={ignoreCandidateInvalid}
        >
          {#key ignoreFade}
            <div class="ignore-capture-identity" class:fade={ignoreFade > 0}>
              {#key ignoreShake}
                <div
                  class="ignore-capture-motion"
                  class:shake={ignoreCandidateInvalid}
                >
                  <span class="ignore-label">{ignoreCandidateLabel}</span>
                  <code class="ignore-id">{ignoreCandidateId}</code>
                </div>
              {/key}
            </div>
          {/key}
          {#if ignoreCandidateInvalid}
            <p class="ignore-capture-exists">
              {t("settings.ignoreKeyExists", locale)}
            </p>
          {/if}
        </div>
      {/if}
      <div class="ignore-capture-actions">
        <button
          type="button"
          class="clear"
          tabindex="-1"
          disabled={ignoreConfirming}
          onclick={() => void discardIgnoreKey()}
        >
          {t("settings.cancel", locale)}
        </button>
        <button
          type="button"
          class="clear ignore-capture-confirm"
          tabindex="-1"
          disabled={ignoreConfirmDisabled}
          onclick={() => void onConfirmIgnoreKey()}
        >
          {t("settings.confirm", locale)}
        </button>
      </div>
    </div>
  </div>
{/if}

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

  .ignore-stack {
    display: grid;
    gap: 10px;
    min-width: 0;
    justify-self: stretch;
    width: 100%;
  }

  .ignore-stack.section-disabled {
    opacity: 0.55;
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
    color: var(--app-fg);
    cursor: pointer;
  }

  .category-toggle input {
    width: 14px;
    height: 14px;
    background-size: 10px 10px;
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
    border-bottom: 1px solid var(--app-hairline);
    font-size: 13px;
  }

  .ignore-label {
    color: var(--app-fg);
    font-weight: 550;
  }

  .ignore-id {
    color: var(--app-faint);
    font-family: "IBM Plex Mono", "SF Mono", ui-monospace, monospace;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ignore-remove {
    justify-self: end;
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
    border-color: var(--app-hairline-strong);
    background: var(--app-control-bg-hover);
  }

  .hook-status {
    margin: 0;
    font-size: 14px;
  }

  .hook-status.error {
    color: var(--app-danger);
  }

  .muted {
    margin: 0;
    color: var(--app-muted);
    font-size: 14px;
  }

  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .ignore-capture {
    position: fixed;
    inset: 0;
    z-index: 40;
    display: grid;
    place-items: center;
    padding: 24px;
  }

  .ignore-capture-scrim {
    position: absolute;
    inset: 0;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: color-mix(in srgb, var(--app-bg) 62%, transparent);
    cursor: pointer;
  }

  .ignore-capture-scrim:hover {
    color: inherit;
    border-color: transparent;
    background: color-mix(in srgb, var(--app-bg) 62%, transparent);
  }

  .ignore-capture-card {
    position: relative;
    z-index: 1;
    width: min(100%, 320px);
    display: grid;
    gap: 14px;
    padding: 20px;
    border-radius: var(--radius-lg);
    background: var(--app-control-bg);
    border: 1px solid var(--app-hairline-strong);
    box-shadow: 0 16px 40px color-mix(in srgb, #000 28%, transparent);
  }

  .ignore-capture-prompt {
    margin: 0;
    color: var(--app-fg);
    font-size: 15px;
  }

  .ignore-capture-key {
    display: grid;
    gap: 4px;
  }

  .ignore-capture-key.invalid .ignore-label,
  .ignore-capture-key.invalid .ignore-id {
    color: var(--app-danger);
  }

  .ignore-capture-identity.fade {
    animation: ignore-capture-fade 0.16s ease;
  }

  .ignore-capture-motion {
    display: grid;
    gap: 4px;
  }

  .ignore-capture-motion.shake {
    animation: ignore-capture-shake 0.36s ease;
  }

  .ignore-capture-exists {
    margin: 6px 0 0;
    color: var(--app-muted);
    font-size: 12px;
  }

  @keyframes ignore-capture-fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes ignore-capture-shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-5px);
    }
    40% {
      transform: translateX(5px);
    }
    60% {
      transform: translateX(-3px);
    }
    80% {
      transform: translateX(3px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ignore-capture-identity.fade,
    .ignore-capture-motion.shake {
      animation: none;
    }
  }

  .ignore-capture-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .ignore-capture-confirm:not(:disabled) {
    color: var(--app-fg);
    border-color: var(--app-accent);
  }
</style>
