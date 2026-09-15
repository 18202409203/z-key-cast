<script lang="ts">
  import { getName, getVersion } from "@tauri-apps/api/app";
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    isHookStatus,
    isHudChip,
    summarizeHookStatus,
    summarizeHudChip,
  } from "$lib/cast";
  import {
    getCaptureSettings,
    setCaptureSettings,
    type CaptureSettings,
  } from "$lib/settings";

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
  let captureReady = $state(false);
  let captureSaving = $state(false);
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
    captureSaving = true;
    try {
      const saved = await setCaptureSettings(next);
      captureKeyboard = saved.captureKeyboard;
      captureMouse = saved.captureMouse;
    } catch (err) {
      captureKeyboard = previous.captureKeyboard;
      captureMouse = previous.captureMouse;
      appendLog(`settings save failed: ${String(err)}`);
    } finally {
      captureSaving = false;
    }
  }

  function onCaptureKeyboardChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = {
      captureKeyboard,
      captureMouse,
    };
    void persistCapture(
      { captureKeyboard: checked, captureMouse },
      previous,
    );
  }

  function onCaptureMouseChange(event: Event) {
    const checked = (event.currentTarget as HTMLInputElement).checked;
    const previous = {
      captureKeyboard,
      captureMouse,
    };
    void persistCapture(
      { captureKeyboard, captureMouse: checked },
      previous,
    );
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
      } catch (err) {
        if (!cancelled) {
          appendLog(`settings load failed: ${String(err)}`);
        }
      } finally {
        if (!cancelled) captureReady = true;
      }

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
    })();

    return () => {
      cancelled = true;
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
          <label>
            Corner
            <select disabled>
              <option selected>Bottom right</option>
              <option>Bottom left</option>
              <option>Top right</option>
              <option>Top left</option>
            </select>
          </label>
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
          <label class="toggle">
            <input
              type="checkbox"
              checked={captureKeyboard}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureKeyboardChange}
            />
            <span>Listen to keyboard</span>
          </label>
          <label class="toggle">
            <input
              type="checkbox"
              checked={captureMouse}
              disabled={!captureReady || captureSaving}
              onchange={onCaptureMouseChange}
            />
            <span>Listen to mouse</span>
          </label>
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
    padding: 20px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
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
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 24px;
    overflow: auto;
  }

  .settings-panel section {
    display: grid;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  label {
    display: grid;
    gap: 8px;
    font-size: 14px;
  }

  label.toggle {
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 10px;
  }

  label.toggle input {
    width: 16px;
    height: 16px;
    accent-color: #38bdf8;
  }

  select {
    width: 100%;
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
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
