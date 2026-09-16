import { invoke } from "@tauri-apps/api/core";
import {
  isKeyboardLegendPreference,
  type KeyboardLegendPreference,
} from "$lib/key-legends";
import { isUiLocale, type UiLocale } from "$lib/i18n";

export const HUD_STYLE_CHANNEL = "cast://hud-style";
export const HUD_PLACE_MODE_CHANNEL = "cast://hud-place-mode";
export const UI_LOCALE_CHANNEL = "cast://ui-locale";

export type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  /** Separate primary-monitor click rings; omit → false. Independent of captureMouse. */
  mouseClickRipple: boolean;
  /** Key ids omitted from HUD chips (primary drop / mod strip). Default []. */
  ignoredKeyIds: string[];
};

export type HudPreset = "text" | "lite" | "full";
export type KeyMouseLayout =
  | "key-left-mouse-right"
  | "key-right-mouse-left"
  | "key-top-mouse-bottom"
  | "key-bottom-mouse-top";

export type HudCorner = "br" | "bl" | "tr" | "tl";

export type HudPositionSettings =
  | { mode: "corner"; corner: HudCorner }
  | { mode: "custom"; x: number; y: number };

export type HudPlaceModePayload = {
  active: boolean;
};

export type HudStyleSettings = {
  fontSizePx: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  dwellMs: number;
  /** Omitted / invalid → `"text"`. Legacy `keyboardDisplayMode` migrates on normalize. */
  hudPreset?: HudPreset;
  /** Omitted → `"auto"` (guess from OS). */
  keyboardLegendLayout?: KeyboardLegendPreference;
  /** Omitted → `"key-left-mouse-right"`. Absolute key/mouse arrangement. */
  keyMouseLayout?: KeyMouseLayout;
};

export const DEFAULT_HUD_STYLE: HudStyleSettings = {
  fontSizePx: 15,
  textColor: "#f8fafc",
  backgroundColor: "#0f172a",
  backgroundOpacity: 0.82,
  dwellMs: 1000,
  hudPreset: "text",
  keyboardLegendLayout: "auto",
  keyMouseLayout: "key-left-mouse-right",
};

export const DEFAULT_HUD_POSITION: HudPositionSettings = {
  mode: "corner",
  corner: "br",
};

/** Quick color themes for text, key-card, and full-keyboard modes. */
export type HudColorPresetId = "dark" | "light";

export type HudColorPreset = {
  id: HudColorPresetId;
  label: string;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
};

export const HUD_COLOR_PRESETS: HudColorPreset[] = [
  {
    id: "dark",
    label: "Black (white on black)",
    textColor: "#f8fafc",
    backgroundColor: "#0f172a",
    backgroundOpacity: 0.9,
  },
  {
    id: "light",
    label: "White (black on white)",
    textColor: "#18181b",
    backgroundColor: "#f4f4f5",
    backgroundOpacity: 0.96,
  },
];

function normHex(color: string): string {
  return color.trim().toLowerCase();
}

export function matchHudColorPreset(
  style: Pick<
    HudStyleSettings,
    "textColor" | "backgroundColor" | "backgroundOpacity"
  >,
): HudColorPresetId | "custom" {
  for (const preset of HUD_COLOR_PRESETS) {
    if (
      normHex(style.textColor) === normHex(preset.textColor) &&
      normHex(style.backgroundColor) === normHex(preset.backgroundColor) &&
      Math.abs(style.backgroundOpacity - preset.backgroundOpacity) < 0.02
    ) {
      return preset.id;
    }
  }
  return "custom";
}

export function colorsFromHudPreset(
  id: HudColorPresetId,
): Pick<
  HudStyleSettings,
  "textColor" | "backgroundColor" | "backgroundOpacity"
> {
  const preset = HUD_COLOR_PRESETS.find((p) => p.id === id) ?? HUD_COLOR_PRESETS[0]!;
  return {
    textColor: preset.textColor,
    backgroundColor: preset.backgroundColor,
    backgroundOpacity: preset.backgroundOpacity,
  };
}

function isHudPreset(value: unknown): value is HudPreset {
  return value === "text" || value === "lite" || value === "full";
}

function hudPresetFromLegacy(value: Record<string, unknown>): HudPreset {
  if (isHudPreset(value.hudPreset)) return value.hudPreset;
  // Invalid / unknown hudPreset → fall through (garbage → text unless legacy maps).
  const legacy = value.keyboardDisplayMode;
  if (legacy === "key-card") return "lite";
  if (legacy === "keyboard") return "full";
  return "text";
}

export function isKeyMouseLayout(value: unknown): value is KeyMouseLayout {
  return (
    value === "key-left-mouse-right" ||
    value === "key-right-mouse-left" ||
    value === "key-top-mouse-bottom" ||
    value === "key-bottom-mouse-top"
  );
}

export function isHudStyleSettings(value: unknown): value is HudStyleSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.fontSizePx !== "number" ||
    typeof s.textColor !== "string" ||
    typeof s.backgroundColor !== "string" ||
    typeof s.backgroundOpacity !== "number" ||
    typeof s.dwellMs !== "number"
  ) {
    return false;
  }
  // Invalid hudPreset is tolerated here; `normalizeHudStyleSettings` coerces to a valid preset.
  if (
    s.hudPreset !== undefined &&
    typeof s.hudPreset !== "string"
  ) {
    return false;
  }
  if (
    s.keyboardLegendLayout !== undefined &&
    !isKeyboardLegendPreference(s.keyboardLegendLayout)
  ) {
    return false;
  }
  if (
    s.keyMouseLayout !== undefined &&
    !isKeyMouseLayout(s.keyMouseLayout)
  ) {
    return false;
  }
  return true;
}

