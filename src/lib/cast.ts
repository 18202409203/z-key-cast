/** App host: Tauri channels + invoke. Chip types/formatters live in `z-key-cast-hud-view`. */

import { invoke } from "@tauri-apps/api/core";

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
} from "z-key-cast-hud-view";

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

export function isHookStatus(value: unknown): value is HookStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  if (typeof status.ok !== "boolean") return false;
  if (status.reason !== undefined && typeof status.reason !== "string") return false;
  return true;
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
