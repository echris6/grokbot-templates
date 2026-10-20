// Procedural furniture library. Every builder works in the item's local frame:
// origin = centre of the footprint on the floor, x = width, z = depth, +z = the item's FRONT
// (the side you face it from: foot of a bed, seat side of a sofa, doors of a cabinet).
// `size` = [width, depth, height] in metres. Colours come from item.color / item.accent /
// item.material (a spec material name); every builder has believable defaults.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/three/addons/RoundedBoxGeometry.js';

const geoCache = new Map();

// Box UVs in metres so world-scale textures (stone, wood, tile) keep their real size.
function metreUVs(g, w, h, d) {
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
    const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]);
  }
  return g;
}

function boxGeo(w, h, d, r = 0) {
  const k = [w, h, d, r].map((x) => x.toFixed(4)).join(',');
  if (!geoCache.has(k)) {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2) * 0.999) : metreUVs(new THREE.BoxGeometry(w, h, d), w, h, d);
    geoCache.set(k, g);
  }
  return geoCache.get(k);
}

/** Box with its BOTTOM at y0, centred at x, z. */
function B(g, w, h, d, x, y0, z, mat, r = 0) {
  const m = new THREE.Mesh(boxGeo(w, h, d, r), mat);
  m.position.set(x, y0 + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  g.add(m); return m;
}
function C(g, rTop, rBot, h, x, y0, z, mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y0 + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  g.add(m); return m;
}

function legs(g, w, d, h, t, inset, mat) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, t, h, t, sx * (w / 2 - inset - t / 2), 0, sz * (d / 2 - inset - t / 2), mat);
}

/** Cabinet fronts: n doors (or drawers) across a face at z = zf, with a slim gap and bar handles. */
function fronts(g, L, x0, y0, h, zf, n, M, { drawers = false, handle = true, color } = {}) {
  const gap = 0.004, fw = L / n;
  const front = M.solid(color || '#f1efea', 0.45);
  const metal = M.solid('#b9b6b0', 0.3, 0.9);
  for (let i = 0; i < n; i++) {
    const cx = x0 + fw * i + fw / 2;
    B(g, fw - gap, h - gap, 0.018, cx, y0 + gap / 2, zf + 0.009, front, 0.002);
    if (handle) {
      if (drawers) B(g, Math.min(0.3, fw * 0.5), 0.012, 0.02, cx, y0 + h - 0.06, zf + 0.028, metal);
      else B(g, 0.012, Math.min(0.18, h * 0.3), 0.02, cx + (i % 2 ? -1 : 1) * (fw / 2 - 0.04), y0 + h - Math.min(0.24, h * 0.4), zf + 0.028, metal);
    }
  }
}

const COLORS = {
  wood: '#9c7754', darkwood: '#5d4636', linen: '#f2efe9', fabric: '#b8b2a7', white: '#f4f2ee',
  black: '#2a2a2a', metal: '#c8c6c2', ceramic: '#f7f6f3', glass: '#cfe0e4',
};

