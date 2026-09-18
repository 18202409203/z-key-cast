<script lang="ts">
  export type SchematicKind =
    | "hud-text"
    | "hud-lite"
    | "hud-full"
    | "km-klmr"
    | "km-krml"
    | "km-ktmb"
    | "km-kbmt"
    | "appearance-system"
    | "appearance-dark"
    | "appearance-light";

  type ChoiceItem = {
    value: string;
    label: string;
    schematic: SchematicKind;
  };

  type Props = {
    name: string;
    value: string;
    items: ChoiceItem[];
    disabled?: boolean;
    labelledBy?: string;
    columns?: number;
    /** `fill` (default): framed preview + label outside; `compact`: legacy inset card. */
    layout?: "compact" | "fill";
    onChange?: (value: string) => void;
  };

  let {
    name,
    value,
    items,
    disabled = false,
    labelledBy,
    columns,
    layout = "fill",
    onChange,
  }: Props = $props();

  const cols = $derived(columns ?? items.length);
  const fill = $derived(layout === "fill");
</script>

<div
  class="choice-group"
  class:choice-group--fill={fill}
  role="radiogroup"
  aria-labelledby={labelledBy}
  style:--choice-cols={cols}
>
  {#each items as item (item.value)}
    <label class="choice-card" class:choice-card--fill={fill}>
      <input
        type="radio"
        {name}
        value={item.value}
        checked={value === item.value}
        {disabled}
        onchange={() => onChange?.(item.value)}
      />
      <span class="schematic-frame">
        <span
          class="schematic"
          class:schematic--bleed={item.schematic.startsWith("appearance-")}
          aria-hidden="true"
        >
          {#if item.schematic === "hud-text"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <rect class="stroke fill" x="8" y="13" width="14" height="14" rx="3" />
              <text
                class="glyph"
                x="15"
                y="20"
                text-anchor="middle"
                dominant-baseline="central">Q</text
              >
              <rect class="stroke fill" x="25" y="13" width="14" height="14" rx="3" />
              <text
                class="glyph"
                x="32"
                y="20"
                text-anchor="middle"
                dominant-baseline="central">W</text
              >
              <rect class="stroke fill" x="42" y="13" width="14" height="14" rx="3" />
              <text
                class="glyph"
                x="49"
                y="20"
                text-anchor="middle"
                dominant-baseline="central">E</text
              >
            </svg>
          {:else if item.schematic === "hud-lite"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <rect class="stroke fill" x="8" y="13" width="14" height="14" rx="3" />
              <rect class="stroke fill" x="26" y="13" width="14" height="14" rx="3" />
              <ellipse class="stroke fill" cx="52" cy="20" rx="5" ry="7" />
              <line class="stroke" x1="52" y1="14" x2="52" y2="19" />
            </svg>
          {:else if item.schematic === "hud-full"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <rect class="stroke fill" x="4" y="10" width="36" height="20" rx="3" />
              <line class="stroke" x1="10" y1="16" x2="34" y2="16" />
              <line class="stroke" x1="10" y1="22" x2="34" y2="22" />
              <ellipse class="stroke fill" cx="52" cy="20" rx="7" ry="11" />
              <line class="stroke" x1="52" y1="11" x2="52" y2="19" />
            </svg>
          {:else if item.schematic === "km-klmr"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <rect class="stroke fill" x="6" y="12" width="28" height="16" rx="2" />
              <ellipse class="stroke fill" cx="50" cy="20" rx="7" ry="11" />
              <line class="stroke" x1="50" y1="11" x2="50" y2="19" />
            </svg>
          {:else if item.schematic === "km-krml"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <ellipse class="stroke fill" cx="14" cy="20" rx="7" ry="11" />
              <line class="stroke" x1="14" y1="11" x2="14" y2="19" />
              <rect class="stroke fill" x="30" y="12" width="28" height="16" rx="2" />
            </svg>
          {:else if item.schematic === "km-ktmb"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <rect class="stroke fill" x="14" y="4" width="36" height="14" rx="2" />
              <ellipse class="stroke fill" cx="32" cy="30" rx="4.5" ry="6.5" />
              <line class="stroke" x1="32" y1="24.5" x2="32" y2="29" />
            </svg>
          {:else if item.schematic === "km-kbmt"}
            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid meet">
              <ellipse class="stroke fill" cx="32" cy="10" rx="4.5" ry="6.5" />
              <line class="stroke" x1="32" y1="4.5" x2="32" y2="9" />
              <rect class="stroke fill" x="14" y="22" width="36" height="14" rx="2" />
            </svg>
          {:else if item.schematic === "appearance-system"}
            <!-- Full-bleed split chrome (fixed swatches, no wash). -->
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect x="0" y="0" width="40" height="56" fill="#ffffff" />
              <rect x="40" y="0" width="40" height="56" fill="#1c1c1e" />
              <rect x="8" y="12" width="24" height="32" rx="4" fill="#f2f2f7" />
              <rect x="48" y="12" width="24" height="32" rx="4" fill="#2c2c2e" />
              <rect x="12" y="20" width="12" height="6" rx="2" fill="#ffffff" />
              <rect x="52" y="20" width="12" height="6" rx="2" fill="#3a3a3c" />
            </svg>
          {:else if item.schematic === "appearance-dark"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="10" y="12" width="60" height="32" rx="5" fill="#2c2c2e" />
              <rect x="16" y="22" width="24" height="8" rx="2" fill="#3a3a3c" />
            </svg>
          {:else}
            <!-- appearance-light -->
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#ffffff" />
              <rect x="10" y="12" width="60" height="32" rx="5" fill="#f2f2f7" />
              <rect x="16" y="22" width="24" height="8" rx="2" fill="#ffffff" />
            </svg>
          {/if}
        </span>
      </span>
      <span class="choice-label">{item.label}</span>
    </label>
  {/each}
</div>

<style>
  .choice-group {
    display: grid;
    grid-template-columns: repeat(var(--choice-cols, 3), minmax(0, 1fr));
    gap: 8px;
  }

  .choice-group--fill {
    gap: 10px 8px;
  }

  .choice-card {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 8px;
    min-width: 0;
    padding: 10px 6px 8px;
    border-radius: var(--radius-md);
    border: 1px solid var(--app-control-border);
    background: var(--app-control-bg);
    color: var(--app-muted);
    cursor: pointer;
  }

  .choice-card:has(input:checked) {
    border-color: var(--app-accent);
    background: var(--app-accent-soft);
    color: var(--app-fg);
  }

  .choice-card--fill {
    padding: 0;
    gap: 8px;
    border: none;
    background: transparent;
    border-radius: 0;
    color: var(--app-muted);
  }

  .choice-card--fill:has(input:checked) {
    background: transparent;
    color: var(--app-fg);
  }

  .choice-card--fill .schematic-frame {
    display: block;
    width: 100%;
    max-width: 96px;
    aspect-ratio: 4 / 3;
    justify-self: center;
    border-radius: var(--radius-md);
    border: none;
    outline: 1px solid var(--app-control-border);
    outline-offset: 0;
    overflow: hidden;
    background: var(--app-inset);
  }

  .choice-card--fill:has(input:checked) .schematic-frame {
    outline: 2px solid var(--app-accent);
    outline-offset: 2px;
  }

  .choice-card:has(input:disabled) {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .choice-card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .schematic-frame {
    display: contents;
  }

  .schematic {
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 36px;
  }

  .choice-card--fill .schematic {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    padding: 10px;
  }

  .choice-card--fill .schematic--bleed {
    padding: 0;
  }

  .choice-card--fill .schematic :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .schematic .stroke {
    fill: none;
    stroke: var(--app-muted);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .schematic .fill {
    fill: color-mix(in srgb, var(--app-muted) 12%, transparent);
  }

  .schematic .glyph {
    fill: var(--app-muted);
    font-size: 7px;
    font-weight: 700;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0;
  }

  .choice-card:not(.choice-card--fill):has(input:checked) .schematic .stroke {
    stroke: var(--app-accent);
  }

  .choice-card:not(.choice-card--fill):has(input:checked) .schematic .fill {
    fill: var(--app-accent-soft);
  }

  .choice-card:not(.choice-card--fill):has(input:checked) .schematic .glyph {
    fill: var(--app-accent);
  }

  .choice-label {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.25;
    text-align: center;
    text-wrap: balance;
  }

  .choice-card--fill .choice-label {
    font-size: 12px;
    font-weight: 500;
  }
</style>
