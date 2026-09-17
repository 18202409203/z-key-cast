<script lang="ts">
  type MouseButton = "left" | "right" | "middle";
  type ScrollDirection = "up" | "down";

  type Props = {
    /** Pressed buttons (Full can light several; Lite usually 0–1). */
    activeButtons?: Iterable<MouseButton>;
    /** Orthogonal wheel-tick pulse; does not clear button highlights. */
    scrollDirection?: ScrollDirection | null;
    /** Bumps so repeated same-direction pulses re-run CSS animation. */
    scrollPulseNonce?: number;
    textColor: string;
    backgroundCss: string;
    fontSizePx: number;
  };

  let {
    activeButtons = [],
    scrollDirection = null,
    scrollPulseNonce = 0,
    textColor,
    backgroundCss,
    fontSizePx,
  }: Props = $props();

  const active = $derived(new Set(activeButtons));
  const scale = $derived(Math.max(0.85, Math.min(1.35, fontSizePx / 15)));
  const ariaLabel = $derived(
    active.size === 0 && !scrollDirection
      ? "Mouse"
      : [
          "Mouse",
          ...active,
          scrollDirection ? `scroll ${scrollDirection}` : null,
        ]
          .filter(Boolean)
          .join(" "),
  );

  /** Stable per-instance id so multiple mice don't share one clipPath. */
  const clipId = `ms-body-${crypto.randomUUID().slice(0, 8)}`;

  const body =
    "M8 25C8 12.2 20.5 5.2 40 5.2C59.5 5.2 72 12.2 72 25C72 33.2 71.6 39.4 67.6 44.2C63.4 49.2 52.8 51.2 40 51.2C27.2 51.2 16.6 49.2 12.4 44.2C8.4 39.4 8 33.2 8 25Z";
</script>

<div
  class="mouse-wrap"
  class:lit={active.size > 0 || scrollDirection !== null}
  style:--m-fg={textColor}
  style:--m-bg={backgroundCss}
  aria-label={ariaLabel}
>
  <svg
    class="mouse"
    viewBox="0 0 80 56"
    width={Math.round(86 * scale)}
    height={Math.round(60 * scale)}
    role="img"
  >
    <defs>
      <clipPath id={clipId}>
        <path d={body} />
      </clipPath>
    </defs>

    <!-- One shell fill: abutting translucent halves left a hairline gap on light desktops. -->
    <path class="shell" d={body} />

    <g clip-path={`url(#${clipId})`}>
      <rect
        class="press"
        class:active={active.has("left")}
        x="0"
        y="0"
        width="40.5"
        height="56"
      />
      <rect
        class="press"
        class:active={active.has("right")}
        x="39.5"
        y="0"
        width="40.5"
        height="56"
      />
    </g>

    <path class="outline" d={body} />
    <line class="seam" x1="40" y1="6.4" x2="40" y2="12.2" />
    <line class="seam" x1="40" y1="32.2" x2="40" y2="50.6" />

    <rect class="well" x="35.05" y="10.9" width="9.9" height="22.6" rx="4.95" />
    <rect
      class="press wheel"
      class:active={active.has("middle")}
      x="36.2"
      y="12.1"
      width="7.6"
      height="20.2"
      rx="3.8"
    />
    {#key scrollPulseNonce}
      <g
        class="ticks"
        class:on={active.has("middle")}
        class:pulse-up={scrollDirection === "up"}
        class:pulse-down={scrollDirection === "down"}
      >
        <line x1="38.15" y1="17.3" x2="41.85" y2="17.3" />
        <line x1="38.15" y1="22.2" x2="41.85" y2="22.2" />
        <line x1="38.15" y1="27.1" x2="41.85" y2="27.1" />
      </g>
    {/key}
  </svg>
</div>

<style>
  .mouse-wrap {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
  }

  .mouse {
    display: block;
    overflow: visible;
  }

  /* Resting fill matches KeyboardMap .key. */
  .shell {
    fill: color-mix(in srgb, var(--m-bg) 58%, transparent);
    stroke: none;
  }

  .press {
    fill: transparent;
    stroke: none;
    transition:
      fill 120ms ease,
      filter 120ms ease;
  }

  .press.active {
    fill: var(--m-fg);
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--m-fg) 55%, transparent));
  }

  .outline {
    fill: none;
    stroke: color-mix(in srgb, var(--m-fg) 16%, transparent);
    stroke-width: 1;
    stroke-linejoin: round;
    stroke-linecap: round;
    transition: stroke 120ms ease;
  }

  .mouse-wrap.lit .outline {
    stroke: color-mix(in srgb, var(--m-fg) 35%, transparent);
  }

  .seam {
    stroke: color-mix(in srgb, var(--m-fg) 16%, transparent);
    stroke-width: 1;
    stroke-linecap: round;
  }

  .well {
    fill: color-mix(in srgb, var(--m-bg) 42%, transparent);
    stroke: none;
  }

  .wheel {
    fill: color-mix(in srgb, var(--m-bg) 58%, transparent);
    stroke: color-mix(in srgb, var(--m-fg) 16%, transparent);
    stroke-width: 1;
  }

  .wheel.active {
    fill: var(--m-fg);
    stroke: color-mix(in srgb, var(--m-fg) 35%, transparent);
    filter: drop-shadow(0 0 3px color-mix(in srgb, var(--m-fg) 55%, transparent));
  }

  .ticks {
    stroke: color-mix(in srgb, var(--m-fg) 55%, transparent);
    stroke-width: 1;
    stroke-linecap: round;
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 120ms ease;
  }

  .ticks.on {
    stroke: color-mix(in srgb, var(--m-bg) 78%, transparent);
  }

  .ticks.pulse-up {
    animation: tick-up 250ms ease-out;
  }

  .ticks.pulse-down {
    animation: tick-down 250ms ease-out;
  }

  @keyframes tick-up {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    40% {
      transform: translateY(-3.5px);
      opacity: 1;
    }
    100% {
      transform: translateY(0);
      opacity: 0.85;
    }
  }

  @keyframes tick-down {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    40% {
      transform: translateY(3.5px);
      opacity: 1;
    }
    100% {
      transform: translateY(0);
      opacity: 0.85;
    }
  }
</style>
