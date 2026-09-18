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
    gap: 2px;
    padding: 2px;
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--app-fg) 8%, transparent);
    border: none;
  }

  .segment {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 30px;
    padding: 5px 8px;
    border-radius: calc(var(--radius-md) - 2px);
    border: none;
    background: transparent;
    color: var(--app-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .segment:has(input:checked) {
    background: var(--app-control-bg);
    color: var(--app-fg);
    box-shadow: 0 0.5px 1.5px rgba(0, 0, 0, 0.18);
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
