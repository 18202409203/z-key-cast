<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import FormSection from "$lib/components/FormSection.svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    getHookStatus,
    isHookStatus,
    isHudChip,
    summarizeHookStatus,
    summarizeHudChip,
  } from "$lib/cast";
  import {
    DEFAULT_HUD_STYLE,
    HUD_STYLE_CHANNEL,
    getHudStyleSettings,
    isHudStyleSettings,
    normalizeHudStyleSettings,
  } from "$lib/settings";
  import { resolveKeyboardLegendLayout } from "$lib/key-legends";
  import { t, type UiLocale } from "$lib/i18n";

  type Props = {
    active: boolean;
    locale: UiLocale;
    logLines: string[];
    appendLog: (line: string) => void;
    onClear: () => void;
  };

  let { active, locale, logLines, appendLog, onClear }: Props = $props();

  const STICK_BOTTOM_PX = 48;

  let logEl = $state<HTMLDivElement | null>(null);
  let stickToBottom = $state(true);
  let legendLayout = $state(
    resolveKeyboardLegendLayout(DEFAULT_HUD_STYLE.keyboardLegendLayout),
  );

  function isNearBottom(el: HTMLDivElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= STICK_BOTTOM_PX;
  }

  function onLogScroll() {
    if (!logEl) return;
    stickToBottom = isNearBottom(logEl);
  }

  function clearLog() {
    onClear();
    stickToBottom = true;
  }

  $effect(() => {
    logLines;
    active;
    if (!active || !stickToBottom || !logEl) return;
    queueMicrotask(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    });
  });

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const style = await getHudStyleSettings();
        if (!cancelled) {
          legendLayout = resolveKeyboardLegendLayout(
            normalizeHudStyleSettings(style).keyboardLegendLayout,
          );
        }
      } catch {
        // Keep default legend for summarizeHudChip.
      }

      try {
        const unlistenStyle = await listen(HUD_STYLE_CHANNEL, (event) => {
          if (!isHudStyleSettings(event.payload)) return;
          legendLayout = resolveKeyboardLegendLayout(
            normalizeHudStyleSettings(event.payload).keyboardLegendLayout,
          );
        });
        if (cancelled) {
          unlistenStyle();
          return;
        }
        unsubs.push(unlistenStyle);

        let gotStatus = false;
        const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
          if (!isHookStatus(event.payload)) return;
          gotStatus = true;
          appendLog(summarizeHookStatus(event.payload));
        });
        if (cancelled) {
          unlistenStatus();
          return;
        }
        unsubs.push(unlistenStatus);

        const cachedStatus = await getHookStatus();
        if (!cancelled && cachedStatus && !gotStatus) {
          appendLog(summarizeHookStatus(cachedStatus));
        }

        const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
          if (!isHudChip(event.payload)) return;
          appendLog(summarizeHudChip(event.payload, legendLayout, locale));
        });
        if (cancelled) {
          unlistenEvent();
          return;
        }
        unsubs.push(unlistenEvent);
      } catch (err) {
        if (!cancelled) {
          appendLog(`event listen failed: ${String(err)}`);
        }
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
  class="panel log-panel"
  id="panel-log"
  role="tabpanel"
  aria-labelledby="tab-log"
  hidden={!active}
  inert={!active}
>
  <FormSection title={t("log.title", locale)} titleId="log-heading">
    {#snippet actions()}
      <button type="button" class="clear" onclick={clearLog}
        >{t("log.clear", locale)}</button
      >
    {/snippet}
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
  </FormSection>
</div>

<style>
  .panel {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: hidden;
  }

  .panel[hidden] {
    display: none;
  }

  .panel :global(.form-section) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .panel :global(.form-group) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
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

  .log {
    box-sizing: border-box;
    flex: 1;
    min-height: 0;
    overflow: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding: 12px 14px;
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

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 13px;
  }

  .empty {
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }
</style>
