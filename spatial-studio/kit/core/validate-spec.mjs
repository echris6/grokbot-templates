#!/usr/bin/env node
// Validate a house spec: JSON schema + geometry sanity + scale against the plan.
//
//   node validate-spec.mjs <house.json> [--json report.json] [--quiet]
//
// Exit 0 = no errors (warnings allowed), 1 = errors, 2 = bad usage / unreadable file.
// Checks: schema; unique ids; room polygons (closed, simple, non-zero, no overlaps, every edge
// walled or shared with a neighbouring room); openings inside their wall, not overlapping,
// fitting the wall height; door swings clear of furniture; furniture inside its room and not
// colliding; viewpoints inside a room with a sane camera; total area vs the plan's stated area;
// scale_checks (known plan dimensions) vs the spec.
import Ajv from 'ajv';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULTS, SQFT_PER_M2, areas, bbox, cleanPolygon, footprint, insetRoomPolygon, openingDims, pointInPolygon, polygonArea,
  selfIntersects, wallFrame, wallHeight, wallThickness, wallsOnEdge, gaps, sub, dot, norm, len, add, mul, viewpointPitchDeg,
} from './web/engine/geom.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--') && argv[argv.indexOf(a) - 1] !== '--json');
if (!file) { console.error('usage: validate-spec.mjs <house.json> [--json out.json]'); process.exit(2); }
const jsonOut = argv.includes('--json') ? argv[argv.indexOf('--json') + 1] : null;
const quiet = argv.includes('--quiet');

let spec;
try { spec = JSON.parse(readFileSync(resolve(file), 'utf8')); } catch (e) { console.error(`cannot read ${file}: ${e.message}`); process.exit(2); }

const errors = [], warnings = [], info = [];
const E = (m) => errors.push(m), W = (m) => warnings.push(m), I = (m) => info.push(m);

// ---------- 1. schema
const schema = JSON.parse(readFileSync(join(HERE, 'schema', 'house.schema.json'), 'utf8'));
const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(schema);
if (!validate(spec)) for (const e of validate.errors.slice(0, 30)) E(`schema: ${e.instancePath || '/'} ${e.message}${e.params?.allowedValues ? ' ' + JSON.stringify(e.params.allowedValues) : ''}`);
if (errors.length) finish(); // geometry checks assume a well-formed spec

// ---------- helpers
const uniq = (label, ids) => { const seen = new Set(); for (const id of ids) { if (id === undefined) continue; if (seen.has(id)) E(`duplicate ${label} id "${id}"`); seen.add(id); } };
const obbOverlap = (A, B) => { // SAT on two convex quads -> overlap depth (m) or 0
  let minDepth = Infinity;
  for (const poly of [A, B]) for (let i = 0; i < 4; i++) {
    const e = sub(poly[(i + 1) % 4], poly[i]); const ax = norm([-e[1], e[0]]);
    const pa = A.map((p) => dot(p, ax)), pb = B.map((p) => dot(p, ax));
    const o = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
    if (o <= 0) return 0; minDepth = Math.min(minDepth, o);
  }
  return minDepth;
};
const TYPICAL = { // [min width, max width] sanity ranges, metres
  bed: [0.85, 2.3], sofa: [1.2, 3.6], armchair: [0.6, 1.1], table: [0.6, 3.2], chair: [0.38, 0.65], toilet: [0.33, 0.5],
  bathtub: [1.2, 2.0], vanity: [0.4, 2.0], fridge: [0.55, 1.0], nightstand: [0.3, 0.7], wardrobe: [0.5, 3.5], island: [0.9, 3.5],
};
const IGNORE_OVERLAP = new Set(['rug', 'art']);

