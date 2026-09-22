/** Snap panels under `.page` — Brand / Stage / Download. */
export function panelList(pageEl: HTMLElement | undefined): HTMLElement[] {
  if (!pageEl) return [];
  return Array.from(pageEl.querySelectorAll<HTMLElement>(":scope > .panel"));
}

export function nearestPanelIndex(pageEl: HTMLElement | undefined): number {
  const panels = panelList(pageEl);
  if (panels.length === 0) return 0;
  const y = window.scrollY;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < panels.length; i++) {
    const dist = Math.abs(panels[i].offsetTop - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Smooth-scroll to a snap panel; returns the clamped index. */
export function scrollToPanel(
  pageEl: HTMLElement | undefined,
  index: number,
): number {
  const panels = panelList(pageEl);
  if (panels.length === 0) return 0;
  const clamped = Math.max(0, Math.min(panels.length - 1, index));
  const target = panels[clamped];
  // scrollTo + snap keeps alignment; smooth helps read as one deliberate step.
  window.scrollTo({ top: target.offsetTop, behavior: "smooth" });
  return clamped;
}
