/** Wire contract — keep aligned with `design/index.md` and Rust `input/event.rs`. */

import { invoke } from "@tauri-apps/api/core";
import {
  displayLabelForKeyId,
  type KeyboardLegendLayoutId,
} from "$lib/key-legends";

export type KeyRef = {
  id: string;
};

export type HudPhase = "down" | "up";
export type ScrollDirection = "up" | "down";

export type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef; phase: HudPhase }
  | { kind: "mouse"; button: "left" | "right" | "middle"; phase: HudPhase }
  | { kind: "scroll"; direction: ScrollDirection };

export type MouseRippleEvent = {
  /** Logical/CSS px from primary monitor top-left. */
  x: number;
  y: number;
  button: "left" | "right" | "middle";
};

export type HookStatus = {
  ok: boolean;
  reason?: string;
};

export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";
export const IGNORE_KEY_CAPTURED_CHANNEL = "cast://ignore-key-captured";
export const MOUSE_RIPPLE_CHANNEL = "cast://mouse-ripple";

/** Fixed Lite/Full wheel-tick pulse length (ms). */
export const SCROLL_PULSE_MS = 250;

function isKeyRef(value: unknown): value is KeyRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Record<string, unknown>;
  // Id-only contract: reject leftover `label` requirement; ignore unknown extra fields.
  return typeof ref.id === "string" && ref.id.length > 0;
}

function isHudPhase(value: unknown): value is HudPhase {
  return value === "down" || value === "up";
}

function isScrollDirection(value: unknown): value is ScrollDirection {
  return value === "up" || value === "down";
}

/** Modifier ids used by ChipReducer / Full held-set (bare-mod chips). */
export function isModifierKeyId(id: string): boolean {
  return (
    id.startsWith("Control") ||
    id.startsWith("Alt") ||
    id.startsWith("Shift") ||
    id.startsWith("Meta")
  );
}

export function isHudChip(value: unknown): value is HudChip {
  if (!value || typeof value !== "object") return false;
  const chip = value as Record<string, unknown>;

  if (chip.kind === "scroll") {
    return isScrollDirection(chip.direction);
  }

  if (!isHudPhase(chip.phase)) return false;

  if (chip.kind === "key") {
    return (
      Array.isArray(chip.mods) &&
      chip.mods.every(isKeyRef) &&
      isKeyRef(chip.key)
    );
  }

  if (chip.kind === "mouse") {
    return (
      chip.button === "left" ||
      chip.button === "right" ||
      chip.button === "middle"
    );
  }

  return false;
}

export function isHookStatus(value: unknown): value is HookStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  if (typeof status.ok !== "boolean") return false;
  if (status.reason !== undefined && typeof status.reason !== "string") return false;
  return true;
}

/** Payload for `cast://ignore-key-captured` (next key/mod down while armed). */
export function isIgnoreKeyCaptured(value: unknown): value is KeyRef {
  return isKeyRef(value);
}

export function isMouseRippleEvent(value: unknown): value is MouseRippleEvent {
  if (!value || typeof value !== "object") return false;
  const ev = value as Record<string, unknown>;
  if (typeof ev.x !== "number" || typeof ev.y !== "number") return false;
  if (!Number.isFinite(ev.x) || !Number.isFinite(ev.y)) return false;
  return (
    ev.button === "left" || ev.button === "right" || ev.button === "middle"
  );
}

export function formatHudLabel(
  chip: HudChip,
  legendLayout: KeyboardLegendLayoutId = "mac-us",
): string {
  if (chip.kind === "scroll") {
    return chip.direction === "up" ? "↑" : "↓";
  }

  if (chip.kind === "key") {
    const parts = [
      ...chip.mods.map((m) => displayLabelForKeyId(m.id, legendLayout)),
      displayLabelForKeyId(chip.key.id, legendLayout),
    ];
    return parts.join(" + ");
  }

  const button =
    chip.button === "left" ? "Left" : chip.button === "right" ? "Right" : "Middle";
  return `Mouse · ${button}`;
}

/** Stable ordered cards for key-card mode (mods then primary; mouse → one card). */
export function hudCards(chip: HudChip): KeyRef[] {
  if (chip.kind === "key") {
    return [...chip.mods, chip.key];
  }
  if (chip.kind === "scroll") {
    return [{ id: chip.direction === "up" ? "ScrollUp" : "ScrollDown" }];
  }
  const label =
    chip.button === "left" ? "Left" : chip.button === "right" ? "Right" : "Middle";
  return [{ id: `Mouse${label}` }];
}

export function summarizeHudChip(
  chip: HudChip,
  legendLayout: KeyboardLegendLayoutId = "mac-us",
): string {
  if (chip.kind === "key") {
    const modIds = chip.mods.map((m) => m.id).join(",");
    const modPart = modIds ? ` mods=[${modIds}]` : "";
    return `key ${chip.phase}${modPart} key=${chip.key.id} · ${formatHudLabel(chip, legendLayout)}`;
  }
  if (chip.kind === "scroll") {
    return `scroll direction=${chip.direction} · ${formatHudLabel(chip, legendLayout)}`;
  }
  return `mouse ${chip.phase} button=${chip.button} · ${formatHudLabel(chip, legendLayout)}`;
}

export function summarizeHookStatus(status: HookStatus): string {
  if (status.ok) {
    return "hook-status: ok";
  }
  return `hook-status: failed (${status.reason ?? "unknown"})`;
}

/** Last cached emit — catches missed one-shot `cast://hook-status` after HMR / late subscribe. */
export async function getHookStatus(): Promise<HookStatus | null> {
  const raw = await invoke<unknown>("get_hook_status");
  if (raw == null) return null;
  return isHookStatus(raw) ? raw : null;
}