// ---------- 2. per level
uniq('viewpoint', (spec.viewpoints || []).map((v) => v.id));
const report = { levels: [] };
for (const level of spec.levels) {
  const L = { id: level.id };
  report.levels.push(L);
  uniq('room', level.rooms.map((r) => r.id)); uniq('wall', level.walls.map((w) => w.id));
  uniq('opening', (level.openings || []).map((o) => o.id)); uniq('furniture', (level.furniture || []).map((f) => f.id));
  const rooms = Object.fromEntries(level.rooms.map((r) => [r.id, r]));
  const walls = Object.fromEntries(level.walls.map((w) => [w.id, w]));

  // rooms: simple, non-degenerate
  const insets = {};
  for (const r of level.rooms) {
    const p = cleanPolygon(r.polygon);
    if (p.length < 3) { E(`room ${r.id}: polygon needs at least 3 distinct points`); continue; }
    const a = Math.abs(polygonArea(p));
    if (a < 0.5) E(`room ${r.id}: area ${a.toFixed(2)} m² is too small (wrong units?)`);
    if (selfIntersects(p)) E(`room ${r.id}: polygon crosses itself (points out of order?)`);
    insets[r.id] = insetRoomPolygon(spec, level, r).poly;
  }
  // overlaps between rooms: sample a 5 cm grid
  const all = level.rooms.flatMap((r) => cleanPolygon(r.polygon)); const bb = bbox(all); const step = 0.05;
  const overlap = {};
  for (let x = bb.minX + step / 2; x < bb.maxX; x += step) for (let y = bb.minY + step / 2; y < bb.maxY; y += step) {
    const hit = level.rooms.filter((r) => pointInPolygon([x, y], cleanPolygon(r.polygon)));
    if (hit.length > 1) { const k = hit.map((r) => r.id).sort().join(' & '); overlap[k] = (overlap[k] || 0) + step * step; }
  }
  for (const [k, a] of Object.entries(overlap)) if (a > 0.05) E(`rooms overlap: ${k} share ${a.toFixed(2)} m²`);

  // closed rooms: every edge carried by a wall or shared with another room (open-plan boundary)
  for (const r of level.rooms) {
    const p = cleanPolygon(r.polygon);
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], eL = len(sub(b, a)), d = norm(sub(b, a));
      const cov = wallsOnEdge(level, a, b).map((x) => [x.lo, x.hi]);
      for (const o of level.rooms) if (o !== r) {
        const q = cleanPolygon(o.polygon);
        for (let j = 0; j < q.length; j++) {
          const c = q[j], e = q[(j + 1) % q.length]; const od = norm(sub(e, c));
          if (Math.abs(d[0] * od[1] - d[1] * od[0]) > 0.01) continue;
          if (Math.abs((c[0] - a[0]) * d[1] - (c[1] - a[1]) * d[0]) > 0.03) continue;
          const t0 = dot(sub(c, a), d), t1 = dot(sub(e, a), d); cov.push([Math.min(t0, t1), Math.max(t0, t1)]);
        }
      }
      for (const [g0, g1] of gaps(eL, cov, 0.1)) E(`room ${r.id}: edge ${i} (${a.join(',')} → ${b.join(',')}) has ${(g1 - g0).toFixed(2)} m with no wall and no neighbouring room (gap at ${g0.toFixed(2)}–${g1.toFixed(2)} m)`);
    }
  }

  // walls + openings
  for (const w of level.walls) {
    const fr = wallFrame(w); if (fr.L < 0.1) E(`wall ${w.id}: length ${fr.L.toFixed(3)} m`);
  }
  const byWall = {};
  for (const o of level.openings || []) {
    const w = walls[o.wall]; if (!w) { E(`opening ${o.id}: wall "${o.wall}" not found`); continue; }
    const fr = wallFrame(w), od = openingDims(o, spec), H = wallHeight(spec, level, w);
    const s0 = o.offset - od.width / 2, s1 = o.offset + od.width / 2;
    if (s0 < 0.05 || s1 > fr.L - 0.05) E(`opening ${o.id}: spans ${s0.toFixed(2)}–${s1.toFixed(2)} m but wall ${w.id} is ${fr.L.toFixed(2)} m long (offset is to the CENTRE, measured from end a)`);
    if (od.sill + od.height > H - 0.05) E(`opening ${o.id}: sill ${od.sill} + height ${od.height} exceeds wall height ${H}`);
    if (o.type === 'door' && (od.width < 0.6 || od.width > 1.3)) W(`opening ${o.id}: door width ${od.width} m is unusual`);
    if (o.type === 'window' && od.sill + od.height < 1.6) W(`opening ${o.id}: window head at ${(od.sill + od.height).toFixed(2)} m is low`);
    (byWall[o.wall] ||= []).push({ o, s0, s1 });
  }
  for (const [wid, list] of Object.entries(byWall)) {
    list.sort((a, b) => a.s0 - b.s0);
    for (let i = 1; i < list.length; i++) if (list[i].s0 < list[i - 1].s1 + 0.05) E(`openings ${list[i - 1].o.id} and ${list[i].o.id} overlap on wall ${wid}`);
  }

  // furniture
  const fps = [];
  for (const f of level.furniture || []) {
    const label = f.id || f.type;
    const fp = footprint(f);
    let room = f.room ? rooms[f.room] : null;
    if (f.room && !room) { E(`furniture ${label}: room "${f.room}" not found`); continue; }
    if (!room) room = level.rooms.find((r) => pointInPolygon(f.position, cleanPolygon(r.polygon)));
    if (!room) { E(`furniture ${label}: position ${f.position.join(',')} is not inside any room`); continue; }
    const inset = insets[room.id];
    const out = fp.filter((p) => !pointInPolygon(p, inset) && !pointInPolygon(p, inset.map((q) => q)) && !nearPolygon(p, inset, 0.03));
    if (out.length) E(`furniture ${label}: ${out.length} corner(s) outside ${room.id}'s inner wall faces (into a wall?) e.g. ${out[0].map((x) => x.toFixed(2)).join(',')}`);
    const rng = TYPICAL[f.type];
    if (rng && (f.size[0] < rng[0] || f.size[0] > rng[1])) W(`furniture ${label}: width ${f.size[0]} m is outside the usual ${rng[0]}–${rng[1]} m for a ${f.type}`);
    if (!IGNORE_OVERLAP.has(f.type) && !(f.elevation > 0.3)) fps.push({ label, fp, f });
  }
  for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) {
    const d = obbOverlap(fps[i].fp, fps[j].fp);
    if (d > 0.03) W(`furniture ${fps[i].label} and ${fps[j].label} overlap by ${(d * 100).toFixed(0)} cm`);
  }
  // door swings vs furniture
  for (const o of (level.openings || []).filter((o) => o.type === 'door' && !o.exterior_door)) {
    const w = walls[o.wall]; if (!w) continue; const fr = wallFrame(w); const od = openingDims(o, spec);
    const side = o.swing === '-' ? -1 : 1, t = wallThickness(spec, w);
    const a0 = add(fr.a, mul(fr.d, o.offset - od.width / 2)), a1 = add(fr.a, mul(fr.d, o.offset + od.width / 2));
    const off = mul(fr.n, side * (t / 2 + od.width * 0.95));
    const sweep = [add(a0, mul(fr.n, side * t / 2)), add(a1, mul(fr.n, side * t / 2)), add(a1, off), add(a0, off)];
    for (const x of fps) if (obbOverlap(sweep, x.fp) > 0.03 && !['rug', 'lamp'].includes(x.f.type)) W(`door ${o.id}: its swing area hits ${x.label}`);
  }

  // area
  const A = areas(spec, level);
  const clear = level.rooms.reduce((s, r) => s + Math.abs(polygonArea(insets[r.id] || cleanPolygon(r.polygon))), 0);
  Object.assign(L, { rooms: A.rooms.map((r) => ({ ...r, area: +r.area.toFixed(2) })), area_centreline_m2: +A.centreline.toFixed(2), area_gross_m2: +A.gross.toFixed(2), area_clear_m2: +clear.toFixed(2) });
  I(`level ${level.id}: ${level.rooms.length} rooms, ${level.walls.length} walls, ${(level.openings || []).length} openings, ${(level.furniture || []).length} furniture items`);
  I(`level ${level.id}: area gross ${A.gross.toFixed(1)} m² (${(A.gross * SQFT_PER_M2).toFixed(0)} sq ft) · centreline ${A.centreline.toFixed(1)} m² · clear floor ${clear.toFixed(1)} m²`);
}

