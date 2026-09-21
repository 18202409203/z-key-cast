/** App host: capture / position / locale / appearance invoke + channels.
 * HUD style types/defaults/CSS helpers live in `z-key-cast-hud-view`. */

import { invoke } from "@tauri-apps/api/core";
import { isUiLocale, type UiLocale } from "$lib/i18n";
import {
  isHudCorner,
  type HudCorner,
  type HudStyleSettings,
} from "z-key-cast-hud-view";

export {
  DEFAULT_HUD_STYLE,
  HUD_COLOR_PRESETS,
  HUD_FONT_SIZE_PX_MAX,
  HUD_FONT_SIZE_PX_MIN,
  clampHudFontSizePx,
  colorsFromHudPreset,
  hudBackgroundCss,
  isHudCorner,
  isHudStyleSettings,
  isKeyMouseLayout,
  matchHudColorPreset,
  normalizeHudStyleSettings,
  type HudColorPreset,
  type HudColorPresetId,
  type HudCorner,
  type HudPreset,
  type HudStyleSettings,
  type KeyMouseLayout,
} from "z-key-cast-hud-view";

export const HUD_STYLE_CHANNEL = "cast://hud-style";
export const HUD_POSITION_CHANNEL = "cast://hud-position";
export const HUD_PLACE_MODE_CHANNEL = "cast://hud-place-mode";
export const UI_LOCALE_CHANNEL = "cast://ui-locale";
export const UI_APPEARANCE_CHANNEL = "cast://ui-appearance";
export const CAPTURE_SETTINGS_CHANNEL = "cast://capture-settings";

export type IgnoredMouseAction = "left" | "right" | "middle" | "scroll";

export const IGNORED_MOUSE_ACTIONS: readonly IgnoredMouseAction[] = [
  "left",
  "right",
  "middle",
  "scroll",
] as const;

export type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  /** Separate primary-monitor click rings; omit → false. Independent of captureMouse. */
  mouseClickRipple: boolean;
  /** Hardware: draw numpad on KeyboardMap. Omit → false. Does not gate chips/ignore. */
  hasNumpad: boolean;
  /** Key ids omitted from HUD chips (primary drop / mod strip). Default []. */
  ignoredKeyIds: string[];
  /** Mouse categories omitted from HUD (`left`/`right`/`middle`/`scroll`). Default []. */
  ignoredMouseActions: IgnoredMouseAction[];
};

export type HudPositionSettings =
  | { mode: "corner"; corner: HudCorner }
  | { mode: "custom"; x: number; y: number; contentCorner: HudCorner };

export type HudPlaceModePayload = {
  active: boolean;
};

function isIgnoredMouseAction(value: unknown): value is IgnoredMouseAction {
  return (
    value === "left" ||
    value === "right" ||
    value === "middle" ||
    value === "scroll"
  );
}

