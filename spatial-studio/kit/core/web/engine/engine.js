// House spec (schema/house.schema.json) -> three.js scene graph.
// buildHouse() is synchronous apart from image textures; await lib.ready() before capture.
import * as THREE from 'three';
import {
  DEFAULTS, cleanPolygon, polygonArea, wallFrame, wallPieces, wallThickness, wallHeight, roomAt, insetRoomPolygon,
  furnitureRotationDeg, footprint, bbox, sub, dot, mul, add, gaps, openingDims,
} from './geom.js';
import { MaterialLibrary } from './materials.js';
import { FURNITURE, FLAT_TYPES } from './furniture.js';

export const PLAN_CUT = 1.2; // plan view cuts the house at this height, like a drawn floor plan
const P = (x, y, h = 0) => new THREE.Vector3(x, h, y); // plan (x, y) + height -> world

function boxMesh(w, h, d, mats) {
  const g = new THREE.BoxGeometry(w, h, d);
  // metre-scale UVs on every face
  const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  const m = new THREE.Mesh(g, mats); m.castShadow = true; m.receiveShadow = true; return m;
}

/** Place a box spanning wall-local [s0,s1] x [z0,z1], centred on the wall line (offset across = c). */
function wallBox(fr, elev, s0, s1, z0, z1, t, mats, c = 0) {
  const m = boxMesh(s1 - s0, z1 - z0, t, mats);
  const mid = add(add(fr.a, mul(fr.d, (s0 + s1) / 2)), mul(fr.n, c));
  m.position.copy(P(mid[0], mid[1], elev + (z0 + z1) / 2));
  m.rotation.y = -fr.angle; // local x along the wall, local z along the wall normal n
  return m;
}

/** Pleated curtain panel: a wavy cross-section extruded upwards. Origin at its left-bottom. */
function curtainGeo(w, h, folds) {
  const n = folds * 10, amp = 0.022, th = 0.012, sh = new THREE.Shape();
  const z = (i) => amp * Math.sin((i / n) * folds * Math.PI * 2);
  sh.moveTo(0, z(0));
  for (let i = 1; i <= n; i++) sh.lineTo((i / n) * w, z(i));
  for (let i = n; i >= 0; i--) sh.lineTo((i / n) * w, z(i) - th);
  const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.computeVertexNormals();
  return g;
}

let shadowTex = null;
function contactShadowTexture() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
  ctx.filter = 'blur(14px)'; ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillRect(26, 26, 76, 76);
  shadowTex = new THREE.CanvasTexture(c); return shadowTex;
}

