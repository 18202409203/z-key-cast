<script lang="ts">
  type SegmentItem = { value: string; label: string };

  type Props = {
    name: string;
    value: string;
    items: SegmentItem[];
    disabled?: boolean;
    labelledBy?: string;
    onChange?: (value: string) => void;
  };

  let {
    name,
    value,
    items,
    disabled = false,
    labelledBy,
    onChange,
  }: Props = $props();
</script>

<div
  class="segmented"
  role="radiogroup"
  aria-labelledby={labelledBy}
  style:--segment-cols={items.length}
>
  {#each items as item (item.value)}
    <label class="segment">
      <input
        type="radio"
        {name}
        value={item.value}
        checked={value === item.value}
        {disabled}
        onchange={() => onChange?.(item.value)}
      />
      <span>{item.label}</span>
    </label>
  {/each}
</div>

<style>
  .segmented {
    display: grid;
    grid-template-columns: repeat(var(--segment-cols, 3), minmax(0, 1fr));
    gap: 6px;
  }

  .segment {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 36px;
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid #334155;
    background: #0f172a;
    color: #cbd5e1;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .segment:has(input:checked) {
    border-color: #38bdf8;
    background: color-mix(in srgb, #0ea5e9 18%, #0f172a);
    color: #e0f2fe;
  }

  .segment:has(input:disabled) {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .segment input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
</style>
