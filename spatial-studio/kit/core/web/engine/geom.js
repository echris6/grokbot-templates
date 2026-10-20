// Pure 2D geometry for house specs. No three.js, no DOM: imported by the browser engine
// and by the Node tools (validate-spec.mjs, plan-svg.mjs, capture.mjs).
//
// Plan coordinates: metres, x to the right (east), y DOWN the plan (south), like an image.
// three.js mapping: plan (x, y) -> world (x, elevation, y). Furniture rotation is clockwise
// on the plan, in degrees; 0 means the item's front faces +y (down the plan).

export const DEFAULTS = {
  wall_height: 2.7,
  wall_thickness: 0.12,
  exterior_wall_thickness: 0.25,
  eye_height: 1.6,
  door: { width: 0.82, height: 2.04 },
  window: { width: 1.2, height: 1.2, sill: 0.9 },
};

export const FACING_DEG = { S: 0, W: 90, N: 180, E: 270 };

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const mul = (a, s) => [a[0] * s, a[1] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
export const len = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => len(sub(a, b));
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };

export function polygonArea(poly) { // signed (positive = clockwise on the y-down plan)
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

export function cleanPolygon(poly) {
  const p = poly.map((q) => [Number(q[0]), Number(q[1])]);
  if (p.length > 1 && dist(p[0], p[p.length - 1]) < 1e-6) p.pop();
  return p;
}

export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function bbox(points) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

export function segmentsIntersect(a, b, c, d) { // proper crossing only
  const d1 = cross(sub(b, a), sub(c, a)), d2 = cross(sub(b, a), sub(d, a));
  const d3 = cross(sub(d, c), sub(a, c)), d4 = cross(sub(d, c), sub(b, c));
  return d1 * d2 < -1e-12 && d3 * d4 < -1e-12;
}

export function selfIntersects(poly) {
  const n = poly.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
    if (segmentsIntersect(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n])) return true;
  }
  return false;
}

export function closestOnSegment(p, a, b) {
  const ab = sub(b, a);
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
  return { point: add(a, mul(ab, t)), t };
}

// ---------- spec helpers ----------

export function levelOf(spec, i = 0) { return spec.levels[i]; }

export function wallHeight(spec, level, wall) {
  return wall?.height ?? level.height ?? spec.defaults?.wall_height ?? DEFAULTS.wall_height;
}

export function wallThickness(spec, wall) {
  if (wall.thickness) return wall.thickness;
  return wall.exterior
    ? spec.defaults?.exterior_wall_thickness ?? DEFAULTS.exterior_wall_thickness
    : spec.defaults?.wall_thickness ?? DEFAULTS.wall_thickness;
}

export function wallFrame(wall) {
  const a = wall.a, b = wall.b;
  const d = norm(sub(b, a));
  return { a, b, d, n: [-d[1], d[0]], L: dist(a, b), angle: Math.atan2(d[1], d[0]) };
}

export function openingDims(o, spec) {
  const def = o.type === 'window' ? DEFAULTS.window : DEFAULTS.door;
  const isWin = o.type === 'window';
  const height = o.height ?? (o.type === 'sliding' ? 2.1 : def.height);
  return {
    width: o.width ?? (o.type === 'sliding' ? 2.4 : def.width),
    height,
    sill: o.sill ?? (isWin ? def.sill : 0),
  };
}

/** Split a wall into solid pieces around its openings. Returns pieces in wall-local
 *  coordinates: s0..s1 along the wall from `a`, z0..z1 in height. */
export function wallPieces(spec, level, wall) {
  const { L } = wallFrame(wall);
  const H = wallHeight(spec, level, wall);
  const ops = (level.openings || [])
    .filter((o) => o.wall === wall.id)
    .map((o) => ({ o, ...openingDims(o, spec) }))
    .map((x) => ({ ...x, s0: x.o.offset - x.width / 2, s1: x.o.offset + x.width / 2 }))
    .sort((p, q) => p.s0 - q.s0);
  const pieces = [];
  let s = 0;
  for (const op of ops) {
    if (op.s0 > s + 1e-6) pieces.push({ s0: s, s1: op.s0, z0: 0, z1: H, kind: 'solid' });
    if (op.sill > 1e-6) pieces.push({ s0: op.s0, s1: op.s1, z0: 0, z1: op.sill, kind: 'sill', opening: op.o.id });
    const head = op.sill + op.height;
    if (head < H - 1e-6) pieces.push({ s0: op.s0, s1: op.s1, z0: head, z1: H, kind: 'head', opening: op.o.id });
    s = Math.max(s, op.s1);
  }
  if (s < L - 1e-6) pieces.push({ s0: s, s1: L, z0: 0, z1: H, kind: 'solid' });
  return { pieces, openings: ops, L, H };
}

