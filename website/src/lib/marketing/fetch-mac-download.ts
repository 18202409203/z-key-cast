import { t, type UiLocale } from "$lib/i18n";

export type MacDownload = { href: string; note: string };

export function placeholderMac(locale: UiLocale): MacDownload {
  return {
    href: "/downloads/",
    note: t("downloads.macos.note", locale),
  };
}

export type MacDownloadResult = {
  version: string;
  download: MacDownload;
};

/** Resolve macOS download href + version note from the site updater manifest. */
export async function fetchMacDownload(
  locale: UiLocale,
  signal?: { cancelled: boolean },
): Promise<MacDownloadResult | null> {
  try {
    const res = await fetch("/updates/latest.json", { cache: "no-store" });
    if (!res.ok || signal?.cancelled) return null;
    const manifest = (await res.json()) as {
      version?: string;
      platforms?: Record<string, { url?: string }>;
    };
    if (!manifest.version || signal?.cancelled) return null;

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

    if (signal?.cancelled) return null;
    return {
      version: manifest.version,
      download: {
        href: macosHref,
        note: t("downloads.versionNote", locale, {
          version: manifest.version,
        }),
      },
    };
  } catch {
    // Keep placeholders when serve has no manifest yet.
    return null;
  }
}
