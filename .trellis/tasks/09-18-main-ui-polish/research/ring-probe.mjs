#!/usr/bin/env node
/**
 * 2x device-pixel radial probe for the `layout="fill"` choice-card selected ring.
 *
 * Renders research/selected-ring-repro.html in headless Chrome at
 * `--force-device-scale-factor=2` (real Retina device pixels), decodes the PNG
 * with zlib (no deps) and reports, for every probe frame:
 *
 *   - geometry (getBoundingClientRect + border width + radius) from `--dump-dom`
 *   - radial RGB sequences at 0 / 45 / 90 deg from the corner-arc centre
 *   - the straight left-edge horizontal scan (hard-transition check)
 *   - all four corner diagonals (45 deg) compared bit-exactly with the
 *     `${appearance}-ref` probe (selected ring, no art = ideal border profile)
 *   - an optional classified corner map
 *
 * Classification of a device pixel: `A` = solid accent; `<b|i|n|a>` = pure page
 * background / `--app-inset` / `--app-control-border` / art; `<digit><letter>` =
 * accent blended over that neighbour with coverage digit/9 (e.g. `6g` = 60%
 * accent over the page background). `?` = not explainable as accent over any
 * known token (usually the art's own antialiased detail).
 *
 * Usage: node ring-probe.mjs [--html path] [--png path] [--maps a,b]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import zlib from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const CHROME =
  arg("--chrome") || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const HTML = arg("--html") || path.join(here, "selected-ring-repro.html");
const PNG = arg("--png") || "/tmp/selected-ring-repro@2x.png";
const MAPS = (arg("--maps") || "").split(",").filter(Boolean);
const DSF = 2;
const WIN = [900, 500];

// ---------------------------------------------------------------- render ----
const chromeArgs = [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--force-device-scale-factor=${DSF}`,
  `--window-size=${WIN[0]},${WIN[1]}`,
];
const url = `file://${HTML}`;
const dom = execFileSync(CHROME, [...chromeArgs, "--dump-dom", url], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
execFileSync(CHROME, [...chromeArgs, `--screenshot=${PNG}`, url], { encoding: "utf8" });

const geoRaw = /<pre id="geo"[^>]*>([\s\S]*?)<\/pre>/.exec(dom)?.[1]
  ?.replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");
if (!geoRaw) throw new Error("geometry dump not found in --dump-dom output");

const probes = new Map();
for (const line of geoRaw.trim().split("\n")) {
  const [name, left, top, width, height, borderTop, radius] = line.split(" ");
  probes.set(name, {
    left: +left,
    top: +top,
    width: +width,
    height: +height,
    borderTop: parseFloat(borderTop),
    radius: parseFloat(radius),
  });
}

// ------------------------------------------------------------- decode png ---
function decodePng(file) {
  const buf = readFileSync(file);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a png");
  let pos = 8;
  let ihdr = null;
  let plte = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "PLTE") plte = Buffer.from(data);
    pos += 12 + len;
  }
  if (ihdr.interlace !== 0) throw new Error("interlaced png unsupported");
  if (ihdr.depth !== 8) throw new Error(`bit depth ${ihdr.depth} unsupported`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ihdr.colorType];
  if (!channels) throw new Error(`color type ${ihdr.colorType} unsupported`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.width * channels;
  const out = Buffer.alloc(ihdr.height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < ihdr.height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev[i];
      const c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
    cur.copy(out, y * stride);
    prev = cur;
  }

  const rgb = new Uint8Array(ihdr.width * ihdr.height * 3);
  const pal = (i) => (plte ? [plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2]] : [0, 0, 0]);
  for (let i = 0; i < ihdr.width * ihdr.height; i++) {
    const s = i * channels;
    let r, g, b;
    if (ihdr.colorType === 3) [r, g, b] = pal(out[s]);
    else if (ihdr.colorType === 0 || ihdr.colorType === 4) r = g = b = out[s];
    else [r, g, b] = [out[s], out[s + 1], out[s + 2]];
    rgb[i * 3] = r;
    rgb[i * 3 + 1] = g;
    rgb[i * 3 + 2] = b;
  }
  return { width: ihdr.width, height: ihdr.height, rgb };
}

const img = decodePng(PNG);
const at = (x, y) => {
  const i = (y * img.width + x) * 3;
  return [img.rgb[i], img.rgb[i + 1], img.rgb[i + 2]];
};
const hex = (p) => "#" + p.map((v) => v.toString(16).padStart(2, "0")).join("");

// ------------------------------------------------------------- classify -----
const TOKENS = {
  light: {
    bg: [255, 255, 255],
    inset: [242, 242, 247],
    border: [209, 209, 214],
    art: [255, 255, 255],
    accent: [0, 122, 255],
  },
  dark: {
    bg: [28, 28, 30],
    inset: [44, 44, 46],
    border: [72, 72, 74],
    art: [28, 28, 30],
    accent: [10, 132, 255],
  },
};
const TAG = { bg: "g", inset: "i", border: "n", art: "a" };

function makeClassifier(ap, opts = {}) {
  const T = { ...TOKENS[ap] };
  // disabled cards are composited at `opacity: .55` over the page background
  if (opts.dim) T.accent = T.accent.map((v, i) => Math.round(0.55 * v + 0.45 * T.bg[i]));
  const fit = (p) => {
    let best = null;
    for (const n of Object.keys(TAG)) {
      const N = T[n];
      const A = T.accent;
      let num = 0;
      let den = 0;
      for (let i = 0; i < 3; i++) {
        num += (p[i] - N[i]) * (A[i] - N[i]);
        den += (A[i] - N[i]) ** 2;
      }
      const a = den ? Math.max(0, Math.min(1, num / den)) : 0;
      let err = 0;
      for (let i = 0; i < 3; i++) err += (p[i] - (a * A[i] + (1 - a) * N[i])) ** 2;
      err = Math.sqrt(err / 3);
      if (!best || err < best.err) best = { a, n, err };
    }
    return best;
  };
  const cls = (p) => {
    const f = fit(p);
    if (f.err > 6) return "?";
    if (f.a >= 0.97) return "A";
    if (f.a <= 0.03) return TAG[f.n];
    return `${Math.round(f.a * 9)}${TAG[f.n]}`;
  };
  return { fit, cls };
}

// ----------------------------------------------------------------- report ---
const corners = {
  tl: { fx: -1, fy: -1, X: "left", Y: "top" },
  tr: { fx: 1, fy: -1, X: "right", Y: "top" },
  bl: { fx: -1, fy: 1, X: "left", Y: "bottom" },
  br: { fx: 1, fy: 1, X: "right", Y: "bottom" },
};

const arcCentre = (g, corner) => {
  const c = corners[corner];
  return {
    cx: (c.X === "left" ? g.left + g.radius : g.left + g.width - g.radius) * DSF,
    cy: (c.Y === "top" ? g.top + g.radius : g.top + g.height - g.radius) * DSF,
    ...c,
  };
};

/**
 * Radial profile sampled at pixel *centres*: a pixel index i covers [i, i+1) in
 * device px, so the sample for a point X is `floor(X)` and its radial distance
 * is that of the pixel centre (i + 0.5). Every pixel the ray crosses is listed
 * once, ascending in `re`, so profiles from different corners line up.
 */
