#!/usr/bin/env node
// Draw a dimensioned 2D floor plan (SVG, optional PNG) from a house spec.
//
//   node plan-svg.mjs --spec house.json --out plan.svg [--png plan.png] [--ppm 50]
//
// Uses: (1) the demo, where the "builder's plan" is drawn from a fictional spec so the whole
// plan -> spec -> 3D -> screenshots flow can run locally; (2) QA in real jobs: draw the spec
// you wrote and put it next to the builder's plan. If the two drawings differ, the spec is wrong.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SQFT_PER_M2, areas, bbox, cleanPolygon, footprint, insetRoomPolygon, openingDims, polygonArea, wallFrame, wallPieces, wallThickness, add, mul,
} from './web/engine/geom.js';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!arg('spec') || !arg('out')) { console.error('usage: plan-svg.mjs --spec house.json --out plan.svg [--png plan.png] [--ppm 50]'); process.exit(2); }
const spec = JSON.parse(readFileSync(resolve(arg('spec')), 'utf8'));
const PPM = Number(arg('ppm', 50));
const level = spec.levels[0];
const CUT = 1.2;
const FIXTURES = new Set(['counter', 'island', 'bathtub', 'shower', 'toilet', 'vanity', 'fridge', 'wardrobe', 'shelving', 'cabinet']);

