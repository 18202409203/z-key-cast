<script lang="ts">
  import { onMount } from "svelte";

  // Minimal internal-test shell — visual design is out of scope for this task.
  const productName = "z-key-cast";
  const tagline = "Corner HUD for keyboard and mouse actions while screen recording.";
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

  onMount(async () => {
    try {
      const res = await fetch("/updates/latest.json", { cache: "no-store" });
      if (!res.ok) return;
      const manifest = (await res.json()) as {
        version?: string;
        platforms?: Record<string, { url?: string }>;
      };
      if (!manifest.version) return;
      versionLabel = manifest.version;
      const folder = `/downloads/${encodeURIComponent(manifest.version)}/`;
      const platformUrls = Object.values(manifest.platforms ?? {})
        .map((p) => p.url)
        .filter((u): u is string => Boolean(u));

      // Prefer a same-origin .dmg under /downloads/<ver>/ if the folder lists one.
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
          // Fall back to updater archive URL (may be absolute LAN URL).
          macosHref = platformUrls[0];
        }
      } catch {
        if (platformUrls[0]) macosHref = platformUrls[0];
      }

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
  });
</script>

<main class="page">
  <header>
    <h1>{productName}</h1>
    <p class="tagline">{tagline}</p>
  </header>

  <section aria-label="Screenshot placeholder">
    <div class="shot">Screenshot placeholder</div>
  </section>

  <section aria-label="Downloads">
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
      <code><a href="/updates/latest.json">/updates/latest.json</a></code>. Changelog:
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
    max-width: 40rem;
    margin: 0 auto;
    padding: 2rem 1.25rem 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
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
    margin: 0.35rem 0 0;
    color: #444;
  }

  .shot {
    border: 1px dashed #999;
    background: #fff;
    min-height: 10rem;
    display: grid;
    place-items: center;
    color: #777;
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