export const FURNITURE = {
  bed(it, M) {
    const g = new THREE.Group(); const [w, d, hb = 1.05] = it.size;
    const frame = M.part(it.material, it.color || '#d8d0c4');
    B(g, w, 0.3, d - 0.08, 0, 0.0, 0.04, frame, 0.02);                    // upholstered base
    B(g, w + 0.06, hb, 0.09, 0, 0, -d / 2 + 0.045, frame, 0.03);          // headboard
    const linen = M.solid(COLORS.linen, 0.95);
    B(g, w - 0.04, 0.22, d - 0.14, 0, 0.3, 0.05, linen, 0.06);             // mattress
    const duvet = M.solid(it.accent || '#e9e4da', 0.98);
    B(g, w + 0.02, 0.08, d * 0.68, 0, 0.47, d / 2 - d * 0.34 + 0.01, duvet, 0.035); // duvet
    B(g, w + 0.03, 0.3, 0.04, 0, 0.24, d / 2 - 0.005, duvet, 0.015);       // duvet drop at foot
    B(g, w * 0.98, 0.03, 0.42, 0, 0.545, d / 2 - 0.42, M.solid(it.throw || '#8f8676', 0.95), 0.01); // throw
    const pillows = w >= 1.3 ? 2 : 1; const pw = (w - 0.2) / pillows;
    for (let i = 0; i < pillows; i++) {
      const x = -w / 2 + 0.1 + pw * i + pw / 2;
      const p = B(g, pw - 0.08, 0.17, 0.5, x, 0.5, -d / 2 + 0.36, linen, 0.045); p.rotation.x = -0.75; p.scale.set(1, 1, 0.9);
    }
    return g;
  },
  nightstand(it, M) {
    const g = new THREE.Group(); const [w, d, h] = it.size;
    const wood = M.part(it.material, it.color || COLORS.wood);
    B(g, w, h - 0.06, d, 0, 0.06, 0, wood, 0.01); legs(g, w, d, 0.06, 0.03, 0.02, M.solid(COLORS.darkwood, 0.6));
    fronts(g, w - 0.04, -w / 2 + 0.02, 0.1, h - 0.16, d / 2, 1, M, { drawers: true, color: it.accent || '#e9e4dc' });
    if (it.lamp !== false) FURNITURE.table_lamp({ size: [0.28, 0.28, 0.5] }, M, g, [0, h, -0.02]);
    return g;
  },
  table_lamp(it, M, parent, at = [0, 0, 0]) {
    const g = parent ? new THREE.Group() : new THREE.Group(); const [, , h] = it.size;
    C(g, 0.07, 0.09, h * 0.45, 0, 0, 0, M.solid('#d9d3c8', 0.4));
    const shade = new THREE.MeshStandardMaterial({ color: '#f6efe2', roughness: 0.9, emissive: '#ffe6bf', emissiveIntensity: 0.55, side: THREE.DoubleSide });
    C(g, 0.11, 0.15, h * 0.42, 0, h * 0.5, 0, shade, 28).castShadow = false;
    if (parent) { g.position.set(...at); parent.add(g); }
    return g;
  },
  sofa(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.82] = it.size;
    const fab = M.part(it.material, it.color || '#9c9a93');
    const arm = it.arms === false ? 0 : 0.18;
    B(g, w, 0.3, d, 0, 0.1, 0, fab, 0.04);                                 // base
    legs(g, w, d, 0.1, 0.04, 0.05, M.solid(COLORS.darkwood, 0.6));
    if (arm) for (const s of [-1, 1]) B(g, arm, 0.62 - 0.1, d, s * (w / 2 - arm / 2), 0.1, 0, fab, 0.06);
    B(g, w - 2 * arm, h - 0.4, 0.22, 0, 0.4, -d / 2 + 0.11, fab, 0.07);    // back frame
    const n = Math.max(1, Math.round((w - 2 * arm) / 0.75)); const cw = (w - 2 * arm) / n;
    const cush = M.part(it.material, it.color || '#9c9a93');
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + arm + cw * i + cw / 2;
      B(g, cw - 0.015, 0.14, d - 0.26, x, 0.4, 0.1, cush, 0.06);           // seat
      const b = B(g, cw - 0.03, 0.4, 0.16, x, 0.52, -d / 2 + 0.28, cush, 0.07); b.rotation.x = -0.12; // back cushion
    }
    if (it.cushions !== false && w > 1.2) {
      const ac = M.solid(it.accent || '#d9cbb3', 0.95);
      for (const s of [-1, 1]) { const p = B(g, 0.42, 0.4, 0.13, s * (w / 2 - arm - 0.3), 0.52, -d / 2 + 0.42, ac, 0.06); p.rotation.set(-0.2, s * 0.25, s * 0.05); }
    }
    return g;
  },
  armchair(it, M) { return FURNITURE.sofa({ ...it, cushions: false }, M); },
  coffee_table(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.4] = it.size;
    const top = M.part(it.material, it.color || COLORS.wood);
    B(g, w, 0.035, d, 0, h - 0.035, 0, top, 0.012);
    B(g, w - 0.1, 0.02, d - 0.1, 0, 0.12, 0, top, 0.006);
    legs(g, w, d, h - 0.035, 0.035, 0.04, M.solid(COLORS.darkwood, 0.6));
    B(g, 0.22, 0.04, 0.16, w * 0.2, h, 0, M.solid('#3f4a52', 0.6), 0.01);  // books
    B(g, 0.2, 0.03, 0.15, w * 0.2, h + 0.04, 0.01, M.solid('#c9b48a', 0.7), 0.01);
    return g;
  },
  table(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.75] = it.size;
    const top = M.part(it.material, it.color || COLORS.wood);
    B(g, w, 0.04, d, 0, h - 0.04, 0, top, 0.01);
    B(g, w - 0.16, 0.08, d - 0.16, 0, h - 0.12, 0, top);
    legs(g, w, d, h - 0.04, 0.06, 0.06, top);
    const n = it.chairs || 0;
    if (n) {
      const per = Math.floor(n / 2), ends = n - per * 2; const sp = w / per;
      for (const s of [-1, 1]) for (let i = 0; i < per; i++) {
        const c = FURNITURE.chair({ size: [0.46, 0.5, 0.86], color: it.chair_color }, M);
        c.position.set(-w / 2 + sp * i + sp / 2, 0, s * (d / 2 + 0.12)); c.rotation.y = s > 0 ? Math.PI : 0; g.add(c);
      }
      if (ends) { const c = FURNITURE.chair({ size: [0.46, 0.5, 0.86], color: it.chair_color }, M); c.position.set(w / 2 + 0.12, 0, 0); c.rotation.y = -Math.PI / 2; g.add(c); }
    }
    return g;
  },
  desk(it, M) { return FURNITURE.table({ ...it, chairs: 0 }, M); },
  chair(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.86] = it.size;
    const wood = M.solid(it.color || '#6e5543', 0.6);
    const seat = M.solid(it.accent || '#cfc6b6', 0.95);
    legs(g, w - 0.02, d - 0.04, 0.44, 0.03, 0.02, wood);
    B(g, w, 0.05, d - 0.02, 0, 0.44, 0.0, seat, 0.02);
    B(g, w - 0.04, 0.2, 0.025, 0, h - 0.26, -d / 2 + 0.03, wood, 0.008);  // back rail at -z, seat faces +z
    B(g, w - 0.08, 0.035, 0.02, 0, h - 0.48, -d / 2 + 0.03, wood, 0.005);
    for (const s of [-1, 1]) B(g, 0.03, h - 0.44, 0.03, s * (w / 2 - 0.03), 0.44, -d / 2 + 0.03, wood);
    return g;
  },
  stool(it, M) {
    const g = new THREE.Group(); const [w, , h = 0.66] = it.size;
    C(g, w / 2, w / 2, 0.05, 0, h - 0.05, 0, M.solid(it.accent || '#8c6f55', 0.55), 28);
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; const l = C(g, 0.012, 0.014, h - 0.05, Math.cos(a) * w * 0.33, 0, Math.sin(a) * w * 0.33, M.solid('#2f2f2f', 0.4, 0.6), 8); l.rotation.set(Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08); }
    C(g, w * 0.36, w * 0.36, 0.015, 0, 0.25, 0, M.solid('#2f2f2f', 0.4, 0.6), 24);
    return g;
  },
  counter(it, M) { // a straight run of base cabinets + top (+ optional uppers, sink, cooktop)
    const g = new THREE.Group(); const [L, d = 0.62, h = 0.9] = it.size;
    const carcass = M.solid(it.color || '#f1efea', 0.5);
    B(g, L - 0.02, 0.1, d - 0.1, 0, 0, -0.04, M.solid('#3b3936', 0.8));    // toe kick
    B(g, L, h - 0.13, d - 0.04, 0, 0.1, -0.02, carcass);
    const n = Math.max(1, Math.round(L / 0.6));
    fronts(g, L, -L / 2, 0.1, h - 0.13, d / 2 - 0.02, n, M, { color: it.color });
    const top = M.part(it.top || 'quartz', '#eeebe5');
    B(g, L, 0.03, d + 0.02, 0, h - 0.03, 0.01, top);
    const steel = M.solid('#c4c5c6', 0.32, 0.55);
    if (it.sink_at !== undefined) {
      const x = -L / 2 + it.sink_at;
      B(g, 0.76, 0.004, 0.44, x, h, 0.02, M.solid('#6d6e70', 0.3, 0.8));
      B(g, 0.7, 0.003, 0.38, x, h + 0.003, 0.02, M.solid('#3d3e40', 0.3, 0.8));
      C(g, 0.016, 0.02, 0.3, x, h, -d / 2 + 0.07, steel, 12);
      const spout = B(g, 0.025, 0.025, 0.2, x, h + 0.28, -d / 2 + 0.16, steel); spout.rotation.x = 0.1;
    }
    if (it.cooktop_at !== undefined) {
      const x = -L / 2 + it.cooktop_at;
      B(g, 0.6, 0.008, 0.52, x, h, 0.0, M.solid('#121315', 0.12, 0.2));
      for (const [ox, oz, r] of [[-0.15, -0.12, 0.09], [0.15, -0.12, 0.07], [-0.15, 0.12, 0.07], [0.15, 0.12, 0.09]]) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 32), M.solid('#4a4b4e', 0.3)); ring.rotation.x = -Math.PI / 2; ring.position.set(x + ox, h + 0.009, oz); g.add(ring);
      }
      if (it.hood !== false) { B(g, 0.6, 0.12, 0.5, x, 1.62, -d / 2 + 0.25, steel); B(g, 0.28, 0.98, 0.25, x, 1.74, -d / 2 + 0.125, steel); }
    }
    if (it.backsplash !== false) B(g, L, 0.55, 0.012, 0, h, -d / 2 + 0.006, M.part(it.backsplash_material || 'white_tile_wall', '#eeece8'));
    if (it.uppers) {
      const ud = 0.35, y0 = h + 0.55, uh = (it.upper_height || 0.75);
      const gaps = (it.upper_gaps || []).concat(it.cooktop_at !== undefined && it.hood !== false ? [[it.cooktop_at - 0.32, it.cooktop_at + 0.32]] : []).sort((a, b) => a[0] - b[0]);
      let s = 0; const runs = [];
      for (const [a, b] of gaps) { if (a > s + 0.25) runs.push([s, a]); s = Math.max(s, b); }
      if (L > s + 0.25) runs.push([s, L]);
      for (const [a, b] of runs) {
        const rl = b - a, cx = -L / 2 + a + rl / 2;
        B(g, rl, uh, ud, cx, y0, -d / 2 + ud / 2, carcass);
        fronts(g, rl, -L / 2 + a, y0, uh, -d / 2 + ud, Math.max(1, Math.round(rl / 0.5)), M, { color: it.color });
        B(g, rl, 0.02, ud, cx, y0 - 0.02, -d / 2 + ud / 2, M.solid('#fff4dd', 1, 0, { emissive: '#fff1d6', emissiveIntensity: 0.25 })); // under-cabinet light strip
      }
    }
    return g;
  },
  island(it, M) { // doors on the -z side, seating overhang on the +z (front) side
    const g = new THREE.Group(); const [w, d, h = 0.92] = it.size; const over = it.overhang ?? 0.3;
    const carcass = M.solid(it.color || '#5f6b63', 0.5);
    B(g, w - 0.04, 0.1, d - over - 0.08, 0, 0, -over / 2, M.solid('#3b3936', 0.8));
    B(g, w - 0.02, h - 0.13, d - over - 0.02, 0, 0.1, -over / 2, carcass);
    const n = Math.max(1, Math.round(w / 0.6));
    const rot = new THREE.Group(); rot.rotation.y = Math.PI; g.add(rot); // fronts face -z (towards the kitchen run)
    fronts(rot, w - 0.02, -(w - 0.02) / 2, 0.1, h - 0.13, d / 2 - 0.01, n, M, { color: it.color });
    B(g, w + 0.04, 0.04, d, 0, h - 0.04, 0, M.part(it.top || 'quartz', '#eeebe5'));
    const k = it.stools || 0;
    for (let i = 0; i < k; i++) { const s = FURNITURE.stool({ size: [0.38, 0.38, 0.66], accent: it.accent }, M); s.position.set(-w / 2 + (w / k) * (i + 0.5), 0, d / 2 + 0.08); g.add(s); }
    return g;
  },
  cabinet(it, M) {
    const g = new THREE.Group(); const [w, d, h] = it.size;
    B(g, w, h, d - 0.02, 0, 0, -0.01, M.part(it.material, it.color || '#efece6'));
    fronts(g, w, -w / 2, 0.0, h, d / 2 - 0.02, Math.max(1, Math.round(w / 0.5)), M, { color: it.color, drawers: it.drawers });
    return g;
  },
  dresser(it, M) {
    const g = new THREE.Group(); const [w, d, h] = it.size; const wood = M.part(it.material, it.color || COLORS.wood);
    B(g, w, h - 0.08, d, 0, 0.08, 0, wood, 0.01); legs(g, w, d, 0.08, 0.035, 0.02, M.solid(COLORS.darkwood, 0.6));
    const rows = 3, rh = (h - 0.14) / rows;
    for (let r = 0; r < rows; r++) fronts(g, w - 0.04, -w / 2 + 0.02, 0.11 + r * rh, rh, d / 2, 2, M, { drawers: true, color: it.accent || '#ebe6dd' });
    return g;
  },
  wardrobe(it, M) {
    const g = new THREE.Group(); const [w, d, h = 2.2] = it.size;
    B(g, w, h, d - 0.02, 0, 0, -0.01, M.part(it.material, it.color || '#efece6'));
    fronts(g, w, -w / 2, 0.02, h - 0.04, d / 2 - 0.02, Math.max(2, Math.round(w / 0.5)), M, { color: it.color });
    return g;
  },
  shelving(it, M) {
    const g = new THREE.Group(); const [w, d, h = 2.1] = it.size; const wood = M.part(it.material, it.color || '#e9e5de');
    for (const s of [-1, 1]) B(g, 0.02, h, d, s * (w / 2 - 0.01), 0, 0, wood);
    for (const y of [0.05, 0.45, 0.95, 1.6, h - 0.02]) B(g, w, 0.02, d, 0, y, 0, wood);
    C(g, 0.012, 0.012, w - 0.06, 0, 1.4, 0, M.solid('#b9b6b0', 0.3, 0.9), 8).rotation.z = Math.PI / 2;
    const cloth = ['#3d4a5a', '#c9c1b2', '#7c6e60', '#e8e3da', '#5b6b5d', '#2f3135'];
    for (let i = 0; i < Math.floor((w - 0.1) / 0.09); i++) B(g, 0.03, 0.7, Math.min(0.42, d - 0.04), -w / 2 + 0.08 + i * 0.09, 0.68, 0, M.solid(cloth[(i * 7) % cloth.length], 0.95), 0.01);
    for (let i = 0; i < Math.floor((w - 0.1) / 0.3); i++) B(g, 0.26, 0.12, d - 0.08, -w / 2 + 0.18 + i * 0.3, 0.47, 0, M.solid(cloth[(i * 5 + 1) % cloth.length], 0.9), 0.02);
    return g;
  },
  fridge(it, M) {
    const g = new THREE.Group(); const [w, d, h = 1.85] = it.size; const steel = M.solid('#cfd0d1', 0.3, 0.55);
    B(g, w, h, d - 0.03, 0, 0, -0.015, steel, 0.01);
    B(g, 0.004, h - 0.7, 0.01, 0, 0.7, d / 2 - 0.025, M.solid('#555', 0.5));
    B(g, w, 0.004, 0.01, 0, 0.7, d / 2 - 0.025, M.solid('#555', 0.5));
    for (const s of [-1, 1]) B(g, 0.02, 0.6, 0.03, s * 0.04, 0.95, d / 2, M.solid('#9a9b9c', 0.3, 0.9));
    return g;
  },
  bathtub(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.56] = it.size; const white = M.solid(COLORS.ceramic, 0.18);
    const rim = 0.08;
    B(g, w, h - 0.02, d, 0, 0, 0, M.solid('#f3f2ef', 0.3));                 // apron/body
    B(g, w, 0.02, rim, 0, h - 0.02, -d / 2 + rim / 2, white); B(g, w, 0.02, rim, 0, h - 0.02, d / 2 - rim / 2, white);
    B(g, rim, 0.02, d, -w / 2 + rim / 2, h - 0.02, 0, white); B(g, rim, 0.02, d, w / 2 - rim / 2, h - 0.02, 0, white);
    const inner = new THREE.Mesh(boxGeo(w - 2 * rim, 0.02, d - 2 * rim, 0.008), M.solid('#e9e8e4', 0.15));
    inner.position.set(0, h - 0.035, 0); g.add(inner);                      // basin reads as a recessed inner surface
    const chrome = M.solid('#d6d7d8', 0.15, 1);
    C(g, 0.02, 0.02, 0.12, -w / 2 + 0.25, h, -d / 2 + 0.04, chrome, 12);
    return g;
  },
  shower(it, M) {
    const g = new THREE.Group(); const [w, d, h = 2.0] = it.size;
    B(g, w, 0.04, d, 0, 0, 0, M.solid('#f2f1ee', 0.3));
    const glass = new THREE.MeshStandardMaterial({ color: '#dfeef0', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false });
    const gl = B(g, w - 0.02, h - 0.06, 0.01, 0, 0.04, d / 2 - 0.01, glass); gl.castShadow = false;
    B(g, 0.02, h - 0.06, 0.02, w / 2 - 0.01, 0.04, d / 2 - 0.01, M.solid('#c9cacb', 0.2, 1));
    const chrome = M.solid('#d6d7d8', 0.15, 1);
    C(g, 0.012, 0.012, 0.9, -w / 2 + 0.1, 1.1, -d / 2 + 0.03, chrome, 10);
    C(g, 0.1, 0.1, 0.015, -w / 2 + 0.1, 2.0, -d / 2 + 0.16, chrome, 24);
    return g;
  },
  toilet(it, M) { // back against the wall at -z
    const g = new THREE.Group(); const [w = 0.38, d = 0.68] = it.size; const white = M.solid(COLORS.ceramic, 0.12);
    B(g, w * 0.95, 0.38, 0.17, 0, 0.4, -d / 2 + 0.085, white, 0.03);        // cistern
    B(g, w, 0.025, 0.19, 0, 0.78, -d / 2 + 0.095, white, 0.01);
    const bowl = C(g, w / 2, w / 2.6, 0.4, 0, 0, 0.06, white, 32); bowl.scale.z = 1.35;
    const seat = C(g, w / 2 + 0.005, w / 2 + 0.005, 0.03, 0, 0.4, 0.06, M.solid('#fbfbfa', 0.25), 32); seat.scale.z = 1.35;
    B(g, w * 0.5, 0.3, 0.2, 0, 0.1, -d / 2 + 0.17, white, 0.04);
    return g;
  },
  vanity(it, M) { // cabinet + top + basin + tap, optional mirror on the wall above
    const g = new THREE.Group(); const [w, d = 0.48, h = 0.85] = it.size;
    const wood = M.part(it.material, it.color || '#8d7158');
    B(g, w, h - 0.225, d - 0.02, 0, 0.2, -0.01, wood);
    fronts(g, w, -w / 2, 0.2, h - 0.23, d / 2 - 0.02, w > 0.9 ? 2 : 1, M, { drawers: true, color: it.color || '#8d7158' });
    B(g, w + 0.01, 0.025, d, 0, h - 0.025, 0, M.part(it.top || 'quartz', '#eeebe5'));
    const basins = w > 1.3 ? [-w / 4, w / 4] : [0];
    for (const x of basins) {
      const b = C(g, 0.2, 0.17, 0.12, x, h, 0.02, M.solid(COLORS.ceramic, 0.12), 32); b.scale.z = 0.8;
      C(g, 0.17, 0.17, 0.002, x, h + 0.121, 0.02, M.solid('#e6e5e1', 0.1), 32).scale.z = 0.8;
      C(g, 0.012, 0.015, 0.24, x, h, -d / 2 + 0.06, M.solid('#d6d7d8', 0.15, 1), 12);
      B(g, 0.02, 0.02, 0.13, x, h + 0.22, -d / 2 + 0.11, M.solid('#d6d7d8', 0.15, 1));
    }
    if (it.mirror !== false) {
      B(g, w * 0.9, 0.8, 0.02, 0, h + 0.3, -d / 2 + 0.01, M.solid('#b9b7b2', 0.4, 0.5));
      // mirror: a pale, slightly glossy surface reads better than a true mirror without real reflections
      B(g, w * 0.9 - 0.04, 0.76, 0.005, 0, h + 0.32, -d / 2 + 0.022, M.solid('#d3dbdc', 0.18, 0.25));
    }
    return g;
  },
  rug(it, M) {
    const g = new THREE.Group(); const [w, d] = it.size;
    const m = B(g, w, 0.01, d, 0, 0.001, 0, M.part(it.material, it.color || '#d6cfc2'), 0.004); m.castShadow = false;
    const inner = B(g, w - 0.16, 0.002, d - 0.16, 0, 0.011, 0, M.solid(it.accent || '#e4ddd1', 1)); inner.castShadow = false;
    return g;
  },
  lamp(it, M) { // floor lamp
    const g = new THREE.Group(); const [, , h = 1.6] = it.size;
    const metal = M.solid('#2e2d2b', 0.4, 0.7);
    C(g, 0.15, 0.16, 0.025, 0, 0, 0, metal, 28); C(g, 0.012, 0.012, h - 0.35, 0, 0.025, 0, metal, 8);
    const shade = new THREE.MeshStandardMaterial({ color: '#f4ecdd', roughness: 0.9, emissive: '#ffe3b8', emissiveIntensity: 0.6, side: THREE.DoubleSide });
    const s = C(g, 0.16, 0.22, 0.34, 0, h - 0.36, 0, shade, 32); s.castShadow = false;
    return g;
  },
  media_unit(it, M) { // low cabinet + wall TV above it (TV width from item.tv, default 1.4 m)
    const g = new THREE.Group(); const [w, d = 0.42, h = 0.5] = it.size;
    const wood = M.part(it.material, it.color || COLORS.wood);
    B(g, w, h - 0.1, d, 0, 0.1, 0, wood, 0.01); legs(g, w, d, 0.1, 0.03, 0.04, M.solid(COLORS.darkwood, 0.6));
    fronts(g, w - 0.04, -w / 2 + 0.02, 0.13, h - 0.16, d / 2, Math.max(2, Math.round(w / 0.6)), M, { handle: false, color: it.accent || '#a7845f' });
    const tw = it.tv ?? 1.4;
    if (tw) { B(g, tw, tw * 0.5625, 0.03, 0, h + 0.35, -d / 2 + 0.03, M.solid('#151617', 0.25, 0.2)); B(g, tw - 0.02, tw * 0.5625 - 0.02, 0.002, 0, h + 0.36, -d / 2 + 0.046, M.solid('#0b0c0d', 0.08, 0.3)); }
    return g;
  },
  plant(it, M) {
    const g = new THREE.Group(); const [w, , h = 1.1] = it.size;
    C(g, w * 0.32, w * 0.26, h * 0.3, 0, 0, 0, M.solid(it.color || '#d8d2c6', 0.6), 24);
    const leaf = M.solid('#4f6b45', 0.8); const leaf2 = M.solid('#5f7d50', 0.8);
    const pts = [[0, 0.62, 0, 0.26], [0.12, 0.8, 0.05, 0.2], [-0.1, 0.86, -0.06, 0.2], [0.03, 0.98, 0.08, 0.17], [-0.05, 0.72, 0.12, 0.17], [0.1, 0.66, -0.1, 0.16]];
    pts.forEach(([x, y, z, r], i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * w * 1.6, 1), i % 2 ? leaf : leaf2); m.position.set(x * w * 1.6, y * h, z * w * 1.6); m.scale.y = 0.85; m.castShadow = true; g.add(m); });
    C(g, 0.015, 0.02, h * 0.4, 0, h * 0.28, 0, M.solid('#5c4a3a', 0.8), 6);
    return g;
  },
  console(it, M) { return FURNITURE.table({ ...it, chairs: 0 }, M); },
  bench(it, M) {
    const g = new THREE.Group(); const [w, d, h = 0.45] = it.size;
    B(g, w, 0.06, d, 0, h - 0.06, 0, M.part(it.material, it.color || COLORS.wood), 0.01); legs(g, w, d, h - 0.06, 0.04, 0.04, M.solid(COLORS.darkwood, 0.6));
    return g;
  },
  art(it, M) { // wall-mounted frame; set `elevation` to the bottom edge height, back of item touches the wall
    const g = new THREE.Group(); const [w, d = 0.03, h] = it.size;
    B(g, w, h, d, 0, 0, 0, M.solid(it.color || '#2c2a28', 0.5));
    B(g, w - 0.06, h - 0.06, 0.004, 0, 0.03, d / 2, M.solid('#f3f0ea', 0.9));
    B(g, w - 0.18, h - 0.18, 0.004, 0, 0.09, d / 2 + 0.003, M.solid(it.accent || '#a99c86', 0.9));
    return g;
  },
  box(it, M) { const g = new THREE.Group(); const [w, d, h] = it.size; B(g, w, h, d, 0, 0, 0, M.part(it.material, it.color || '#cccccc')); return g; },
};

export const FURNITURE_TYPES = Object.keys(FURNITURE).filter((k) => k !== 'table_lamp');

// Items with no contact shadow / collision.
export const FLAT_TYPES = new Set(['rug', 'art']);
