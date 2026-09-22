/**
 * One-shot intro typewriter: writes invite text and emits matching HudChips.
 * Cancel on first real user chip; never loops.
 */

import type { HudChip } from "z-key-cast-hud-view";
import { t, type UiLocale } from "$lib/i18n";

/** @deprecated Prefer inviteFor(locale); kept for call sites that pass text explicitly. */
export const INTRO_INVITE = "Press any key to take control.";

export function inviteFor(locale: UiLocale): string {
  return t("intro.invite", locale);
}

const CHAR_TO_CODE: Record<string, string> = {
  a: "KeyA",
  b: "KeyB",
  c: "KeyC",
  d: "KeyD",
  e: "KeyE",
  f: "KeyF",
  g: "KeyG",
  h: "KeyH",
  i: "KeyI",
  j: "KeyJ",
  k: "KeyK",
  l: "KeyL",
  m: "KeyM",
  n: "KeyN",
  o: "KeyO",
  p: "KeyP",
  q: "KeyQ",
  r: "KeyR",
  s: "KeyS",
  t: "KeyT",
  u: "KeyU",
  v: "KeyV",
  w: "KeyW",
  x: "KeyX",
  y: "KeyY",
  z: "KeyZ",
  " ": "Space",
  ".": "Period",
  "。": "Period",
  ",": "Comma",
  "，": "Comma",
  "'": "Quote",
  "-": "Minus",
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => resolve(), ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function tapKey(
  keyId: string,
  emit: (chip: HudChip) => void,
  signal: AbortSignal,
  holdMs: number,
) {
  emit({ kind: "key", mods: [], key: { id: keyId }, phase: "down" });
  try {
    await sleep(holdMs, signal);
  } finally {
    emit({ kind: "key", mods: [], key: { id: keyId }, phase: "up" });
  }
}

export type IntroTypewriterOptions = {
  text?: string;
  signal: AbortSignal;
  /** Append one character (or replace whole buffer — caller owns string). */
  onChar: (nextText: string) => void;
  emit: (chip: HudChip) => void;
  /** Delay before first character. */
  startDelayMs?: number;
  /** Gap between characters. */
  charDelayMs?: number;
  /** Key-down hold for map highlight. */
  holdMs?: number;
};

/**
 * Types `text` once into the notepad via `onChar`, driving HUD chips.
 * Unmapped chars (e.g. CJK) still emit a chip whose id is the character itself.
 * Throws AbortError when cancelled; callers should ignore that.
 */
export async function runIntroTypewriter(
  options: IntroTypewriterOptions,
): Promise<void> {
  const text = options.text ?? INTRO_INVITE;
  const startDelayMs = options.startDelayMs ?? 480;
  const charDelayMs = options.charDelayMs ?? 72;
  const holdMs = options.holdMs ?? 48;
  const { signal, onChar, emit } = options;

  await sleep(startDelayMs, signal);

  let buffer = "";
  for (const char of text) {
    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const lower = char.toLowerCase();
    const code = CHAR_TO_CODE[lower] ?? CHAR_TO_CODE[char];
    const needsShift = char !== lower && /[a-z]/i.test(char);

    if (code) {
      if (needsShift) {
        emit({
          kind: "key",
          mods: [],
          key: { id: "ShiftLeft" },
          phase: "down",
        });
        try {
          await sleep(20, signal);
          emit({
            kind: "key",
            mods: [{ id: "ShiftLeft" }],
            key: { id: code },
            phase: "down",
          });
          try {
            await sleep(holdMs, signal);
          } finally {
            emit({
              kind: "key",
              mods: [],
              key: { id: code },
              phase: "up",
            });
          }
        } finally {
          emit({
            kind: "key",
            mods: [],
            key: { id: "ShiftLeft" },
            phase: "up",
          });
        }
      } else {
        await tapKey(code, emit, signal, holdMs);
      }
    } else {
      // CJK / other: notepad gets the glyph; Lite shows the same as chip caption.
      await tapKey(char, emit, signal, holdMs);
    }

    if (signal.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    buffer += char;
    onChar(buffer);
    await sleep(charDelayMs, signal);
  }
}
