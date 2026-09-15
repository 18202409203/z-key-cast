import type { KeyRef } from "$lib/cast";
import {
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
    ControlLeft: { symbol: "⌃", caption: "control" },
    ControlRight: { symbol: "⌃", caption: "control" },
    AltLeft: { symbol: "⌥", caption: "option" },
    AltRight: { symbol: "⌥", caption: "option" },
    MetaLeft: { symbol: "⌘", caption: "command" },
    MetaRight: { symbol: "⌘", caption: "command" },
    ShiftLeft: { caption: "shift", wide: true },
    ShiftRight: { caption: "shift", wide: true },
    Fn: { caption: "fn" },
  },
  "win-us": {
    ControlLeft: { caption: "ctrl" },
    ControlRight: { caption: "ctrl" },
    AltLeft: { caption: "alt" },
    AltRight: { caption: "alt" },
    MetaLeft: { caption: "win", wide: true },
    MetaRight: { caption: "win", wide: true },
    ShiftLeft: { caption: "shift", wide: true },
    ShiftRight: { caption: "shift", wide: true },
    Fn: { caption: "fn" },
  },
};

const SPECIAL_BY_LAYOUT: Record<
  KeyboardLegendLayoutId,
  Record<string, { symbol?: string; caption: string; wide?: boolean }>
> = {
  "mac-us": {
    Space: { caption: "space", wide: true },
    Tab: { caption: "tab" },
    Enter: { caption: "return", wide: true },
    Escape: { caption: "esc" },
    Backspace: { symbol: "⌫", caption: "delete" },
    ForwardDelete: { symbol: "⌦", caption: "delete" },
    CapsLock: { caption: "caps" },
  },
  "win-us": {
    Space: { caption: "space", wide: true },
    Tab: { caption: "tab" },
    Enter: { caption: "enter", wide: true },
    Escape: { caption: "esc" },
    Backspace: { symbol: "⌫", caption: "backspace", wide: true },
    ForwardDelete: { symbol: "Del", caption: "delete" },
    CapsLock: { caption: "caps" },
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
      caption: ref.label.toLowerCase(),
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
    main: ref.label,
  };
}
