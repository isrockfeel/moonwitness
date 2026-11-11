// Saksi pens: expand centerline skeletons into filled outlines.
// mono = bevel joins + square caps (technical), marker = fat round-joined
// strokes with wobble/tooth (zine), hand = slanted monoline with bounce.
// Original work, (c) 2026 MoonWitness. See LICENSE.txt.

import polygonClipping from "polygon-clipping";

// Union of same-winding rings. Input geometry must avoid exact tangencies
// (see skeletons.mjs); a tiny nudge retry covers residual numeric degeneracy.
function unionRings(allRings) {
  const asPolys = (rings) => rings.map((r) => [r]);
  let multi;
  try {
    multi = polygonClipping.union(asPolys(allRings));
  } catch {
    const rand = rng(0x5eed);
    const nudged = allRings.map((r) =>
      r.map(([x, y]) => [x + (rand() - 0.5) * 0.3, y + (rand() - 0.5) * 0.3]),
    );
    multi = polygonClipping.union(asPolys(nudged));
  }
  const rings = [];
  for (const poly of multi) {
    poly.forEach((ring, idx) => rings.push(orient(ring, idx === 0)));
  }
  return rings;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const len = (a) => Math.hypot(a[0], a[1]);
const norm = (a) => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l];
};
const left = (d) => [-d[1], d[0]];

function area(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

const orient = (ring, cw) => (area(ring) < 0 === cw ? ring : ring.slice().reverse());

function resample(pts, maxLen) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = len(sub(b, a));
    const n = Math.max(1, Math.ceil(d / maxLen));
    for (let j = 1; j <= n; j++) out.push(add(a, mul(sub(b, a), j / n)));
  }
  return out;
}

// Smooth 1-D value noise along arc length, period ~wavelength.
function makeNoise(rand, wavelength) {
  const phase = rand() * Math.PI * 2;
  const phase2 = rand() * Math.PI * 2;
  const w1 = wavelength * (0.8 + rand() * 0.4);
  const w2 = wavelength * 0.47 * (0.8 + rand() * 0.4);
  return (s) => Math.sin(s / w1 + phase) * 0.65 + Math.sin(s / w2 + phase2) * 0.35;
}

function circle(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function hull(points) {
  const c = points.reduce((acc, p) => add(acc, p), [0, 0]).map((v) => v / points.length);
  return points
    .map((p) => ({ p, a: Math.atan2(p[1] - c[1], p[0] - c[0]) }))
    .sort((x, y) => x.a - y.a)
    .map((x) => x.p);
}

// Expand one polyline stroke into a list of same-winding rings whose union
// is the stroke. Variable half-widths h[i] allow pressure variation.
function expandStroke(pts, h, { cap, join, closed }) {
  const rings = [];
  const n = pts.length;
  const segCount = closed ? n : n - 1;
  const dirs = [];
  for (let i = 0; i < segCount; i++) {
    dirs.push(norm(sub(pts[(i + 1) % n], pts[i])));
  }
  const joinN = Math.max(10, Math.min(24, Math.round(h[0] / 4)));
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const d = dirs[i];
    const nn = left(d);
    // Overlap consecutive quads by 0.5u: edge-adjacent (non-overlapping) input
    // paths trigger Clipper's DoMaxima bug.
    const a2 = sub(a, mul(d, 0.5));
    const b2 = add(b, mul(d, 0.5));
    rings.push([
      add(a2, mul(nn, h[i])),
      add(b2, mul(nn, h[(i + 1) % n])),
      add(b2, mul(nn, -h[(i + 1) % n])),
      add(a2, mul(nn, -h[i])),
    ]);
  }
  const joinAt = (i) => {
    const p = pts[i];
    const d1 = dirs[(i - 1 + segCount) % segCount];
    const d2 = dirs[i % segCount];
    const h1 = h[(i - 1 + n) % n];
    const h2 = h[i];
    const r = Math.max(h1, h2);
    if (join === "round") {
      rings.push(circle(p[0], p[1], r, joinN));
    } else {
      const n1 = left(d1);
      const n2 = left(d2);
      rings.push(
        hull([
          add(p, mul(n1, h1)),
          add(p, mul(n1, -h1)),
          add(p, mul(n2, h2)),
          add(p, mul(n2, -h2)),
        ]),
      );
    }
  };
  if (closed) {
    for (let i = 0; i < n; i++) joinAt(i);
  } else {
    for (let i = 1; i < n - 1; i++) joinAt(i);
    const capAt = (p, d, hh, forward) => {
      const nn = left(d);
      if (cap === "round") {
        rings.push(circle(p[0], p[1], hh, joinN));
      } else if (cap === "square") {
        const e = mul(d, forward ? hh : -hh);
        rings.push([
          add(p, mul(nn, hh)),
          add(add(p, e), mul(nn, hh)),
          add(add(p, e), mul(nn, -hh)),
          add(p, mul(nn, -hh)),
        ]);
      }
    };
    capAt(pts[0], dirs[0], h[0], false);
    capAt(pts[n - 1], dirs[segCount - 1], h[n - 1], true);
  }
  return rings.map((r) => orient(r, true));
}

