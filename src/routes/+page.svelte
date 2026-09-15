<script lang="ts">
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

  const MAX_LOG_LINES = 100;
  const STICK_BOTTOM_PX = 48;

  let logLines = $state<string[]>([]);
  let hookOk = $state<boolean | null>(null);
  let logEl = $state<HTMLDivElement | null>(null);
  let stickToBottom = $state(true);

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

  $effect(() => {
    logLines;
    if (!stickToBottom || !logEl) return;
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    });
  });

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
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

<main class="settings">
  <header>
    <p class="brand">z-key-cast</p>
    <h1>Settings</h1>
    <p class="lead">
      Corner HUD overlay is running. Global input capture feeds the log below.
    </p>
  </header>

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
        Input hook failed — grant Accessibility in System Settings, then restart.
      {:else}
        Waiting for hook status…
      {/if}
    </p>
  </section>

  <section class="log-section">
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
  </section>
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

  .settings {
    box-sizing: border-box;
    height: 100%;
    padding: 28px 24px 32px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    overflow: hidden;
  }

  .brand {
    margin: 0 0 8px;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7dd3fc;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .lead {
    margin: 10px 0 0;
    color: #94a3b8;
    line-height: 1.5;
  }

  section {
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

  .log-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
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
</style>