const pts = level.walls.flatMap((w) => [w.a, w.b]);
const b0 = bbox(pts); const tExt = spec.defaults?.exterior_wall_thickness ?? 0.25;
const ob = { minX: b0.minX - tExt / 2, maxX: b0.maxX + tExt / 2, minY: b0.minY - tExt / 2, maxY: b0.maxY + tExt / 2 };
const M = { left: 90, top: 90, right: 60, bottom: 150 };
const W = Math.round((ob.maxX - ob.minX) * PPM + M.left + M.right), H = Math.round((ob.maxY - ob.minY) * PPM + M.top + M.bottom);
const X = (x) => +(M.left + (x - ob.minX) * PPM).toFixed(2), Y = (y) => +(M.top + (y - ob.minY) * PPM).toFixed(2);
const P = (p) => `${X(p[0])},${Y(p[1])}`;
const out = [];
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif">`);
out.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);
// room fills
for (const r of level.rooms) out.push(`<polygon points="${cleanPolygon(r.polygon).map(P).join(' ')}" fill="${/bath|ensuite|wc|laundry/i.test(r.id + r.name) ? '#eef1f2' : '#fbfaf7'}" stroke="none"/>`);
// fixtures (what builders' plans usually draw)
for (const f of level.furniture || []) if (FIXTURES.has(f.type)) {
  out.push(`<polygon points="${footprint(f).map(P).join(' ')}" fill="#ffffff" stroke="#8a8a8a" stroke-width="1"/>`);
  if (f.type === 'bathtub' || f.type === 'toilet') { const fp = footprint(f); const c = [(fp[0][0] + fp[2][0]) / 2, (fp[0][1] + fp[2][1]) / 2]; out.push(`<ellipse cx="${X(c[0])}" cy="${Y(c[1])}" rx="${(f.size[0] * PPM * 0.33).toFixed(1)}" ry="${(f.size[1] * PPM * 0.3).toFixed(1)}" fill="none" stroke="#8a8a8a" stroke-width="1"/>`); }
}
// walls: solid pieces cut at 1.2 m, drawn as filled quads
for (const w of level.walls) {
  const fr = wallFrame(w); const t = wallThickness(spec, w); const { pieces, openings } = wallPieces(spec, level, w);
  for (const pc of pieces) {
    if (pc.kind !== 'solid' || !(pc.z0 < CUT && pc.z1 > CUT)) continue; // high windows still draw as windows
    const ext = (pc.s0 < 1e-6 ? t / 2 : 0), ext2 = (pc.s1 > fr.L - 1e-6 ? t / 2 : 0);
    const a = add(fr.a, mul(fr.d, pc.s0 - ext)), b = add(fr.a, mul(fr.d, pc.s1 + ext2));
    const q = [add(a, mul(fr.n, t / 2)), add(b, mul(fr.n, t / 2)), add(b, mul(fr.n, -t / 2)), add(a, mul(fr.n, -t / 2))];
    out.push(`<polygon points="${q.map(P).join(' ')}" fill="#1d1d1b"/>`);
  }
  for (const op of openings) {
    const o = op.o, od = openingDims(o, spec);
    const a = add(fr.a, mul(fr.d, op.s0)), b = add(fr.a, mul(fr.d, op.s1));
    if (o.type === 'window' || o.type === 'sliding') {
      for (const k of [-0.5, 0, 0.5]) out.push(`<line x1="${X(add(a, mul(fr.n, k * t))[0])}" y1="${Y(add(a, mul(fr.n, k * t))[1])}" x2="${X(add(b, mul(fr.n, k * t))[0])}" y2="${Y(add(b, mul(fr.n, k * t))[1])}" stroke="#1d1d1b" stroke-width="${k === 0 ? 1.6 : 1}"/>`);
      if (op.sill > 0) out.push(`<polygon points="${[add(a, mul(fr.n, t / 2)), add(b, mul(fr.n, t / 2)), add(b, mul(fr.n, -t / 2)), add(a, mul(fr.n, -t / 2))].map(P).join(' ')}" fill="none" stroke="#1d1d1b" stroke-width="1"/>`);
    } else if (o.type === 'door') {
      const side = o.swing === '-' ? -1 : 1; const hingeB = o.hinge === 'b';
      const hinge = add(hingeB ? b : a, mul(fr.n, side * t / 2)), free = add(hingeB ? a : b, mul(fr.n, side * t / 2));
      const tip = add(hinge, mul(fr.n, side * od.width));
      out.push(`<line x1="${X(hinge[0])}" y1="${Y(hinge[1])}" x2="${X(tip[0])}" y2="${Y(tip[1])}" stroke="#1d1d1b" stroke-width="1.6"/>`);
      const r = od.width * PPM; const sweep = (side * (hingeB ? -1 : 1)) > 0 ? 1 : 0;
      out.push(`<path d="M ${X(free[0])} ${Y(free[1])} A ${r} ${r} 0 0 ${sweep} ${X(tip[0])} ${Y(tip[1])}" fill="none" stroke="#1d1d1b" stroke-width="0.8" stroke-dasharray="3 2"/>`);
    }
  }
}
// labels: name + clear dimensions (what builders print), else area
for (const r of level.rooms) {
  const poly = cleanPolygon(r.polygon); const bb = bbox(poly); const ins = insetRoomPolygon(spec, level, r).poly; const ib = bbox(ins);
  const rect = Math.abs(Math.abs(polygonArea(poly)) - bb.w * bb.h) < 0.01;
  const [cx, cy] = r.label_at || [bb.cx, bb.cy];
  out.push(`<text x="${X(cx)}" y="${Y(cy) - 4}" text-anchor="middle" font-size="13" font-weight="700" fill="#1d1d1b" letter-spacing="0.5">${esc(r.name.toUpperCase())}</text>`);
  out.push(`<text x="${X(cx)}" y="${Y(cy) + 12}" text-anchor="middle" font-size="11.5" fill="#444">${rect ? `${ib.w.toFixed(2)} × ${ib.h.toFixed(2)} m` : `${Math.abs(polygonArea(ins)).toFixed(1)} m²`}</text>`);
}
// overall dimension lines
const dim = (x1, y1, x2, y2, label, vertical) => {
  out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1d1d1b" stroke-width="1"/>`);
  for (const [x, y] of [[x1, y1], [x2, y2]]) out.push(vertical ? `<line x1="${x - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y - 6}" stroke="#1d1d1b" stroke-width="1.4"/>` : `<line x1="${x - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y - 6}" stroke="#1d1d1b" stroke-width="1.4"/>`);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  out.push(vertical ? `<text x="${mx - 10}" y="${my}" text-anchor="middle" font-size="13" transform="rotate(-90 ${mx - 10} ${my})" fill="#1d1d1b">${label}</text>` : `<text x="${mx}" y="${my - 9}" text-anchor="middle" font-size="13" fill="#1d1d1b">${label}</text>`);
};
dim(X(ob.minX), M.top - 40, X(ob.maxX), M.top - 40, `${(ob.maxX - ob.minX).toFixed(2)} m`, false);
dim(M.left - 40, Y(ob.minY), M.left - 40, Y(ob.maxY), `${(ob.maxY - ob.minY).toFixed(2)} m`, true);
// title block, scale bar, north arrow
const A = areas(spec, level); const meta = spec.meta || {};
const ty = H - 92;
out.push(`<text x="${M.left}" y="${ty}" font-size="17" font-weight="700" fill="#1d1d1b">${esc(meta.name || 'Floor plan')}</text>`);
out.push(`<text x="${M.left}" y="${ty + 22}" font-size="12.5" fill="#444">${esc(level.name || '')} · ${A.gross.toFixed(1)} m² (${Math.round(A.gross * SQFT_PER_M2).toLocaleString('en-US')} sq ft) gross to outside of walls · ceiling ${(level.height || spec.defaults?.wall_height || 2.7).toFixed(2)} m</text>`);
if (meta.fictional) out.push(`<text x="${M.left}" y="${ty + 42}" font-size="12" font-weight="700" fill="#a33">FICTIONAL SAMPLE · not a real property · drawn from the spec for the Spatial Studio demo</text>`);
const sx = W - M.right - 5 * PPM, sy = ty + 6;
for (let i = 0; i < 5; i++) out.push(`<rect x="${sx + i * PPM}" y="${sy}" width="${PPM}" height="7" fill="${i % 2 ? '#fff' : '#1d1d1b'}" stroke="#1d1d1b" stroke-width="1"/>`);
out.push(`<text x="${sx}" y="${sy - 8}" font-size="11" fill="#1d1d1b">0</text><text x="${sx + 5 * PPM}" y="${sy - 8}" font-size="11" text-anchor="end" fill="#1d1d1b">5 m</text>`);
out.push(`<text x="${sx}" y="${sy + 24}" font-size="11" fill="#666">${PPM} px = 1 m · plan cut at ${CUT} m</text>`);
const nx = W - 28, ny = M.top + 24;
out.push(`<polygon points="${nx},${ny - 18} ${nx + 9},${ny + 10} ${nx},${ny + 4} ${nx - 9},${ny + 10}" fill="#1d1d1b"/><text x="${nx}" y="${ny + 26}" text-anchor="middle" font-size="12" font-weight="700">N</text>`);
out.push('</svg>');

const svg = out.join('\n');
writeFileSync(resolve(arg('out')), svg);
console.log(`plan svg: ${resolve(arg('out'))} (${W}x${H}, ${PPM} px/m)`);
if (arg('png')) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await page.screenshot({ path: resolve(arg('png')), clip: { x: 0, y: 0, width: W, height: H } });
  await browser.close();
  console.log(`plan png: ${resolve(arg('png'))}`);
}
