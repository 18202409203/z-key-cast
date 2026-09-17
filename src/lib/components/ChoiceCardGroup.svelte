<script lang="ts">
  export type SchematicKind =
    | "hud-text"
    | "hud-lite"
    | "hud-full"
    | "km-klmr"
    | "km-krml"
    | "km-ktmb"
    | "km-kbmt";

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
    onChange?: (value: string) => void;
  };

  let {
    name,
    value,
    items,
    disabled = false,
    labelledBy,
    columns,
    onChange,
  }: Props = $props();

  const cols = $derived(columns ?? items.length);
</script>

<div
  class="choice-group"
  role="radiogroup"
  aria-labelledby={labelledBy}
  style:--choice-cols={cols}
>
  {#each items as item (item.value)}
    <label class="choice-card">
      <input
        type="radio"
        {name}
        value={item.value}
        checked={value === item.value}
        {disabled}
        onchange={() => onChange?.(item.value)}
      />
      <span class="schematic" aria-hidden="true">
        {#if item.schematic === "hud-text"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <rect
              class="stroke fill"
              x="4"
              y="14"
              width="14"
              height="12"
              rx="3"
            />
            <rect
              class="stroke fill"
              x="22"
              y="14"
              width="14"
              height="12"
              rx="3"
            />
            <rect
              class="stroke fill"
              x="40"
              y="14"
              width="18"
              height="12"
              rx="3"
            />
          </svg>
        {:else if item.schematic === "hud-lite"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <rect class="stroke fill" x="4" y="12" width="12" height="14" rx="3" />
            <rect class="stroke fill" x="19" y="12" width="12" height="14" rx="3" />
            <ellipse class="stroke fill" cx="42" cy="19" rx="5" ry="8" />
            <line class="stroke" x1="42" y1="13" x2="42" y2="18" />
            <ellipse class="stroke fill" cx="56" cy="19" rx="5" ry="8" />
            <line class="stroke" x1="54" y1="16" x2="58" y2="16" />
            <line class="stroke" x1="54" y1="20" x2="58" y2="20" />
            <line class="stroke" x1="54" y1="24" x2="58" y2="24" />
          </svg>
        {:else if item.schematic === "hud-full"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <rect class="stroke fill" x="4" y="10" width="36" height="20" rx="3" />
            <line class="stroke" x1="10" y1="16" x2="34" y2="16" />
            <line class="stroke" x1="10" y1="22" x2="34" y2="22" />
            <ellipse class="stroke fill" cx="52" cy="20" rx="7" ry="11" />
            <line class="stroke" x1="52" y1="11" x2="52" y2="19" />
          </svg>
        {:else if item.schematic === "km-klmr"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <rect class="stroke fill" x="6" y="12" width="28" height="16" rx="2" />
            <ellipse class="stroke fill" cx="50" cy="20" rx="7" ry="11" />
            <line class="stroke" x1="50" y1="11" x2="50" y2="19" />
          </svg>
        {:else if item.schematic === "km-krml"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <ellipse class="stroke fill" cx="14" cy="20" rx="7" ry="11" />
            <line class="stroke" x1="14" y1="11" x2="14" y2="19" />
            <rect class="stroke fill" x="30" y="12" width="28" height="16" rx="2" />
          </svg>
        {:else if item.schematic === "km-ktmb"}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <rect class="stroke fill" x="14" y="4" width="36" height="14" rx="2" />
            <ellipse class="stroke fill" cx="32" cy="30" rx="8" ry="6" />
            <line class="stroke" x1="32" y1="25" x2="32" y2="30" />
          </svg>
        {:else}
          <svg viewBox="0 0 64 40" width="56" height="35">
            <ellipse class="stroke fill" cx="32" cy="10" rx="8" ry="6" />
            <line class="stroke" x1="32" y1="5" x2="32" y2="10" />
            <rect class="stroke fill" x="14" y="22" width="36" height="14" rx="2" />
          </svg>
        {/if}
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

  .choice-card {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 8px;
    min-width: 0;
    padding: 10px 6px 8px;
    border-radius: 10px;
    border: 1px solid #334155;
    background: #0f172a;
    color: #cbd5e1;
    cursor: pointer;
  }

  .choice-card:has(input:checked) {
    border-color: #38bdf8;
    background: color-mix(in srgb, #0ea5e9 18%, #0f172a);
    color: #e0f2fe;
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

  .schematic {
    display: grid;
    place-items: center;
    width: 100%;
    min-height: 36px;
  }

  .schematic .stroke {
    fill: none;
    stroke: #94a3b8;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .schematic .fill {
    fill: color-mix(in srgb, #94a3b8 12%, transparent);
  }

  .choice-card:has(input:checked) .schematic .stroke {
    stroke: #7dd3fc;
  }

  .choice-card:has(input:checked) .schematic .fill {
    fill: color-mix(in srgb, #38bdf8 16%, transparent);
  }

  .choice-label {
    font-size: 11px;
    font-weight: 600;
    line-height: 1.25;
    text-align: center;
    text-wrap: balance;
  }
</style>
