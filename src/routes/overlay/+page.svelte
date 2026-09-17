<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import HudView from "$lib/overlay/HudView.svelte";
  import { createHudSlots } from "$lib/overlay/hud-slots.svelte";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    getHookStatus,
    isHookStatus,
    isHudChip,
  } from "$lib/cast";
  import {
    HUD_PLACE_MODE_CHANNEL,
    HUD_STYLE_CHANNEL,
    UI_LOCALE_CHANNEL,
    getHudStyleSettings,
    getUiLocaleSettings,
    isHudPlaceModePayload,
    isHudStyleSettings,
    isUiLocalePayload,
    setUiLocaleSettings,
  } from "$lib/settings";
  import {
    guessLocaleFromSystem,
    type UiLocale,
  } from "$lib/i18n";

  const hud = createHudSlots();
  let placeMode = $state(false);
  let locale = $state<UiLocale>("en");

  async function onPlacePointerDown(event: PointerEvent) {
    if (!placeMode) return;
    if (event.button !== 0) return;
    event.preventDefault();
    try {
      await getCurrentWindow().startDragging();
    } catch {
      // Ignore when not running under Tauri.
    }
  }

  onMount(() => {
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    void (async () => {
      try {
        const stored = await getUiLocaleSettings();
        if (!cancelled) {
          if (stored) {
            locale = stored;
          } else {
            const guessed = guessLocaleFromSystem();
            locale = guessed;
            try {
              await setUiLocaleSettings(guessed);
            } catch {
              // Main window may persist first; keep guessed locale in-memory.
            }
          }
        }
      } catch {
        if (!cancelled) locale = guessLocaleFromSystem();
      }

      try {
        const loaded = await getHudStyleSettings();
        if (!cancelled) hud.applyStyle(loaded);
      } catch {
        // Keep defaults when invoke is unavailable (browser-only).
      }

      const unlistenLocale = await listen(UI_LOCALE_CHANNEL, (event) => {
        if (!isUiLocalePayload(event.payload)) return;
        locale = event.payload.locale;
      });
      if (cancelled) {
        unlistenLocale();
        return;
      }
      unsubs.push(unlistenLocale);

      const unlistenStyle = await listen(HUD_STYLE_CHANNEL, (event) => {
        if (!isHudStyleSettings(event.payload)) return;
        hud.applyStyle(event.payload);
      });
      if (cancelled) {
        unlistenStyle();
        return;
      }
      unsubs.push(unlistenStyle);

      const unlistenPlace = await listen(HUD_PLACE_MODE_CHANNEL, (event) => {
        if (!isHudPlaceModePayload(event.payload)) return;
        placeMode = event.payload.active;
      });
      if (cancelled) {
        unlistenPlace();
        return;
      }
      unsubs.push(unlistenPlace);

      const unlistenEvent = await listen(EVENT_CHANNEL, (event) => {
        if (!isHudChip(event.payload)) return;
        hud.showChip(event.payload);
      });
      if (cancelled) {
        unlistenEvent();
        return;
      }
      unsubs.push(unlistenEvent);

      const unlistenStatus = await listen(HOOK_STATUS_CHANNEL, (event) => {
        if (!isHookStatus(event.payload)) return;
        if (!event.payload.ok) {
          hud.showCaptureUnavailable();
        }
      });
      if (cancelled) {
        unlistenStatus();
        return;
      }
      unsubs.push(unlistenStatus);

      const cachedStatus = await getHookStatus();
      if (!cancelled && cachedStatus && !cachedStatus.ok) {
        hud.showCaptureUnavailable();
      }
    })();

    return () => {
      cancelled = true;
      hud.clearAllIdleTimers();
      for (const unlisten of unsubs) {
        unlisten();
      }
    };
  });
</script>

<HudView
  style={hud.style}
  {locale}
  {placeMode}
  keySlot={hud.keySlot}
  mouseSlot={hud.mouseSlot}
  statusActive={hud.statusActive}
  activeKeyIds={hud.activeKeyIds}
  mouseActiveButtons={hud.mouseActiveButtons}
  showKmGroup={hud.showKmGroup}
  showKeySide={hud.showKeySide}
  showMouseSide={hud.showMouseSide}
  showKeyboardMap={hud.showKeyboardMap}
  showKeyCards={hud.showKeyCards}
  showMouseSchematic={hud.showMouseSchematic}
  isFull={hud.isFull}
  {onPlacePointerDown}
/>

<style>
  :global(html, body) {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
  }

  :global(body) {
    background: transparent !important;
  }
</style>
