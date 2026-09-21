/** Physical keycap legends for mainstream ANSI layouts (by HudChip `id`). */

export type KeyLegend = {
  /** Bottom / primary glyph (unshifted). */
  main: string;
  /** Top glyph when the keycap has a shift legend. */
  shift?: string;
};

export type KeyboardLegendLayoutId = "mac-us" | "win-us";

export type KeyboardLegendPreference = "auto" | KeyboardLegendLayoutId;

/** US ANSI dual-legend keys — same on Mac and Windows physical US boards. */
const US_ANSI_DUAL: Record<string, KeyLegend> = {
  Backquote: { main: "`", shift: "~" },
  Digit1: { main: "1", shift: "!" },
  Digit2: { main: "2", shift: "@" },
  Digit3: { main: "3", shift: "#" },
  Digit4: { main: "4", shift: "$" },
  Digit5: { main: "5", shift: "%" },
  Digit6: { main: "6", shift: "^" },
  Digit7: { main: "7", shift: "&" },
  Digit8: { main: "8", shift: "*" },
  Digit9: { main: "9", shift: "(" },
  Digit0: { main: "0", shift: ")" },
  Minus: { main: "-", shift: "_" },
  Equal: { main: "=", shift: "+" },
  BracketLeft: { main: "[", shift: "{" },
  BracketRight: { main: "]", shift: "}" },
  Backslash: { main: "\\", shift: "|" },
  Semicolon: { main: ";", shift: ":" },
  Quote: { main: "'", shift: '"' },
  Comma: { main: ",", shift: "<" },
  Period: { main: ".", shift: ">" },
  Slash: { main: "/", shift: "?" },
};

const LETTER_IDS = [
  "KeyA",
  "KeyB",
  "KeyC",
  "KeyD",
  "KeyE",
  "KeyF",
  "KeyG",
  "KeyH",
  "KeyI",
  "KeyJ",
  "KeyK",
  "KeyL",
  "KeyM",
  "KeyN",
  "KeyO",
  "KeyP",
  "KeyQ",
  "KeyR",
  "KeyS",
  "KeyT",
  "KeyU",
  "KeyV",
  "KeyW",
  "KeyX",
  "KeyY",
  "KeyZ",
] as const;

function letterLegends(): Record<string, KeyLegend> {
  const out: Record<string, KeyLegend> = {};
  for (const id of LETTER_IDS) {
    out[id] = { main: id.slice(3) };
  }
  return out;
}

/** Shared special-key glyphs (prefer symbols; word labels Title Case). */
const US_ANSI_BASE: Record<string, KeyLegend> = {
  ...US_ANSI_DUAL,
  ...letterLegends(),
  Escape: { main: "Esc" },
  Tab: { main: "⇥" },
  CapsLock: { main: "Caps" },
  Space: { main: "Space" },
  // ↵ (U+21B5): mainstream PC/W3C enter mark; unified over ⏎ / ↩.
  Enter: { main: "↵" },
  Backspace: { main: "⌫" },
  ForwardDelete: { main: "⌦" },
  ArrowLeft: { main: "←" },
  ArrowRight: { main: "→" },
  ArrowUp: { main: "↑" },
  ArrowDown: { main: "↓" },
  F1: { main: "F1" },
  F2: { main: "F2" },
  F3: { main: "F3" },
  F4: { main: "F4" },
  F5: { main: "F5" },
  F6: { main: "F6" },
  F7: { main: "F7" },
  F8: { main: "F8" },
  F9: { main: "F9" },
  F10: { main: "F10" },
  F11: { main: "F11" },
  F12: { main: "F12" },
  Numpad0: { main: "0" },
  Numpad1: { main: "1" },
  Numpad2: { main: "2" },
  Numpad3: { main: "3" },
  Numpad4: { main: "4" },
  Numpad5: { main: "5" },
  Numpad6: { main: "6" },
  Numpad7: { main: "7" },
  Numpad8: { main: "8" },
  Numpad9: { main: "9" },
  NumpadDecimal: { main: "." },
  NumpadAdd: { main: "+" },
  NumpadSubtract: { main: "-" },
  NumpadMultiply: { main: "*" },
  NumpadDivide: { main: "/" },
  NumpadEnter: { main: "↵" },
  NumpadEqual: { main: "=" },
};

