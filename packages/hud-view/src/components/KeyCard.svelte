<script lang="ts">
  import type { KeyCardVisual } from "../model/key-card";

  type Props = {
    visual: KeyCardVisual;
    fontSizePx: number;
    textColor: string;
    backgroundCss: string;
  };

  let { visual, fontSizePx, textColor, backgroundCss }: Props = $props();

  const unit = $derived(Math.max(18, Math.min(34, fontSizePx * 1.35)));
</script>

{#if visual.layout === "modifier"}
  <div
    class="cap modifier"
    class:wide={visual.wide}
    class:symbol-only={!visual.symbol}
    data-key-id={visual.id}
    style:--cap-unit={`${unit}px`}
    style:--cap-fg={textColor}
    style:--cap-bg={backgroundCss}
  >
    {#if visual.symbol}
      <span class="symbol">{visual.symbol}</span>
    {/if}
    <span class="caption">{visual.caption}</span>
  </div>
{:else if visual.shift}
  <div
    class="cap character dual"
    data-key-id={visual.id}
    style:--cap-unit={`${unit}px`}
    style:--cap-fg={textColor}
    style:--cap-bg={backgroundCss}
  >
    <span class="shift">{visual.shift}</span>
    <span class="main">{visual.main}</span>
  </div>
{:else}
  <div
    class="cap character"
    data-key-id={visual.id}
    style:--cap-unit={`${unit}px`}
    style:--cap-fg={textColor}
    style:--cap-bg={backgroundCss}
  >
    <span class="glyph">{visual.main}</span>
  </div>
{/if}

<style>
  .cap {
    box-sizing: border-box;
    position: relative;
    display: flex;
    background: var(--cap-bg);
    color: var(--cap-fg);
    border: 1px solid color-mix(in srgb, var(--cap-fg) 22%, transparent);
    border-radius: calc(var(--cap-unit) * 0.28);
    font-family:
      "SF Pro Text",
      "IBM Plex Sans",
      "Segoe UI",
      system-ui,
      sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .modifier {
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    min-width: calc(var(--cap-unit) * 2.35);
    height: calc(var(--cap-unit) * 2.15);
    padding: calc(var(--cap-unit) * 0.22) calc(var(--cap-unit) * 0.32)
      calc(var(--cap-unit) * 0.28);
  }

  .modifier.wide {
    min-width: calc(var(--cap-unit) * 3.4);
  }

  .modifier.symbol-only {
    justify-content: flex-end;
  }

  .symbol {
    font-size: calc(var(--cap-unit) * 0.48);
    font-weight: 500;
    line-height: 1;
    color: color-mix(in srgb, var(--cap-fg) 72%, transparent);
  }

  .caption {
    font-size: calc(var(--cap-unit) * 0.38);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
    text-transform: lowercase;
  }

  .character {
    align-items: center;
    justify-content: center;
    width: calc(var(--cap-unit) * 2.15);
    height: calc(var(--cap-unit) * 2.15);
    min-width: calc(var(--cap-unit) * 2.15);
  }

  .character.dual {
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: calc(var(--cap-unit) * 0.28) 0 calc(var(--cap-unit) * 0.22);
  }

  .shift {
    font-size: calc(var(--cap-unit) * 0.42);
    font-weight: 500;
    line-height: 1;
    color: color-mix(in srgb, var(--cap-fg) 72%, transparent);
  }

  .main {
    font-size: calc(var(--cap-unit) * 0.55);
    font-weight: 600;
    line-height: 1;
  }

  .glyph {
    font-size: calc(var(--cap-unit) * 0.92);
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.02em;
  }
</style>
