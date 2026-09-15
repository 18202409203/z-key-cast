<script lang="ts">
  import { MAIN_ROWS, NUMPAD_ROWS, type LayoutKey } from "$lib/keyboard-layout";
  import {
    legendForKeyId,
    type KeyboardLegendLayoutId,
  } from "$lib/key-legends";

  type Props = {
    activeIds: ReadonlySet<string>;
    textColor: string;
    backgroundCss: string;
    fontSizePx: number;
    legendLayout?: KeyboardLegendLayoutId;
  };

  let {
    activeIds,
    textColor,
    backgroundCss,
    fontSizePx,
    legendLayout = "mac-us",
  }: Props = $props();

  const unit = $derived(Math.max(14, Math.min(22, fontSizePx * 0.85)));

  function keyStyle(key: LayoutKey) {
    const w = key.w ?? 1;
    return `flex: ${w} 1 0; min-width: ${unit * w * 0.55}px`;
  }

  function face(key: LayoutKey) {
    if (key.id.startsWith("_")) {
      return { main: key.label };
    }
    return legendForKeyId(key.id, legendLayout) ?? { main: key.label };
  }
</script>

<div
  class="board"
  style:--kb-fg={textColor}
  style:--kb-bg={backgroundCss}
  style:--kb-unit={`${unit}px`}
  style:--kb-gap={`${Math.max(3, unit * 0.18)}px`}
>
  <div class="main">
    {#each MAIN_ROWS as row, ri (ri)}
      <div class="row">
        {#each row as key (key.id + String(ri))}
          {@const legend = face(key)}
          <div
            class="key"
            class:active={activeIds.has(key.id)}
            class:dual={Boolean(legend.shift)}
            data-key-id={key.id}
            style={keyStyle(key)}
          >
            {#if legend.shift}
              <span class="face-shift">{legend.shift}</span>
              <span class="face-main">{legend.main}</span>
            {:else}
              <span class="face-single">{legend.main}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
  <div class="numpad">
    {#each NUMPAD_ROWS as row, ri (ri)}
      <div class="row">
        {#each row as key (`np-${key.id}-${ri}`)}
          {@const legend = face(key)}
          <div
            class="key"
            class:active={activeIds.has(key.id)}
            class:dual={Boolean(legend.shift)}
            data-key-id={key.id}
            style={keyStyle(key)}
          >
            {#if legend.shift}
              <span class="face-shift">{legend.shift}</span>
              <span class="face-main">{legend.main}</span>
            {:else}
              <span class="face-single">{legend.main}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .board {
    display: flex;
    align-items: flex-end;
    gap: calc(var(--kb-gap) * 2);
    max-width: 100%;
    padding: 10px;
    border-radius: 14px;
    background: rgba(2, 6, 23, 0.55);
    backdrop-filter: blur(12px);
    box-shadow: 0 12px 36px rgba(2, 6, 23, 0.4);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--kb-gap);
    min-width: 0;
    flex: 1 1 auto;
  }

  .numpad {
    display: flex;
    flex-direction: column;
    gap: var(--kb-gap);
    flex: 0 0 auto;
    width: calc(var(--kb-unit) * 5.2);
  }

  .row {
    display: flex;
    gap: var(--kb-gap);
    width: 100%;
  }

  .key {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(var(--kb-unit) * 1.55);
    padding: 0 2px;
    border-radius: 6px;
    border: 1px solid rgba(248, 250, 252, 0.1);
    background: rgba(15, 23, 42, 0.72);
    color: #94a3b8;
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
    overflow: hidden;
    transition:
      background 120ms ease,
      color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .key.dual {
    flex-direction: column;
    justify-content: space-between;
    padding: 3px 0 2px;
  }

  .face-shift {
    font-size: calc(var(--kb-unit) * 0.36);
    font-weight: 500;
    opacity: 0.85;
  }

  .face-main {
    font-size: calc(var(--kb-unit) * 0.42);
  }

  .face-single {
    font-size: calc(var(--kb-unit) * 0.52);
    white-space: nowrap;
  }

  .key.active {
    background: var(--kb-bg);
    color: var(--kb-fg);
    border-color: rgba(248, 250, 252, 0.28);
    box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.35);
  }
</style>