function simplify(ring, tol = 0.6) {
  if (ring.length < 4) return ring;
  const out = [];
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[(i - 1 + n) % n];
    const b = ring[i];
    const c = ring[(i + 1) % n];
    const ab = sub(b, a);
    const ac = sub(c, a);
    const dist = Math.abs(ab[0] * ac[1] - ab[1] * ac[0]) / (len(ab) || 1);
    if (dist > tol || len(sub(b, a)) < 1e-6) out.push(b);
  }
  return out.length >= 3 ? out : ring;
}

// Roughen an outline edge with small perpendicular noise (marker tooth).
function tooth(ring, rand, amp, step) {
  const noise = makeNoise(rand, step * 3.2);
  const out = [];
  let s = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const d = sub(b, a);
    const l = len(d);
    const nn = left(norm(d));
    const j0 = (rand() - 0.5) * amp;
    out.push(add(a, mul(nn, j0)));
    const pieces = Math.max(1, Math.round(l / step));
    for (let j = 1; j < pieces; j++) {
      const t = j / pieces;
      const p = add(a, mul(d, t));
      out.push(add(p, mul(nn, noise(s + l * t) * amp)));
    }
    s += l;
  }
  return out;
}

export const PENS = {
  mono: {
    widths: { 400: 84, 700: 126 },
    cap: "square",
    join: "bevel",
    wobble: 0,
    pressure: 0,
    tooth: 0,
    slant: 0,
    rotate: 0,
    bounce: 0,
    sidebearing: 0,
    fixed: 600,
  },
  marker: {
    widths: { 400: 150, 700: 178 },
    cap: "square",
    join: "round",
    wobble: 5,
    pressure: 0.07,
    tooth: 2.8,
    slant: 0,
    rotate: 2.4,
    bounce: 9,
    sidebearing: 42,
    fixed: 0,
    space: 300,
  },
  hand: {
    widths: { 400: 58, 700: 82 },
    cap: "round",
    join: "round",
    wobble: 2.5,
    pressure: 0.12,
    tooth: 0,
    slant: Math.tan((9 * Math.PI) / 180),
    rotate: 2.2,
    bounce: 13,
    sidebearing: 32,
    fixed: 0,
    space: 260,
    taper: 0.85,
  },
};

