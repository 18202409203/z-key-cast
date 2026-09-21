import {
  isKeyboardLegendPreference,
  type KeyboardLegendPreference,
} from "./key-legends";

export type HudPreset = "text" | "lite" | "full";
export type KeyMouseLayout =
  | "key-left-mouse-right"
  | "key-right-mouse-left"
  | "key-top-mouse-bottom"
  | "key-bottom-mouse-top";

export type HudCorner = "br" | "bl" | "tr" | "tl";

export type HudStyleSettings = {
  fontSizePx: number;
  textColor: string;
  backgroundColor: string;
  backgroundOpacity: number;
  dwellMs: number;
  /** Text/Lite timeline length. Omit → 5; clamp 1..=10. */
  timelineMax?: number;
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
  /** Shared across color presets; only Custom edits text/bg colors. */
  backgroundOpacity: 0.52,
  dwellMs: 1000,
  timelineMax: 5,
  hudPreset: "text",
  keyboardLegendLayout: "auto",
  keyMouseLayout: "key-left-mouse-right",
};

/** Quick color themes for text / background (opacity is independent). */
export type HudColorPresetId = "dark" | "light";

export type HudColorPreset = {
  id: HudColorPresetId;
  label: string;
  textColor: string;
  backgroundColor: string;
};

/** Built-in palettes — text + background only. Opacity is a shared HUD setting. */
export const HUD_COLOR_PRESETS: HudColorPreset[] = [
  {
    id: "dark",
    label: "Black (white on black)",
    textColor: "#f8fafc",
    backgroundColor: "#0f172a",
  },
  {
    id: "light",
    label: "White (black on white)",
    textColor: "#18181b",
    backgroundColor: "#f4f4f5",
  },
];

function normHex(color: string): string {
  return color.trim().toLowerCase();
}

/** Match by text/bg only — opacity does not force Custom. */
export function matchHudColorPreset(
  style: Pick<HudStyleSettings, "textColor" | "backgroundColor">,
): HudColorPresetId | "custom" {
  for (const preset of HUD_COLOR_PRESETS) {
    if (
      normHex(style.textColor) === normHex(preset.textColor) &&
      normHex(style.backgroundColor) === normHex(preset.backgroundColor)
    ) {
      return preset.id;
    }
  }
  return "custom";
}

/** Colors only — callers keep the current `backgroundOpacity`. */
export function colorsFromHudPreset(
  id: HudColorPresetId,
): Pick<HudStyleSettings, "textColor" | "backgroundColor"> {
  const preset = HUD_COLOR_PRESETS.find((p) => p.id === id) ?? HUD_COLOR_PRESETS[0]!;
  return {
    textColor: preset.textColor,
    backgroundColor: preset.backgroundColor,
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
  if (s.timelineMax !== undefined && typeof s.timelineMax !== "number") {
    return false;
  }
  // Invalid hudPreset is tolerated here; `normalizeHudStyleSettings` coerces to a valid preset.
  // Legacy `timelineGrow` (if present) is ignored.
  if (s.hudPreset !== undefined && typeof s.hudPreset !== "string") {
    return false;
  }
  if (
    s.keyboardLegendLayout !== undefined &&
    !isKeyboardLegendPreference(s.keyboardLegendLayout)
  ) {
    return false;
  }
  if (s.keyMouseLayout !== undefined && !isKeyMouseLayout(s.keyMouseLayout)) {
    return false;
  }
  return true;
}

function clampTimelineMax(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.round(value)));
}

/** Fill defaults for fields omitted by older settings.json / emits. */
export function normalizeHudStyleSettings(value: HudStyleSettings): HudStyleSettings & {
  hudPreset: HudPreset;
  keyboardLegendLayout: KeyboardLegendPreference;
  keyMouseLayout: KeyMouseLayout;
  timelineMax: number;
} {
  const raw = value as HudStyleSettings & Record<string, unknown>;
  return {
    fontSizePx: value.fontSizePx,
    textColor: value.textColor,
    backgroundColor: value.backgroundColor,
    backgroundOpacity: value.backgroundOpacity,
    dwellMs: value.dwellMs,
    timelineMax: clampTimelineMax(value.timelineMax),
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

export function isHudCorner(value: unknown): value is HudCorner {
  return value === "br" || value === "bl" || value === "tr" || value === "tl";
}
