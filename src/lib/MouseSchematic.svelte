<script lang="ts">
  type Props = {
    button?: "left" | "right" | "middle" | null;
    textColor: string;
    backgroundCss: string;
    fontSizePx: number;
  };

  let { button = null, textColor, backgroundCss, fontSizePx }: Props = $props();

  const scale = $derived(Math.max(0.85, Math.min(1.35, fontSizePx / 15)));

  const body =
    "M8 25C8 12.2 20.5 5.2 40 5.2C59.5 5.2 72 12.2 72 25C72 33.2 71.6 39.4 67.6 44.2C63.4 49.2 52.8 51.2 40 51.2C27.2 51.2 16.6 49.2 12.4 44.2C8.4 39.4 8 33.2 8 25Z";
</script>

<div
  class="mouse-wrap"
  style:--m-fg={textColor}
  style:--m-bg={backgroundCss}
  aria-label={button ? `Mouse ${button}` : "Mouse"}
>
  <svg
    class="mouse"
    viewBox="0 0 80 56"
    width={Math.round(86 * scale)}
    height={Math.round(60 * scale)}
    role="img"
  >
    <defs>
      <clipPath id="ms-body">
        <path d={body} />
      </clipPath>
    </defs>

    <g clip-path="url(#ms-body)">
      <rect
        class="btn"
        class:active={button === "left"}
        x="0"
        y="0"
        width="40"
        height="56"
      />
      <rect
        class="btn"
        class:active={button === "right"}
        x="40"
        y="0"
        width="40"
        height="56"
      />
    </g>

    <path class="outline" d={body} />
    <line class="seam" x1="40" y1="6.4" x2="40" y2="12.2" />
    <line class="seam" x1="40" y1="32.2" x2="40" y2="50.6" />

    <rect class="well" x="35.05" y="10.9" width="9.9" height="22.6" rx="4.95" />
    <rect
      class="btn wheel"
      class:active={button === "middle"}
      x="36.2"
      y="12.1"
      width="7.6"
      height="20.2"
      rx="3.8"
    />
    <g class="ticks" class:on={button === "middle"}>
      <line x1="38.15" y1="17.3" x2="41.85" y2="17.3" />
      <line x1="38.15" y1="22.2" x2="41.85" y2="22.2" />
      <line x1="38.15" y1="27.1" x2="41.85" y2="27.1" />
    </g>
  </svg>
</div>

<style>
  .mouse-wrap {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    filter: drop-shadow(0 8px 18px color-mix(in srgb, #000 26%, transparent));
  }

  .mouse {
    display: block;
    overflow: visible;
  }

  /* Resting body = HUD background (same as keycaps); press = textColor. */
  .btn {
    fill: color-mix(in srgb, var(--m-bg) 92%, transparent);
    stroke: none;
    transition: fill 140ms ease;
  }

  .btn.active {
    fill: var(--m-fg);
  }

  .outline {
    fill: none;
    stroke: color-mix(in srgb, var(--m-fg) 32%, transparent);
    stroke-width: 1.65;
    stroke-linejoin: round;
    stroke-linecap: round;
  }

  .seam {
    stroke: color-mix(in srgb, var(--m-fg) 22%, transparent);
    stroke-width: 1.15;
    stroke-linecap: round;
  }

  .well {
    fill: color-mix(in srgb, var(--m-bg) 72%, var(--m-fg) 10%);
    stroke: none;
  }

  .wheel {
    fill: color-mix(in srgb, var(--m-bg) 78%, var(--m-fg) 10%);
    stroke: color-mix(in srgb, var(--m-fg) 32%, transparent);
    stroke-width: 1.45;
  }

  .wheel.active {
    fill: var(--m-fg);
    stroke: var(--m-fg);
  }

  .ticks {
    stroke: color-mix(in srgb, var(--m-fg) 58%, transparent);
    stroke-width: 1.1;
    stroke-linecap: round;
  }

  .ticks.on {
    stroke: color-mix(in srgb, var(--m-bg) 78%, transparent);
  }
</style>
