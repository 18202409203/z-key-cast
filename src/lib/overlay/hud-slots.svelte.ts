import {
  isModifierKeyId,
  SCROLL_PULSE_MS,
  type HudChip,
  type ScrollDirection,
} from "$lib/cast";
import {
  DEFAULT_HUD_STYLE,
  normalizeHudStyleSettings,
  type HudPreset,
  type HudStyleSettings,
} from "$lib/settings";

type MouseButton = Extract<HudChip, { kind: "mouse" }>["button"];

export type TimelineChip = Extract<
  HudChip,
  { kind: "key" | "mouse" | "scroll" }
>;

export type TimelineItem = {
  id: string;
  chip: TimelineChip;
};

const TIMELINE_MAX = 5;

/**
 * Overlay HUD slot / timer / held-set state. Instantiated once by the overlay route.
 * Owns style for dwell and preset side effects (single writer).
 */
export function createHudSlots() {
  let timeline = $state<TimelineItem[]>([]);
  let heldKeyIds = $state<Set<string>>(new Set());
  let heldMouseButtons = $state<Set<MouseButton>>(new Set());
  /** Full wheel-tick pulse — orthogonal to button held-set. */
  let scrollPulse = $state<{ direction: ScrollDirection; nonce: number } | null>(
    null,
  );
  /** When true, overlay shows capture-unavailable status (re-translated on locale change). */
  let statusActive = $state(false);
  let style = $state<HudStyleSettings>({ ...DEFAULT_HUD_STYLE });
  const itemTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let statusIdleTimer: ReturnType<typeof setTimeout> | null = null;
  let scrollPulseTimer: ReturnType<typeof setTimeout> | null = null;
  let nextItemId = 0;

  const hudPreset = $derived<HudPreset>(style.hudPreset ?? "text");
  const isFull = $derived(hudPreset === "full");
  const isLite = $derived(hudPreset === "lite");

  const activeKeyIds = $derived.by(() => {
    if (isFull) return heldKeyIds;
    return new Set<string>();
  });

  const mouseActiveButtons = $derived.by(() => {
    if (isFull) return heldMouseButtons;
    return new Set<MouseButton>();
  });

  const scrollDirection = $derived<ScrollDirection | null>(
    scrollPulse?.direction ?? null,
  );
  const scrollPulseNonce = $derived(scrollPulse?.nonce ?? 0);

  const showKeyboardMap = $derived(isFull);
  const showMouseSchematic = $derived(isFull);

  /** Full always shows boards; Text/Lite keep the timeline host mounted so last-item outro can finish. */
  const showKmGroup = $derived(!statusActive);

  function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
    if (timer !== null) clearTimeout(timer);
  }

  function clearStatusIdleTimer() {
    clearTimer(statusIdleTimer);
    statusIdleTimer = null;
  }

  function clearScrollPulseTimer() {
    clearTimer(scrollPulseTimer);
    scrollPulseTimer = null;
  }

  function clearItemTimer(id: string) {
    const timer = itemTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      itemTimers.delete(id);
    }
  }

  function clearAllItemTimers() {
    for (const timer of itemTimers.values()) clearTimeout(timer);
    itemTimers.clear();
  }

  function clearTimeline() {
    clearAllItemTimers();
    timeline = [];
  }

  function clearAllIdleTimers() {
    clearAllItemTimers();
    clearStatusIdleTimer();
    clearScrollPulseTimer();
  }

  function clearHeldSets() {
    heldKeyIds = new Set();
    heldMouseButtons = new Set();
  }

  function armItemIdle(id: string) {
    clearItemTimer(id);
    if (isFull) return;
    itemTimers.set(
      id,
      setTimeout(() => {
        itemTimers.delete(id);
        timeline = timeline.filter((item) => item.id !== id);
      }, style.dwellMs),
    );
  }

  function armScrollPulse(direction: ScrollDirection) {
    clearScrollPulseTimer();
    const nonce = (scrollPulse?.nonce ?? 0) + 1;
    scrollPulse = { direction, nonce };
    scrollPulseTimer = setTimeout(() => {
      scrollPulse = null;
      scrollPulseTimer = null;
    }, SCROLL_PULSE_MS);
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

  function pushTimelineChip(chip: TimelineChip) {
    const id = `t${nextItemId++}`;
    let next = [...timeline, { id, chip }];
    while (next.length > TIMELINE_MAX) {
      const dropped = next[0];
      if (dropped) clearItemTimer(dropped.id);
      next = next.slice(1);
    }
    timeline = next;
    armItemIdle(id);
  }

  function applyStyle(next: HudStyleSettings) {
    const previousPreset = style.hudPreset ?? "text";
    const normalized = normalizeHudStyleSettings(next);
    style = normalized;
    const nextPreset = normalized.hudPreset;

    if (previousPreset === "full" && nextPreset !== "full") {
      clearHeldSets();
      scrollPulse = null;
      clearScrollPulseTimer();
      clearTimeline();
    }
    if (previousPreset !== "full" && nextPreset === "full") {
      clearHeldSets();
      clearTimeline();
      scrollPulse = null;
      clearScrollPulseTimer();
    }

    // Use nextPreset (not derived `isFull`) so re-arming is deterministic in this sync path.
    if (nextPreset !== "full") {
      for (const item of timeline) {
        armItemIdle(item.id);
      }
    }
    if (statusActive) armStatusIdle();
  }

  function applyFullHeld(chip: Extract<HudChip, { kind: "key" | "mouse" }>) {
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
      if (chip.kind === "scroll") {
        armScrollPulse(chip.direction);
        return;
      }
      applyFullHeld(chip);
      return;
    }

    // Text / Lite: ignore ups and bare-modifier downs.
    if (chip.kind === "key" || chip.kind === "mouse") {
      if (chip.phase === "up") return;
      if (chip.kind === "key" && isModifierKeyId(chip.key.id)) return;
    }

    clearStatusIdleTimer();
    clearStatus();

    if (chip.kind === "scroll") {
      const tail = timeline[timeline.length - 1];
      if (
        tail &&
        tail.chip.kind === "scroll" &&
        tail.chip.direction === chip.direction
      ) {
        armItemIdle(tail.id);
        return;
      }
      pushTimelineChip(chip);
      return;
    }

    pushTimelineChip(chip);
  }

  function showCaptureUnavailable() {
    clearTimeline();
    scrollPulse = null;
    clearHeldSets();
    clearScrollPulseTimer();
    statusActive = true;
    armStatusIdle();
  }

  return {
    get timeline() {
      return timeline;
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
    get isLite() {
      return isLite;
    },
    get activeKeyIds() {
      return activeKeyIds;
    },
    get mouseActiveButtons() {
      return mouseActiveButtons;
    },
    get scrollDirection() {
      return scrollDirection;
    },
    get scrollPulseNonce() {
      return scrollPulseNonce;
    },
    get showKeyboardMap() {
      return showKeyboardMap;
    },
    get showMouseSchematic() {
      return showMouseSchematic;
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
