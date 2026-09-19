<script lang="ts">
  import {
    MAIN_LAYOUT_UNITS,
    MAIN_ROWS,
    NUMPAD_LAYOUT_UNITS,
    NUMPAD_ROWS,
    type LayoutKey,
  } from "$lib/keyboard-layout";
  import {
    displayLabelForKeyId,
    legendForKeyId,
    type KeyboardLegendLayoutId,
  } from "$lib/key-legends";

  const EMPTY_IDS: ReadonlySet<string> = new Set();

  type Props = {
    activeIds?: ReadonlySet<string>;
    ignoredIds?: ReadonlySet<string>;
    interactive?: boolean;
    /** Draw numpad column; default true. Does not affect chip emit. */
    showNumpad?: boolean;
    textColor: string;
    backgroundCss: string;
    fontSizePx: number;
    legendLayout?: KeyboardLegendLayoutId;
    disabled?: boolean;
    onToggleKey?: (id: string) => void;
  };

  let {
    activeIds = EMPTY_IDS,
    ignoredIds = EMPTY_IDS,
    interactive = false,
    showNumpad = false,
    textColor,
    backgroundCss,
    fontSizePx,
    legendLayout = "mac-us",
    disabled = false,
    onToggleKey,
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
    return (
      legendForKeyId(key.id, legendLayout) ?? {
        main: displayLabelForKeyId(key.id, legendLayout),
      }
    );
  }

  function isSpacer(id: string) {
    return id.startsWith("_");
  }

  function isIgnored(id: string) {
    return !isSpacer(id) && ignoredIds.has(id);
  }

  function handleToggle(id: string) {
    if (!interactive || disabled || isSpacer(id)) return;
    onToggleKey?.(id);
  }
</script>

<div
  class="board"
  class:interactive
  class:disabled={interactive && disabled}
  style:--kb-fg={textColor}
  style:--kb-bg={backgroundCss}
  style:--kb-unit={`${unit}px`}
  style:--kb-gap={`${Math.max(3, unit * 0.18)}px`}
  style:--kb-main-flex={MAIN_LAYOUT_UNITS}
  style:--kb-num-flex={showNumpad ? NUMPAD_LAYOUT_UNITS : 0}
  class:no-numpad={!showNumpad}
>
  <div class="main">
    {#each MAIN_ROWS as row, ri (ri)}
      <div class="row">
        {#each row as key (key.id + String(ri))}
          {@const legend = face(key)}
          {@const spacer = isSpacer(key.id)}
          {#if interactive && !spacer}
            <button
              type="button"
              class="key"
              class:ignored={isIgnored(key.id)}
              class:dual={Boolean(legend.shift)}
              data-key-id={key.id}
              style={keyStyle(key)}
              disabled={disabled}
              aria-pressed={isIgnored(key.id)}
              onclick={() => handleToggle(key.id)}
            >
              {#if legend.shift}
                <span class="face-shift">{legend.shift}</span>
                <span class="face-main">{legend.main}</span>
              {:else}
                <span class="face-single">{legend.main}</span>
              {/if}
            </button>
          {:else}
            <div
              class="key"
              class:active={activeIds.has(key.id)}
              class:ignored={isIgnored(key.id)}
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
          {/if}
        {/each}
      </div>
    {/each}
  </div>
  {#if showNumpad}
    <div class="numpad">
      {#each NUMPAD_ROWS as row, ri (ri)}
        <div class="row">
          {#each row as key (`np-${key.id}-${ri}`)}
            {@const legend = face(key)}
            {@const spacer = isSpacer(key.id)}
            {#if interactive && !spacer}
              <button
                type="button"
                class="key"
                class:ignored={isIgnored(key.id)}
                class:dual={Boolean(legend.shift)}
                data-key-id={key.id}
                style={keyStyle(key)}
                disabled={disabled}
                aria-pressed={isIgnored(key.id)}
                onclick={() => handleToggle(key.id)}
              >
                {#if legend.shift}
                  <span class="face-shift">{legend.shift}</span>
                  <span class="face-main">{legend.main}</span>
                {:else}
                  <span class="face-single">{legend.main}</span>
                {/if}
              </button>
            {:else}
              <div
                class="key"
                class:active={activeIds.has(key.id)}
                class:ignored={isIgnored(key.id)}
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
            {/if}
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .board {
    display: flex;
    align-items: flex-end;
    gap: calc(var(--kb-gap) * 2);
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding: 10px;
    border-radius: 14px;
    /* Use --kb-bg as-is so HUD backgroundOpacity is the only alpha. */
    background: var(--kb-bg);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--kb-gap);
    min-width: 0;
    flex: var(--kb-main-flex) 1 0;
  }

  .board.no-numpad .main {
    flex: 1 1 auto;
  }

  .numpad {
    display: flex;
    flex-direction: column;
    gap: var(--kb-gap);
    min-width: 0;
    flex: var(--kb-num-flex) 1 0;
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
    border: 1px solid color-mix(in srgb, var(--kb-fg) 16%, var(--kb-bg));
    /* Hierarchy via fg/bg mix — never mix --kb-bg with transparent (desktop bleed). */
    background: color-mix(in srgb, var(--kb-fg) 10%, var(--kb-bg));
    color: color-mix(in srgb, var(--kb-fg) 62%, var(--kb-bg));
    font-weight: 600;
    letter-spacing: 0.02em;
    line-height: 1;
    overflow: hidden;
    transition:
      background 120ms ease,
      color 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  button.key {
    margin: 0;
    font: inherit;
    font-family: inherit;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
  }

  button.key:disabled {
    cursor: not-allowed;
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
    background: color-mix(in srgb, var(--kb-fg) 22%, var(--kb-bg));
    color: var(--kb-fg);
    border-color: color-mix(in srgb, var(--kb-fg) 35%, var(--kb-bg));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--kb-fg) 28%, var(--kb-bg));
  }

  .key.ignored {
    opacity: 0.4;
    border-color: color-mix(in srgb, var(--kb-fg) 8%, var(--kb-bg));
    background: color-mix(in srgb, var(--kb-fg) 6%, var(--kb-bg));
    color: color-mix(in srgb, var(--kb-fg) 40%, var(--kb-bg));
    box-shadow: none;
  }
</style>