// Build outline rings for one glyph with a given pen/weight.
// Returns { rings, bbox, advance }.
export function drawGlyph(char, def, penName, weight, { slashedZero = false } = {}) {
  const pen = PENS[penName];
  const w = pen.widths[weight];
  const rand = rng(hashStr(char) ^ (weight * 7919) ^ hashStr(penName));

  let strokes = def.slashed && slashedZero ? def.slashed : def.strokes;
  if (def.fill) {
    const rings = def.fill.map((r) => orient(r, true));
    return finish(rings, char, pen, weight, rand, def.adv);
  }
  if (!strokes || strokes.length === 0) {
    return { rings: [], bbox: null, advance: def.adv ?? pen.fixed ?? pen.space };
  }

  // Slant (hand) before expansion.
  if (pen.slant) strokes = strokes.map((st) => st.map(([x, y]) => [x + y * pen.slant, y]));

  const allRings = [];
  for (const raw of strokes) {
    const closed = len(sub(raw[0], raw[raw.length - 1])) < 1e-6;
    let pts = closed ? raw.slice(0, -1) : raw.slice();
    if (pts.length < 2) pts = [pts[0], add(pts[0], [0.01, 0])];
    pts = resample(pts, 26);
    const n = pts.length;

    // Arc-length table for wobble/pressure.
    const s = [0];
    for (let i = 1; i < n; i++) s.push(s[i - 1] + len(sub(pts[i], pts[i - 1])));
    const total = s[n - 1] || 1;

    const wob = pen.wobble ? makeNoise(rand, 110) : null;
    const pres = pen.pressure ? makeNoise(rand, 160) : null;

    // Displace centerline perpendicular to local direction.
    if (wob) {
      const moved = pts.map((p, i) => {
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(n - 1, i + 1)];
        const nn = left(norm(sub(next, prev)));
        return add(p, mul(nn, wob(s[i]) * pen.wobble));
      });
      pts = moved;
    }

    const h = pts.map((_, i) => {
      let hh = w / 2;
      if (pres) hh *= 1 + pres(s[i]) * pen.pressure;
      if (pen.taper && !closed) {
        const edge = Math.min(s[i], total - s[i]);
        hh *= pen.taper + (1 - pen.taper) * Math.min(1, edge / 45);
      }
      return hh;
    });

    allRings.push(...expandStroke(pts, h, { cap: pen.cap, join: pen.join, closed }));
  }

  let unioned;
  try {
    unioned = unionRings(allRings);
  } catch (e) {
    throw new Error(`glyph "${char}" (${penName}/${weight}): ${e.message}`);
  }
  const rings = unioned.map((r) => {
    let s = simplify(r);
    if (pen.tooth) s = tooth(s, rand, pen.tooth, 26);
    return s;
  });
  return finish(rings, char, pen, weight, rand, def.adv);
}

function finish(rings, char, pen, weight, rand, advOverride) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  const hasInk = rings.length > 0;

  // Per-glyph rotation + baseline bounce for the hand-set voices.
  if (hasInk && (pen.rotate || pen.bounce)) {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const ang = ((rand() - 0.5) * 2 * pen.rotate * Math.PI) / 180;
    const dy = (rand() - 0.5) * 2 * pen.bounce;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    rings = rings.map((r) =>
      r.map(([x, y]) => {
        const dx = x - cx;
        const dyy = y - cy;
        return [cx + dx * cos - dyy * sin, cy + dx * sin + dyy * cos + dy];
      }),
    );
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;
    for (const r of rings)
      for (const [x, y] of r) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  }

  let advance;
  if (advOverride != null) advance = advOverride;
  else if (pen.fixed) advance = pen.fixed;
  else if (!hasInk) advance = pen.space;
  else advance = Math.ceil(maxX - minX + pen.sidebearing * 2);

  // Shift so left sidebearing is exact (proportional voices).
  if (hasInk && !pen.fixed && advOverride == null) {
    const dx = pen.sidebearing - minX;
    rings = rings.map((r) => r.map(([x, y]) => [x + dx, y]));
    minX += dx;
    maxX += dx;
  }

  return { rings, bbox: hasInk ? [minX, minY, maxX, maxY] : null, advance };
}