export function buildHouse(spec, { baseUrl = '', anisotropy = 4 } = {}) {
  const lib = new MaterialLibrary(spec, { baseUrl, anisotropy });
  const root = new THREE.Group(); root.name = 'house';
  const groups = { plan: new THREE.Group(), scenery: new THREE.Group(), walls: new THREE.Group(), floors: new THREE.Group(), ceilings: new THREE.Group(), trim: new THREE.Group(), openings: new THREE.Group(), furniture: new THREE.Group(), fixtures: new THREE.Group(), site: new THREE.Group() };
  for (const [k, g] of Object.entries(groups)) { g.name = k; root.add(g); }
  groups.plan.visible = false;
  const colliders = []; // 2D OBBs: {c:[x,y], hx, hy, angle, z0, z1, level}
  const roomLights = []; // {room, light}
  const allPts = [];
  const d = spec.defaults || {};
  const trim = lib.get(d.trim || 'trim_white');
  const cut = lib.get(d.wall_cut || 'wall_cut');

  spec.levels.forEach((level, li) => {
    const elev = level.elevation || 0;
    const H = level.height || d.wall_height || DEFAULTS.wall_height;
    const roomById = Object.fromEntries((level.rooms || []).map((r) => [r.id, r]));
    const wallMat = (room, exterior) => lib.get(room?.wall || (exterior && !room ? d.exterior_wall || 'exterior_render' : d.wall || 'cream_wall'));

    // ---- floors, ceilings, skirting
    for (const room of level.rooms || []) {
      const poly = cleanPolygon(room.polygon); allPts.push(...poly);
      const shape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, -y)));
      const fg = new THREE.ShapeGeometry(shape); fg.rotateX(-Math.PI / 2);
      const floor = new THREE.Mesh(fg, lib.get(room.floor || d.floor || 'oak_floor'));
      floor.position.y = elev; floor.receiveShadow = true; floor.name = `floor:${room.id}`; floor.userData.room = room.id;
      groups.floors.add(floor);
      if (room.ceiling === 'none') continue; // open to the sky (trade-show booths, courtyards); no ceiling, no lights
      const cshape = new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y)));
      const cg = new THREE.ShapeGeometry(cshape); cg.rotateX(Math.PI / 2);
      const ceil = new THREE.Mesh(cg, lib.get(room.ceiling || d.ceiling || 'white_ceiling'));
      ceil.position.y = elev + (room.ceiling_height || H); ceil.receiveShadow = true; ceil.castShadow = true; ceil.name = `ceiling:${room.id}`;
      groups.ceilings.add(ceil);

      // skirting boards on the inner face of each walled edge, broken at doors/openings
      if (room.skirting !== false) {
        const { edges } = insetRoomPolygon(spec, level, room);
        const ins = insetRoomPolygon(spec, level, room).poly;
        edges.forEach((e, i) => {
          if (!e.walls.length) return;
          const p = ins[i], q = ins[(i + 1) % ins.length];
          const L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (L < 0.05) return;
          const dir = [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
          const blocked = [];
          for (const { wall } of e.walls) {
            const fr = wallFrame(wall);
            for (const o of (level.openings || []).filter((o) => o.wall === wall.id && o.type !== 'window')) {
              const od = openingDims(o, spec);
              const c0 = add(fr.a, mul(fr.d, o.offset - od.width / 2)), c1 = add(fr.a, mul(fr.d, o.offset + od.width / 2));
              const t0 = dot(sub(c0, p), dir), t1 = dot(sub(c1, p), dir);
              blocked.push([Math.min(t0, t1), Math.max(t0, t1)]);
            }
          }
          const solid = gaps(L, blocked, 0.03);
          const inward = [-dir[1], dir[0]];
          for (const [s0, s1] of solid) {
            const fr = { a: p, d: dir, n: inward, angle: Math.atan2(dir[1], dir[0]) };
            const sk = wallBox(fr, elev, s0, s1, 0, d.skirting_height || 0.09, 0.014, trim, 0.007);
            sk.castShadow = false; groups.trim.add(sk);
          }
        });
      }

      // ceiling lights
      for (const l of level.lights || []) {
        if (l.room !== room.id) continue;
        const [x, y] = l.position; const ch = elev + (room.ceiling_height || H);
        const warm = l.color || '#fff1e0';
        if (l.type === 'pendant') {
          const drop = l.drop ?? 0.75;
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, drop, 6), lib.solid('#222', 0.5)); cord.position.copy(P(x, y, ch - drop / 2)); groups.fixtures.add(cord);
          const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, l.radius || 0.22, 0.24, 32, 1, true), lib.solid(l.shade_color || '#2f2e2c', 0.5, 0.3, { side: THREE.DoubleSide }));
          shade.position.copy(P(x, y, ch - drop - 0.12)); shade.castShadow = true; groups.fixtures.add(shade);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8), new THREE.MeshBasicMaterial({ color: '#fff3dc' })); bulb.position.copy(P(x, y, ch - drop - 0.2)); groups.fixtures.add(bulb);
        } else {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(l.radius || 0.16, l.radius || 0.16, 0.03, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e0', emissiveIntensity: 0.9, roughness: 0.6 }));
          disc.position.copy(P(x, y, ch - 0.015)); groups.fixtures.add(disc);
        }
        if (l.emit !== false) {
          const light = new THREE.PointLight(warm, l.intensity ?? 2.4, l.distance ?? 6, 2);
          light.position.copy(P(x, y, ch - (l.type === 'pendant' ? (l.drop ?? 0.75) + 0.25 : 0.25)));
          light.visible = false; // lit only for the room the camera is in (see app.js), avoids light leaking through walls
          groups.fixtures.add(light); roomLights.push({ room: room.id, light });
        }
      }
    }

    // ---- walls (per side material from the room on that side), openings
    for (const wall of level.walls || []) {
      const fr = wallFrame(wall); const t = wallThickness(spec, wall); const WH = wallHeight(spec, level, wall);
      const mid = add(fr.a, mul(fr.d, fr.L / 2));
      const sideRoom = (sgn, s = fr.L / 2) => roomAt(level, add(add(fr.a, mul(fr.d, s)), mul(fr.n, sgn * (t / 2 + 0.05))));
      const { pieces, openings } = wallPieces(spec, level, wall);
      // Close L-corners: extend an end by half the thickness of the wall that also ENDS there (not collinear).
      // At T-junctions the end already sits inside the other wall, so no extension (avoids coplanar faces).
      const cornerExt = (pt) => {
        let e = 0;
        for (const o of level.walls || []) {
          if (o === wall) continue;
          const shares = [o.a, o.b].some((q) => Math.hypot(q[0] - pt[0], q[1] - pt[1]) < 1e-3);
          if (!shares) continue;
          const od = wallFrame(o).d; if (Math.abs(od[0] * fr.d[1] - od[1] * fr.d[0]) < 0.01) continue; // collinear continuation
          e = Math.max(e, wallThickness(spec, o) / 2);
        }
        return e;
      };
      const extA = cornerExt(fr.a), extB = cornerExt(fr.b);
      for (const pc of pieces) {
        const sm = (pc.s0 + pc.s1) / 2;
        const plus = wallMat(sideRoom(1, sm), wall.exterior), minus = wallMat(sideRoom(-1, sm), wall.exterior);
        const reveal = wallMat(sideRoom(1, sm) || sideRoom(-1, sm), false);
        const atStart = pc.s0 < 1e-6, atEnd = pc.s1 > fr.L - 1e-6;
        // solid pieces at the wall ends extend into the corner; sill/head pieces overlap their neighbours by 2 mm so no hairline cracks show
        const lap = pc.kind === 'solid' ? 0 : 0.002;
        const s0 = atStart && pc.kind === 'solid' ? pc.s0 - extA : pc.s0 - lap, s1 = atEnd && pc.kind === 'solid' ? pc.s1 + extB : pc.s1 + lap;
        // BoxGeometry groups: +x, -x, +y(top), -y(bottom), +z, -z ; local +z = wall normal n
        const endMat = (isWallEnd) => (isWallEnd ? (wall.exterior ? plus : plus) : reveal);
        const mats = [endMat(atEnd), endMat(atStart), pc.z1 >= WH - 1e-6 ? cut : reveal, reveal, plus, minus];
        const m = wallBox(fr, elev, s0, s1, pc.z0, pc.z1, t, mats);
        m.name = `wall:${wall.id}:${pc.kind}`; m.userData.wall = wall.id; groups.walls.add(m);
        if (pc.kind === 'solid' && pc.z0 < PLAN_CUT && pc.z1 > PLAN_CUT) { // poché (window sills are drawn as windows, even high ones): solid black-ish cut face for the plan view
          const pm = wallBox(fr, elev, s0, s1, PLAN_CUT - 0.01, PLAN_CUT, t, lib.solid('#34312e', 0.9)); pm.castShadow = false; groups.plan.add(pm);
        }
        if (pc.kind !== 'head' && pc.z1 > 0.5) {
          const c = add(fr.a, mul(fr.d, (s0 + s1) / 2));
          colliders.push({ c, hx: (s1 - s0) / 2, hy: t / 2, angle: fr.angle, level: li, kind: 'wall' });
        }
      }
      for (const op of openings) buildOpening(op, fr, t, elev, WH, wall, groups.openings, lib, trim, colliders, li);
    }

    // ---- furniture
    for (const it of level.furniture || []) {
      const fn = FURNITURE[it.type];
      if (!fn) { console.warn('unknown furniture type', it.type); continue; }
      const g = fn(it, lib);
      const rot = (furnitureRotationDeg(it) * Math.PI) / 180;
      g.position.copy(P(it.position[0], it.position[1], elev + (it.elevation || 0)));
      g.rotation.y = -rot; g.name = `furniture:${it.id || it.type}`; g.userData.item = it;
      groups.furniture.add(g);
      if (!FLAT_TYPES.has(it.type) && !(it.elevation > 0.3)) {
        const [w, dd] = it.size;
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.45 + 0.18, dd * 1.45 + 0.18), new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, opacity: it.type === 'lamp' || it.type === 'plant' ? 0.25 : 0.42, depthWrite: false, color: '#000000', toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }));
        sh.rotation.x = -Math.PI / 2; sh.position.copy(P(it.position[0], it.position[1], elev + 0.013)); sh.rotation.z = -rot;
        sh.renderOrder = 1; groups.furniture.add(sh);
        if (it.collide !== false && !['lamp', 'plant', 'art'].includes(it.type)) {
          colliders.push({ c: it.position, hx: w / 2, hy: dd / 2, angle: rot, level: li, kind: 'furniture' });
        }
      }
    }
  });

  // ---- site: ground, terrace, hedge, trees (what you see through the windows)
  const b = bbox(allPts);
  const site = spec.site || {};
  if (site.ground !== false) {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), lib.get(site.ground_material || 'lawn'));
    ground.rotation.x = -Math.PI / 2; ground.position.set(b.cx, -0.02, b.cy);
    // UVs in metres
    const uv = ground.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 160, uv.getY(i) * 160);
    ground.receiveShadow = true; groups.site.add(ground);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.2, 0.04, b.h + 1.2), lib.get('paving'));
    { const u = slab.geometry.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * (b.w + 1.2), u.getY(i) * (b.h + 1.2)); }
    slab.position.set(b.cx, -0.025, b.cy); slab.receiveShadow = true; groups.site.add(slab);
    const hedgeMat = lib.solid('#71895c', 0.95); const trunk = lib.solid('#5b4a3b', 0.9); const canopy = lib.solid('#5d7a4c', 0.9);
    const R = Math.max(b.w, b.h) / 2 + 14;
    for (const [sx, sy, lw, lh] of [[0, -1, 2 * R, 0.8], [0, 1, 2 * R, 0.8], [-1, 0, 0.8, 2 * R], [1, 0, 0.8, 2 * R]]) {
      const hdg = new THREE.Mesh(new THREE.BoxGeometry(lw, 1.3, lh), hedgeMat); hdg.position.set(b.cx + sx * R, 0.65, b.cy + sy * R); hdg.receiveShadow = true; groups.scenery.add(hdg);
    }
    const trees = site.trees ?? [[-7, -6, 1.8], [b.w + 7, -5, 2.2], [-8, b.h + 6, 2.0], [b.w + 6, b.h + 8, 1.6], [b.w / 2 + 1, -9.5, 2.4], [b.w / 2 - 4, b.h + 10, 1.9], [-10, b.h / 2, 2.1], [b.w + 10, b.h / 2 - 1, 1.7], [3, -11, 1.5], [b.w - 2, b.h + 12, 2.2], [-11, -1, 1.6], [b.w + 12, b.h + 1, 1.9]];
    for (const [x, y, s] of trees) {
      const tx = b.minX + x, ty = b.minY + y;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 2.2 * s, 8), trunk); tr.position.set(tx, 1.1 * s, ty); tr.castShadow = true; groups.scenery.add(tr);
      const cp = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 * s, 1), canopy); cp.position.set(tx, 2.9 * s, ty); cp.scale.y = 0.9; cp.castShadow = true; groups.scenery.add(cp);
    }
  }

  return { root, groups, colliders, roomLights, lib, bounds: b };
}

