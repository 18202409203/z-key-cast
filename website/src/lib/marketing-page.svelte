<script lang="ts">
  import { onMount } from "svelte";
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
  } from "z-key-cast-hud-view";
  import { attachDomInputAdapter } from "$lib/dom-input-adapter";
  import { t, type UiLocale } from "$lib/i18n";
  import { getTextareaCaretPoint } from "$lib/notepad-caret";

  type Props = { locale: UiLocale };
  let { locale }: Props = $props();

  const productName = "z-key-cast";
  const changelogUrl =
    "https://gitee.com/zhupengji/z-key-cast/blob/main/CHANGELOG.md";
  // Locale is fixed per route mount (`/` vs `/zh/`); capture invite once for notepad seed.
  // svelte-ignore state_referenced_locally
  const inviteText = t("intro.invite", locale);

  type DownloadLink = { label: string; href: string; note: string };

  function placeholderDownloads(loc: UiLocale): DownloadLink[] {
    return [
      {
        label: "macOS",
        href: "/downloads/",
        note: t("downloads.macos.note", loc),
      },
      {
        label: "Windows",
        href: "/downloads/",
        note: t("downloads.windows.note", loc),
      },
    ];
  }

  let manifestDownloads: DownloadLink[] | null = $state(null);
  let publishedVersion: string | null = $state(null);
  const downloads = $derived(
    manifestDownloads ?? placeholderDownloads(locale),
  );
  const versionLabel = $derived(
    publishedVersion ?? t("version.none", locale),
  );
  const darkColors = colorsFromHudPreset("dark");
  const liteSlots = createHudSlots();
  const fullSlots = createHudSlots();

  liteSlots.applyStyle({
    ...DEFAULT_HUD_STYLE,
    ...darkColors,
    hudPreset: "lite",
    backgroundOpacity: 0.78,
    fontSizePx: 13,
    dwellMs: 1200,
    timelineMax: 8,
  });
  fullSlots.applyStyle({
    ...DEFAULT_HUD_STYLE,
    ...darkColors,
    hudPreset: "full",
    backgroundOpacity: 0.88,
  });

  const boardBg = $derived(
    hudBackgroundCss(
      fullSlots.style.backgroundColor,
      fullSlots.style.backgroundOpacity,
    ),
  );
  const legendLayout = guessKeyboardLegendLayout();

  let stageRoot: HTMLDivElement | undefined = $state();
  let notepadEl: HTMLTextAreaElement | undefined = $state();
  let rigEl: HTMLDivElement | undefined = $state();
  let baseEl: HTMLDivElement | undefined = $state();
  let kbWrapEl: HTMLDivElement | undefined = $state();
  let mouseWrapEl: HTMLDivElement | undefined = $state();
  let stageFocused = $state(false);
  let notepadText = $state(inviteText);
  /** Remount packet overlays — one-shot current toward the monitor. */
  let kbPulseNonce = $state(0);
  let msPulseNonce = $state(0);
  let caretPos = $state<{ left: number; top: number; height: number } | null>(
    null,
  );

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

  const stageHint = $derived(
    stageFocused ? t("stage.on", locale) : t("stage.off", locale),
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

  onMount(() => {
    let cancelled = false;
    let adapter: ReturnType<typeof attachDomInputAdapter> | undefined;

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
      });
    }

    // Boot powered on so first input works immediately.
    queueMicrotask(() => {
      adapter?.powerOn();
      layoutCables();
      updateNotepadCaret();
    });

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            layoutCables();
            updateNotepadCaret();
          })
        : null;
    if (rigEl) ro?.observe(rigEl);
    window.addEventListener("resize", layoutCables);

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
        manifestDownloads = [
          {
            label: "macOS",
            href: macosHref,
            note: t("downloads.versionNote", locale, {
              version: manifest.version,
            }),
          },
          {
            label: t("downloads.browse", locale),
            href: folder,
            note: t("downloads.browse.note", locale),
          },
          {
            label: "Windows",
            href: "/downloads/",
            note: t("downloads.windows.note", locale),
          },
        ];
      } catch {
        // Keep placeholders when serve has no manifest yet.
      }
    })();

    return () => {
      cancelled = true;
      adapter?.dispose();
      ro?.disconnect();
      window.removeEventListener("resize", layoutCables);
      document.removeEventListener("selectionchange", onSelectionChange);
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

<main class="page">
  <header class="brand">
    <h1>{productName}</h1>
    <p class="tagline">{t("brand.tagline", locale)}</p>
  </header>

  <!-- Capture surface: listeners on stage; typing focus always parks on notepad. -->
  <div
    class="stage"
    class:focused={stageFocused}
    bind:this={stageRoot}
    role="application"
    aria-label={t("stage.aria", locale)}
  >
    <div class="rig" bind:this={rigEl}>
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
        <div class="desk-glow" aria-hidden="true"></div>
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
          <path
            class="cable-live"
            d={cableGeo.kb}
            fill="none"
          />
          <path
            class="cable-live"
            d={cableGeo.ms}
            fill="none"
          />
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

    <p class="stage-status" class:live={stageFocused} aria-live="polite">
      <span class="stage-status-dot" aria-hidden="true"></span>
      {stageHint}
    </p>
  </div>

  <div class="cta-bar">
    <a class="download-btn" href="#downloads">{t("cta.download", locale)}</a>
    <p class="cta-note">
      <span class="ver"
        >{t("cta.latest", locale, { version: versionLabel })}</span
      >
      <br />
      <span>{t("cta.note", locale)}</span>
    </p>
  </div>

  <section aria-label={t("boundary.aria", locale)} class="boundary">
    <p>{t("boundary.body", locale)}</p>
  </section>

  <section id="downloads" aria-label={t("downloads.aria", locale)} class="downloads">
    <h2>{t("downloads.title", locale)}</h2>
    <ul>
      {#each downloads as item}
        <li>
          <a href={item.href}>{item.label}</a>
          <span class="note">{item.note}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section aria-label={t("version.aria", locale)} class="version">
    <h2>{t("version.title", locale)}</h2>
    <p>
      {t("version.published", locale)} <strong>{versionLabel}</strong>.
      {t("version.artifacts", locale)}
      <code>/downloads/</code>; {t("version.manifest", locale)}
      <code><a href="/updates/latest.json">/updates/latest.json</a></code>.
      {t("version.changelog", locale)}
      <a href={changelogUrl} rel="noreferrer">CHANGELOG.md</a>
    </p>
  </section>

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
    --paper: #f4f4f5;
    --paper-ink: #18181b;
    --bezel: #141414;
    --noise: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
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

  .page {
    position: relative;
    max-width: 56rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 3.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
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

  .brand {
    text-align: center;
    animation: rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
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

  h2 {
    margin: 0 0 0.5rem;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .tagline {
    margin: 0.55rem 0 0;
    font-size: clamp(0.95rem, 2.2vw, 1.1rem);
    font-weight: 400;
    color: var(--fg-muted);
    letter-spacing: 0.01em;
  }

  .site-footer {
    margin-top: 0.5rem;
    padding-top: 1.25rem;
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
      0 0 0 1px color-mix(in srgb, var(--accent) 35%, #2a2a2a),
      0 0 28px color-mix(in srgb, var(--accent) 12%, transparent),
      0 24px 48px rgba(0, 0, 0, 0.55);
  }

  .stage:not(.focused) .desk {
    opacity: 0.72;
    border-color: #333;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  .stage.focused .desk {
    opacity: 1;
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    box-shadow:
      0 0 28px var(--accent-dim),
      inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  /* Screen powers off until the desk is armed; lights to paper when live. */
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
      0 0 32px color-mix(in srgb, var(--paper) 22%, transparent);
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

  .stage-status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0.85rem 0 0;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    color: var(--fg-muted);
    background: color-mix(in srgb, var(--bg-elev) 80%, #000);
    border: 1px solid #2a2a2a;
    transition:
      color 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .stage-status.live {
    color: #e4fffc;
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    box-shadow: 0 0 16px var(--accent-dim);
  }

  .stage-status-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: #52525b;
    flex: 0 0 auto;
  }

  .stage-status.live .stage-status-dot {
    background: var(--accent);
    box-shadow: 0 0 8px var(--accent);
    animation: cable-pulse 1.6s ease-in-out infinite;
  }

  .rig {
    position: relative;
    width: min(100%, 48rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.65rem;
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
    border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
    background: color-mix(in srgb, var(--bg-elev) 92%, #000);
    box-shadow:
      0 0 24px var(--accent-dim),
      inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  }

  .desk-glow {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 12%, transparent);
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

  .cta-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.85rem 1.25rem;
    animation: rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both;
  }

  .download-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 8.5rem;
    padding: 0.65rem 1.35rem;
    border: 1px solid rgba(255, 255, 255, 0.82);
    border-radius: 0.35rem;
    background: #0a0a0a;
    color: #fff;
    font-family: Syne, "IBM Plex Sans", sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    letter-spacing: 0.02em;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease;
  }

  .download-btn:hover {
    border-color: var(--accent);
    box-shadow: 0 0 18px var(--accent-dim);
  }

  .cta-note {
    margin: 0;
    max-width: 22rem;
    font-size: 0.85rem;
    color: var(--fg-muted);
    line-height: 1.4;
  }

  .cta-note .ver {
    color: var(--fg);
  }

  .boundary,
  .downloads,
  .version {
    color: var(--fg-muted);
    font-size: 0.92rem;
  }

  .boundary p,
  .version p {
    margin: 0;
  }

  .downloads a,
  .version a {
    color: var(--accent);
  }

  ul {
    margin: 0;
    padding-left: 1.2rem;
  }

  li {
    margin: 0.35rem 0;
  }

  .note {
    margin-left: 0.5rem;
    color: #71717a;
    font-size: 0.88rem;
  }

  code {
    font-size: 0.9em;
    color: #d4d4d8;
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
    .page {
      padding-top: 1.75rem;
    }

    .desk {
      padding: 2rem 0.5rem 0.75rem;
    }

    .cta-note {
      text-align: center;
    }
  }
</style>
