<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    label?: string;
    labelId?: string;
    /** Associates the row label with a control id (checkbox/select). */
    htmlFor?: string;
    hint?: string;
    hintId?: string;
    /** Weaker label for nested blocks (e.g. Capture ignore). */
    sublabel?: boolean;
    /** Full-width stack: label above, control below. */
    stack?: boolean;
    children: Snippet;
  };

  let {
    label,
    labelId,
    htmlFor,
    hint,
    hintId,
    sublabel = false,
    stack = false,
    children,
  }: Props = $props();

  const showLabel = $derived(Boolean(label));
  const showHint = $derived(Boolean(hint));
</script>

<div
  class="form-row"
  class:form-row--stack={stack}
  class:form-row--label-only={!showLabel}
>
  {#if showLabel || (showHint && !stack)}
    <div class="form-row-meta">
      {#if showLabel}
        {#if htmlFor}
          <label
            class="form-row-label"
            class:form-sublabel={sublabel}
            id={labelId}
            for={htmlFor}>{label}</label
          >
        {:else}
          <span
            class="form-row-label"
            class:form-sublabel={sublabel}
            id={labelId}>{label}</span
          >
        {/if}
      {/if}
      {#if showHint && !stack}
        <p class="form-row-hint" id={hintId}>{hint}</p>
      {/if}
    </div>
  {/if}
  <div class="form-row-control">
    {@render children()}
    {#if showHint && stack}
      <p class="form-row-hint" id={hintId}>{hint}</p>
    {/if}
  </div>
</div>

<style>
  .form-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px 16px;
    padding: 12px 14px;
    min-width: 0;
    /* ≤ section title (14px); hold or step down */
    font-size: 13px;
  }

  .form-row--stack {
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
  }

  .form-row--label-only {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-row-meta {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .form-row-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--app-fg);
    line-height: 1.35;
  }

  .form-sublabel {
    font-size: 12px;
    font-weight: 500;
    color: var(--app-muted);
  }

  .form-row-hint {
    margin: 0;
    color: var(--app-faint);
    font-size: 12px;
    line-height: 1.4;
  }

  .form-row-control {
    display: grid;
    gap: 8px;
    min-width: 0;
    justify-items: end;
  }

  .form-row--stack .form-row-control,
  .form-row--label-only .form-row-control {
    justify-items: stretch;
  }

  .form-row-control :global(select),
  .form-row-control :global(input[type="number"]),
  .form-row-control :global(input[type="color"]),
  .form-row-control :global(input[type="range"]),
  .form-row-control :global(.range-slider) {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(select),
  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(input[type="number"]),
  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(input[type="color"]),
  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(input[type="range"]),
  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(.range-slider) {
    width: auto;
    min-width: 140px;
    max-width: 220px;
  }

  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(input[type="range"]),
  .form-row:not(.form-row--stack):not(.form-row--label-only)
    .form-row-control
    :global(.range-slider) {
    min-width: 120px;
    max-width: 180px;
  }

  .form-row-control :global(select),
  .form-row-control :global(input[type="number"]) {
    border: 1px solid var(--app-control-border);
    border-radius: var(--radius-md);
    background: var(--app-control-bg);
    color: var(--app-fg);
    padding: 8px 12px;
  }

  .form-row-control :global(input[type="color"]) {
    min-height: 36px;
    min-width: 72px;
    border: 1px solid var(--app-control-border);
    border-radius: var(--radius-md);
    background: var(--app-control-bg);
    padding: 4px;
  }

  .form-row-control :global(input[type="range"]) {
    accent-color: var(--app-accent);
  }

  .form-row-control :global(input[type="checkbox"]) {
    width: 16px;
    height: 16px;
    margin: 0;
  }

  .form-row-control :global(select:disabled),
  .form-row-control :global(input:disabled),
  .form-row-control :global(button:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
