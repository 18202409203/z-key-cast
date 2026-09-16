/** Category → key id lists for ignore-list presets (frontend only). */

export type IgnoreCategoryId =
  | "letters"
  | "digits"
  | "function"
  | "arrows"
  | "numpad"
  | "navigation"
  | "punctuation";

export type IgnoreCategory = {
  id: IgnoreCategoryId;
  label: string;
  ids: readonly string[];
};

const LETTERS: string[] = Array.from({ length: 26 }, (_, i) => {
  const letter = String.fromCharCode(65 + i);
  return `Key${letter}`;
});

const DIGITS: string[] = Array.from({ length: 10 }, (_, i) => `Digit${i}`);

const FUNCTION: string[] = Array.from({ length: 12 }, (_, i) => `F${i + 1}`);

const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"] as const;

const NUMPAD = [
  "Numpad0",
  "Numpad1",
  "Numpad2",
  "Numpad3",
  "Numpad4",
  "Numpad5",
  "Numpad6",
  "Numpad7",
  "Numpad8",
  "Numpad9",
  "NumpadDecimal",
  "NumpadMultiply",
  "NumpadAdd",
  "NumpadDivide",
  "NumpadSubtract",
  "NumpadEnter",
  "NumpadEqual",
  "NumLock",
] as const;

const NAVIGATION = [
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "ForwardDelete",
] as const;

const PUNCTUATION = [
  "Backquote",
  "Minus",
  "Equal",
  "BracketLeft",
  "BracketRight",
  "Backslash",
  "Semicolon",
  "Quote",
  "Comma",
  "Period",
  "Slash",
] as const;

export const IGNORE_CATEGORIES: IgnoreCategory[] = [
  { id: "letters", label: "Letters", ids: LETTERS },
  { id: "digits", label: "Digits", ids: DIGITS },
  { id: "function", label: "Function", ids: FUNCTION },
  { id: "arrows", label: "Arrows", ids: ARROWS },
  { id: "numpad", label: "Numpad", ids: NUMPAD },
  { id: "navigation", label: "Navigation", ids: NAVIGATION },
  { id: "punctuation", label: "Punctuation", ids: PUNCTUATION },
];

export type CategoryToggleState = "checked" | "unchecked" | "indeterminate";

export function categoryToggleState(
  ignoredIds: readonly string[],
  categoryIds: readonly string[],
): CategoryToggleState {
  const set = new Set(ignoredIds);
  let hit = 0;
  for (const id of categoryIds) {
    if (set.has(id)) hit += 1;
  }
  if (hit === 0) return "unchecked";
  if (hit === categoryIds.length) return "checked";
  return "indeterminate";
}

/** Add all category ids; preserve existing order; append new ids at end. */
export function addCategoryIds(
  ignoredIds: readonly string[],
  categoryIds: readonly string[],
): string[] {
  const seen = new Set(ignoredIds);
  const next = [...ignoredIds];
  for (const id of categoryIds) {
    if (!seen.has(id)) {
      seen.add(id);
      next.push(id);
    }
  }
  return next;
}

/** Remove only members of this category; leave other ignored ids. */
export function removeCategoryIds(
  ignoredIds: readonly string[],
  categoryIds: readonly string[],
): string[] {
  const drop = new Set(categoryIds);
  return ignoredIds.filter((id) => !drop.has(id));
}

/** Ignored ids that are not drawn on the shared keyboard layout. */
export function offBoardIgnoredIds(
  ignoredIds: readonly string[],
  layoutIds: ReadonlySet<string>,
): string[] {
  return ignoredIds.filter((id) => !layoutIds.has(id));
}

/** Short display label when we only have an id (category bulk-add). */
export function labelForKeyId(id: string): string {
  if (id.startsWith("Key") && id.length === 4) return id.slice(3);
  if (id.startsWith("Digit") && id.length === 6) return id.slice(5);
  if (id.startsWith("Numpad") && id.length > 6) {
    const rest = id.slice(6);
    if (/^\d$/.test(rest)) return `Num${rest}`;
    return id;
  }
  const known: Record<string, string> = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    MetaLeft: "⌘",
    MetaRight: "⌘",
    ShiftLeft: "⇧",
    ShiftRight: "⇧",
    AltLeft: "⌥",
    AltRight: "⌥",
    ControlLeft: "⌃",
    ControlRight: "⌃",
    Escape: "Esc",
    Backspace: "⌫",
    ForwardDelete: "⌦",
    Enter: "↵",
    Space: "Space",
    Tab: "⇥",
    CapsLock: "Caps",
    NumLock: "Clr",
    NumpadEnter: "↵",
  };
  return known[id] ?? id;
}
