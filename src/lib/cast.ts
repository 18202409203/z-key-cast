/** Wire contract — keep aligned with `design/index.md` and Rust `input/event.rs`. */

export type KeyRef = {
  id: string;
  label: string;
};

export type HudChip =
  | { kind: "key"; mods: KeyRef[]; key: KeyRef }
  | { kind: "mouse"; button: "left" | "right" | "middle" };

export type HookStatus = {
  ok: boolean;
  reason?: string;
};

export const EVENT_CHANNEL = "cast://event";
export const HOOK_STATUS_CHANNEL = "cast://hook-status";

function isKeyRef(value: unknown): value is KeyRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Record<string, unknown>;
  return typeof ref.id === "string" && typeof ref.label === "string";
}

export function isHudChip(value: unknown): value is HudChip {
  if (!value || typeof value !== "object") return false;
  const chip = value as Record<string, unknown>;
  // Public wire contract has no `phase` (raw downs/ups stay internal).
  if ("phase" in chip) return false;

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

export function formatHudLabel(chip: HudChip): string {
  if (chip.kind === "key") {
    const parts = [...chip.mods.map((m) => m.label), chip.key.label];
    return parts.join(" + ");
  }

  const button =
    chip.button === "left" ? "Left" : chip.button === "right" ? "Right" : "Middle";
  return `Mouse · ${button}`;
}

export function summarizeHudChip(chip: HudChip): string {
  if (chip.kind === "key") {
    const modIds = chip.mods.map((m) => m.id).join(",");
    const modPart = modIds ? ` mods=[${modIds}]` : "";
    return `key${modPart} key=${chip.key.id} · ${formatHudLabel(chip)}`;
  }
  return `mouse button=${chip.button} · ${formatHudLabel(chip)}`;
}

export function summarizeHookStatus(status: HookStatus): string {
  if (status.ok) {
    return "hook-status: ok";
  }
  return `hook-status: failed (${status.reason ?? "unknown"})`;
}
