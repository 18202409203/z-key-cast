import {
  hudCards,
  isModifierKeyId,
  type HudChip,
} from "$lib/cast";
import {
  DEFAULT_HUD_STYLE,
  normalizeHudStyleSettings,
  type HudPreset,
  type HudStyleSettings,
} from "$lib/settings";

type KeyChip = Extract<HudChip, { kind: "key" }>;
type MouseChip = Extract<HudChip, { kind: "mouse" }>;
type MouseButton = MouseChip["button"];

/**
 * Overlay HUD slot / timer / held-set state. Instantiated once by the overlay route.
 * Owns style for dwell and preset side effects (single writer).
 */
export function createHudSlots() {
  let keySlot = $state<KeyChip | null>(null);
  let mouseSlot = $state<MouseChip | null>(null);
  let heldKeyIds = $state<Set<string>>(new Set());
  let heldMouseButtons = $state<Set<MouseButton>>(new Set());
  /** When true, overlay shows capture-unavailable status (re-translated on locale change). */
  let statusActive = $state(false);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  let keyIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let mouseIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let statusIdleTimer: ReturnType<typeof setTimeout> | null = null;

  const hudPreset = $derived<HudPreset>(style.hudPreset ?? "text");
  const isFull = $derived(hudPreset === "full");
  const isLite = $derived(hudPreset === "lite");

  const activeKeyIds = $derived.by(() => {
    if (isFull) return heldKeyIds;
    const ids = new Set<string>();
    if (keySlot) {
      for (const card of hudCards(keySlot)) {
        ids.add(card.id);
      }
    }
    return ids;
  });

  const mouseActiveButtons = $derived.by(() => {
    if (isFull) return heldMouseButtons;
    if (mouseSlot) return new Set<MouseButton>([mouseSlot.button]);
    return new Set<MouseButton>();
  });

  const showKeyboardMap = $derived(isFull);
  const showKeyCards = $derived(isLite && keySlot !== null);
  const showMouseSchematic = $derived(isFull || (isLite && mouseSlot !== null));

  const showKeySide = $derived(
    showKeyboardMap || showKeyCards || (!isFull && !isLite && keySlot !== null),
  );

  const showMouseSide = $derived(
    showMouseSchematic || (!isFull && !isLite && mouseSlot !== null),
  );

  const showKmGroup = $derived(
    !statusActive && (isFull || keySlot !== null || mouseSlot !== null),
  );

  function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer !== null) clearTimeout(timer);
  }

  function clearKeyIdleTimer() {
    clearTimer(keyIdleTimer);
    keyIdleTimer = null;
  }

  function clearMouseIdleTimer() {
    clearTimer(mouseIdleTimer);
    mouseIdleTimer = null;
  }

  function clearStatusIdleTimer() {
    clearTimer(statusIdleTimer);
    statusIdleTimer = null;
  }

  function clearAllIdleTimers() {
    clearKeyIdleTimer();
    clearMouseIdleTimer();
    clearStatusIdleTimer();
  }

  function clearHeldSets() {
    heldKeyIds = new Set();
    heldMouseButtons = new Set();
  }

  function armKeyIdle() {
    clearKeyIdleTimer();
    if (isFull) return;
    keyIdleTimer = setTimeout(() => {
      keySlot = null;
      keyIdleTimer = null;
    }, style.dwellMs);
  }

  function armMouseIdle() {
    clearMouseIdleTimer();
    if (isFull) return;
    mouseIdleTimer = setTimeout(() => {
      mouseSlot = null;
      mouseIdleTimer = null;
    }, style.dwellMs);
  }

  function clearStatus() {
    statusActive = false;
  }

  function armStatusIdle() {
    clearStatusIdleTimer();
    statusIdleTimer = setTimeout(() => {
      clearStatus();
      statusIdleTimer = null;
    }, style.dwellMs);
  }

  function applyStyle(next: HudStyleSettings) {
    const previousPreset = style.hudPreset ?? "text";
    const normalized = normalizeHudStyleSettings(next);
    style = normalized;
    const nextPreset = normalized.hudPreset;

    if (previousPreset === "full" && nextPreset !== "full") {
      clearHeldSets();
    }
    if (previousPreset !== "full" && nextPreset === "full") {
      clearHeldSets();
      keySlot = null;
      mouseSlot = null;
      clearKeyIdleTimer();
      clearMouseIdleTimer();
    }

    // Use nextPreset (not derived `isFull`) so re-arming is deterministic in this sync path.
    if (nextPreset !== "full") {
      if (keySlot !== null) armKeyIdle();
      if (mouseSlot !== null) armMouseIdle();
    }
    if (statusActive) armStatusIdle();
  }

  function applyFullHeld(chip: HudChip) {
    if (chip.kind === "key") {
      const next = new Set(heldKeyIds);
      if (chip.phase === "down") next.add(chip.key.id);
      else next.delete(chip.key.id);
      heldKeyIds = next;
      return;
    }
    const next = new Set(heldMouseButtons);
    if (chip.phase === "down") next.add(chip.button);
    else next.delete(chip.button);
    heldMouseButtons = next;
  }

  function showChip(chip: HudChip) {
    if (isFull) {
      clearStatusIdleTimer();
      clearStatus();
      applyFullHeld(chip);
      return;
    }

    // Text / Lite: ignore ups and bare-modifier downs.
    if (chip.phase === "up") return;
    if (chip.kind === "key" && isModifierKeyId(chip.key.id)) return;

    if (chip.kind === "key") {
      clearStatusIdleTimer();
      clearStatus();
      keySlot = chip;
      armKeyIdle();
      return;
    }
    clearStatusIdleTimer();
    clearStatus();
    mouseSlot = chip;
    armMouseIdle();
  }

  function showCaptureUnavailable() {
    keySlot = null;
    mouseSlot = null;
    clearHeldSets();
    clearKeyIdleTimer();
    clearMouseIdleTimer();
    statusActive = true;
    armStatusIdle();
  }

  return {
    get keySlot() {
      return keySlot;
    },
    get mouseSlot() {
      return mouseSlot;
    },
    get statusActive() {
      return statusActive;
    },
    get style() {
      return style;
    },
    get isFull() {
      return isFull;
    },
    get activeKeyIds() {
      return activeKeyIds;
    },
    get mouseActiveButtons() {
      return mouseActiveButtons;
    },
    get showKeyboardMap() {
      return showKeyboardMap;
    },
    get showKeyCards() {
      return showKeyCards;
    },
    get showMouseSchematic() {
      return showMouseSchematic;
    },
    get showKeySide() {
      return showKeySide;
    },
    get showMouseSide() {
      return showMouseSide;
    },
    get showKmGroup() {
      return showKmGroup;
    },
    applyStyle,
    showChip,
    showCaptureUnavailable,
    clearAllIdleTimers,
  };
}

export type HudSlots = ReturnType<typeof createHudSlots>;
