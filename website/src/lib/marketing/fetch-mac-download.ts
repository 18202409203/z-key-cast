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
    const apple = manifest.platforms?.["darwin-aarch64"];

    let macosHref = "/downloads/";
    let sizeBytes: number | undefined;

    if (apple?.installer?.url) {
      macosHref = pathnameOf(apple.installer.url, folder);
      sizeBytes = apple.installer.size;
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