// total area vs stated
const meta = spec.meta || {};
const stated = meta.stated_area_m2 ?? (meta.stated_area_sqft ? meta.stated_area_sqft / SQFT_PER_M2 : null);
if (meta.stated_area_m2 && meta.stated_area_sqft && Math.abs(meta.stated_area_m2 * SQFT_PER_M2 - meta.stated_area_sqft) / meta.stated_area_sqft > 0.01) W(`area: stated_area_m2 (${meta.stated_area_m2}) and stated_area_sqft (${meta.stated_area_sqft}) disagree; the m² figure is used`);
const gross = report.levels.reduce((s, l) => s + (l.area_gross_m2 || 0), 0);
const clearAll = report.levels.reduce((s, l) => s + (l.area_clear_m2 || 0), 0);
if (stated) {
  const dg = (gross - stated) / stated, dc = (clearAll - stated) / stated;
  const best = Math.abs(dg) <= Math.abs(dc) ? ['gross', dg] : ['clear', dc];
  const msg = `area: plan states ${stated.toFixed(1)} m² (${(stated * SQFT_PER_M2).toFixed(0)} sq ft); spec gross ${gross.toFixed(1)} m² (${(dg * 100).toFixed(1)}%), clear ${clearAll.toFixed(1)} m² (${(dc * 100).toFixed(1)}%)`;
  report.area = { stated_m2: +stated.toFixed(2), gross_m2: +gross.toFixed(2), clear_m2: +clearAll.toFixed(2), closest: best[0], diff_pct: +(best[1] * 100).toFixed(2) };
  if (Math.abs(best[1]) > 0.08) E(msg + ' → more than 8% off: check the scale and the wall positions');
  else if (Math.abs(best[1]) > 0.03) W(msg + ' → 3–8% off: check which area the plan states (meta.stated_area_basis)');
  else I(msg + ' → OK');
} else W('area: meta.stated_area_m2 / stated_area_sqft missing, so the total area cannot be checked against the plan');