/** Fill defaults for fields omitted by older settings.json / emits. */
export function normalizeHudStyleSettings(value: HudStyleSettings): HudStyleSettings & {
  hudPreset: HudPreset;
  keyboardLegendLayout: KeyboardLegendPreference;
  keyMouseLayout: KeyMouseLayout;
} {
  const raw = value as HudStyleSettings & Record<string, unknown>;
  return {
    fontSizePx: value.fontSizePx,
    textColor: value.textColor,
    backgroundColor: value.backgroundColor,
    backgroundOpacity: value.backgroundOpacity,
    dwellMs: value.dwellMs,
    hudPreset: hudPresetFromLegacy(raw),
    keyboardLegendLayout: value.keyboardLegendLayout ?? "auto",
    keyMouseLayout: value.keyMouseLayout ?? "key-left-mouse-right",
  };
}

/** Convert `#rgb` / `#rrggbb` + opacity into `rgba(...)` for the chip background. */
export function hudBackgroundCss(color: string, opacity: number): string {
  const hex = color.trim();
  const raw = hex.startsWith("#") ? hex.slice(1) : hex;
  let r = 15;
  let g = 23;
  let b = 42;
  if (raw.length === 3) {
    r = parseInt(raw[0]! + raw[0]!, 16);
    g = parseInt(raw[1]! + raw[1]!, 16);
    b = parseInt(raw[2]! + raw[2]!, 16);
  } else if (raw.length === 6) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  }
  const a = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 0.82;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export async function getCaptureSettings(): Promise<CaptureSettings> {
  const raw = await invoke<CaptureSettings>("get_capture_settings");
  return {
    captureKeyboard: raw.captureKeyboard,
    captureMouse: raw.captureMouse,
    mouseClickRipple: Boolean(raw.mouseClickRipple),
    ignoredKeyIds: Array.isArray(raw.ignoredKeyIds) ? [...raw.ignoredKeyIds] : [],
  };
}

export async function setCaptureSettings(
  settings: CaptureSettings,
): Promise<CaptureSettings> {
  const saved = await invoke<CaptureSettings>("set_capture_settings", {
    settings: {
      captureKeyboard: settings.captureKeyboard,
      captureMouse: settings.captureMouse,
      mouseClickRipple: settings.mouseClickRipple,
      ignoredKeyIds: settings.ignoredKeyIds,
    },
  });
  return {
    captureKeyboard: saved.captureKeyboard,
    captureMouse: saved.captureMouse,
    mouseClickRipple: Boolean(saved.mouseClickRipple),
    ignoredKeyIds: Array.isArray(saved.ignoredKeyIds)
      ? [...saved.ignoredKeyIds]
      : [],
  };
}

export async function armIgnoreKeyCapture(): Promise<void> {
  await invoke("arm_ignore_key_capture");
}

export async function cancelIgnoreKeyCapture(): Promise<void> {
  await invoke("cancel_ignore_key_capture");
}

export async function getHudStyleSettings(): Promise<HudStyleSettings> {
  return invoke<HudStyleSettings>("get_hud_style_settings");
}

export async function setHudStyleSettings(
  settings: HudStyleSettings,
): Promise<HudStyleSettings> {
  return invoke<HudStyleSettings>("set_hud_style_settings", { settings });
}

export function isHudCorner(value: unknown): value is HudCorner {
  return value === "br" || value === "bl" || value === "tr" || value === "tl";
}

export function isHudPositionSettings(
  value: unknown,
): value is HudPositionSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (s.mode === "corner") return isHudCorner(s.corner);
  if (s.mode === "custom") {
    return typeof s.x === "number" && typeof s.y === "number";
  }
  return false;
}

export function isHudPlaceModePayload(
  value: unknown,
): value is HudPlaceModePayload {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Record<string, unknown>).active === "boolean";
}

export function cornerSelectValue(position: HudPositionSettings): string {
  return position.mode === "custom" ? "custom" : position.corner;
}

export async function getHudPositionSettings(): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("get_hud_position_settings");
  return isHudPositionSettings(raw) ? raw : { ...DEFAULT_HUD_POSITION };
}

export async function setHudPositionSettings(
  settings: HudPositionSettings,
): Promise<HudPositionSettings> {
  return invoke<HudPositionSettings>("set_hud_position_settings", { settings });
}

export async function startHudPlaceMode(): Promise<void> {
  await invoke("start_hud_place_mode");
}

export async function endHudPlaceMode(): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("end_hud_place_mode");
  return isHudPositionSettings(raw) ? raw : { ...DEFAULT_HUD_POSITION };
}

export type UiLocalePayload = {
  locale: UiLocale;
};

export function isUiLocalePayload(value: unknown): value is UiLocalePayload {
  if (!value || typeof value !== "object") return false;
  return isUiLocale((value as Record<string, unknown>).locale);
}

/** `null` when unset (frontend should guess once then persist). */
export async function getUiLocaleSettings(): Promise<UiLocale | null> {
  const raw = await invoke<UiLocale | null>("get_ui_locale_settings");
  return isUiLocale(raw) ? raw : null;
}

export async function setUiLocaleSettings(locale: UiLocale): Promise<UiLocale> {
  const saved = await invoke<UiLocale>("set_ui_locale_settings", { locale });
  return isUiLocale(saved) ? saved : locale;
}
