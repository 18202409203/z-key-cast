/** Wire contract — keep aligned with `design/index.md` and Rust `input/event.rs`. */

export type Phase = "down" | "up";

export type CastEvent =
  | { type: "key"; key: string; mods: string[]; phase: Phase }
  | { type: "mouse"; button: "left" | "right" | "middle"; phase: Phase };

export type HookStatus = {
  ok: boolean;
  reason?: string;
};

export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";

function isPhase(value: unknown): value is Phase {
  return value === "down" || value === "up";
}

export function isCastEvent(value: unknown): value is CastEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;

  if (event.type === "key") {
    return (
      typeof event.key === "string" &&
      Array.isArray(event.mods) &&
      event.mods.every((mod) => typeof mod === "string") &&
      isPhase(event.phase)
    );
  }

  if (event.type === "mouse") {
    return (
      (event.button === "left" ||
        event.button === "right" ||
        event.button === "middle") &&
      isPhase(event.phase)
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

export function formatLabel(event: CastEvent): string {
  if (event.type === "key") {
    if (event.mods.length > 0) {
      return `${event.mods.join(" + ")} + ${event.key}`;
    }
    return event.key;
  }

  const button =
    event.button === "left" ? "Left" : event.button === "right" ? "Right" : "Middle";
  return `Mouse · ${button}`;
}

export function summarizeEvent(event: CastEvent): string {
  const label = formatLabel(event);
  return `${event.type} ${event.phase}: ${label}`;
}

export function summarizeHookStatus(status: HookStatus): string {
  if (status.ok) {
    return "hook-status: ok";
  }
  return `hook-status: failed (${status.reason ?? "unknown"})`;
}
