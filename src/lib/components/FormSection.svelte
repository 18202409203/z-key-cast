<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    title: string;
    titleId?: string;
    /** Optional trailing header actions (e.g. Log clear). */
    actions?: Snippet;
    children: Snippet;
  };

  let { title, titleId, actions, children }: Props = $props();
</script>

<section class="form-section" aria-labelledby={titleId || undefined}>
  <div class="form-section-header">
    <h2 class="form-section-title" id={titleId}>{title}</h2>
    {#if actions}
      <div class="form-section-actions">
        {@render actions()}
      </div>
    {/if}
  </div>
  <div class="form-group">
    {@render children()}
  </div>
</section>

<style>
  .form-section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  .form-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  .form-section-title {
    margin: 0;
    /* ≤ tab (14px): hold equal; distinguish via weight/color, not size */
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: #94a3b8;
  }

  .form-section-actions {
    flex: none;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .form-group {
    display: grid;
    min-width: 0;
    border-radius: 12px;
    background: color-mix(in srgb, #94a3b8 10%, transparent);
    overflow: hidden;
  }

  .form-group > :global(.form-row + .form-row) {
    border-top: 1px solid color-mix(in srgb, #94a3b8 14%, transparent);
  }
</style>
