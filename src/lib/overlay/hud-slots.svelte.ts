import {
  isModifierKeyId,
  SCROLL_PULSE_MS,
  type HudChip,
  type KeyRef,
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

function sameModIds(a: KeyRef[], b: KeyRef[]): boolean {
  if (a.length !== b.length) return false;
  const left = a.map((m) => m.id).slice().sort();
  const right = b.map((m) => m.id).slice().sort();
  return left.every((id, i) => id === right[i]);
}

function modIdsOnChip(chip: TimelineChip): string[] {
  const ids = chip.mods.map((m) => m.id);
  if (chip.kind === "key" && isModifierKeyId(chip.key.id)) {
    ids.push(chip.key.id);
  }
  return ids;
}

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
  /** Text/Lite: modifier ids consumed by a companion chord this down-cycle. */
  let consumedModIds = new Set<string>();
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

  function clearConsumedMods() {
    consumedModIds = new Set();
  }

  function consumeModsFromChip(chip: TimelineChip) {
    for (const id of modIdsOnChip(chip)) {
      consumedModIds.add(id);
    }
  }

  function clearTimeline() {
    clearAllItemTimers();
    timeline = [];
    clearConsumedMods();
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
    const max = style.timelineMax ?? 5;
    let next = [...timeline, { id, chip }];
    while (next.length > max) {
      const dropped = next[0];
      if (dropped) clearItemTimer(dropped.id);
      next = next.slice(1);
    }
    timeline = next;
    armItemIdle(id);
  }

  function trimTimelineToMax(max: number) {
    if (timeline.length <= max) return;
    let next = [...timeline];
    while (next.length > max) {
      const dropped = next[0];
      if (dropped) clearItemTimer(dropped.id);
      next = next.slice(1);
    }
    timeline = next;
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

    // Shrinking N drops oldest immediately (same as enqueue overflow).
    if (nextPreset !== "full") {
      trimTimelineToMax(normalized.timelineMax);
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

    // Text / Lite: deferred modifier commit (down never queues; unconsumed up synthesizes).
    if (chip.kind === "key" && isModifierKeyId(chip.key.id)) {
      if (chip.phase === "down") {
        consumedModIds.delete(chip.key.id);
        return;
      }
      // Modifier up: silent if already consumed by a companion / stacked-mod synth.
      if (consumedModIds.has(chip.key.id)) {
        consumedModIds.delete(chip.key.id);
        return;
      }
      const displayChip: TimelineChip = {
        kind: "key",
        mods: chip.mods,
        key: chip.key,
        phase: "down",
      };
      clearStatusIdleTimer();
      clearStatus();
      consumeModsFromChip(displayChip);
      pushTimelineChip(displayChip);
      return;
    }

    // Non-mod key ups and mouse ups stay off the timeline.
    if ((chip.kind === "key" || chip.kind === "mouse") && chip.phase === "up") {
      return;
    }

    clearStatusIdleTimer();
    clearStatus();

    if (chip.kind === "scroll") {
      const tail = timeline[timeline.length - 1];
      if (
        tail &&
        tail.chip.kind === "scroll" &&
        tail.chip.direction === chip.direction &&
        sameModIds(tail.chip.mods, chip.mods)
      ) {
        consumeModsFromChip(chip);
        armItemIdle(tail.id);
        return;
      }
      consumeModsFromChip(chip);
      pushTimelineChip(chip);
      return;
    }

    consumeModsFromChip(chip);
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
