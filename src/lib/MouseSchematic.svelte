<script lang="ts">
  type Props = {
    button: "left" | "right" | "middle";
    textColor: string;
    backgroundCss: string;
    fontSizePx: number;
  };

  let { button, textColor, backgroundCss, fontSizePx }: Props = $props();

  const scale = $derived(Math.max(0.85, Math.min(1.35, fontSizePx / 15)));
</script>

<div
  class="mouse-wrap"
  style:--m-fg={textColor}
  style:--m-bg={backgroundCss}
  style:--m-scale={scale}
  aria-label={`Mouse ${button}`}
>
  <svg
    class="mouse"
    viewBox="0 0 120 180"
    width={Math.round(96 * scale)}
    height={Math.round(144 * scale)}
    role="img"
  >
    <!-- Body -->
    <rect
      class="body"
      x="18"
      y="8"
      width="84"
      height="164"
      rx="42"
      ry="42"
    />
    <!-- Left button -->
    <path
      class="btn"
      class:active={button === "left"}
      d="M22 14h34v52c0 8-6 14-14 14H36c-8 0-14-8-14-18V22c0-4.4 1.8-8 4-8z"
    />
    <!-- Right button -->
    <path
      class="btn"
      class:active={button === "right"}
      d="M64 14h34c2.2 0 4 3.6 4 8v40c0 10-6 18-14 18H78c-8 0-14-6-14-14V14z"
    />
    <!-- Middle / wheel well -->
    <rect
      class="btn wheel"
      class:active={button === "middle"}
      x="52"
      y="28"
      width="16"
      height="36"
      rx="8"
    />
    <!-- Seam -->
    <line class="seam" x1="60" y1="14" x2="60" y2="80" />
    <line class="seam" x1="22" y1="80" x2="98" y2="80" />
  </svg>
</div>

<style>
  .mouse-wrap {
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    filter: drop-shadow(0 10px 24px color-mix(in srgb, #000 28%, transparent));
  }

  .mouse {
    display: block;
  }

  .body {
    fill: color-mix(in srgb, var(--m-bg) 55%, transparent);
    stroke: color-mix(in srgb, var(--m-fg) 22%, transparent);
    stroke-width: 2;
  }

  .btn {
    fill: color-mix(in srgb, var(--m-bg) 72%, transparent);
    stroke: color-mix(in srgb, var(--m-fg) 18%, transparent);
    stroke-width: 1.5;
    transition: fill 120ms ease, stroke 120ms ease;
  }

  .btn.active {
    fill: var(--m-bg);
    stroke: color-mix(in srgb, var(--m-fg) 45%, transparent);
  }

  .seam {
    stroke: color-mix(in srgb, var(--m-fg) 28%, transparent);
    stroke-width: 1.5;
    stroke-linecap: round;
  }
</style>