/** Normalize + dedupe valid mouse ignore categories; preserve order. */
export function normalizeIgnoredMouseActions(
  raw: unknown,
): IgnoredMouseAction[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<IgnoredMouseAction>();
  const out: IgnoredMouseAction[] = [];
  for (const item of raw) {
    if (!isIgnoredMouseAction(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/**
 * Normalize capture payload.
 * omit `hasNumpad` → false; omit `ignoredMouseActions` → [].
 * Legacy `captureScroll: false` → ensure `"scroll"` is ignored.
 */
export function normalizeCaptureSettings(
  raw: Partial<CaptureSettings> & { captureScroll?: boolean },
): CaptureSettings {
  let ignoredMouseActions = normalizeIgnoredMouseActions(raw.ignoredMouseActions);
  if (raw.captureScroll === false && !ignoredMouseActions.includes("scroll")) {
    ignoredMouseActions = [...ignoredMouseActions, "scroll"];
  }
  return {
    captureKeyboard: Boolean(raw.captureKeyboard),
    captureMouse: Boolean(raw.captureMouse),
    mouseClickRipple: Boolean(raw.mouseClickRipple),
    hasNumpad: raw.hasNumpad === true,
    ignoredKeyIds: Array.isArray(raw.ignoredKeyIds) ? [...raw.ignoredKeyIds] : [],
    ignoredMouseActions,
  };
}

export function isCaptureSettings(value: unknown): value is CaptureSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.captureKeyboard !== "boolean" ||
    typeof s.captureMouse !== "boolean"
  ) {
    return false;
  }
  if (s.mouseClickRipple !== undefined && typeof s.mouseClickRipple !== "boolean") {
    return false;
  }
  if (s.hasNumpad !== undefined && typeof s.hasNumpad !== "boolean") {
    return false;
  }
  if (s.ignoredKeyIds !== undefined && !Array.isArray(s.ignoredKeyIds)) {
    return false;
  }
  if (
    Array.isArray(s.ignoredKeyIds) &&
    !s.ignoredKeyIds.every((id) => typeof id === "string")
  ) {
    return false;
  }
  if (
    s.ignoredMouseActions !== undefined &&
    !Array.isArray(s.ignoredMouseActions)
  ) {
    return false;
  }
  if (
    Array.isArray(s.ignoredMouseActions) &&
    !s.ignoredMouseActions.every((id) => typeof id === "string")
  ) {
    return false;
  }
  // Legacy peer toggle still accepted so normalize can migrate.
  if (s.captureScroll !== undefined && typeof s.captureScroll !== "boolean") {
    return false;
  }
  return true;
}

export async function getCaptureSettings(): Promise<CaptureSettings> {
  const raw = await invoke<CaptureSettings>("get_capture_settings");
  return normalizeCaptureSettings(raw);
}

export async function setCaptureSettings(
  settings: CaptureSettings,
): Promise<CaptureSettings> {
  const saved = await invoke<CaptureSettings>("set_capture_settings", {
    settings: {
      captureKeyboard: settings.captureKeyboard,
      captureMouse: settings.captureMouse,
      mouseClickRipple: settings.mouseClickRipple,
      hasNumpad: settings.hasNumpad,
      ignoredKeyIds: settings.ignoredKeyIds,
      ignoredMouseActions: settings.ignoredMouseActions,
    },
  });
  return normalizeCaptureSettings(saved);
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

export const DEFAULT_HUD_POSITION: HudPositionSettings = {
  mode: "corner",
  corner: "br",
};

export function isHudPositionSettings(
  value: unknown,
): value is HudPositionSettings {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (s.mode === "corner") return isHudCorner(s.corner);
  if (s.mode === "custom") {
    if (typeof s.x !== "number" || typeof s.y !== "number") return false;
    // contentCorner optional for legacy wire/JSON; normalize fills `br`.
    if (s.contentCorner !== undefined && !isHudCorner(s.contentCorner)) {
      return false;
    }
    return true;
  }
  return false;
}

/** Fill omitted `custom.contentCorner` → `br` (legacy JSON / wire). */
export function normalizeHudPositionSettings(
  value: unknown,
): HudPositionSettings | null {
  if (!isHudPositionSettings(value)) return null;
  if (value.mode === "corner") {
    return { mode: "corner", corner: value.corner };
  }
  const raw = value as { x: number; y: number; contentCorner?: unknown };
  return {
    mode: "custom",
    x: raw.x,
    y: raw.y,
    contentCorner: isHudCorner(raw.contentCorner) ? raw.contentCorner : "br",
  };
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

/** Overlay content anchor: corner mode uses that corner; custom uses stored contentCorner. */
export function contentCornerFromPosition(
  position: HudPositionSettings,
): HudCorner {
  if (position.mode === "corner") return position.corner;
  return isHudCorner(position.contentCorner) ? position.contentCorner : "br";
}

export async function getHudPositionSettings(): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("get_hud_position_settings");
  return normalizeHudPositionSettings(raw) ?? { ...DEFAULT_HUD_POSITION };
}

export async function setHudPositionSettings(
  settings: HudPositionSettings,
): Promise<HudPositionSettings> {
  const saved = await invoke<HudPositionSettings>("set_hud_position_settings", {
    settings,
  });
  return normalizeHudPositionSettings(saved) ?? { ...DEFAULT_HUD_POSITION };
}

/** Snapshot overlay position into custom mode (does not start place/drag). */
export async function enterHudCustomMode(
  contentCorner: HudCorner,
): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("enter_hud_custom_mode", {
    contentCorner,
  });
  return normalizeHudPositionSettings(raw) ?? { ...DEFAULT_HUD_POSITION };
}

/** Patch custom contentCorner without moving the overlay window. */
export async function setHudCustomContentCorner(
  contentCorner: HudCorner,
): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("set_hud_custom_content_corner", {
    contentCorner,
  });
  return normalizeHudPositionSettings(raw) ?? { ...DEFAULT_HUD_POSITION };
}

export async function startHudPlaceMode(): Promise<void> {
  await invoke("start_hud_place_mode");
}

export async function endHudPlaceMode(
  contentCorner?: HudCorner,
): Promise<HudPositionSettings> {
  const raw = await invoke<HudPositionSettings>("end_hud_place_mode", {
    contentCorner: contentCorner ?? null,
  });
  return normalizeHudPositionSettings(raw) ?? { ...DEFAULT_HUD_POSITION };
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

export type UiAppearance = "system" | "dark" | "light";

export type ResolvedAppearance = "dark" | "light";

export type UiAppearancePayload = {
  appearance: UiAppearance;
};

export function isUiAppearance(value: unknown): value is UiAppearance {
  return value === "system" || value === "dark" || value === "light";
}

export function isUiAppearancePayload(
  value: unknown,
): value is UiAppearancePayload {
  if (!value || typeof value !== "object") return false;
  return isUiAppearance((value as Record<string, unknown>).appearance);
}

/** Resolve stored mode to a concrete dark|light theme for CSS. */
export function resolveAppearance(
  stored: UiAppearance | null | undefined,
): ResolvedAppearance {
  const mode = stored ?? "system";
  if (mode === "dark" || mode === "light") return mode;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** `null` when unset (frontend treats as `system`). */
export async function getUiAppearanceSettings(): Promise<UiAppearance | null> {
  const raw = await invoke<UiAppearance | null>("get_ui_appearance_settings");
  return isUiAppearance(raw) ? raw : null;
}

export async function setUiAppearanceSettings(
  appearance: UiAppearance,
): Promise<UiAppearance> {
  const saved = await invoke<UiAppearance>("set_ui_appearance_settings", {
    appearance,
  });
  return isUiAppearance(saved) ? saved : appearance;
}
