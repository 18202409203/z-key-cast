/**
 * DOM keyboard / mouse / wheel → HudChip (same wire contract as the App hook).
 * Full demo ignores chip.mods for held-set; we still snapshot held modifiers for parity.
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
  // Layout spacer — no highlight target.
  if (id.startsWith("_")) return null;
  return id;
}

function mouseButton(button: number): MouseButton | null {
  if (button === 0) return "left";
  if (button === 1) return "middle";
  if (button === 2) return "right";
  return null;
}

export type DomInputAdapterOptions = {
  onChip: (chip: HudChip) => void;
  /** Optional UI sync (click-to-focus hint). Also driven by focus/blur. */
  onFocusChange?: (focused: boolean) => void;
};

/**
 * Attach listeners on `root` (must be focusable, e.g. tabindex=0).
 * Captures only while `root` is focused; preventDefault on wheel to avoid page scroll.
 * Returns a disposer.
 */
export function attachDomInputAdapter(
  root: HTMLElement,
  options: DomInputAdapterOptions,
): () => void {
  const heldMods = new Set<string>();
  const heldKeys = new Set<string>();
  const heldButtons = new Set<MouseButton>();

  function modsSnapshot(): KeyRef[] {
    return [...heldMods].map((id) => ({ id }));
  }

  function emit(chip: HudChip) {
    options.onChip(chip);
  }

  function setFocused(focused: boolean) {
    options.onFocusChange?.(focused);
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

  function onKeyDown(event: KeyboardEvent) {
    if (document.activeElement !== root) return;
    const id = keyIdFromCode(event.code);
    if (!id) return;
    // Avoid browser chrome eating demo keys when possible (Tab still moves focus).
    if (event.code !== "Tab") event.preventDefault();
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
    if (document.activeElement !== root) return;
    const id = keyIdFromCode(event.code);
    if (!id) return;
    if (event.code !== "Tab") event.preventDefault();
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
    // Do NOT preventDefault on pointerdown — it cancels focus in browsers.
    // Focus + optional UI callback so the demo hint updates on first click.
    if (document.activeElement !== root) {
      root.focus({ preventScroll: true });
    }
    setFocused(true);

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
    const button = mouseButton(event.button);
    if (!button) return;
    if (!heldButtons.has(button) && document.activeElement !== root) return;
    heldButtons.delete(button);
    emit({
      kind: "mouse",
      mods: modsSnapshot(),
      button,
      phase: "up",
    });
  }

  function onPointerCancel() {
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
    if (document.activeElement !== root) return;
    event.preventDefault();
  }

  function onWheel(event: WheelEvent) {
    if (document.activeElement !== root) return;
    event.preventDefault();
    if (event.deltaY === 0) return;
    emit({
      kind: "scroll",
      mods: modsSnapshot(),
      direction: event.deltaY < 0 ? "up" : "down",
    });
  }

  function onFocus() {
    setFocused(true);
  }

  function onBlur() {
    releaseAll();
    setFocused(false);
  }

  root.addEventListener("keydown", onKeyDown);
  root.addEventListener("keyup", onKeyUp);
  root.addEventListener("pointerdown", onPointerDown);
  // pointerup / cancel on window so release works if pointer leaves root
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  root.addEventListener("contextmenu", onContextMenu);
  root.addEventListener("wheel", onWheel, { passive: false });
  root.addEventListener("focus", onFocus);
  root.addEventListener("blur", onBlur);

  return () => {
    releaseAll();
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("keyup", onKeyUp);
    root.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
    root.removeEventListener("contextmenu", onContextMenu);
    root.removeEventListener("wheel", onWheel);
    root.removeEventListener("focus", onFocus);
    root.removeEventListener("blur", onBlur);
  };
}
