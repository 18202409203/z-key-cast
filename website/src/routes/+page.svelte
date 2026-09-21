<script lang="ts">
  import { onMount } from "svelte";
  import {
    DEFAULT_HUD_STYLE,
    HudView,
    createHudSlots,
  } from "z-key-cast-hud-view";
  import { attachDomInputAdapter } from "$lib/dom-input-adapter";

  // Minimal single-page shell — visual polish is out of scope.
  const productName = "z-key-cast";
  const tagline =
    "Corner HUD for keyboard and mouse actions while screen recording.";
  const changelogUrl =
    "https://gitee.com/zhupengji/z-key-cast/blob/main/CHANGELOG.md";

  type DownloadLink = { label: string; href: string; note: string };

  let downloads: DownloadLink[] = $state([
    {
      label: "macOS",
      href: "/downloads/",
      note: "Open folder if no artifact yet — run pnpm site:publish-test",
    },
    {
      label: "Windows",
      href: "/downloads/",
      note: "Placeholder — updater C-loop not required",
    },
  ]);
  let versionLabel = $state("(none published)");

  const hud = createHudSlots();
  hud.applyStyle({ ...DEFAULT_HUD_STYLE, hudPreset: "full" });

  let demoRoot: HTMLDivElement | undefined = $state();
  let demoFocused = $state(false);

  function onPlacePointerDown(_event: PointerEvent) {
    // No place mode on the website demo.
  }

  onMount(() => {
    let cancelled = false;
    let disposeAdapter: (() => void) | undefined;

    if (demoRoot) {
      disposeAdapter = attachDomInputAdapter(demoRoot, {
        onChip: (chip) => hud.showChip(chip),
        onFocusChange: (focused) => (demoFocused = focused),
      });
    }

    void (async () => {
      try {
        const res = await fetch("/updates/latest.json", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const manifest = (await res.json()) as {
          version?: string;
          platforms?: Record<string, { url?: string }>;
        };
        if (!manifest.version || cancelled) return;
        versionLabel = manifest.version;
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
        downloads = [
          {
            label: "macOS",
            href: macosHref,
            note: `v${manifest.version}`,
          },
          {
            label: "Browse all",
            href: folder,
            note: "Version folder",
          },
          {
            label: "Windows",
            href: "/downloads/",
            note: "Placeholder — updater C-loop not required",
          },
        ];
      } catch {
        // Keep placeholders when serve has no manifest yet.
      }
    })();

    return () => {
      cancelled = true;
      disposeAdapter?.();
      hud.clearAllIdleTimers();
    };
  });
</script>

<main class="page">
  <header class="hero">
    <h1>{productName}</h1>
    <p class="tagline">{tagline}</p>

    <!-- Focusable capture surface for DOM → HudChip (role=application is intentional). -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="demo"
      class:focused={demoFocused}
      bind:this={demoRoot}
      tabindex="0"
      role="application"
      aria-label="Interactive Full HUD demo"
      onfocus={() => (demoFocused = true)}
      onblur={() => (demoFocused = false)}
    >
      <p class="demo-hint">
        {#if demoFocused}
          Demo focused — type, click, and scroll here.
        {:else}
          Click or Tab into the demo to try the Full HUD.
        {/if}
      </p>
      <div class="demo-stage">
        <HudView
          style={hud.style}
          locale="en"
          placeMode={false}
          contentCorner="br"
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
          showNumpad={true}
          {onPlacePointerDown}
        />
      </div>
    </div>

    <p class="cta">
      <a href="#downloads">Download</a>
    </p>
  </header>

  <section aria-label="Capability boundary" class="boundary">
    <p>
      This in-page preview only captures input while the demo is focused. It is
      not the app’s OS-global capture or screen-recording corner HUD.
    </p>
  </section>

  <section id="downloads" aria-label="Downloads">
    <h2>Downloads</h2>
    <ul>
      {#each downloads as item}
        <li>
          <a href={item.href}>{item.label}</a>
          <span class="note">{item.note}</span>
        </li>
      {/each}
    </ul>
  </section>

  <section aria-label="Version">
    <h2>Version</h2>
    <p>
      Published: <strong>{versionLabel}</strong>. Artifacts under
      <code>/downloads/</code>; updater manifest at
      <code><a href="/updates/latest.json">/updates/latest.json</a></code>.
      Changelog:
      <a href={changelogUrl} rel="noreferrer">CHANGELOG.md</a>
    </p>
  </section>
</main>

<style>
  :global(html, body) {
    margin: 0;
    font-family: ui-sans-serif, system-ui, sans-serif;
    line-height: 1.45;
    color: #1a1a1a;
    background: #f7f7f7;
  }

  .page {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2rem 1.25rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .hero {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h1 {
    margin: 0;
    font-size: 1.75rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.1rem;
  }

  .tagline {
    margin: 0;
    color: #444;
  }

  .demo {
    outline: none;
    border: 1px solid #ccc;
    background: #1e293b;
    border-radius: 0.35rem;
    padding: 0.75rem;
    cursor: pointer;
    user-select: none;
  }

  .demo.focused {
    border-color: #64748b;
    box-shadow: 0 0 0 2px rgba(100, 116, 139, 0.35);
  }

  .demo-hint {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .demo-stage {
    /* HudView is absolute-positioned for overlay; give it a local stage here. */
    position: relative;
    min-height: 18rem;
    overflow: auto;
  }

  .demo-stage :global(.hud) {
    position: relative;
    inset: auto;
    width: max-content;
    max-width: 100%;
    margin: 0 auto;
  }

  .cta {
    margin: 0;
  }

  .cta a {
    color: #1d4ed8;
  }

  .boundary p {
    margin: 0;
    color: #555;
    font-size: 0.95rem;
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
    color: #666;
    font-size: 0.9rem;
  }

  code {
    font-size: 0.9em;
  }
</style>
