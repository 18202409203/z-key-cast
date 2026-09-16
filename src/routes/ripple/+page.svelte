<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { onMount } from "svelte";
  import {
    MOUSE_RIPPLE_CHANNEL,
    isMouseRippleEvent,
    type MouseRippleEvent,
  } from "$lib/cast";

  type Ring = MouseRippleEvent & { id: number };

  const MAX_RINGS = 8;
  const DURATION_MS = 400;

  let rings = $state<Ring[]>([]);
  let nextId = 0;

  onMount(() => {
    let unlisten: (() => void) | undefined;
    void listen(MOUSE_RIPPLE_CHANNEL, (event) => {
      if (!isMouseRippleEvent(event.payload)) return;
      const id = nextId++;
      rings = [...rings, { ...event.payload, id }].slice(-MAX_RINGS);
      window.setTimeout(() => {
        rings = rings.filter((r) => r.id !== id);
      }, DURATION_MS);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  });
</script>

<div class="stage" aria-hidden="true">
  {#each rings as ring (ring.id)}
    <span
      class="ring"
      style="left: {ring.x}px; top: {ring.y}px"
    ></span>
  {/each}
</div>

<style>
  :global(html),
  :global(body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  .stage {
    position: fixed;
    inset: 0;
    pointer-events: none;
  }

  .ring {
    position: absolute;
    width: 14px;
    height: 14px;
    margin: -7px 0 0 -7px;
    border: 2px solid rgba(248, 250, 252, 0.88);
    border-radius: 50%;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.2);
    pointer-events: none;
    animation: ripple 400ms ease-out forwards;
  }

  @keyframes ripple {
    from {
      transform: scale(1);
      opacity: 0.9;
    }
    to {
      transform: scale(7);
      opacity: 0;
    }
  }
</style>