/** Which room a plan point lies in (first match), or null. */
export function roomAt(level, pt) {
  for (const r of level.rooms || []) if (pointInPolygon(pt, cleanPolygon(r.polygon))) return r;
  return null;
}

/** Find the wall that carries a polygon edge (collinear, overlapping). Returns
 *  { wall, covered } where covered is the overlapping length. */
export function wallsOnEdge(level, p, q, tol = 0.03) {
  const e = sub(q, p), eL = len(e), ed = mul(e, 1 / (eL || 1));
  const out = [];
  for (const w of level.walls || []) {
    const wd = norm(sub(w.b, w.a));
    if (Math.abs(cross(ed, wd)) > 0.01) continue; // not parallel
    const off = Math.abs(cross(ed, sub(w.a, p)));
    if (off > tol) continue; // not collinear
    const t0 = dot(sub(w.a, p), ed), t1 = dot(sub(w.b, p), ed);
    const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(eL, Math.max(t0, t1));
    if (hi - lo > 1e-3) out.push({ wall: w, lo, hi });
  }
  return out;
}

/** Uncovered intervals of [0, L] given covered intervals. */
export function gaps(L, intervals, minGap = 0.02) {
  const iv = intervals.map(([a, b]) => [Math.max(0, a), Math.min(L, b)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = []; let s = 0;
  for (const [a, b] of iv) { if (a - s > minGap) out.push([s, a]); s = Math.max(s, b); }
  if (L - s > minGap) out.push([s, L]);
  return out;
}

/** Inset a room polygon so each edge sits on the inner face of the wall carrying it
 *  (half that wall's thickness). Edges with no wall (open-plan boundaries) are not moved. */
export function insetRoomPolygon(spec, level, room) {
  let poly = cleanPolygon(room.polygon);
  if (polygonArea(poly) < 0) poly = poly.slice().reverse(); // make clockwise on the y-down plan
  const n = poly.length;
  // Clockwise on a y-down plan: the interior is to the right of each edge, i.e. normal (-dy, dx).
  const lines = [];
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    const d = norm(sub(q, p));
    const inward = [-d[1], d[0]];
    const ws = wallsOnEdge(level, p, q);
    const t = ws.length ? Math.max(...ws.map((x) => wallThickness(spec, x.wall))) / 2 : 0;
    lines.push({ p: add(p, mul(inward, t)), d, t, walls: ws, orig: [p, q] });
  }
  const pts = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n], l2 = lines[i];
    const den = cross(l1.d, l2.d);
    if (Math.abs(den) < 1e-9) { pts.push(l2.p); continue; }
    const t = cross(sub(l2.p, l1.p), l2.d) / den;
    pts.push(add(l1.p, mul(l1.d, t)));
  }
  return { poly: pts, edges: lines };
}

/** Rotated footprint rectangle of a furniture item, as 4 plan points. */
export function furnitureRotationDeg(item) {
  if (item.facing && FACING_DEG[item.facing] !== undefined) return FACING_DEG[item.facing];
  return item.rotation || 0;
}

export function footprint(item) {
  const [w, d] = item.size;
  const r = (furnitureRotationDeg(item) * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  const [x, y] = item.position;
  return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
}

/** Total room area, and an estimate of gross area measured to the outside face of the
 *  exterior walls (how most builders state "living area"). */
export function areas(spec, level) {
  const rooms = (level.rooms || []).map((r) => ({ id: r.id, name: r.name, area: Math.abs(polygonArea(cleanPolygon(r.polygon))) }));
  const centreline = rooms.reduce((s, r) => s + r.area, 0);
  let extHalf = 0; // perimeter * half thickness, plus corner squares
  let corners = 0;
  for (const w of level.walls || []) if (w.exterior) { extHalf += wallFrame(w).L * wallThickness(spec, w) / 2; corners++; }
  const t = spec.defaults?.exterior_wall_thickness ?? DEFAULTS.exterior_wall_thickness;
  const gross = centreline + extHalf + (corners ? 4 * (t / 2) ** 2 : 0);
  return { rooms, centreline, gross };
}

export function viewpointPitchDeg(v) {
  const dx = v.target[0] - v.position[0], dy = v.target[1] - v.position[1], dz = v.target[2] - v.position[2];
  // viewpoint position/target: [x, y, height] in plan metres
  return (Math.atan2(dz, Math.hypot(dx, dy)) * 180) / Math.PI;
}

export const SQFT_PER_M2 = 10.7639;

// Small seeded PRNG so procedural textures and plans are byte-for-byte repeatable.
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
