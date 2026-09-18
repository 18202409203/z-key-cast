<script lang="ts">
  type TabItem = { id: string; label: string };

  type Props = {
    items: TabItem[];
    value: string;
    ariaLabel: string;
    onChange: (id: string) => void;
  };

  let { items, value, ariaLabel, onChange }: Props = $props();

  function selectTab(id: string) {
    onChange(id);
  }

  function onTabListKeydown(event: KeyboardEvent) {
    const current = items.findIndex((tab) => tab.id === value);
    if (current < 0) return;

    let next = current;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (current + 1) % items.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (current - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = items.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = items[next];
    if (!nextTab) return;
    selectTab(nextTab.id);
    queueMicrotask(() => {
      document.getElementById(`tab-${nextTab.id}`)?.focus();
    });
  }
</script>

<div class="tabs" role="tablist" aria-label={ariaLabel}>
  {#each items as tab (tab.id)}
    <button
      type="button"
      class="tab"
      class:active={value === tab.id}
      aria-selected={value === tab.id}
      aria-controls={`panel-${tab.id}`}
      id={`tab-${tab.id}`}
      role="tab"
      tabindex={value === tab.id ? 0 : -1}
      onclick={() => selectTab(tab.id)}
      onkeydown={onTabListKeydown}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--app-hairline);
    padding-bottom: 0;
  }

  .tab {
    appearance: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: var(--app-muted);
    font: inherit;
    font-size: 14px;
    font-weight: 550;
    padding: 8px 12px;
    cursor: pointer;
    transition:
      color 120ms ease,
      border-color 120ms ease;
  }

  .tab:hover {
    color: var(--app-fg);
  }

  .tab.active {
    color: var(--app-fg);
    border-bottom-color: var(--app-accent);
  }
</style>
