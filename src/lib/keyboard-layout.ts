/** Compact Mac-like layout keyed by HudChip `id` values from macOS normalize. */

export type LayoutKey = {
  id: string;
  label: string;
  /** Relative width units (default 1). */
  w?: number;
};

export type LayoutRow = LayoutKey[];

export const MAIN_ROWS: LayoutRow[] = [
  [
    { id: "Escape", label: "esc", w: 1.25 },
    { id: "F1", label: "F1" },
    { id: "F2", label: "F2" },
    { id: "F3", label: "F3" },
    { id: "F4", label: "F4" },
    { id: "F5", label: "F5" },
    { id: "F6", label: "F6" },
    { id: "F7", label: "F7" },
    { id: "F8", label: "F8" },
    { id: "F9", label: "F9" },
    { id: "F10", label: "F10" },
    { id: "F11", label: "F11" },
    { id: "F12", label: "F12" },
  ],
  [
    { id: "Backquote", label: "`" },
    { id: "Digit1", label: "1" },
    { id: "Digit2", label: "2" },
    { id: "Digit3", label: "3" },
    { id: "Digit4", label: "4" },
    { id: "Digit5", label: "5" },
    { id: "Digit6", label: "6" },
    { id: "Digit7", label: "7" },
    { id: "Digit8", label: "8" },
    { id: "Digit9", label: "9" },
    { id: "Digit0", label: "0" },
    { id: "Minus", label: "-" },
    { id: "Equal", label: "=" },
    { id: "Backspace", label: "⌫", w: 1.6 },
  ],
  [
    { id: "Tab", label: "tab", w: 1.4 },
    { id: "KeyQ", label: "Q" },
    { id: "KeyW", label: "W" },
    { id: "KeyE", label: "E" },
    { id: "KeyR", label: "R" },
    { id: "KeyT", label: "T" },
    { id: "KeyY", label: "Y" },
    { id: "KeyU", label: "U" },
    { id: "KeyI", label: "I" },
    { id: "KeyO", label: "O" },
    { id: "KeyP", label: "P" },
    { id: "BracketLeft", label: "[" },
    { id: "BracketRight", label: "]" },
    { id: "Backslash", label: "\\", w: 1.2 },
  ],
  [
    { id: "_CapsLock", label: "caps", w: 1.7 },
    { id: "KeyA", label: "A" },
    { id: "KeyS", label: "S" },
    { id: "KeyD", label: "D" },
    { id: "KeyF", label: "F" },
    { id: "KeyG", label: "G" },
    { id: "KeyH", label: "H" },
    { id: "KeyJ", label: "J" },
    { id: "KeyK", label: "K" },
    { id: "KeyL", label: "L" },
    { id: "Semicolon", label: ";" },
    { id: "Quote", label: "'" },
    { id: "Enter", label: "⏎", w: 1.85 },
  ],
  [
    { id: "ShiftLeft", label: "⇧", w: 2.2 },
    { id: "KeyZ", label: "Z" },
    { id: "KeyX", label: "X" },
    { id: "KeyC", label: "C" },
    { id: "KeyV", label: "V" },
    { id: "KeyB", label: "B" },
    { id: "KeyN", label: "N" },
    { id: "KeyM", label: "M" },
    { id: "Comma", label: "," },
    { id: "Period", label: "." },
    { id: "Slash", label: "/" },
    { id: "ShiftRight", label: "⇧", w: 2.2 },
  ],
  [
    { id: "Fn", label: "fn", w: 1.1 },
    { id: "ControlLeft", label: "⌃", w: 1.1 },
    { id: "AltLeft", label: "⌥", w: 1.1 },
    { id: "MetaLeft", label: "⌘", w: 1.35 },
    { id: "Space", label: "", w: 4.8 },
    { id: "MetaRight", label: "⌘", w: 1.35 },
    { id: "AltRight", label: "⌥", w: 1.1 },
    { id: "ControlRight", label: "⌃", w: 1.1 },
    { id: "ArrowLeft", label: "←" },
    { id: "ArrowDown", label: "↓" },
    { id: "ArrowUp", label: "↑" },
    { id: "ArrowRight", label: "→" },
  ],
];

export const NUMPAD_ROWS: LayoutRow[] = [
  [
    { id: "NumLock", label: "clr" },
    { id: "NumpadEqual", label: "=" },
    { id: "NumpadDivide", label: "/" },
    { id: "NumpadMultiply", label: "*" },
  ],
  [
    { id: "Numpad7", label: "7" },
    { id: "Numpad8", label: "8" },
    { id: "Numpad9", label: "9" },
    { id: "NumpadSubtract", label: "-" },
  ],
  [
    { id: "Numpad4", label: "4" },
    { id: "Numpad5", label: "5" },
    { id: "Numpad6", label: "6" },
    { id: "NumpadAdd", label: "+" },
  ],
  [
    { id: "Numpad1", label: "1" },
    { id: "Numpad2", label: "2" },
    { id: "Numpad3", label: "3" },
    { id: "NumpadEnter", label: "⏎" },
  ],
  [
    { id: "Numpad0", label: "0", w: 2 },
    { id: "NumpadDecimal", label: "." },
    { id: "ForwardDelete", label: "⌦" },
  ],
];

function collectNonSpacerIds(rows: LayoutRow[]): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    for (const key of row) {
      if (!key.id.startsWith("_")) ids.push(key.id);
    }
  }
  return ids;
}

/** Non-spacer ids drawn on the shared KeyboardMap (main + numpad). */
export const LAYOUT_KEY_IDS: ReadonlySet<string> = new Set([
  ...collectNonSpacerIds(MAIN_ROWS),
  ...collectNonSpacerIds(NUMPAD_ROWS),
]);

function rowUnitSum(row: LayoutRow): number {
  return row.reduce((sum, key) => sum + (key.w ?? 1), 0);
}

/** Widest main-board row in relative key units (bottom modifier/arrow row). */
export const MAIN_LAYOUT_UNITS = Math.max(...MAIN_ROWS.map(rowUnitSum));

/** Numpad column span in relative key units (standard 4-wide block). */
export const NUMPAD_LAYOUT_UNITS = Math.max(...NUMPAD_ROWS.map(rowUnitSum));
