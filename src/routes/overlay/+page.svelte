<script lang="ts">
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { onMount } from "svelte";
  import { HudView, createHudSlots } from "z-key-cast-hud-view";
  import {
    EVENT_CHANNEL,
    HOOK_STATUS_CHANNEL,
    getHookStatus,
    isHookStatus,
    isHudChip,
  } from "$lib/cast";
  import {
    CAPTURE_SETTINGS_CHANNEL,
    DEFAULT_HUD_POSITION,
    HUD_PLACE_MODE_CHANNEL,
    HUD_POSITION_CHANNEL,
    HUD_STYLE_CHANNEL,
    UI_LOCALE_CHANNEL,
    contentCornerFromPosition,
    getCaptureSettings,
    getHudPositionSettings,
    getHudStyleSettings,
    getUiLocaleSettings,
    isCaptureSettings,
    isHudPlaceModePayload,
    isHudStyleSettings,
    isUiLocalePayload,
    normalizeCaptureSettings,
    normalizeHudPositionSettings,
    setUiLocaleSettings,
    type HudCorner,
  } from "$lib/settings";
  import {
    guessLocaleFromSystem,
    type UiLocale,
  } from "$lib/i18n";

  const hud = createHudSlots();
  let placeMode = $state(false);
  let locale = $state<UiLocale>("en");
  let hasNumpad = $state(false);
  let contentCorner = $state<HudCorner>("br");

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

      try {
        const capture = await getCaptureSettings();
        if (!cancelled) hasNumpad = capture.hasNumpad;
      } catch {
        // Keep default true when invoke is unavailable.
      }

      try {
        const position = await getHudPositionSettings();
        if (!cancelled) contentCorner = contentCornerFromPosition(position);
      } catch {
        if (!cancelled) {
          contentCorner = contentCornerFromPosition(DEFAULT_HUD_POSITION);
        }
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

      const unlistenPosition = await listen(HUD_POSITION_CHANNEL, (event) => {
        const position = normalizeHudPositionSettings(event.payload);
        if (!position) return;
        contentCorner = contentCornerFromPosition(position);
      });
      if (cancelled) {
        unlistenPosition();
        return;
      }
      unsubs.push(unlistenPosition);

      const unlistenCapture = await listen(CAPTURE_SETTINGS_CHANNEL, (event) => {
        if (!isCaptureSettings(event.payload)) return;
        hasNumpad = normalizeCaptureSettings(event.payload).hasNumpad;
      });
      if (cancelled) {
        unlistenCapture();
        return;
      }
      unsubs.push(unlistenCapture);

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
  {contentCorner}
  timeline={hud.timeline}
  statusActive={hud.statusActive}
  activeKeyIds={hud.activeKeyIds}
  mouseActiveButtons={hud.mouseActiveButtons}
  scrollDirection={hud.scrollDirection}
  scrollPulseNonce={hud.scrollPulseNonce}
  showKmGroup={hud.showKmGroup}
  showKeyboardMap={hud.showKeyboardMap}
  showMouseSchematic={hud.showMouseSchematic}
  isFull={hud.isFull}
  isLite={hud.isLite}
  showNumpad={hasNumpad}
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
