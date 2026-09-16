import type { KeyRef } from "$lib/cast";
import {
  displayLabelForKeyId,
  legendForKeyId,
  type KeyboardLegendLayoutId,
} from "$lib/key-legends";

export type KeyCardVisual =
  | {
      id: string;
      layout: "modifier";
      symbol?: string;
      caption: string;
      wide?: boolean;
    }
  | {
      id: string;
      layout: "character";
      main: string;
      shift?: string;
    };

const MODIFIER_BY_LAYOUT: Record<
  KeyboardLegendLayoutId,
  Record<string, { symbol?: string; caption: string; wide?: boolean }>
> = {
  "mac-us": {
    ControlLeft: { symbol: "⌃", caption: "Control" },
    ControlRight: { symbol: "⌃", caption: "Control" },
    AltLeft: { symbol: "⌥", caption: "Option" },
    AltRight: { symbol: "⌥", caption: "Option" },
    MetaLeft: { symbol: "⌘", caption: "Command" },
    MetaRight: { symbol: "⌘", caption: "Command" },
    ShiftLeft: { symbol: "⇧", caption: "Shift", wide: true },
    ShiftRight: { symbol: "⇧", caption: "Shift", wide: true },
    Fn: { caption: "fn" },
  },
  "win-us": {
    ControlLeft: { caption: "Ctrl" },
    ControlRight: { caption: "Ctrl" },
    AltLeft: { caption: "Alt" },
    AltRight: { caption: "Alt" },
    MetaLeft: { caption: "Win", wide: true },
    MetaRight: { caption: "Win", wide: true },
    ShiftLeft: { symbol: "⇧", caption: "Shift", wide: true },
    ShiftRight: { symbol: "⇧", caption: "Shift", wide: true },
    Fn: { caption: "fn" },
  },
};

const SPECIAL_BY_LAYOUT: Record<
  KeyboardLegendLayoutId,
  Record<string, { symbol?: string; caption: string; wide?: boolean }>
> = {
  "mac-us": {
    Space: { caption: "Space", wide: true },
    Tab: { symbol: "⇥", caption: "Tab" },
    Enter: { symbol: "↵", caption: "Return", wide: true },
    Escape: { caption: "Esc" },
    Backspace: { symbol: "⌫", caption: "Delete" },
    ForwardDelete: { symbol: "⌦", caption: "Delete" },
    CapsLock: { caption: "Caps" },
  },
  "win-us": {
    Space: { caption: "Space", wide: true },
    Tab: { symbol: "⇥", caption: "Tab" },
    Enter: { symbol: "↵", caption: "Enter", wide: true },
    Escape: { caption: "Esc" },
    Backspace: { symbol: "⌫", caption: "Backspace", wide: true },
    ForwardDelete: { symbol: "⌦", caption: "Del" },
    CapsLock: { caption: "Caps" },
  },
};

/** Map a HudChip KeyRef to key-card presentation for a legend layout. */
export function toKeyCardVisual(
  ref: KeyRef,
  layout: KeyboardLegendLayoutId = "mac-us",
): KeyCardVisual {
  const mod = MODIFIER_BY_LAYOUT[layout][ref.id];
  if (mod) {
    return {
      id: ref.id,
      layout: "modifier",
      symbol: mod.symbol,
      caption: mod.caption,
      wide: mod.wide,
    };
  }

  const special = SPECIAL_BY_LAYOUT[layout][ref.id];
  if (special) {
    return {
      id: ref.id,
      layout: "modifier",
      symbol: special.symbol,
      caption: special.caption,
      wide: special.wide,
    };
  }

  if (ref.id.startsWith("Mouse")) {
    return {
      id: ref.id,
      layout: "modifier",
      caption: displayLabelForKeyId(ref.id, layout).toLowerCase(),
      wide: true,
    };
  }

  const legend = legendForKeyId(ref.id, layout);
  if (legend) {
    return {
      id: ref.id,
      layout: "character",
      main: legend.main,
      shift: legend.shift,
    };
  }

  return {
    id: ref.id,
    layout: "character",
    main: displayLabelForKeyId(ref.id, layout),
  };
}
