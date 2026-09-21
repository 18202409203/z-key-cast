/** Minimal HUD / overlay locale strings (no settings-shell catalog). */

export type UiLocale = "en" | "zh";

export type HudMessageKey =
  | "overlay.captureUnavailable"
  | "overlay.placeAria"
  | "overlay.hudAria"
  | "hud.chip.mouse.left"
  | "hud.chip.mouse.right"
  | "hud.chip.mouse.middle"
  | "hud.chip.scroll.up"
  | "hud.chip.scroll.down";

const en: Record<HudMessageKey, string> = {
  "overlay.captureUnavailable":
    "Can't capture keyboard & mouse — check system permissions",
  "overlay.placeAria": "HUD place mode — drag to move",
  "overlay.hudAria": "Key cast HUD",
  "hud.chip.mouse.left": "LMB",
  "hud.chip.mouse.right": "RMB",
  "hud.chip.mouse.middle": "MMB",
  "hud.chip.scroll.up": "Scr↑",
  "hud.chip.scroll.down": "Scr↓",
};

const zh: Record<HudMessageKey, string> = {
  "overlay.captureUnavailable": "无法捕获键盘和鼠标 — 请检查系统权限",
  "overlay.placeAria": "面板定位模式 — 拖动以移动",
  "overlay.hudAria": "按键投射面板",
  "hud.chip.mouse.left": "左键",
  "hud.chip.mouse.right": "右键",
  "hud.chip.mouse.middle": "中键",
  "hud.chip.scroll.up": "向上滚",
  "hud.chip.scroll.down": "向下滚",
};

const catalogs: Record<UiLocale, Record<HudMessageKey, string>> = { en, zh };

export function isUiLocale(value: unknown): value is UiLocale {
  return value === "en" || value === "zh";
}

/** Resolve a HUD message; missing key falls back to en then the key string. */
export function t(
  key: HudMessageKey,
  locale: UiLocale = "en",
): string {
  const primary = catalogs[locale]?.[key];
  if (primary !== undefined) return primary;
  return catalogs.en[key] ?? key;
}
