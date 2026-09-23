import type { UiLocale } from "$lib/i18n";

export type MacDownload = { href: string; sizeLabel: string | null };

export function placeholderMac(_locale: UiLocale): MacDownload {
  return {
    href: "/downloads/",
    sizeLabel: null,
  };
}

export type MacDownloadResult = {
  version: string;
  download: MacDownload;
};

type InstallerRef = { url?: string; size?: number };

type PlatformEntry = {
  url?: string;
  size?: number;
  installer?: InstallerRef;
};

/** 1024-based, one decimal under 10 MB — matches `ls -lh` style. */
export function formatByteSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const n = mb >= 10 ? mb.toFixed(0) : mb.toFixed(1);
  return `${n} MB`;
}

function pathnameOf(url: string, folder: string): string {
  if (url.startsWith("http")) return new URL(url).pathname;
  if (url.startsWith("/")) return url;
  return `${folder}${url}`;
}

function labelFor(bytes: number | undefined): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  return formatByteSize(bytes);
}

/** Resolve macOS download href, version, and installer size from the updater manifest. */
export async function fetchMacDownload(
  _locale: UiLocale,
  signal?: { cancelled: boolean },
): Promise<MacDownloadResult | null> {
  try {
    const res = await fetch("/updates/latest.json", { cache: "no-store" });
    if (!res.ok || signal?.cancelled) return null;
    const manifest = (await res.json()) as {
      version?: string;
      platforms?: Record<string, PlatformEntry>;
    };
    if (!manifest.version || signal?.cancelled) return null;

    const folder = `/downloads/${encodeURIComponent(manifest.version)}/`;
    const platforms = Object.values(manifest.platforms ?? {});
    const darwin = Object.entries(manifest.platforms ?? {}).find(([key]) =>
      key.startsWith("darwin-"),
    )?.[1];

    let macosHref = folder;
    let sizeBytes: number | undefined;

    if (darwin?.installer?.url) {
      macosHref = pathnameOf(darwin.installer.url, folder);
      sizeBytes = darwin.installer.size;
    } else {
      const platformUrls = platforms
        .map((p) => p.url)
        .filter((u): u is string => Boolean(u));
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
        } else if (darwin?.url) {
          macosHref = pathnameOf(darwin.url, folder);
          sizeBytes = darwin.size;
        } else if (platformUrls[0]) {
          macosHref = platformUrls[0];
        }
      } catch {
        if (darwin?.url) {
          macosHref = pathnameOf(darwin.url, folder);
          sizeBytes = darwin.size;
        } else if (platformUrls[0]) {
          macosHref = platformUrls[0];
        }
      }
    }

    if (signal?.cancelled) return null;
    return {
      version: manifest.version,
      download: {
        href: macosHref,
        sizeLabel: labelFor(sizeBytes),
      },
    };
  } catch {
    // Keep placeholders when serve has no manifest yet.
    return null;
  }
}
