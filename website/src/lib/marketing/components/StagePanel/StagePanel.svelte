<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    DEFAULT_HUD_STYLE,
    HudView,
    KeyboardMap,
    MouseSchematic,
    colorsFromHudPreset,
    createHudSlots,
    guessKeyboardLegendLayout,
    hudBackgroundCss,
    type HudChip,
    type HudColorPresetId,
  } from "z-key-cast-hud-view";
  import { attachDomInputAdapter } from "$lib/dom-input-adapter";
  import type { DomInputAdapter } from "$lib/dom-input-adapter";
  import { t, type UiLocale } from "$lib/i18n";
  import { getTextareaCaretPoint } from "$lib/notepad-caret";
  import { computeRigFit, measureCableGeo, type CableGeo } from "./cable-layout";
  import { BLIND_SLAT_COUNT } from "../../constants";
  import "./stage-panel.css";

  type Props = {
    locale: UiLocale;
    /** Mirrored so page wheel snap can yield while the demo is armed. */
    powered?: boolean;
  };
  let { locale, powered = $bindable(false) }: Props = $props();

  // Locale is fixed per route mount (`/` vs `/zh/`); capture invite once for notepad seed.
  // svelte-ignore state_referenced_locally
  const inviteText = t("intro.invite", locale);

  /**
   * Room light via blinds (stage-local only).
   * Open blinds → bright room → light HUD + light paper.
   * Closed blinds → dim room → dark HUD + dark paper.
   * Default closed (night) so Stage matches the dark marketing chrome on first view.
   */
  const INITIAL_BLINDS_OPEN = false;
  let blindsOpen = $state(INITIAL_BLINDS_OPEN);
  const hudColor = $derived<HudColorPresetId>(
    blindsOpen ? "light" : "dark",
  );
  const INITIAL_HUD_COLOR: HudColorPresetId = INITIAL_BLINDS_OPEN
    ? "light"
    : "dark";
  const liteSlots = createHudSlots();
  const fullSlots = createHudSlots();

  liteSlots.applyStyle({
    ...DEFAULT_HUD_STYLE,
    ...colorsFromHudPreset(INITIAL_HUD_COLOR),
    hudPreset: "lite",
    backgroundOpacity: 0.78,
    fontSizePx: 13,
    dwellMs: 1200,
    timelineMax: 8,
  });
  fullSlots.applyStyle({
    ...DEFAULT_HUD_STYLE,
    ...colorsFromHudPreset(INITIAL_HUD_COLOR),
    hudPreset: "full",
    backgroundOpacity: 0.88,
  });

  function applyHudColor(id: HudColorPresetId) {
    const colors = colorsFromHudPreset(id);
    liteSlots.applyStyle({ ...liteSlots.style, ...colors });
    fullSlots.applyStyle({ ...fullSlots.style, ...colors });
  }

  /** Brief window so theme paint crossfades without stretching keypress feedback. */
  const THEME_CROSSFADE_MS = 220;
  const BLIND_ANIM_MS = 420;
  let themeCrossfade = $state(false);
  let cordYank = $state(false);
  let themeCrossfadeTimer: ReturnType<typeof setTimeout> | null = null;
  let cordYankTimer: ReturnType<typeof setTimeout> | null = null;

  function clearThemeCrossfadeTimer() {
    if (themeCrossfadeTimer !== null) {
      clearTimeout(themeCrossfadeTimer);
      themeCrossfadeTimer = null;
    }
  }

  function clearCordYankTimer() {
    if (cordYankTimer !== null) {
      clearTimeout(cordYankTimer);
      cordYankTimer = null;
    }
  }

  async function setBlindsOpen(open: boolean) {
    if (blindsOpen === open) return;
    const nextColor: HudColorPresetId = open ? "light" : "dark";
    // Transition must be armed in the DOM before color props flip, or the paint snaps.
    themeCrossfade = true;
    cordYank = true;
    await tick();
    blindsOpen = open;
    applyHudColor(nextColor);
    clearThemeCrossfadeTimer();
    clearCordYankTimer();
    themeCrossfadeTimer = setTimeout(() => {
      themeCrossfade = false;
      themeCrossfadeTimer = null;
    }, Math.max(THEME_CROSSFADE_MS, BLIND_ANIM_MS));
    cordYankTimer = setTimeout(() => {
      cordYank = false;
      cordYankTimer = null;
    }, 280);
  }

  function toggleBlinds() {
    void setBlindsOpen(!blindsOpen);
  }

  const blindsAria = $derived(
    t("stage.blinds.aria", locale, {
      state: t(
        blindsOpen ? "stage.blinds.open" : "stage.blinds.closed",
        locale,
      ),
    }),
  );

  const boardBg = $derived(
    hudBackgroundCss(
      fullSlots.style.backgroundColor,
      fullSlots.style.backgroundOpacity,
    ),
  );
  const legendLayout = guessKeyboardLegendLayout();

  let stageRoot: HTMLDivElement | undefined = $state();
  let panelStageEl: HTMLElement | undefined = $state();
  let notepadEl: HTMLTextAreaElement | undefined = $state();
  let rigEl: HTMLDivElement | undefined = $state();
  let baseEl: HTMLDivElement | undefined = $state();
  let kbWrapEl: HTMLDivElement | undefined = $state();
  let mouseWrapEl: HTMLDivElement | undefined = $state();
  let stageFocused = $state(false);
  let inputAdapter: DomInputAdapter | undefined = $state();
  let notepadText = $state(inviteText);
  /** Remount packet overlays — one-shot current toward the monitor. */
  let kbPulseNonce = $state(0);
  let msPulseNonce = $state(0);
  /** Avoid wheel/key-repeat remounting the packet every tick (looks stuck at the jack). */
  const CABLE_PULSE_COOLDOWN_MS = 420;
  let lastKbPulseAt = 0;
  let lastMsPulseAt = 0;
  let caretPos = $state<{ left: number; top: number; height: number } | null>(
    null,
  );
  /** Fit short viewports; 1 means no transform (avoid HUD containing block). */
  let rigScale = $state(1);
  let rigSlotHeight = $state<number | null>(null);
  let cableGeo = $state<CableGeo | null>(null);

  const powerLabel = $derived(
    `${t("stage.power", locale)} — ${
      stageFocused ? t("stage.on", locale) : t("stage.off", locale)
    }`,
  );

  function layoutCables() {
    if (!rigEl || !baseEl || !kbWrapEl || !mouseWrapEl) return;
    cableGeo = measureCableGeo(rigEl, baseEl, kbWrapEl, mouseWrapEl);
  }

  function fitStageHeight() {
    if (!panelStageEl || !rigEl) return;
    const next = computeRigFit(panelStageEl, rigEl);
    if (!next) return;
    if (
      Math.abs(next.scale - rigScale) < 0.01 &&
      ((next.slotHeight == null && rigSlotHeight == null) ||
        (next.slotHeight != null &&
          rigSlotHeight != null &&
          Math.abs(next.slotHeight - rigSlotHeight) < 1))
    ) {
      return;
    }
    rigScale = next.scale;
    rigSlotHeight = next.slotHeight;
    queueMicrotask(() => layoutCables());
  }

  function onViewportResize() {
    fitStageHeight();
    layoutCables();
  }

  function updateNotepadCaret() {
    const el = notepadEl;
    if (!el || !stageFocused || document.activeElement !== el) {
      caretPos = null;
      return;
    }
    caretPos = getTextareaCaretPoint(el);
  }

  function fanOut(chip: HudChip) {
    liteSlots.showChip(chip);
    fullSlots.showChip(chip);
  }

  /** Fire a one-shot packet on the matching cable (device → monitor). */
  function pulseCableFor(chip: HudChip) {
    if (!stageFocused) return;
    const now = performance.now();
    if (chip.kind === "key") {
      if (chip.phase === "up") return;
      if (now - lastKbPulseAt < CABLE_PULSE_COOLDOWN_MS) return;
      lastKbPulseAt = now;
      kbPulseNonce += 1;
      return;
    }
    // Mouse buttons + scroll share the mouse cable.
    if (chip.kind === "mouse" && chip.phase === "up") return;
    if (chip.kind !== "mouse" && chip.kind !== "scroll") return;
    if (now - lastMsPulseAt < CABLE_PULSE_COOLDOWN_MS) return;
    lastMsPulseAt = now;
    msPulseNonce += 1;
  }

  function onPlacePointerDown(_event: PointerEvent) {
    // No place mode on the website demo.
  }

  /** Keyboard activation for the desk power button (mouse is handled in the adapter). */
  function onPowerClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Mouse path: adapter toggles on pointerdown and preventDefault suppresses click.
    // If a click still arrives from a pointer, detail >= 1 — ignore to avoid double toggle.
    if (event.detail !== 0) return;
    if (!inputAdapter) return;
    if (inputAdapter.powered) inputAdapter.powerOff();
    else inputAdapter.powerOn();
  }

  function setStageFocused(next: boolean) {
    stageFocused = next;
    powered = next;
  }

  onMount(() => {
    let cancelled = false;
    let adapter: DomInputAdapter | undefined;

    if (stageRoot) {
      adapter = attachDomInputAdapter(stageRoot, {
        onChip: (chip) => {
          pulseCableFor(chip);
          fanOut(chip);
        },
        onPowerChange: (nextPowered) => {
          setStageFocused(nextPowered);
          queueMicrotask(() => updateNotepadCaret());
        },
        getFocusTarget: () => notepadEl,
        getScrollTarget: () => notepadEl,
        // Whole second screen (panel), not just the desk/monitor stack.
        getPointerRoot: () => panelStageEl,
      });
      inputAdapter = adapter;
    }

    // Enter Stage → power on; leave Stage → power off. ⏻ still toggles while
    // parked on the panel (leave/re-enter re-arms).
    const STAGE_IN_RATIO = 0.45;
    let stageInView = false;
    const io =
      typeof IntersectionObserver !== "undefined" && panelStageEl
        ? new IntersectionObserver(
            (entries) => {
              if (cancelled) return;
              const entry = entries[0];
              const next =
                Boolean(entry?.isIntersecting) &&
                (entry?.intersectionRatio ?? 0) >= STAGE_IN_RATIO;
              if (next === stageInView) return;
              stageInView = next;
              if (next) adapter?.powerOn();
              else adapter?.powerOff();
            },
            { threshold: [0, 0.45, 0.6, 1] },
          )
        : null;
    if (panelStageEl) io?.observe(panelStageEl);

    queueMicrotask(() => {
      fitStageHeight();
      layoutCables();
      updateNotepadCaret();
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            fitStageHeight();
            layoutCables();
            updateNotepadCaret();
          })
        : null;
    if (rigEl) ro?.observe(rigEl);
    if (panelStageEl) ro?.observe(panelStageEl);
    window.addEventListener("resize", onViewportResize);

    function onSelectionChange() {
      if (document.activeElement === notepadEl) updateNotepadCaret();
    }
    document.addEventListener("selectionchange", onSelectionChange);

    return () => {
      cancelled = true;
      adapter?.dispose();
      inputAdapter = undefined;
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("resize", onViewportResize);
      document.removeEventListener("selectionchange", onSelectionChange);
      clearThemeCrossfadeTimer();
      clearCordYankTimer();
      liteSlots.clearAllIdleTimers();
      fullSlots.clearAllIdleTimers();
    };
  });

  $effect(() => {
    notepadText;
    stageFocused;
    queueMicrotask(() => updateNotepadCaret());
  });
