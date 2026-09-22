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
  import { t, type MessageKey, type UiLocale } from "$lib/i18n";
  import { getTextareaCaretPoint } from "$lib/notepad-caret";

  type Props = { locale: UiLocale };
  let { locale }: Props = $props();

  const productName = "z-key-cast";
  // Locale is fixed per route mount (`/` vs `/zh/`); capture invite once for notepad seed.
  // svelte-ignore state_referenced_locally
  const inviteText = t("intro.invite", locale);

  type MacDownload = { href: string; note: string };

  function placeholderMac(loc: UiLocale): MacDownload {
    return {
      href: "/downloads/",
      note: t("downloads.macos.note", loc),
    };
  }

  // svelte-ignore state_referenced_locally
  let macDownload: MacDownload = $state(placeholderMac(locale));
  let publishedVersion: string | null = $state(null);
  const versionLabel = $derived(
    publishedVersion ?? t("version.none", locale),
  );
  /**
   * Room light via blinds (stage-local only).
   * Open blinds → bright room → light HUD + light paper.
   * Closed blinds → dim room → dark HUD + dark paper.
   */
  const INITIAL_BLINDS_OPEN = true;
  let blindsOpen = $state(INITIAL_BLINDS_OPEN);
  const hudColor = $derived<HudColorPresetId>(
    blindsOpen ? "light" : "dark",
  );
  const BLIND_SLAT_COUNT = 16;
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

  let pageEl: HTMLElement | undefined = $state();
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
  let caretPos = $state<{ left: number; top: number; height: number } | null>(
    null,
  );
  /** Fit short viewports; 1 means no transform (avoid HUD containing block). */
  let rigScale = $state(1);
  let rigSlotHeight = $state<number | null>(null);

  /** Measured orthogonal cable geometry (rig-local px). */
  let cableGeo = $state<{
    w: number;
    h: number;
    kb: string;
    ms: string;
    kbJack: { x: number; y: number };
    msJack: { x: number; y: number };
    kbPort: { x: number; y: number };
    msPort: { x: number; y: number };
  } | null>(null);

  const powerLabel = $derived(
    `${t("stage.power", locale)} — ${
      stageFocused ? t("stage.on", locale) : t("stage.off", locale)
    }`,
  );

  function layoutCables() {
    const rig = rigEl;
    const base = baseEl;
    const kb = kbWrapEl;
    const ms = mouseWrapEl;
    if (!rig || !base || !kb || !ms) return;

    const r = rig.getBoundingClientRect();
    const b = base.getBoundingClientRect();
    const k = kb.getBoundingClientRect();
    const m = ms.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;

    // Monitor base USB ports (center underside).
    const kbPort = {
      x: b.left + b.width * 0.42 - r.left,
      y: b.bottom - r.top,
    };
    const msPort = {
      x: b.left + b.width * 0.58 - r.left,
      y: b.bottom - r.top,
    };
    // Keyboard top near F12 (right of letter block, before numpad).
    const kbJack = {
      x: k.left + k.width * 0.62 - r.left,
      y: k.top - r.top + 2,
    };
    // Mouse top-center.
    const msJack = {
      x: m.left + m.width * 0.5 - r.left,
      y: m.top - r.top + 2,
    };
    // Horizontal run in the gap above the desk pad (matches the red sketch).
    const deskTop = k.top - r.top;
    const runY = kbPort.y + (deskTop - kbPort.y) * 0.55;

    const ortho = (
      jack: { x: number; y: number },
      port: { x: number; y: number },
    ) =>
      `M ${jack.x.toFixed(1)} ${jack.y.toFixed(1)} V ${runY.toFixed(1)} H ${port.x.toFixed(1)} V ${port.y.toFixed(1)}`;

    cableGeo = {
      w: r.width,
      h: r.height,
      kb: ortho(kbJack, kbPort),
      ms: ortho(msJack, msPort),
      kbJack,
      msJack,
      kbPort,
      msPort,
    };
  }

  /** Shrink `.rig` when layout height exceeds the stage panel budget. */
  function fitStageHeight() {
    const panel = panelStageEl;
    const rig = rigEl;
    if (!panel || !rig) return;

    const caption = panel.querySelector(".stage-caption");
    const captionH = caption?.getBoundingClientRect().height ?? 0;
    const styles = getComputedStyle(panel);
    const padY =
      (parseFloat(styles.paddingTop) || 0) +
      (parseFloat(styles.paddingBottom) || 0);
    const gap = 12;
    // Budget from viewport — not panel.clientHeight (content overflow grows the panel).
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const budget = viewportH - padY - captionH - gap;
    if (budget < 80) return;

    // offsetHeight is pre-transform layout size (safe while scaled).
    const natural = rig.offsetHeight;
    if (natural < 8) return;

    const next = natural > budget ? Math.max(0.45, budget / natural) : 1;
    const nextSlot = next < 1 ? natural * next : null;
    if (
      Math.abs(next - rigScale) < 0.01 &&
      ((nextSlot == null && rigSlotHeight == null) ||
        (nextSlot != null &&
          rigSlotHeight != null &&
          Math.abs(nextSlot - rigSlotHeight) < 1))
    ) {
      return;
    }
    rigScale = next;
    rigSlotHeight = nextSlot;
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
    if (chip.kind === "key") {
      if (chip.phase === "up") return;
      kbPulseNonce += 1;
      return;
    }
    if (chip.kind === "mouse" && chip.phase === "up") return;
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

  /** Snap panels under `.page` — Brand / Stage / Download. */
  function panelList(): HTMLElement[] {
    if (!pageEl) return [];
    return Array.from(pageEl.querySelectorAll<HTMLElement>(":scope > .panel"));
  }

  function nearestPanelIndex(): number {
    const panels = panelList();
    if (panels.length === 0) return 0;
    const y = window.scrollY;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < panels.length; i++) {
      const dist = Math.abs(panels[i].offsetTop - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  function scrollToPanel(index: number) {
    const panels = panelList();
    if (panels.length === 0) return;
    const clamped = Math.max(0, Math.min(panels.length - 1, index));
    const target = panels[clamped];
    activePanel = clamped;
    // scrollTo + snap keeps alignment; smooth helps read as one deliberate step.
    window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  }

  const PANEL_NAV: { id: string; label: MessageKey }[] = [
    { id: "brand", label: "nav.brand" },
    { id: "stage", label: "nav.stage" },
    { id: "downloads", label: "nav.download" },
  ];

  let activePanel = $state(0);

  onMount(() => {
    let cancelled = false;
    let adapter: DomInputAdapter | undefined;

    if (stageRoot) {
      adapter = attachDomInputAdapter(stageRoot, {
        onChip: (chip) => {
          pulseCableFor(chip);
          fanOut(chip);
        },
        onPowerChange: (powered) => {
          stageFocused = powered;
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

    // Trackpad inertia can skip snap-stop panels (Brand → Download). Throttle
    // wheel: always preventDefault, advance at most one panel per cooldown so
    // continuous scroll keeps stepping. Stage power still owns wheel via adapter.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let lastStepAt = 0;
    const STEP_COOLDOWN_MS = 700;

    function onPageWheel(event: WheelEvent) {
      if (cancelled || reduceMotion.matches) return;
      // Adapter capture listener owns the gesture while the demo is powered.
      if (adapter?.powered) return;
      if (event.ctrlKey) return; // leave pinch-zoom alone
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      if (event.deltaY === 0) return;

      event.preventDefault();
      const now = Date.now();
      if (now - lastStepAt < STEP_COOLDOWN_MS) return;

      lastStepAt = now;
      const dir = event.deltaY > 0 ? 1 : -1;
      scrollToPanel(nearestPanelIndex() + dir);
    }

    window.addEventListener("wheel", onPageWheel, {
      passive: false,
      capture: true,
    });

    queueMicrotask(() => {
      fitStageHeight();
      layoutCables();
      updateNotepadCaret();
      activePanel = nearestPanelIndex();
    });

    function onScroll() {
      if (cancelled) return;
      activePanel = nearestPanelIndex();
    }
    window.addEventListener("scroll", onScroll, { passive: true });

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

    void (async () => {
      try {
        const res = await fetch("/updates/latest.json", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const manifest = (await res.json()) as {
          version?: string;
          platforms?: Record<string, { url?: string }>;
        };
        if (!manifest.version || cancelled) return;
        publishedVersion = manifest.version;
        const folder = `/downloads/${encodeURIComponent(manifest.version)}/`;
        const platformUrls = Object.values(manifest.platforms ?? {})
          .map((p) => p.url)
          .filter((u): u is string => Boolean(u));

        let macosHref = folder;
        try {
          const listing = await fetch(folder, { cache: "no-store" });
          const html = await listing.text();
          const dmg = html.match(/href="([^"]+\.dmg)"/i)?.[1];
          if (dmg) {
            macosHref = dmg.startsWith("http")
              ? new URL(dmg).pathname
              : dmg.startsWith("/")
                ? dmg
                : `${folder}${dmg}`;
          } else if (platformUrls[0]) {
            macosHref = platformUrls[0];
          }
        } catch {
          if (platformUrls[0]) macosHref = platformUrls[0];
        }

        if (cancelled) return;
        macDownload = {
          href: macosHref,
          note: t("downloads.versionNote", locale, {
            version: manifest.version,
          }),
        };
      } catch {
        // Keep placeholders when serve has no manifest yet.
      }
    })();

    return () => {
      cancelled = true;
      adapter?.dispose();
      inputAdapter = undefined;
      io?.disconnect();
      ro?.disconnect();
      window.removeEventListener("wheel", onPageWheel, true);
      window.removeEventListener("scroll", onScroll);
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

<main class="page" bind:this={pageEl}>
  <nav
    class="page-rail"
    data-stage-pointer-exempt
    aria-label={t("nav.aria", locale)}
  >
    {#each PANEL_NAV as item, i}
      <button
        type="button"
        class="page-rail-dot"
        class:active={activePanel === i}
        aria-label={t(item.label, locale)}
        aria-current={activePanel === i ? "true" : undefined}
        onclick={() => scrollToPanel(i)}
      ></button>
    {/each}
  </nav>

  <section
    id="brand"
    class="panel panel-brand"
    aria-label={productName}
  >
    <header class="brand">
      <h1>{productName}</h1>
      <p class="tagline">{t("brand.tagline", locale)}</p>
    </header>
  </section>

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

  <section
    id="downloads"
    class="panel panel-download"
    aria-label={t("downloads.aria", locale)}
  >
    <div class="download-inner">
      <h2 class="download-title">{t("download.panel.title", locale)}</h2>
      <p class="download-lead">{t("download.panel.lead", locale)}</p>

      <div class="cta-row">
        <a class="download-btn" href={macDownload.href}
          >{t("download.panel.cta", locale)}</a
        >
        <!-- Future: Windows sibling button in this flex row -->
      </div>
      <p class="download-footnote">
        <span class="ver"
          >{t("cta.latest", locale, { version: versionLabel })}</span
        >
        · {macDownload.note}
      </p>
    </div>

    <!-- Lang footer lives in panel 3 — mandatory snap rejects content after the last snap target. -->
    <footer class="site-footer">
      <nav class="lang" aria-label={t("lang.switch", locale)}>
        <a href="/" aria-current={locale === "en" ? "page" : undefined}
          >{t("lang.en", locale)}</a
        >
        <span class="lang-sep" aria-hidden="true">|</span>
        <a href="/zh/" aria-current={locale === "zh" ? "page" : undefined}
          >{t("lang.zh", locale)}</a
        >
      </nav>
    </footer>
  </section>
</main>

<style>
  /* Theme tokens on :root so html/body (and fixed stage wash) resolve correctly. */
  :global(:root) {
    --bg: #050505;
    --bg-elev: #0c0c0c;
    --fg: #f4f4f5;
    --fg-muted: #a1a1aa;
    --accent: #80ffff;
    --accent-dim: color-mix(in srgb, #80ffff 35%, transparent);
    --bezel: #141414;
    --noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
  }

  :global(html) {
    /* Hard stop on panels — avoid resting in the junction between sections. */
    scroll-snap-type: y mandatory;
  }

  :global(html, body) {
    margin: 0;
    min-height: 100%;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
    line-height: 1.45;
    color: var(--fg);
    background: var(--bg);
    scrollbar-width: none;
  }

  :global(html::-webkit-scrollbar),
  :global(body::-webkit-scrollbar) {
    display: none;
    width: 0;
    height: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-snap-type: none;
    }
  }

  .page {
    position: relative;
    margin: 0 auto;
    padding: 0;
    display: flex;
    flex-direction: column;
    isolation: isolate;
  }

  .page::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(
        ellipse 80% 50% at 50% 18%,
        color-mix(in srgb, var(--accent) 7%, transparent),
        transparent 62%
      ),
      var(--bg);
  }

  .page::after {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    opacity: 0.035;
    background-image: var(--noise);
    background-size: 180px 180px;
  }

  .panel {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    min-height: 100dvh;
    max-width: 56rem;
    margin: 0 auto;
    padding: 1.75rem 1.25rem 3.75rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }

  /* Left section rail — current step + click-to-jump (replaces bottom scroll arrows). */
  .page-rail {
    position: fixed;
    left: max(0.65rem, env(safe-area-inset-left, 0px));
    top: 50%;
    transform: translateY(-50%);
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.55rem;
    padding: 0.45rem 0.35rem;
    border-radius: 999px;
    background: color-mix(in srgb, #0a0a0a 55%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .page-rail-dot {
    box-sizing: border-box;
    width: 0.4rem;
    height: 0.4rem;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--fg) 35%, transparent);
    cursor: pointer;
    transition:
      height 0.25s ease,
      background 0.2s ease,
      box-shadow 0.2s ease;
  }

  .page-rail-dot:hover {
    background: color-mix(in srgb, var(--fg) 65%, transparent);
  }

  .page-rail-dot:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 3px;
  }

  .page-rail-dot.active {
    height: 1.15rem;
    background: var(--accent);
    box-shadow: 0 0 10px var(--accent-dim);
  }

  .panel-brand {
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .brand {
    text-align: center;
  }

  h1 {
    margin: 0;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 800;
    font-size: clamp(2.35rem, 6vw, 3.35rem);
    letter-spacing: -0.03em;
    line-height: 1.05;
    color: #fff;
  }

  .tagline {
    margin: 0.55rem 0 0;
    font-size: clamp(0.95rem, 2.2vw, 1.1rem);
    font-weight: 400;
    color: var(--fg-muted);
    letter-spacing: 0.01em;
  }

  .panel-stage {
    /* Height budget for CSS width clamp; JS scale is the fallback. */
    --stage-chrome: 5.5rem;
    --rig-budget: calc(100dvh - var(--stage-chrome) - 3.5rem);
    /* Break out of .panel max-width so sky/blinds can wash the whole viewport. */
    max-width: none;
    width: 100%;
    overflow: hidden;
    isolation: isolate;
  }

  .panel-stage > .stage {
    position: relative;
    z-index: 2;
    max-width: 56rem;
    width: 100%;
    margin-inline: auto;
  }

  /* --- Stage environment: sunny sky gated by blinds --- */
  .stage-env {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .stage-sky {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(
        ellipse 55% 45% at 72% 28%,
        #fff6d6 0%,
        transparent 55%
      ),
      linear-gradient(
        165deg,
        #7eb8e8 0%,
        #a8d4f0 38%,
        #c5e0ef 70%,
        #dce8ee 100%
      );
    transition: filter 420ms ease, opacity 420ms ease;
  }

  .stage-sun {
    position: absolute;
    top: 12%;
    right: 18%;
    width: min(9rem, 22vw);
    height: min(9rem, 22vw);
    border-radius: 50%;
    background: radial-gradient(circle at 40% 40%, #fff9e8 0%, #f5d76e 45%, #e8b84a 100%);
    box-shadow:
      0 0 40px rgba(255, 220, 120, 0.55),
      0 0 80px rgba(255, 200, 80, 0.28);
  }

  .stage-blinds {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    perspective: 900px;
    z-index: 1;
    transform-origin: top center;
    transition:
      transform 420ms cubic-bezier(0.33, 1, 0.68, 1),
      opacity 380ms ease;
  }

  .blind-slat {
    flex: 1 1 0;
    min-height: 0;
    margin: 0;
    transform-origin: center top;
    background: linear-gradient(
      180deg,
      #3a3a3e 0%,
      #2a2a2e 40%,
      #1c1c1f 100%
    );
    border-bottom: 1px solid rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  /* Open: blinds retract fully — clean sky, no residual slat lines. */
  .panel-stage.blinds-open .stage-blinds {
    opacity: 0;
    transform: translateY(-12%) scaleY(0.04);
    pointer-events: none;
  }

  .panel-stage.blinds-open .stage-sky {
    filter: none;
    opacity: 1;
  }

  .panel-stage.blinds-open .stage-room-shade {
    opacity: 0;
  }

  /* Closed: slats seal — dark room. */
  .panel-stage.blinds-closed .stage-blinds {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }

  .panel-stage.blinds-closed .stage-sky {
    filter: brightness(0.35) saturate(0.7);
    opacity: 0.45;
  }

  .panel-stage.blinds-closed .stage-room-shade {
    opacity: 1;
  }

  .stage-room-shade {
    position: absolute;
    inset: 0;
    z-index: 2;
    background: radial-gradient(
      ellipse 70% 60% at 50% 40%,
      rgba(8, 8, 10, 0.35),
      rgba(4, 4, 6, 0.82)
    );
    opacity: 0;
    transition: opacity 420ms ease;
  }

  .blind-cord {
    position: absolute;
    top: 0;
    right: max(0.75rem, calc(50% - 28rem));
    z-index: 6;
    width: 2.5rem;
    height: 7.5rem;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .blind-cord-line {
    width: 2px;
    flex: 1 1 auto;
    min-height: 3.5rem;
    background: linear-gradient(180deg, #a1a1aa, #52525b);
    border-radius: 1px;
    transition: transform 280ms cubic-bezier(0.33, 1, 0.68, 1);
  }

  .blind-cord-knob {
    width: 0.85rem;
    height: 1.35rem;
    margin-top: -1px;
    border-radius: 0.2rem 0.2rem 0.55rem 0.55rem;
    background: linear-gradient(180deg, #d4d4d8, #71717a);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.25) inset,
      0 2px 6px rgba(0, 0, 0, 0.4);
    transition: transform 280ms cubic-bezier(0.33, 1, 0.68, 1);
  }

  .blind-cord:hover .blind-cord-knob {
    background: linear-gradient(180deg, #e4e4e7, #a1a1aa);
  }

  .blind-cord:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 4px;
  }

  .blind-cord.yank .blind-cord-line,
  .blind-cord.yank .blind-cord-knob {
    transform: translateY(10px);
  }

  @media (prefers-reduced-motion: reduce) {
    .stage-sky,
    .stage-blinds,
    .stage-room-shade,
    .blind-cord-line,
    .blind-cord-knob {
      transition: none;
    }

    .blind-cord.yank .blind-cord-line,
    .blind-cord.yank .blind-cord-knob {
      transform: none;
    }
  }

  .panel-download {
    justify-content: space-between;
    padding-bottom: 1.5rem;
  }

  .panel-download .download-inner {
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 100%;
  }

  .site-footer {
    flex: 0 0 auto;
    width: 100%;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid color-mix(in srgb, var(--fg) 8%, transparent);
    text-align: center;
  }

  .lang {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
  }

  .lang a {
    color: var(--fg-muted);
    text-decoration: none;
  }

  .lang a:hover {
    color: var(--fg);
  }

  .lang a[aria-current="page"] {
    color: var(--accent);
  }

  .lang-sep {
    color: #52525b;
    opacity: 0.7;
  }

  .stage {
    outline: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    width: 100%;
    animation: rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
    cursor: text;
  }

  .stage:not(.focused) .bezel {
    box-shadow:
      0 0 0 1px #2a2a2a,
      0 24px 48px rgba(0, 0, 0, 0.55);
  }

  .stage.focused .bezel {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 45%, #2a2a2a),
      0 0 28px var(--accent-dim),
      0 0 48px color-mix(in srgb, var(--accent) 14%, transparent),
      0 24px 48px rgba(0, 0, 0, 0.55);
  }

  .stage:not(.focused) .desk {
    opacity: 0.78;
  }

  .stage.focused .desk {
    opacity: 1;
  }

  /* Screen powers off until the desk is armed; lights to paper when live. */
  /*
   * Notepad follows the same light/dark family as the HUD (try same-theme pairing).
   * open → light HUD + light paper · closed → dark HUD + dark paper.
   */
  .stage[data-hud-color="light"] {
    --paper: #ffffff;
    --paper-ink: #333333;
  }

  .stage[data-hud-color="dark"] {
    --paper: #1e1e1e;
    --paper-ink: #d4d4d4;
  }

  .stage.focused .screen,
  .stage.focused .notepad,
  .stage.focused .notepad-caret {
    transition:
      background-color 180ms ease,
      background 180ms ease,
      color 180ms ease,
      box-shadow 180ms ease;
  }

  /* Theme-only: do not leave permanent transitions on keys/mouse (press is 120ms in hud-view). */
  .stage.theme-crossfade :global(.hud .chip),
  .stage.theme-crossfade :global(.board .key),
  .stage.theme-crossfade :global(.mouse .shell),
  .stage.theme-crossfade :global(.mouse .press),
  .stage.theme-crossfade :global(.mouse .side-mark) {
    transition:
      color 180ms ease,
      background 180ms ease,
      background-color 180ms ease,
      fill 180ms ease,
      stroke 180ms ease,
      border-color 180ms ease,
      box-shadow 180ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .stage.focused .screen,
    .stage.focused .notepad,
    .stage.focused .notepad-caret,
    .stage.theme-crossfade :global(.hud .chip),
    .stage.theme-crossfade :global(.board .key),
    .stage.theme-crossfade :global(.mouse .shell),
    .stage.theme-crossfade :global(.mouse .press),
    .stage.theme-crossfade :global(.mouse .side-mark) {
      transition: none;
    }
  }

  .stage:not(.focused) .screen {
    background: #0a0a0a;
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      inset 0 0 40px rgba(0, 0, 0, 0.85);
  }

  .stage.focused .screen {
    background: var(--paper);
    box-shadow:
      inset 0 0 0 1px rgba(0, 0, 0, 0.08),
      0 0 28px var(--accent-dim),
      0 0 40px color-mix(in srgb, var(--paper) 18%, transparent);
  }

  .stage:not(.focused) .notepad {
    color: color-mix(in srgb, #e4e4e7 28%, transparent);
    caret-color: transparent;
  }

  .stage.focused .notepad {
    color: var(--paper-ink);
    /* Native caret hidden — custom .notepad-caret is cross-browser width. */
    caret-color: transparent;
  }

  .notepad-caret {
    position: absolute;
    z-index: 3;
    width: 2.5px;
    margin-left: -1px;
    border-radius: 1px;
    background: var(--paper-ink);
    pointer-events: none;
    animation: caret-blink 1.05s steps(1, end) infinite;
  }

  .stage.focused .screen::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent);
    border-radius: inherit;
    opacity: 0.9;
  }

  .stage:not(.focused) .notepad::placeholder {
    color: color-mix(in srgb, #a1a1aa 35%, transparent);
  }

  .stage:not(.focused) .hud-corner {
    opacity: 0.22;
    filter: saturate(0.35) brightness(0.55);
  }

  .stage.focused .hud-corner {
    opacity: 1;
    filter: none;
  }

  .stage-caption {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 0.85rem;
    max-width: 26rem;
    text-align: center;
  }

  .stage-help {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: var(--fg-muted);
    letter-spacing: 0.01em;
  }

  .rig-scaler {
    position: relative;
    width: min(100%, 48rem, calc(var(--rig-budget) * 0.92));
    display: flex;
    justify-content: center;
    /* When JS sets height for scaled rig, clip empty space. */
  }

  .rig {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
    transform-origin: top center;
    /* transform only when rigScale < 1 (inline); otherwise none — no HUD containing block. */
  }

  .monitor {
    width: min(100%, 42rem);
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .bezel {
    width: 100%;
    padding: 0.85rem 0.85rem 0.7rem;
    border-radius: 0.85rem;
    background: linear-gradient(180deg, #1a1a1a 0%, var(--bezel) 100%);
    box-shadow:
      0 0 0 1px #2a2a2a,
      0 24px 48px rgba(0, 0, 0, 0.55);
  }

  .screen {
    position: relative;
    aspect-ratio: 16 / 10;
    width: 100%;
    border-radius: 0.2rem;
    overflow: hidden;
    background: #0a0a0a;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
    transition:
      background 0.35s ease,
      box-shadow 0.35s ease;
  }

  .hud-corner {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
    transition:
      opacity 0.35s ease,
      filter 0.35s ease;
  }

  .hud-corner :global(.hud) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    max-width: none;
    box-sizing: border-box;
    padding: 0.55rem 0.65rem;
  }

  /* Span the full monitor so timelineMax chips can pack across the screen. */
  .hud-corner :global(.timeline) {
    width: 100%;
    max-width: 100%;
  }

  .notepad {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 18% 12% 12%;
    border: none;
    resize: none;
    outline: none;
    background: transparent;
    color: color-mix(in srgb, #e4e4e7 28%, transparent);
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-size: clamp(1.15rem, 2.8vw, 1.65rem);
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.01em;
    text-align: center;
    caret-color: transparent;
    transition: color 0.35s ease;
    overflow: auto;
    scrollbar-width: none;
  }

  .notepad::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }

  .notepad::placeholder {
    color: color-mix(in srgb, #a1a1aa 35%, transparent);
  }

  .stand {
    width: 18%;
    height: 1.35rem;
    margin-top: -1px;
    background: linear-gradient(180deg, #222, #111);
    clip-path: polygon(18% 0, 82% 0, 100% 100%, 0 100%);
  }

  .base {
    width: 36%;
    height: 0.45rem;
    border-radius: 999px;
    background: #1a1a1a;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .cable {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
    overflow: visible;
  }

  .cable-track {
    stroke: #1f1f1f;
    stroke-width: 2;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .cable-live {
    stroke: #2a2a2a;
    stroke-width: 1.75;
    stroke-linecap: square;
    stroke-linejoin: miter;
    fill: none;
    opacity: 0;
    transition:
      opacity 0.25s ease,
      stroke 0.25s ease,
      filter 0.25s ease;
  }

  .cable-port,
  .cable-jack {
    fill: #2a2a2a;
    transition:
      fill 0.25s ease,
      filter 0.25s ease;
  }

  /* Powered: steady lit cable (no looping current). */
  .cable.powered .cable-live {
    opacity: 1;
    stroke: color-mix(in srgb, var(--accent) 55%, #1a1a1a);
    filter: drop-shadow(0 0 3px var(--accent-dim));
    animation: cable-ignite 0.5s ease-out both;
  }

  .cable.powered .cable-port,
  .cable.powered .cable-jack {
    fill: var(--accent);
    filter: drop-shadow(0 0 5px var(--accent));
  }

  /* One-shot packet: device jack → monitor port (path draw order). */
  .cable-packet {
    stroke: #eaffff;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: miter;
    fill: none;
    stroke-dasharray: 16 100;
    stroke-dashoffset: 0;
    filter: drop-shadow(0 0 6px var(--accent));
    animation: cable-packet 0.48s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
  }

  .stage:not(.focused) .cable-track {
    stroke: #141414;
  }

  .desk {
    position: relative;
    z-index: 1;
    width: 100%;
    /* Top runway: space between monitor base and peripherals (cables cross here). */
    padding: 2.85rem 0.85rem 1rem;
    border-radius: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.06);
    /* Fallback = night; blinds-open/closed own the room light. */
    background: #12141a;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
    transition:
      background 420ms ease,
      border-color 420ms ease,
      box-shadow 420ms ease,
      opacity 0.25s ease;
  }

  /*
   * Same cool desk material in both rooms — only exposure / bounce change.
   * Day = lifted graphite under skylight (not a warm wood swap).
   * Night = deeper graphite; screen bounce when powered.
   */
  .panel-stage.blinds-open .desk {
    background: linear-gradient(165deg, #3a3e46 0%, #2a2e36 55%, #1e2228 100%);
    border-color: rgba(180, 190, 205, 0.14);
    box-shadow:
      inset 0 1px 0 rgba(220, 228, 240, 0.1),
      0 10px 24px rgba(20, 24, 32, 0.22);
  }

  /* Day + screen on: faint panel fill on the same graphite, not a hue shift. */
  .panel-stage.blinds-open .stage.focused .desk {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--paper) 12%, #40454e) 0%,
      #2c3038 50%,
      #1e2228 100%
    );
    box-shadow:
      inset 0 36px 56px -32px color-mix(in srgb, var(--paper) 16%, transparent),
      inset 0 1px 0 rgba(220, 228, 240, 0.12),
      0 10px 24px rgba(20, 24, 32, 0.22);
  }

  .panel-stage.blinds-closed .desk {
    background: linear-gradient(180deg, #151820 0%, #0e1016 55%, #090a0e 100%);
    border-color: rgba(120, 140, 160, 0.08);
    box-shadow:
      inset 0 1px 0 rgba(160, 180, 200, 0.03),
      0 10px 28px rgba(0, 0, 0, 0.55);
  }

  /* Night + screen on: thin bounce only. */
  .panel-stage.blinds-closed .stage.focused .desk {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--paper) 8%, #1a2030) 0%,
      #10141c 45%,
      #090a0e 100%
    );
    border-color: rgba(140, 160, 180, 0.1);
    box-shadow:
      inset 0 36px 56px -30px color-mix(in srgb, var(--paper) 12%, transparent),
      inset 0 1px 0 color-mix(in srgb, var(--paper) 6%, transparent),
      0 10px 28px rgba(0, 0, 0, 0.55);
  }

  .power-btn {
    position: absolute;
    top: 0.55rem;
    right: 0.55rem;
    z-index: 6;
    box-sizing: border-box;
    width: 2rem;
    height: 2rem;
    margin: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid #3f3f46;
    background: linear-gradient(180deg, #222 0%, #121212 100%);
    color: #71717a;
    cursor: pointer;
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.06) inset,
      0 2px 8px rgba(0, 0, 0, 0.45);
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .power-btn:hover {
    color: #a1a1aa;
    border-color: #52525b;
  }

  .power-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 2px;
  }

  .power-btn.on {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 55%, #2a2a2a);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.08) inset,
      0 0 14px var(--accent-dim),
      0 2px 8px rgba(0, 0, 0, 0.45);
  }

  .power-icon {
    display: block;
  }

  .km-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 0.85rem;
    flex-wrap: wrap;
  }

  .kb-wrap {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 36rem;
  }

  .kb-wrap :global(.board) {
    width: 100%;
  }

  /* Cyan activation polish on desk schematics (proto accent). */
  .desk :global(.key.active) {
    background: var(--accent);
    color: #0a0a0a;
    border-color: color-mix(in srgb, var(--accent) 80%, #fff);
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent),
      0 0 14px var(--accent-dim);
  }

  .desk :global(.press.active),
  .desk :global(.wheel.active) {
    fill: var(--accent);
    filter: drop-shadow(0 0 5px var(--accent));
  }

  .desk :global(.mouse-wrap.lit .outline) {
    stroke: color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .mouse-wrap {
    flex: 0 0 auto;
    padding-bottom: 0.35rem;
  }

  .download-inner {
    width: 100%;
    max-width: 36rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
  }

  .download-title {
    margin: 0;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 800;
    /* Keep one line on common laptop widths; shrink before wrapping. */
    font-size: clamp(1.85rem, 5.2vw, 3.25rem);
    letter-spacing: -0.04em;
    line-height: 1.05;
    color: #fff;
    font-style: italic;
    white-space: nowrap;
  }

  .download-lead {
    margin: 0;
    max-width: 28rem;
    font-size: clamp(0.95rem, 2vw, 1.1rem);
    color: var(--fg-muted);
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.85rem 1rem;
    margin-top: 0.35rem;
  }

  .download-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 12rem;
    padding: 0.85rem 1.6rem;
    border: 1px solid rgba(255, 255, 255, 0.92);
    border-radius: 0.45rem;
    background: #fff;
    color: #0a0a0a;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 700;
    font-size: 0.98rem;
    letter-spacing: 0.01em;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease,
      color 160ms ease;
  }

  .download-btn:hover {
    border-color: var(--accent);
    background: #0a0a0a;
    color: #fff;
    box-shadow: 0 0 18px var(--accent-dim);
  }

  .download-footnote {
    margin: 0;
    max-width: 26rem;
    font-size: 0.85rem;
    color: var(--fg-muted);
    line-height: 1.45;
  }

  .download-footnote .ver {
    color: var(--fg);
  }

  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      /* `none` — leave no transform containing block (breaks HUD fixed/absolute outro). */
      transform: none;
    }
  }

  @keyframes caret-blink {
    0%,
    45% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @keyframes cable-ignite {
    0% {
      stroke: #3a3a3a;
      filter: none;
    }
    45% {
      stroke: #e8ffff;
      filter: drop-shadow(0 0 10px var(--accent));
    }
    100% {
      stroke: color-mix(in srgb, var(--accent) 55%, #1a1a1a);
      filter: drop-shadow(0 0 3px var(--accent-dim));
    }
  }

  /* Dash travels along path from jack (start) toward monitor port (end). */
  @keyframes cable-packet {
    from {
      stroke-dashoffset: 0;
      opacity: 1;
    }
    to {
      stroke-dashoffset: -100;
      opacity: 0.15;
    }
  }

  @keyframes cable-pulse {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }

  @media (max-width: 640px) {
    .panel {
      padding: 1.25rem 1rem;
    }

    .desk {
      padding: 2rem 0.5rem 0.75rem;
    }

    .download-footnote {
      text-align: center;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .panel-brand,
    .stage,
    .download-inner {
      animation: none;
    }

    .page-rail-dot {
      transition: none;
    }
  }
</style>