/** Mac Clear (abbr. Clr) vs Win Num Lock on the same physical NumLock key. */
const NUM_LOCK_BY_LAYOUT: Record<KeyboardLegendLayoutId, KeyLegend> = {
  "mac-us": { main: "Clr" },
  "win-us": { main: "Num" },
};

/** Guess a legend pack from the host OS (best-effort). */
export function guessKeyboardLegendLayout(): KeyboardLegendLayoutId {
  if (typeof navigator === "undefined") return "mac-us";
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || "").toLowerCase();
  if (
    platform.includes("mac") ||
    ua.includes("mac os") ||
    ua.includes("macintosh")
  ) {
    return "mac-us";
  }
  // Windows / Linux desktop → Win-US naming for modifiers; legends still US ANSI.
  return "win-us";
}

export function resolveKeyboardLegendLayout(
  preference: KeyboardLegendPreference | undefined,
): KeyboardLegendLayoutId {
  if (preference === "mac-us" || preference === "win-us") return preference;
  return guessKeyboardLegendLayout();
}

export function legendForKeyId(
  id: string,
  layout: KeyboardLegendLayoutId = "mac-us",
): KeyLegend | undefined {
  if (id === "NumLock") return NUM_LOCK_BY_LAYOUT[layout];
  // US ANSI dual glyphs shared; modifiers/special captions live in key-card.
  return US_ANSI_BASE[id];
}

/** Compact Text-HUD / Log glyphs for modifiers (OS-aware). */
const HUD_MOD_LABEL: Record<
  KeyboardLegendLayoutId,
  Record<string, string>
> = {
  "mac-us": {
    ControlLeft: "⌃",
    ControlRight: "⌃",
    AltLeft: "⌥",
    AltRight: "⌥",
    MetaLeft: "⌘",
    MetaRight: "⌘",
    ShiftLeft: "⇧",
    ShiftRight: "⇧",
    Fn: "Fn",
  },
  "win-us": {
    ControlLeft: "Ctrl",
    ControlRight: "Ctrl",
    AltLeft: "Alt",
    AltRight: "Alt",
    MetaLeft: "Win",
    MetaRight: "Win",
    ShiftLeft: "⇧",
    ShiftRight: "⇧",
    Fn: "Fn",
  },
};

/** Compact specials preferred over wordy key-card captions in Text HUD. */
const HUD_SPECIAL_LABEL: Record<string, string> = {
  Escape: "Esc",
  Tab: "⇥",
  Enter: "↵",
  NumpadEnter: "↵",
  Backspace: "⌫",
  ForwardDelete: "⌦",
  Space: "Space",
  CapsLock: "Caps",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

/**
 * Resolve a user-visible key string from stable `id` + legend/OS layout.
 * Wire payloads carry id only — never trust a payload.label.
 */
export function displayLabelForKeyId(
  id: string,
  layout: KeyboardLegendLayoutId = "mac-us",
): string {
  const mod = HUD_MOD_LABEL[layout][id];
  if (mod) return mod;

  const special = HUD_SPECIAL_LABEL[id];
  if (special) return special;

  const legend = legendForKeyId(id, layout);
  if (legend) return legend.main;

  if (id.startsWith("Key") && id.length === 4) return id.slice(3);
  if (id.startsWith("Digit") && id.length === 6) return id.slice(5);
  if (id.startsWith("Numpad") && id.length > 6) {
    const rest = id.slice(6);
    if (/^\d$/.test(rest)) return rest;
  }
  if (id.startsWith("Mouse")) {
    return id.slice("Mouse".length) || id;
  }
  return id;
}

export function isKeyboardLegendPreference(
  value: unknown,
): value is KeyboardLegendPreference {
  return value === "auto" || value === "mac-us" || value === "win-us";
}