function buildOpening(op, fr, t, elev, WH, wall, group, lib, trim, colliders, li) {
  const o = op.o; const w = op.width, h = op.height, sill = op.sill;
  const cen = add(fr.a, mul(fr.d, o.offset));
  const g = new THREE.Group();
  g.position.copy(P(cen[0], cen[1], elev)); g.rotation.y = -fr.angle; g.name = `opening:${o.id}`;
  group.add(g);
  const add3 = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  const casing = (side) => { // architrave around a door/opening on one face (side = +1 / -1 along n)
    const cw = 0.07, cd = 0.016, z = side * (t / 2 + cd / 2), sideH = h + cw;
    for (const sx of [-1, 1]) add3(boxMesh(cw, sideH, cd, trim), sx * (w / 2 + cw / 2), sideH / 2, z).castShadow = false;
    add3(boxMesh(w + 2 * cw, cw, cd, trim), 0, h + cw / 2, z).castShadow = false;
  };
  const frameMat = lib.solid(o.frame_color || '#f2f0ec', 0.4, 0);
  const glass = new THREE.MeshStandardMaterial({ color: o.frosted ? '#eef2f2' : '#cfdde2', roughness: o.frosted ? 0.6 : 0.03, metalness: 0.0, transparent: true, opacity: o.frosted ? 0.85 : 0.16, depthWrite: false, envMapIntensity: 1.2 });

  if (o.type === 'window') {
    const ft = 0.06, fd = 0.08;
    for (const sx of [-1, 1]) add3(boxMesh(ft, h, fd, frameMat), sx * (w / 2 - ft / 2), sill + h / 2, 0);
    for (const sy of [0, 1]) add3(boxMesh(w, ft, fd, frameMat), 0, sill + ft / 2 + sy * (h - ft), 0);
    const panes = o.panes || (w > 1.3 ? 2 : 1);
    for (let i = 1; i < panes; i++) add3(boxMesh(0.045, h - 2 * ft, fd * 0.9, frameMat), -w / 2 + (w * i) / panes, sill + h / 2, 0);
    const gl = add3(new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * ft, h - 2 * ft), glass), 0, sill + h / 2, 0); gl.castShadow = false; gl.renderOrder = 2;
    // interior sill board on the room side(s)
    for (const side of [-1, 1]) {
      if (wall.exterior && side !== (o.inside_side ?? 1)) continue;
      add3(boxMesh(w + 0.1, 0.025, 0.05, trim), 0, sill - 0.0125, side * (t / 2 + 0.02)).castShadow = false;
    }
    if (o.curtains !== false && !o.frosted) {
      const cm = lib.solid(o.curtain_color || '#ddd4c4', 1, 0, { side: THREE.DoubleSide });
      const side = o.inside_side ?? 1, top = Math.min(WH - 0.08, sill + h + 0.22), ch = top - 0.03, cw = o.curtain_width || 0.34;
      for (const sx of [-1, 1]) {
        const cur = new THREE.Mesh(curtainGeo(cw, ch, 6), cm); cur.castShadow = true; cur.receiveShadow = true;
        add3(cur, sx * (w / 2 + 0.06) + (sx < 0 ? -cw : 0), 0.02, side * (t / 2 + 0.1));
      }
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w + 2 * cw + 0.3, 10), lib.solid('#3a3835', 0.4, 0.6));
      rod.rotation.z = Math.PI / 2; add3(rod, 0, top + 0.01, side * (t / 2 + 0.1)).castShadow = false;
    }
    return;
  }

  // doors, cased openings, sliding doors
  const jamb = lib.solid('#f2f0ec', 0.45);
  for (const sx of [-1, 1]) add3(boxMesh(0.03, h, t + 0.01, jamb), sx * (w / 2 - 0.015), h / 2, 0).castShadow = false;
  add3(boxMesh(w, 0.03, t + 0.01, jamb), 0, h - 0.015, 0).castShadow = false;
  if (o.casing !== false) { casing(1); casing(-1); }

  if (o.type === 'door') {
    const leafW = w - 0.06, leafH = h - 0.035, lt = 0.04;
    const leafMat = lib.solid(o.color || '#f4f2ee', 0.45);
    const hingeAtB = o.hinge === 'b'; // hinge at the end of the opening nearer wall end b
    const side = o.swing === '-' ? -1 : 1; // which side of the wall the door swings into (along n)
    const open = ((o.open_deg ?? (o.exterior_door ? 0 : 85)) * Math.PI) / 180;
    const pivot = new THREE.Group();
    const hx = hingeAtB ? w / 2 - 0.03 : -w / 2 + 0.03;
    pivot.position.set(hx, 0, side * (t / 2 - lt / 2 - 0.005) * (open > 0 ? 1 : 0));
    g.add(pivot);
    const dirx = hingeAtB ? -1 : 1;
    const leaf = boxMesh(leafW, leafH, lt, leafMat); leaf.position.set(dirx * leafW / 2, leafH / 2 + 0.01, 0); pivot.add(leaf);
    // simple panel detailing + handle
    if (o.panels !== false) for (const yy of [0.35, 1.25]) { const p = boxMesh(leafW - 0.2, 0.7, lt + 0.006, lib.solid(o.color || '#f4f2ee', 0.5)); p.position.set(dirx * leafW / 2, yy + 0.35, 0); p.scale.set(1, 1, 1); pivot.add(p); }
    const metal = lib.solid('#b9b6b0', 0.3, 0.9);
    for (const sz of [-1, 1]) { const hd = boxMesh(0.12, 0.02, 0.02, metal); hd.position.set(dirx * (leafW - 0.09), 1.0, sz * (lt / 2 + 0.03)); pivot.add(hd); }
    pivot.rotation.y = -side * dirx * open; // swing towards `side`
    if (open < 0.2) colliders.push({ c: cen, hx: w / 2, hy: t / 2, angle: fr.angle, level: li, kind: 'door' });
  } else if (o.type === 'sliding') {
    const ft = 0.05, fd = 0.06, n = o.panes || 2, pw = w / n;
    const fm = lib.solid(o.frame_color || '#3a3a3a', 0.4, 0.4);
    for (let i = 0; i < n; i++) {
      const zz = (i % 2 ? 1 : -1) * 0.035; const x0 = -w / 2 + pw * i + pw / 2;
      for (const sx of [-1, 1]) add3(boxMesh(ft, h - 0.03, fd, fm), x0 + sx * (pw / 2 - ft / 2), (h - 0.03) / 2, zz);
      for (const sy of [0, 1]) add3(boxMesh(pw, ft, fd, fm), x0, ft / 2 + sy * (h - 0.03 - ft), zz);
      const gl = add3(new THREE.Mesh(new THREE.PlaneGeometry(pw - 2 * ft, h - 0.03 - 2 * ft), glass), x0, (h - 0.03) / 2, zz); gl.castShadow = false; gl.renderOrder = 2;
    }
    colliders.push({ c: cen, hx: w / 2, hy: t / 2, angle: fr.angle, level: li, kind: 'door' });
  }
}

/** Resolve a viewpoint to world-space camera params. Viewpoint coords: [x, y, height] on the plan. */
export function viewpointToCamera(spec, v) {
  const lev = spec.levels.find((l) => l.id === v.level) || spec.levels[0];
  const e = lev.elevation || 0;
  return { position: P(v.position[0], v.position[1], e + v.position[2]), target: P(v.target[0], v.target[1], e + v.target[2]), fov: v.fov || 60 };
}

export { footprint };