</script>

  <section
    id="stage"
    class="panel panel-stage"
    class:blinds-open={blindsOpen}
    class:blinds-closed={!blindsOpen}
    bind:this={panelStageEl}
    aria-label={t("stage.aria", locale)}
  >
    <!-- Full-bleed room light: sky always sunny; blinds gate how much enters. -->
    <div class="stage-env" aria-hidden="true">
      <div class="stage-sky">
        <div class="stage-sun"></div>
      </div>
      <div class="stage-blinds">
        {#each Array(BLIND_SLAT_COUNT) as _, i}
          <div class="blind-slat" style:--i={i}></div>
        {/each}
      </div>
      <div class="stage-room-shade"></div>
    </div>

    <button
      type="button"
      class="blind-cord"
      class:yank={cordYank}
      data-stage-pointer-exempt
      aria-label={blindsAria}
      aria-pressed={!blindsOpen}
      onclick={toggleBlinds}
    >
      <span class="blind-cord-line" aria-hidden="true"></span>
      <span class="blind-cord-knob" aria-hidden="true"></span>
    </button>

    <!-- Capture surface: listeners on stage; typing focus always parks on notepad. -->
    <div
      class="stage"
      class:focused={stageFocused}
      class:theme-crossfade={themeCrossfade}
      data-hud-color={hudColor}
      bind:this={stageRoot}
      role="application"
      aria-label={t("stage.aria", locale)}
    >
      <div
        class="rig-scaler"
        style:height={rigSlotHeight != null ? `${rigSlotHeight}px` : undefined}
      >
        <div
          class="rig"
          bind:this={rigEl}
          style:transform={rigScale < 1 ? `scale(${rigScale})` : undefined}
        >
          <div class="monitor">
            <div class="bezel">
              <div class="screen">
                <div class="hud-corner" aria-hidden="true">
                  <HudView
                    style={liteSlots.style}
                    {locale}
                    placeMode={false}
                    contentCorner="tl"
                    timeline={liteSlots.timeline}
                    statusActive={liteSlots.statusActive}
                    activeKeyIds={liteSlots.activeKeyIds}
                    mouseActiveButtons={liteSlots.mouseActiveButtons}
                    scrollDirection={liteSlots.scrollDirection}
                    scrollPulseNonce={liteSlots.scrollPulseNonce}
                    showKmGroup={liteSlots.showKmGroup}
                    showKeyboardMap={liteSlots.showKeyboardMap}
                    showMouseSchematic={liteSlots.showMouseSchematic}
                    isFull={liteSlots.isFull}
                    isLite={liteSlots.isLite}
                    showNumpad={false}
                    {onPlacePointerDown}
                  />
                </div>
                <textarea
                  class="notepad"
                  bind:this={notepadEl}
                  bind:value={notepadText}
                  spellcheck="false"
                  autocomplete="off"
                  aria-label={t("notepad.aria", locale)}
                  oninput={() => updateNotepadCaret()}
                  onclick={() => updateNotepadCaret()}
                  onkeyup={() => updateNotepadCaret()}
                  onscroll={() => updateNotepadCaret()}
                ></textarea>
                {#if stageFocused && caretPos}
                  <div
                    class="notepad-caret"
                    style:left={`${caretPos.left}px`}
                    style:top={`${caretPos.top}px`}
                    style:height={`${caretPos.height}px`}
                    aria-hidden="true"
                  ></div>
                {/if}
              </div>
            </div>
            <div class="stand" aria-hidden="true"></div>
            <div class="base" bind:this={baseEl} aria-hidden="true"></div>
          </div>

          <div class="desk">
            <button
              type="button"
              class="power-btn"
              class:on={stageFocused}
              data-stage-power
              aria-pressed={stageFocused}
              aria-label={powerLabel}
              onclick={onPowerClick}
            >
              <svg
                class="power-icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="M12 3v9"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
                <path
                  d="M7.5 6.2a7 7 0 1 0 9 0"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <div class="km-row">
              <div class="kb-wrap" bind:this={kbWrapEl}>
                <KeyboardMap
                  activeIds={fullSlots.activeKeyIds}
                  showNumpad={true}
                  textColor={fullSlots.style.textColor}
                  backgroundCss={boardBg}
                  fontSizePx={18}
                  legendLayout={legendLayout}
                />
              </div>
              <div class="mouse-wrap" bind:this={mouseWrapEl}>
                <MouseSchematic
                  activeButtons={fullSlots.mouseActiveButtons}
                  scrollDirection={fullSlots.scrollDirection}
                  scrollPulseNonce={fullSlots.scrollPulseNonce}
                  textColor={fullSlots.style.textColor}
                  backgroundCss={boardBg}
                  fontSizePx={16}
                  size="board"
                />
              </div>
            </div>
          </div>

          {#if cableGeo}
            <svg
              class="cable"
              class:powered={stageFocused}
              aria-hidden="true"
              viewBox={`0 0 ${cableGeo.w} ${cableGeo.h}`}
              width={cableGeo.w}
              height={cableGeo.h}
            >
              <path class="cable-track" d={cableGeo.kb} fill="none" />
              <path class="cable-track" d={cableGeo.ms} fill="none" />
              <path class="cable-live" d={cableGeo.kb} fill="none" />
              <path class="cable-live" d={cableGeo.ms} fill="none" />
              {#key kbPulseNonce}
                {#if kbPulseNonce > 0}
                  <path
                    class="cable-packet"
                    d={cableGeo.kb}
                    fill="none"
                    pathLength="100"
                  />
                {/if}
              {/key}
              {#key msPulseNonce}
                {#if msPulseNonce > 0}
                  <path
                    class="cable-packet"
                    d={cableGeo.ms}
                    fill="none"
                    pathLength="100"
                  />
                {/if}
              {/key}
              <circle
                class="cable-jack"
                cx={cableGeo.kbJack.x}
                cy={cableGeo.kbJack.y}
                r="2.6"
              />
              <circle
                class="cable-jack"
                cx={cableGeo.msJack.x}
                cy={cableGeo.msJack.y}
                r="2.6"
              />
              <circle
                class="cable-port"
                cx={cableGeo.kbPort.x}
                cy={cableGeo.kbPort.y}
                r="2.4"
              />
              <circle
                class="cable-port"
                cx={cableGeo.msPort.x}
                cy={cableGeo.msPort.y}
                r="2.4"
              />
            </svg>
          {/if}
        </div>
      </div>

      <div class="stage-caption">
        <p class="stage-help" aria-label={t("stage.help.aria", locale)}>
          {t("stage.help", locale)}
        </p>
      </div>
    </div>
  </section>

