<script lang="ts">
  import { untrack } from "svelte";

  type Props = {
    id?: string;
    value: number;
    min: number;
    max: number;
    step?: number | string;
    disabled?: boolean;
    labelledBy?: string;
    describedBy?: string;
    title?: string;
    /** Bubble / live text; should match the row label `{n}` formatting. */
    format?: (value: number) => string;
    onChange?: (value: number) => void;
  };

  let {
    id,
    value,
    min,
    max,
    step = 1,
    disabled = false,
    labelledBy,
    describedBy,
    title,
    format = (n: number) => String(n),
    onChange,
  }: Props = $props();

  let inputEl = $state<HTMLInputElement | null>(null);
  let liveValue = $state(untrack(() => value));
  let dragging = $state(false);
  let keyboardFocused = $state(false);
  let focusFrame = 0;

  // Sync from the saved prop only. Drag-end must not copy the prop back:
  // pointerup clears `dragging` before `change`, and that write drops the gesture.
  $effect(() => {
    const next = value;
    if (untrack(() => dragging)) return;
    liveValue = next;
  });

  const showBubble = $derived(!disabled && (dragging || keyboardFocused));
  const ratio = $derived(max === min ? 0 : (liveValue - min) / (max - min));
  const bubbleText = $derived(format(liveValue));

  function readValue(event: Event): number | null {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    return Number.isFinite(next) ? next : null;
  }

  function onInput(event: Event) {
    const next = readValue(event);
    if (next === null) return;
    liveValue = next;
  }

  function onCommit(event: Event) {
    const next = readValue(event);
    if (next === null) return;
    liveValue = next;
    onChange?.(next);
  }

  function onPointerDown() {
    if (disabled) return;
    dragging = true;
  }

  function onPointerEnd() {
    dragging = false;
  }

  function syncKeyboardFocus() {
    keyboardFocused = Boolean(inputEl?.matches(":focus-visible"));
  }

  function onFocus() {
    // Defer so :focus-visible reflects keyboard vs pointer focus.
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(syncKeyboardFocus);
  }

  function onBlur() {
    cancelAnimationFrame(focusFrame);
    keyboardFocused = false;
    dragging = false;
  }

  function onKeyDown(event: KeyboardEvent) {
    const stepsValue =
      event.key.startsWith("Arrow") ||
      event.key === "Home" ||
      event.key === "End" ||
      event.key === "PageUp" ||
      event.key === "PageDown";
    if (disabled || !stepsValue) return;
    keyboardFocused = true;
  }
</script>

<svelte:window onpointerup={onPointerEnd} onpointercancel={onPointerEnd} />

<div class="range-slider">
  {#if showBubble}
    <span
      class="range-slider-bubble"
      style:left="calc({ratio} * (100% - var(--range-thumb)) + (var(--range-thumb) / 2))"
      aria-hidden="true">{bubbleText}</span
    >
  {/if}
  <input
    bind:this={inputEl}
    {id}
    type="range"
    {min}
    {max}
    {step}
    value={liveValue}
    {disabled}
    {title}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    oninput={onInput}
    onchange={onCommit}
    onpointerdown={onPointerDown}
    onpointerup={onPointerEnd}
    onpointercancel={onPointerEnd}
    onfocus={onFocus}
    onblur={onBlur}
    onkeydown={onKeyDown}
  />
</div>

<style>
  .range-slider {
    --range-thumb: 16px;
    position: relative;
    display: block;
    box-sizing: border-box;
    min-width: 0;
  }

  .range-slider :global(input[type="range"]) {
    display: block;
    box-sizing: border-box;
    width: 100%;
    margin: 0;
    accent-color: var(--app-accent);
  }

  .range-slider-bubble {
    position: absolute;
    bottom: calc(100% + 6px);
    z-index: 1;
    transform: translateX(-50%);
    padding: 2px 6px;
    border-radius: var(--radius-sm, 4px);
    background: var(--app-control-bg);
    color: var(--app-fg);
    border: 1px solid var(--app-control-border);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  }
</style>
