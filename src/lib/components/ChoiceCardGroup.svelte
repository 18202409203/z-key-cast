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
        <span class="schematic schematic--bleed" aria-hidden="true">
          {#if item.schematic === "hud-text"}
            <!-- Full-bleed HUD chips: bg #1c1c1e, keys #636366 for contrast. -->
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="8" y="18" width="18" height="20" rx="4" fill="#0a84ff" />
              <rect x="31" y="18" width="18" height="20" rx="4" fill="#636366" />
              <rect x="54" y="18" width="18" height="20" rx="4" fill="#636366" />
              <text
                x="17"
                y="28"
                text-anchor="middle"
                dominant-baseline="central"
                fill="#ffffff"
                font-size="9"
                font-weight="700"
                font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
                >Q</text
              >
              <text
                x="40"
                y="28"
                text-anchor="middle"
                dominant-baseline="central"
                fill="#f2f2f7"
                font-size="9"
                font-weight="700"
                font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
                >W</text
              >
              <text
                x="63"
                y="28"
                text-anchor="middle"
                dominant-baseline="central"
                fill="#f2f2f7"
                font-size="9"
                font-weight="700"
                font-family="ui-monospace, SFMono-Regular, Menlo, monospace"
                >E</text
              >
            </svg>
          {:else if item.schematic === "hud-lite"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="8" y="18" width="18" height="20" rx="4" fill="#0a84ff" />
              <rect x="30" y="18" width="18" height="20" rx="4" fill="#636366" />
              <!-- mouse: squat body + seam + wheel (no tread) -->
              <rect x="51" y="22" width="18" height="12" rx="5" fill="#636366" />
              <line
                x1="60"
                y1="24"
                x2="60"
                y2="32"
                stroke="#2c2c2e"
                stroke-width="1.25"
                stroke-linecap="round"
              />
              <rect x="58.5" y="23.5" width="3" height="7" rx="1.5" fill="#aeaeb2" />
            </svg>
          {:else if item.schematic === "hud-full"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="6" y="14" width="42" height="28" rx="5" fill="#2c2c2e" />
              <!-- short board: top N=3 equal, bottom bar -->
              <rect x="11" y="20" width="9" height="6" rx="1.5" fill="#0a84ff" />
              <rect x="22" y="20" width="9" height="6" rx="1.5" fill="#636366" />
              <rect x="33" y="20" width="9" height="6" rx="1.5" fill="#636366" />
              <rect x="11" y="29" width="31" height="6" rx="1.5" fill="#636366" />
              <rect x="55" y="22" width="18" height="12" rx="5" fill="#636366" />
              <line
                x1="64"
                y1="24"
                x2="64"
                y2="32"
                stroke="#2c2c2e"
                stroke-width="1.25"
                stroke-linecap="round"
              />
              <rect x="62.5" y="23.5" width="3" height="7" rx="1.5" fill="#aeaeb2" />
            </svg>
          {:else if item.schematic === "km-klmr"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="6" y="16" width="36" height="24" rx="5" fill="#2c2c2e" />
              <rect x="11" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="20" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="29" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="11" y="30.5" width="25" height="5.5" rx="1.5" fill="#636366" />
              <rect x="53" y="22" width="18" height="12" rx="5" fill="#636366" />
              <line
                x1="62"
                y1="24"
                x2="62"
                y2="32"
                stroke="#2c2c2e"
                stroke-width="1.25"
                stroke-linecap="round"
              />
              <rect x="60.5" y="23.5" width="3" height="7" rx="1.5" fill="#aeaeb2" />
            </svg>
          {:else if item.schematic === "km-krml"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="9" y="22" width="18" height="12" rx="5" fill="#636366" />
              <line
                x1="18"
                y1="24"
                x2="18"
                y2="32"
                stroke="#2c2c2e"
                stroke-width="1.25"
                stroke-linecap="round"
              />
              <rect x="16.5" y="23.5" width="3" height="7" rx="1.5" fill="#aeaeb2" />
              <rect x="38" y="16" width="36" height="24" rx="5" fill="#2c2c2e" />
              <rect x="43" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="52" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="61" y="22" width="7" height="5.5" rx="1.5" fill="#636366" />
              <rect x="43" y="30.5" width="25" height="5.5" rx="1.5" fill="#636366" />
            </svg>
          {:else if item.schematic === "km-ktmb"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="14" y="6" width="52" height="22" rx="5" fill="#2c2c2e" />
              <!-- long board: top N=4 equal, bottom bar -->
              <rect x="20" y="12" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="30.5" y="12" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="41" y="12" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="51.5" y="12" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="20" y="19" width="40" height="5" rx="1.5" fill="#636366" />
              <rect x="33" y="36" width="14" height="10" rx="4" fill="#636366" />
              <line
                x1="40"
                y1="37.5"
                x2="40"
                y2="44.5"
                stroke="#2c2c2e"
                stroke-width="1.1"
                stroke-linecap="round"
              />
              <rect x="38.75" y="37.25" width="2.5" height="5.5" rx="1.25" fill="#aeaeb2" />
            </svg>
          {:else if item.schematic === "km-kbmt"}
            <svg viewBox="0 0 80 56" preserveAspectRatio="xMidYMid slice">
              <rect width="80" height="56" fill="#1c1c1e" />
              <rect x="33" y="10" width="14" height="10" rx="4" fill="#636366" />
              <line
                x1="40"
                y1="11.5"
                x2="40"
                y2="18.5"
                stroke="#2c2c2e"
                stroke-width="1.1"
                stroke-linecap="round"
              />
              <rect x="38.75" y="11.25" width="2.5" height="5.5" rx="1.25" fill="#aeaeb2" />
              <rect x="14" y="28" width="52" height="22" rx="5" fill="#2c2c2e" />
              <rect x="20" y="34" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="30.5" y="34" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="41" y="34" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="51.5" y="34" width="8.5" height="5" rx="1.5" fill="#636366" />
              <rect x="20" y="41" width="40" height="5" rx="1.5" fill="#636366" />
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
  }

  .choice-card--fill .schematic--bleed {
    padding: 0;
  }

  .choice-card--fill .schematic :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
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
