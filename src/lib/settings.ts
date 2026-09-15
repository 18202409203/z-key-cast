import { invoke } from "@tauri-apps/api/core";
import {
  isKeyboardLegendPreference,
  type KeyboardLegendPreference,
} from "$lib/key-legends";

export const HUD_STYLE_CHANNEL = "cast://hud-style";

export type CaptureSettings = {
  captureKeyboard: boolean;
  captureMouse: boolean;
  /** Key ids omitted from HUD chips (primary drop / mod strip). Default []. */
  ignoredKeyIds: string[];
};

export type KeyboardDisplayMode = "text" | "key-card" | "keyboard";
export type MouseDisplayMode = "text" | "schematic";

export type HudStyleSettings = {
  fontSizePx: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  dwellMs: number;
  /** Omitted in older settings → treat as `"text"`. */
  keyboardDisplayMode?: KeyboardDisplayMode;
  /** Omitted → `"auto"` (guess from OS). */
  keyboardLegendLayout?: KeyboardLegendPreference;
  /** Omitted → `"text"`. Independent of keyboard display mode. */
  mouseDisplayMode?: MouseDisplayMode;
};

export const DEFAULT_HUD_STYLE: HudStyleSettings = {
  fontSizePx: 15,
  textColor: "#f8fafc",
  backgroundColor: "#0f172a",
  backgroundOpacity: 0.82,
  dwellMs: 1000,
  keyboardDisplayMode: "text",
  keyboardLegendLayout: "auto",
  mouseDisplayMode: "text",
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

function isKeyboardDisplayMode(value: unknown): value is KeyboardDisplayMode {
  return value === "text" || value === "key-card" || value === "keyboard";
}

function isMouseDisplayMode(value: unknown): value is MouseDisplayMode {
  return value === "text" || value === "schematic";
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
  if (
    s.keyboardLegendLayout !== undefined &&
    !isKeyboardLegendPreference(s.keyboardLegendLayout)
  ) {
    return false;
  }
  if (
    s.mouseDisplayMode !== undefined &&
    !isMouseDisplayMode(s.mouseDisplayMode)
  ) {
    return false;
  }
  return true;
}

/** Fill defaults for fields omitted by older settings.json / emits. */
export function normalizeHudStyleSettings(value: HudStyleSettings): HudStyleSettings & {
  keyboardDisplayMode: KeyboardDisplayMode;
  keyboardLegendLayout: KeyboardLegendPreference;
  mouseDisplayMode: MouseDisplayMode;
} {
  return {
    ...value,
    keyboardDisplayMode: value.keyboardDisplayMode ?? "text",
    keyboardLegendLayout: value.keyboardLegendLayout ?? "auto",
    mouseDisplayMode: value.mouseDisplayMode ?? "text",
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
      ignoredKeyIds: settings.ignoredKeyIds,
    },
  });
  return {
    captureKeyboard: saved.captureKeyboard,
    captureMouse: saved.captureMouse,
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
