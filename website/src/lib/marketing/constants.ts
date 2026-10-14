import type { MessageKey, UiLocale } from "$lib/i18n";

export const PRODUCT_NAME = "z-key-cast";

/** English site opens GitHub; Chinese site opens Gitee. */
export const SOURCE_REPO_URL: Record<UiLocale, string> = {
  en: "https://github.com/18202409203/z-key-cast",
  zh: "https://gitee.com/zhupengji/z-key-cast",
};

export const PANEL_NAV: { id: string; label: MessageKey }[] = [
  { id: "brand", label: "nav.brand" },
  { id: "stage", label: "nav.stage" },
  { id: "downloads", label: "nav.download" },
];

export const BLIND_SLAT_COUNT = 16;
