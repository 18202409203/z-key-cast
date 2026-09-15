import { invoke } from "@tauri-apps/api/core";

export const HUD_STYLE_CHANNEL = "cast://hud-style";

export type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
};

export type KeyboardDisplayMode = "text" | "key-card" | "keyboard";

export type HudStyleSettings = {
  fontSizePx: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  dwellMs: number;
  /** Omitted in older settings → treat as `"text"`. */
  keyboardDisplayMode?: KeyboardDisplayMode;
};

export const DEFAULT_HUD_STYLE: HudStyleSettings = {
  fontSizePx: 15,
  textColor: "#f8fafc",
  backgroundColor: "#0f172a",
  backgroundOpacity: 0.82,
  dwellMs: 1000,
  keyboardDisplayMode: "text",
};

function isKeyboardDisplayMode(value: unknown): value is KeyboardDisplayMode {
  return value === "text" || value === "key-card" || value === "keyboard";
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
  if (
    s.keyboardDisplayMode !== undefined &&
    !isKeyboardDisplayMode(s.keyboardDisplayMode)
  ) {
    return false;
  }
  return true;
}

/** Fill defaults for fields omitted by older settings.json / emits. */
export function normalizeHudStyleSettings(
  value: HudStyleSettings,
): HudStyleSettings & { keyboardDisplayMode: KeyboardDisplayMode } {
  return {
    ...value,
    keyboardDisplayMode: value.keyboardDisplayMode ?? "text",
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
  return invoke<CaptureSettings>("get_capture_settings");
}

export async function setCaptureSettings(
  settings: CaptureSettings,
): Promise<CaptureSettings> {
  return invoke<CaptureSettings>("set_capture_settings", { settings });
}

export async function getHudStyleSettings(): Promise<HudStyleSettings> {
  return invoke<HudStyleSettings>("get_hud_style_settings");
}

export async function setHudStyleSettings(
  settings: HudStyleSettings,
): Promise<HudStyleSettings> {
  return invoke<HudStyleSettings>("set_hud_style_settings", { settings });
}
