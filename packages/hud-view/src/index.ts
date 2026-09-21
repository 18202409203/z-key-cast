/** Shared HUD view layer — no `@tauri-apps/*` dependency. */

export { default as HudView } from "./components/HudView.svelte";
export { default as KeyCard } from "./components/KeyCard.svelte";
export { default as KeyboardMap } from "./components/KeyboardMap.svelte";
export { default as MouseSchematic } from "./components/MouseSchematic.svelte";

export {
  createHudSlots,
  type HudSlots,
  type TimelineChip,
  type TimelineItem,
} from "./state/hud-slots.svelte";

export {
  SCROLL_PULSE_MS,
  formatHudLabel,
  formatHudModsLabel,
  formatHudPointerBody,
  hudCards,
  isHudChip,
  isIgnoreKeyCaptured,
  isModifierKeyId,
  summarizeHudChip,
  type HudChip,
  type HudPhase,
  type KeyRef,
  type ScrollDirection,
} from "./model/chip";

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
} from "./model/hud-style";

export {
  displayLabelForKeyId,
  guessKeyboardLegendLayout,
  isKeyboardLegendPreference,
  legendForKeyId,
  resolveKeyboardLegendLayout,
  type KeyLegend,
  type KeyboardLegendLayoutId,
  type KeyboardLegendPreference,
} from "./model/key-legends";

export { toKeyCardVisual, type KeyCardVisual } from "./model/key-card";

export {
  KEYBOARD_MAP_FONT_PX,
  KEYBOARD_MAP_WIDTH_PX,
  LAYOUT_KEY_IDS,
  LAYOUT_KEY_IDS_MAIN,
  LAYOUT_KEY_IDS_NUMPAD,
  MAIN_LAYOUT_UNITS,
  MAIN_ROWS,
  NUMPAD_LAYOUT_UNITS,
  NUMPAD_ROWS,
  layoutKeyIds,
  type LayoutKey,
  type LayoutRow,
} from "./model/keyboard-layout";

export { isUiLocale, t as hudT, type HudMessageKey, type UiLocale } from "./model/i18n";