// scale checks
report.scale_checks = [];
for (const c of spec.scale_checks || []) {
  const level = spec.levels.find((l) => l.id === c.measure.level) || spec.levels[0];
  const v = measure(level, c.measure);
  if (v === null) { E(`scale check "${c.label}": cannot measure ${JSON.stringify(c.measure)}`); continue; }
  const diff = v - c.plan_value_m, pct = Math.abs(diff) / c.plan_value_m;
  report.scale_checks.push({ label: c.label, plan: c.plan_value_m, spec: +v.toFixed(3), diff_m: +diff.toFixed(3) });
  const msg = `scale "${c.label}": plan ${c.plan_value_m.toFixed(3)} m, spec ${v.toFixed(3)} m (${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)} cm)`;
  if (Math.abs(diff) <= Math.max(0.05, c.plan_value_m * 0.015)) I(msg + ' → OK'); else if (pct <= 0.03) W(msg); else E(msg + ' → off by more than 3%');
}
if (!(spec.scale_checks || []).length) W('no scale_checks: add at least two dimensions read off the plan (overall width and one room)');

// viewpoints
const level0 = spec.levels[0];
for (const v of spec.viewpoints || []) {
  const level = spec.levels.find((l) => l.id === v.level) || level0;
  const [x, y, h] = v.position;
  const room = level.rooms.find((r) => pointInPolygon([x, y], cleanPolygon(r.polygon)));
  if (!room) { E(`viewpoint ${v.id}: camera ${x},${y} is outside every room`); continue; }
  if (v.room && v.room !== room.id) W(`viewpoint ${v.id}: says room "${v.room}" but the camera stands in "${room.id}"`);
  const ins = insetRoomPolygon(spec, level, room).poly;
  if (!pointInPolygon([x, y], ins)) E(`viewpoint ${v.id}: camera is inside a wall of ${room.id}`);
  if (h < 0.9 || h > 2.0) W(`viewpoint ${v.id}: camera height ${h} m (photos are usually taken at 1.2–1.6 m)`);
  const pitch = viewpointPitchDeg(v);
  if (Math.abs(pitch) > 20) W(`viewpoint ${v.id}: camera pitch ${pitch.toFixed(0)}° (keep within ±20° so verticals stay straight)`);
  if (len(sub(v.target, v.position).slice(0, 2)) < 0.5) W(`viewpoint ${v.id}: target is less than 0.5 m away horizontally`);
  for (const f of level.furniture || []) if (!IGNORE_OVERLAP.has(f.type) && pointInPolygon([x, y], footprint(f)) && f.size[2] > h - 0.3) E(`viewpoint ${v.id}: camera is inside ${f.id || f.type}`);
}
if (!(spec.viewpoints || []).length) W('no viewpoints: add one per reference photo (or one per room)');
const roomsWithView = new Set((spec.viewpoints || []).map((v) => v.room));
for (const r of level0.rooms) if (!roomsWithView.has(r.id)) I(`room ${r.id} has no viewpoint (fine if there is no photo of it)`);

finish();

function nearPolygon(p, poly, tol) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ab = sub(b, a);
    const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
    if (len(sub(p, add(a, mul(ab, t)))) <= tol) return true;
  }
  return false;
}

function measure(level, m) {
  const ext = level.walls.filter((w) => w.exterior);
  if (m.kind === 'overall_x' || m.kind === 'overall_y') {
    if (!ext.length) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const w of ext) { const t = wallThickness(spec, w) / 2; for (const p of [w.a, w.b]) { minX = Math.min(minX, p[0] - t); maxX = Math.max(maxX, p[0] + t); minY = Math.min(minY, p[1] - t); maxY = Math.max(maxY, p[1] + t); } }
    return m.kind === 'overall_x' ? maxX - minX : maxY - minY;
  }
  if (m.kind.startsWith('room_')) {
    const r = level.rooms.find((x) => x.id === m.room); if (!r) return null;
    const pts = m.kind.includes('clear') ? insetRoomPolygon(spec, level, r).poly : cleanPolygon(r.polygon);
    const b = bbox(pts); return m.kind.endsWith('_x') ? b.w : b.h;
  }
  if (m.kind === 'wall_length') { const w = level.walls.find((x) => x.id === m.wall); return w ? wallFrame(w).L : null; }
  if (m.kind === 'opening_width') { const o = (level.openings || []).find((x) => x.id === m.opening); return o ? openingDims(o, spec).width : null; }
  return null;
}

function finish() {
  const out = { file: resolve(file), ok: errors.length === 0, errors, warnings, info, ...report };
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
  if (!quiet) {
    for (const m of info) console.log(`  info  ${m}`);
    for (const m of warnings) console.log(`  WARN  ${m}`);
    for (const m of errors) console.log(`  ERROR ${m}`);
    console.log(`${errors.length ? 'FAIL' : 'PASS'}: ${errors.length} error(s), ${warnings.length} warning(s) · ${file}`);
  }
  process.exit(errors.length ? 1 : 0);
}
