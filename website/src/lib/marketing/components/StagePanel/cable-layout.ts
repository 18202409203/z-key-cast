export type CablePoint = { x: number; y: number };

export type CableGeo = {
  w: number;
  h: number;
  kb: string;
  ms: string;
  kbJack: CablePoint;
  msJack: CablePoint;
  kbPort: CablePoint;
  msPort: CablePoint;
};

/** Orthogonal USB cable paths from desk devices to the monitor base (rig-local px). */
export function measureCableGeo(
  rig: HTMLElement,
  base: HTMLElement,
  kb: HTMLElement,
  ms: HTMLElement,
): CableGeo | null {
  const r = rig.getBoundingClientRect();
  const b = base.getBoundingClientRect();
  const k = kb.getBoundingClientRect();
  const m = ms.getBoundingClientRect();
  if (r.width < 8 || r.height < 8) return null;

  // Monitor base USB ports (center underside).
  const kbPort = {
    x: b.left + b.width * 0.42 - r.left,
    y: b.bottom - r.top,
  };
  const msPort = {
    x: b.left + b.width * 0.58 - r.left,
    y: b.bottom - r.top,
  };
  // Keyboard top near F12 (right of letter block, before numpad).
  const kbJack = {
    x: k.left + k.width * 0.62 - r.left,
    y: k.top - r.top + 2,
  };
  // Mouse top-center.
  const msJack = {
    x: m.left + m.width * 0.5 - r.left,
    y: m.top - r.top + 2,
  };
  // Horizontal run in the gap above the desk pad (matches the red sketch).
  const deskTop = k.top - r.top;
  const runY = kbPort.y + (deskTop - kbPort.y) * 0.55;

  const ortho = (jack: CablePoint, port: CablePoint) =>
    `M ${jack.x.toFixed(1)} ${jack.y.toFixed(1)} V ${runY.toFixed(1)} H ${port.x.toFixed(1)} V ${port.y.toFixed(1)}`;

  return {
    w: r.width,
    h: r.height,
    kb: ortho(kbJack, kbPort),
    ms: ortho(msJack, msPort),
    kbJack,
    msJack,
    kbPort,
    msPort,
  };
}

export type RigFit = {
  scale: number;
  slotHeight: number | null;
};

/** Shrink `.rig` when layout height exceeds the stage panel budget. */
export function computeRigFit(
  panel: HTMLElement,
  rig: HTMLElement,
): RigFit | null {
  const caption = panel.querySelector(".stage-caption");
  const captionH = caption?.getBoundingClientRect().height ?? 0;
  const styles = getComputedStyle(panel);
  const padY =
    (parseFloat(styles.paddingTop) || 0) +
    (parseFloat(styles.paddingBottom) || 0);
  const gap = 12;
  // Budget from viewport — not panel.clientHeight (content overflow grows the panel).
  const viewportH =
    window.innerHeight || document.documentElement.clientHeight;
  const budget = viewportH - padY - captionH - gap;
  if (budget < 80) return null;

  // offsetHeight is pre-transform layout size (safe while scaled).
  const natural = rig.offsetHeight;
  if (natural < 8) return null;

  const scale = natural > budget ? Math.max(0.45, budget / natural) : 1;
  const slotHeight = scale < 1 ? natural * scale : null;
  return { scale, slotHeight };
}
