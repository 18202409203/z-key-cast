/**
 * DOM keyboard / mouse / wheel → HudChip (same wire contract as the App hook).
 *
 * Capture is gated by an explicit power session (on/off), not by hover target:
 * - Power on (click stage / host call / key while idle): document-level capture.
 * - Power off (click outside stage): release held keys/buttons; page mouse/keys
 *   behave normally again. The outside click that shuts down is swallowed so it
 *   does not also activate Download links — the next click is a normal one.
 */

import {
  isModifierKeyId,
  type HudChip,
  type KeyRef,
} from "z-key-cast-hud-view";

type MouseButton = Extract<HudChip, { kind: "mouse" }>["button"];

const CODE_ALIASES: Record<string, string> = {
  Delete: "ForwardDelete",
  OSLeft: "MetaLeft",
  OSRight: "MetaRight",
};

function keyIdFromCode(code: string): string | null {
  if (!code || code === "Unidentified") return null;
  const id = CODE_ALIASES[code] ?? code;
  if (id.startsWith("_")) return null;
  return id;
}

function mouseButton(button: number): MouseButton | null {
  if (button === 0) return "left";
  if (button === 1) return "middle";
  if (button === 2) return "right";
  return null;
}

function isEditableElement(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
    return !el.disabled && !el.readOnly;
  }
  return el.isContentEditable;
}

function isPageInteractive(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest("a, button, input, textarea, select, [contenteditable=true]"),
  );
}

/** Desk power toggle — handled by the control's click, not as capture/chips. */
function isStagePowerToggle(el: EventTarget | null): boolean {
  return el instanceof Element && Boolean(el.closest("[data-stage-power]"));
}

export type DomInputAdapterOptions = {
  onChip: (chip: HudChip) => void;
  /** Fires when the power session flips (screen on/off). */
  onPowerChange?: (powered: boolean) => void;
  /** Typing surface (notepad). Focus parks here while powered. */
  getFocusTarget?: () => HTMLElement | null | undefined;
  /** Scrollable notepad; wheel deltas apply here while powered. */
  getScrollTarget?: () => HTMLElement | null | undefined;
};

export type DomInputAdapter = {
  dispose: () => void;
  powerOn: () => void;
  powerOff: () => void;
  readonly powered: boolean;
};

/**
 * Attach document-level listeners. `root` is the stage: clicks inside power on
 * (or stay on); clicks outside while powered power off.
 */
export function attachDomInputAdapter(
  root: HTMLElement,
  options: DomInputAdapterOptions,
): DomInputAdapter {
  const heldMods = new Set<string>();
  const heldKeys = new Set<string>();
  const heldButtons = new Set<MouseButton>();
  let powered = false;

  function modsSnapshot(): KeyRef[] {
    return [...heldMods].map((id) => ({ id }));
  }

  function emit(chip: HudChip) {
    options.onChip(chip);
  }

  function parkFocus() {
    const preferred = options.getFocusTarget?.() ?? null;
    const target = preferred ?? root;
    if (document.activeElement !== target) {
      target.focus({ preventScroll: true });
    }
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const len = target.value.length;
      try {
        target.setSelectionRange(len, len);
      } catch {
        // ignore
      }
    }
  }

  function releaseAll() {
    for (const id of [...heldKeys]) {
      emit({
        kind: "key",
        mods: [],
        key: { id },
        phase: "up",
      });
    }
    heldKeys.clear();
    heldMods.clear();
    for (const button of [...heldButtons]) {
      emit({
        kind: "mouse",
        mods: [],
        button,
        phase: "up",
      });
    }
    heldButtons.clear();
  }

  function powerOn() {
    if (powered) {
      parkFocus();
      return;
    }
    powered = true;
    parkFocus();
    options.onPowerChange?.(true);
  }

  function powerOff() {
    if (!powered) return;
    releaseAll();
    powered = false;
    const active = document.activeElement;
    if (active instanceof HTMLElement && root.contains(active)) {
      active.blur();
    }
    options.onPowerChange?.(false);
  }

  function onKeyDown(event: KeyboardEvent) {
    // Let the power button receive Space/Enter → click; do not wake/capture as chips.
    if (isStagePowerToggle(event.target)) return;

    if (!powered) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (isPageInteractive(event.target) && !root.contains(event.target as Node)) {
        return;
      }
      powerOn();
    }

    if (!isEditableElement(document.activeElement)) {
      parkFocus();
    }

    const id = keyIdFromCode(event.code);
    if (!id) return;
    const editable = isEditableElement(document.activeElement);
    if (!editable && event.code !== "Tab") event.preventDefault();
    if (event.repeat) return;
    if (isModifierKeyId(id)) heldMods.add(id);
    heldKeys.add(id);
    emit({
      kind: "key",
      mods: isModifierKeyId(id) ? [] : modsSnapshot().filter((m) => m.id !== id),
      key: { id },
      phase: "down",
    });
  }

  function onKeyUp(event: KeyboardEvent) {
    if (!powered) return;
    const id = keyIdFromCode(event.code);
    if (!id) return;
    const editable = isEditableElement(document.activeElement);
    if (!editable && event.code !== "Tab") event.preventDefault();
    if (isModifierKeyId(id)) heldMods.delete(id);
    heldKeys.delete(id);
    emit({
      kind: "key",
      mods: [],
      key: { id },
      phase: "up",
    });
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target;
    // Desk power button: toggle here; suppress click so it does not double-fire.
    if (isStagePowerToggle(target)) {
      if (powered) powerOff();
      else powerOn();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const inside =
      target instanceof Node ? root.contains(target) : false;

    if (powered && !inside) {
      // First outside click only shuts down; next click is normal page UI.
      powerOff();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!powered) {
      if (!inside) return;
      powerOn();
    } else {
      parkFocus();
    }

    const button = mouseButton(event.button);
    if (!button) return;
    heldButtons.add(button);
    emit({
      kind: "mouse",
      mods: modsSnapshot(),
      button,
      phase: "down",
    });
  }

  function onPointerUp(event: PointerEvent) {
    if (!powered && heldButtons.size === 0) return;
    const button = mouseButton(event.button);
    if (!button) return;
    if (!heldButtons.has(button)) return;
    heldButtons.delete(button);
    emit({
      kind: "mouse",
      mods: modsSnapshot(),
      button,
      phase: "up",
    });
  }

  function onPointerCancel() {
    if (heldButtons.size === 0) return;
    for (const button of [...heldButtons]) {
      emit({
        kind: "mouse",
        mods: modsSnapshot(),
        button,
        phase: "up",
      });
    }
    heldButtons.clear();
  }

  function onContextMenu(event: Event) {
    if (!powered) return;
    if (event.target instanceof Node && root.contains(event.target)) {
      event.preventDefault();
    }
  }

  function onWheel(event: WheelEvent) {
    if (!powered) return;
    event.preventDefault();
    const scrollEl = options.getScrollTarget?.() ?? null;
    if (scrollEl && event.deltaY !== 0) {
      scrollEl.scrollTop += event.deltaY;
    }
    if (event.deltaY === 0) return;
    emit({
      kind: "scroll",
      mods: modsSnapshot(),
      direction: event.deltaY < 0 ? "up" : "down",
    });
  }

  // Capture phase so outside-click power-off wins before link activation.
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerup", onPointerUp, true);
  window.addEventListener("pointercancel", onPointerCancel, true);
  window.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });

  return {
    get powered() {
      return powered;
    },
    powerOn,
    powerOff,
    dispose() {
      powerOff();
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerCancel, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("wheel", onWheel, true);
    },
  };
}
