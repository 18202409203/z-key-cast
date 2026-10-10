<script lang="ts">
  import { onMount } from "svelte";
  import { t, type UiLocale } from "$lib/i18n";
  import BrandPanel from "./components/BrandPanel.svelte";
  import DownloadPanel from "./components/DownloadPanel.svelte";
  import PageRail from "./components/PageRail.svelte";
  import StagePanel from "./components/StagePanel/StagePanel.svelte";
  import {
    fetchMacDownload,
    placeholderMac,
    type MacDownload,
  } from "./fetch-mac-download";
  import { nearestPanelIndex, scrollToPanel } from "./panel-scroll";
  import "./marketing-chrome.css";

  type Props = { locale: UiLocale };
  let { locale }: Props = $props();

  // svelte-ignore state_referenced_locally
  let macDownload: MacDownload = $state(placeholderMac(locale));
  let publishedVersion: string | null = $state(null);
  const versionLabel = $derived(
    publishedVersion ?? t("version.none", locale),
  );

  let pageEl: HTMLElement | undefined = $state();
  let activePanel = $state(0);
  let stagePowered = $state(false);

  function goToPanel(index: number) {
    activePanel = scrollToPanel(pageEl, index);
  }

  onMount(() => {
    let cancelled = false;

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
      if (stagePowered) return;
      if (event.ctrlKey) return; // leave pinch-zoom alone
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      if (event.deltaY === 0) return;

      event.preventDefault();
      const now = Date.now();
      if (now - lastStepAt < STEP_COOLDOWN_MS) return;

      lastStepAt = now;
      const dir = event.deltaY > 0 ? 1 : -1;
      goToPanel(nearestPanelIndex(pageEl) + dir);
    }

    window.addEventListener("wheel", onPageWheel, {
      passive: false,
      capture: true,
    });

    queueMicrotask(() => {
      activePanel = nearestPanelIndex(pageEl);
    });

    function onScroll() {
      if (cancelled) return;
      activePanel = nearestPanelIndex(pageEl);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    void (async () => {
      const result = await fetchMacDownload(locale, {
        get cancelled() {
          return cancelled;
        },
      });
      if (!result || cancelled) return;
      publishedVersion = result.version;
      macDownload = result.download;
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("wheel", onPageWheel, true);
      window.removeEventListener("scroll", onScroll);
    };
  });
</script>

<main class="page" bind:this={pageEl}>
  <PageRail {locale} {activePanel} onSelect={goToPanel} />
  <BrandPanel {locale} onSelectPanel={goToPanel} />
  <StagePanel {locale} bind:powered={stagePowered} />
  <DownloadPanel {locale} {macDownload} {versionLabel} />
</main>