const profile = (g, corner, deg) => {
  const { cx, cy, fx, fy } = arcCentre(g, corner);
  const rad = (deg * Math.PI) / 180;
  const dx = fx * Math.cos(rad);
  const dy = fy * Math.sin(rad);
  const seen = new Set();
  const out = [];
  for (let step = 2; step <= 42; step += 0.25) {
    const ix = Math.floor(cx + dx * step);
    const iy = Math.floor(cy + dy * step);
    if (ix < 0 || iy < 0 || ix >= img.width || iy >= img.height) continue;
    const key = `${ix},${iy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ix,
      iy,
      re: (ix + 0.5 - cx) * dx + (iy + 0.5 - cy) * dy,
      p: at(ix, iy),
    });
  }
  return { cx, cy, dx, dy, samples: out.sort((a, b) => a.re - b.re) };
};

/** Scan of one straight edge, 20 dev px away from the nearest arc centre. */
const edgeScan = (g, side) => {
  const corner = { left: "tl", right: "tr", top: "tl", bottom: "bl" }[side];
  const { cx, cy } = arcCentre(g, corner);
  const horiz = side === "left" || side === "right";
  const fixed = side === "left" || side === "right" ? Math.floor(cy + 40) : Math.floor(cx + 40);
  const out = [];
  for (let k = -26; k <= 26; k++) {
    const ix = horiz ? Math.floor(cx + k) : fixed;
    const iy = horiz ? fixed : Math.floor(cy + k);
    if (ix < 0 || iy < 0 || ix >= img.width || iy >= img.height) continue;
    out.push({ off: (horiz ? ix + 0.5 - cx : iy + 0.5 - cy), p: at(ix, iy) });
  }
  return out;
};

/** Compact description of a straight-edge scan: the solid run + its neighbours. */
const summarize = (scan, cls) => {
  // |off| is the distance from the nearest arc centre, so left/top (negative off)
  // and right/bottom (positive off) share one description.
  const band = scan.filter((e) => Math.abs(e.off) >= 15.5 && Math.abs(e.off) <= 21.5);
  const solid = band.filter((e) => cls(e.p) === "A" || cls(e.p) === "n");
  const pure = (e) => `${hex(e.p)}${cls(e.p) === "A" ? "" : `[${cls(e.p)}]`}`;
  const inside = scan.filter((e) => Math.abs(e.off) < 15.5).sort((a, b) => Math.abs(b.off) - Math.abs(a.off))[0];
  const outside = scan.filter((e) => Math.abs(e.off) > 21.5).sort((a, b) => Math.abs(a.off) - Math.abs(b.off))[0];
  return (
    `run=${solid.length}px ${solid.length ? `${pure(solid[0])} @ |off| ${Math.abs(solid[0].off).toFixed(1)}..${Math.abs(solid[solid.length - 1].off).toFixed(1)}` : "-"}` +
    ` | inside=${inside ? `${Math.abs(inside.off).toFixed(1)}:${pure(inside)}` : "-"}` +
    ` | outside=${outside ? `${Math.abs(outside.off).toFixed(1)}:${pure(outside)}` : "-"}`
  );
};

// ---------------------------------------------------------------- report ----
console.log(
  `png: ${PNG} ${img.width}x${img.height} (window ${WIN[0]}x${WIN[1]} @ ${DSF}x device scale)`,
);
if (img.width !== WIN[0] * DSF) console.log(`WARN: png width ${img.width} != ${WIN[0] * DSF}`);
console.log(
  "corner quadrant = pixels on the corner side of the arc centre, sampled at pixel centres;\n" +
    `the exact 45deg ray of an integer-positioned corner runs along pixel corners, so the raw\n` +
    `sequences below use 42 / 45 / 48 deg and the annulus metric is angle-independent.`,
);

const G0 = probes.values().next().value; // all probes share the same geometry
const R_IN = Math.round((G0.radius - G0.borderTop) * DSF); // 16: inner edge of the accent band
const R_OUT = Math.round(G0.radius * DSF); // 20: outer edge of the accent band
const D_MIN = R_IN - 3;
const D_MAX = R_OUT + 4;
const fmt = (e, cls) => {
  const tag = cls(e.p);
  const d = (e.re ?? e.off).toFixed(1);
  return `${d}:${hex(e.p)}${tag === "A" ? "" : `[${tag}]`}`;
};

/** Every pixel in the corner quadrant whose centre is 13..24 dev px from the arc centre. */
const annulus = (g, corner) => {
  const { cx, cy, fx, fy } = arcCentre(g, corner);
  const px = [];
  for (let y = Math.floor(cy - 32); y <= Math.floor(cy + 32); y++) {
    for (let x = Math.floor(cx - 32); x <= Math.floor(cx + 32); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const ox = x + 0.5 - cx;
      const oy = y + 0.5 - cy;
      if (ox * fx < 0 || oy * fy < 0) continue; // keep the corner quadrant only
      const d = Math.hypot(ox, oy);
      if (d < D_MIN || d > D_MAX) continue;
      px.push({ x, y, d, p: at(x, y) });
    }
  }
  return px;
};

// tolerance compare for the classification signatures (d, coverage) lists
const closeList = (a, b, tolD = 0.25, tolA = 0.03) =>
  a.length === b.length &&
  a.every((x, i) => Math.abs(x.d - b[i].d) <= tolD && Math.abs(x.a - b[i].a) <= tolA);

const ext = (list, key) => {
  const v = list.map((e) => e[key]);
  return v.length ? `${Math.min(...v).toFixed(1)}..${Math.max(...v).toFixed(1)}` : "-";
};

const refSig = new Map();

for (const [name, g] of probes) {
  const ap = name.startsWith("dark") ? "dark" : "light";
  const { fit, cls } = makeClassifier(ap, { dim: name.endsWith("-disabled") });
  console.log(`\n=== ${name} (${ap}) ===`);
  console.log(
    `  rect ${g.width}x${g.height} css @ (${g.left},${g.top})  border ${g.borderTop}px  radius ${g.radius}px`,
  );

  // 1. straight edges (20 dev px away from the arc centres)
  console.log("  straight edges (solid run of the selected/neutral 2px border):");
  for (const side of ["left", "right", "top", "bottom"])
    console.log(`    ${side.padEnd(6)} ${summarize(edgeScan(g, side), cls)}`);

  // 2. annulus metrics per corner
  const sig = new Map();
  for (const corner of ["tl", "tr", "bl", "br"]) {
    const scored = annulus(g, corner).map((e) => ({ ...e, ...fit(e.p) }));
    const painted = scored.filter((e) => e.err <= 6 && e.a >= 0.1);
    const solid = scored.filter((e) => e.err <= 6 && e.a >= 0.97);
    const graded = scored.filter((e) => e.err <= 6 && e.a > 0.03 && e.a < 0.97);
    const pale = graded.filter((e) => e.a >= 0.25 && e.a <= 0.9);
    // the AC's "washed fringe": diluted accent pixels lying *outside* the ring band
    const fringe = pale.filter((e) => e.d > R_OUT + 0.5);
    const unexpl = scored.filter((e) => e.err > 6);
    sig.set(corner, {
      painted: ext(painted, "d"),
      solid: ext(solid, "d"),
      paintedN: painted.length,
      solidN: solid.length,
      graded: graded.map((e) => e.a.toFixed(2)).sort(),
      paleArr: pale.map((e) => ({ d: e.d, a: e.a })),
      pale: pale.map((e) => `${e.d.toFixed(1)}@${(e.a * 100).toFixed(0)}%`).join(","),
      fringeN: fringe.length,
      fringe: fringe.map((e) => `d${e.d.toFixed(1)}@${(e.a * 100).toFixed(0)}%`).join(","),
      unexplD: unexpl.length
        ? `${Math.min(...unexpl.map((e) => e.d)).toFixed(1)}..${Math.max(...unexpl.map((e) => e.d)).toFixed(1)}`
        : "-",
      dIn: painted.length ? Math.min(...painted.map((e) => e.d)).toFixed(2) : "-",
      dOut: painted.length ? Math.max(...painted.map((e) => e.d)).toFixed(2) : "-",
      solidIn: solid.length ? Math.min(...solid.map((e) => e.d)).toFixed(2) : "-",
      solidOut: solid.length ? Math.max(...solid.map((e) => e.d)).toFixed(2) : "-",
    });
    const s = sig.get(corner);
    console.log(
      `  ${corner} annulus (band d=${R_IN}..${R_OUT} dev px): painted(>=10% accent) d=${s.painted} ` +
        `(${s.paintedN}px)  solid d=${s.solid} (${s.solidN}px)  graded=${s.graded.length}px  ` +
        `fringe(d>${R_OUT + 0.5}, 25-90%) = ${s.fringeN}px`,
    );
    if (s.fringeN)
      console.log(`    fringe pixels: ${s.fringe}\n    (washed 25-90% everywhere in quadrant: ${s.pale})`);
    if (unexpl.length) console.log(`    ${unexpl.length} unexplained px at d=${s.unexplD} (art detail)`);
  }

  // 3. raw RGB sequences, tl corner (three near-diagonal rays + both straight edges)
  for (const deg of [0, 42, 45, 48, 90]) {
    const { samples, cx, cy } = profile(g, "tl", deg);
    const inWin = samples.filter((e) => e.re >= 13.5 && e.re <= 22.5);
    console.log(
      `  tl ray ${deg}deg (arc centre ${cx},${cy}):\n    ` +
        inWin.map((e) => fmt(e, cls)).join(" "),
    );
  }

  // 4. compare with the ideal ring (identical geometry, no art)
  if (refSig.has(ap)) {
    const ref = refSig.get(ap);
    const diffs = [];
    for (const c of ["tl", "tr", "bl", "br"]) {
      const a = ref.get(c);
      const b = sig.get(c);
      const keys = ["dIn", "dOut", "solidIn", "solidOut", "pale"];
      const bad = keys.filter((k) =>
        k === "pale" ? !closeList(a.paleArr, b.paleArr) : a[k] !== b[k],
      );
      if (bad.length)
        diffs.push(
          `${c}: ` +
            bad
              .map((k) =>
                k === "pale"
                  ? `washed pixels ${a.paleArr.length}→${b.paleArr.length}`
                  : `${k} ${a[k]}→${b[k]}`,
              )
              .join(" "),
        );
    }
    console.log(
      `  vs ${ap}-ref (ideal accent ring, no art): ` +
        (diffs.length === 0
          ? "identical (band, solid core, painted extent and washed pixels)"
          : `differs at ${diffs.join(" | ")}`),
    );
  }
  if (name.endsWith("-ref")) refSig.set(ap, sig);

  // 5. optional classified corner map (tl)
  if (MAPS.includes(name)) {
    const { cx, cy } = arcCentre(g, "tl");
    console.log("  tl corner map (2 chars/px, x right, y down, origin = arc centre - 26):");
    for (let y = Math.round(cy - 26); y <= Math.round(cy - 2); y++) {
      let line = "    ";
      for (let x = Math.round(cx - 26); x <= Math.round(cx - 2); x++)
        line += cls(at(x, y)).padEnd(2);
      console.log(line.trimEnd());
    }
  }
}
