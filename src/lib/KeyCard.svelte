<script lang="ts">
  import type { KeyCardVisual } from "$lib/key-card";

  type Props = {
    visual: KeyCardVisual;
    /** Scales the Mac keycap size from HUD fontSize setting. */
    fontSizePx: number;
  };

  let { visual, fontSizePx }: Props = $props();

  const unit = $derived(Math.max(18, Math.min(34, fontSizePx * 1.35)));
</script>

{#if visual.layout === "modifier"}
  <div
    class="cap modifier"
    class:wide={visual.wide}
    class:symbol-only={!visual.symbol}
    data-key-id={visual.id}
    style:--cap-unit={`${unit}px`}
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
  >
    <span class="shift">{visual.shift}</span>
    <span class="main">{visual.main}</span>
  </div>
{:else}
  <div
    class="cap character"
    data-key-id={visual.id}
    style:--cap-unit={`${unit}px`}
  >
    <span class="glyph">{visual.main}</span>
  </div>
{/if}

<style>
  .cap {
    box-sizing: border-box;
    position: relative;
    display: flex;
    background: #f4f4f5;
    color: #3f3f46;
    border: 1px solid #d4d4d8;
    border-radius: calc(var(--cap-unit) * 0.28);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.9) inset,
      0 2px 4px rgba(24, 24, 27, 0.18),
      0 1px 0 rgba(24, 24, 27, 0.06);
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
    color: #52525b;
  }

  .caption {
    font-size: calc(var(--cap-unit) * 0.38);
    font-weight: 500;
    line-height: 1;
    letter-spacing: 0.01em;
    text-transform: lowercase;
    color: #3f3f46;
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
    color: #52525b;
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
