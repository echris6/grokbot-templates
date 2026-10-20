// Walkthrough page. Query parameters:
//   spec=<url>        house spec JSON (default: house.json next to this page)
//   view=<id>         start at a viewpoint id, or "dollhouse" / "plan"
//   capture=1         deterministic capture: no UI, no animation, sets window.__SPATIAL_READY
//   w=<px>&h=<px>     fixed render size (capture)
import * as THREE from 'three';
import { OrbitControls } from './vendor/three/addons/OrbitControls.js';
import { RoomEnvironment } from './vendor/three/addons/RoomEnvironment.js';
import { buildHouse, viewpointToCamera, PLAN_CUT } from './engine/engine.js';
import { roomAt, cleanPolygon, bbox, polygonArea, DEFAULTS } from './engine/geom.js';

const q = new URLSearchParams(location.search);
const CAPTURE = q.get('capture') === '1';
const specUrl = new URL(q.get('spec') || 'house.json', location.href).href;
if (CAPTURE) document.body.classList.add('capture');
window.__SPATIAL_READY = false;

const $ = (s) => document.querySelector(s);
function fail(msg) { const e = $('#error'); e.hidden = false; e.textContent = msg; window.__SPATIAL_ERROR = msg; console.error(msg); }

const canvas = $('#view');
const overlay = $('#overlay');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: CAPTURE, powerPreference: 'high-performance' });
renderer.setPixelRatio(CAPTURE ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(60, 1, 0.05, 400);
persp.rotation.order = 'YXZ';
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
let camera = persp;

function size() {
  const w = Number(q.get('w')) || window.innerWidth, h = Number(q.get('h')) || window.innerHeight;
  return [w, h];
}

function skyTexture(top, horizon, ground) {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, top); grd.addColorStop(0.48, horizon); grd.addColorStop(0.52, horizon); grd.addColorStop(1, ground);
  g.fillStyle = grd; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

async function main() {
  let spec;
  try { const r = await fetch(specUrl); if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); spec = await r.json(); }
  catch (e) { fail(`Could not load the house spec (${specUrl}): ${e.message}`); return; }

  const R = spec.render || {};
  const meta = spec.meta || {};
  document.title = meta.name ? `${meta.name} · Interactive floor plan` : 'Interactive floor plan';
  $('#house-name').textContent = meta.name || 'House';
  const badge = meta.label || (meta.fictional ? 'Fictional sample house' : '');
  if (badge) { $('#badge').hidden = false; $('#badge').textContent = badge; }

  scene.background = skyTexture(R.sky_top || '#bccfdf', R.sky_horizon || '#e9eef0', R.sky_ground || '#c9c4b8');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = R.env_intensity ?? 0.6;
  renderer.toneMappingExposure = R.exposure ?? 1.0;

  const house = buildHouse(spec, { baseUrl: specUrl, anisotropy: renderer.capabilities.getMaxAnisotropy() });
  scene.add(house.root);
  const b = house.bounds;
  const centre = new THREE.Vector3(b.cx, 0, b.cy);

  const hemi = new THREE.HemisphereLight(R.hemi_sky || '#f6f3ec', R.hemi_ground || '#a99b86', R.hemi_intensity ?? 0.7);
  scene.add(hemi);
  // Sun: azimuth = compass bearing (deg clockwise from north), north = plan up unless meta.north_deg says otherwise
  const az = (((R.sun_azimuth_deg ?? 215) - (meta.north_deg || 0)) * Math.PI) / 180, el = ((R.sun_elevation_deg ?? 32) * Math.PI) / 180;
  const sun = new THREE.DirectionalLight(R.sun_color || '#fff0dc', R.sun_intensity ?? 2.4);
  const toSun = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  sun.position.copy(centre).addScaledVector(toSun, 40); sun.target.position.copy(centre);
  sun.castShadow = true; sun.shadow.mapSize.set(R.shadow_map ?? 2048, R.shadow_map ?? 2048);
  const ext = Math.max(b.w, b.h) / 2 + 4;
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 90 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  // ---------- views
  const views = spec.viewpoints || [];
  const level0 = spec.levels[0];
  const eye = spec.defaults?.eye_height ?? DEFAULTS.eye_height;
  let mode = 'walk';
  let yaw = 0, pitch = 0;
  const orbit = new OrbitControls(persp, canvas); orbit.enabled = false; orbit.enableDamping = !CAPTURE;
  orbit.maxPolarAngle = THREE.MathUtils.degToRad(68); orbit.minPolarAngle = THREE.MathUtils.degToRad(20);
  orbit.minDistance = 6; orbit.maxDistance = 60;

  function setRoomLights(roomId) { for (const { room, light } of house.roomLights) light.visible = room === roomId && mode === 'walk'; }
  function showInterior(on) { house.groups.ceilings.visible = on; house.groups.fixtures.visible = on; }

  // Viewpoint fovs are authored for 16:10 photos. On narrow (portrait) screens keep the same
  // horizontal framing by widening the vertical fov, capped at 100 degrees.
  function screenFov(fov) {
    const aspect = persp.aspect || 1.6; if (aspect >= 1.2) return fov;
    const h = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.6);
    return Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(h / 2) / aspect)));
  }
  function lookFrom(pos, target, fov) {
    persp.position.copy(pos);
    const d = new THREE.Vector3().subVectors(target, pos).normalize();
    yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
    persp.rotation.set(pitch, yaw, 0); persp.fov = screenFov(fov); persp.updateProjectionMatrix();
  }

  let fly = null;
  function goToViewpoint(v, animate = !CAPTURE) {
    setMode('walk', false);
    const c = viewpointToCamera(spec, v);
    if (!animate) { lookFrom(c.position, c.target, c.fov); }
    else {
      const from = { p: persp.position.clone(), yaw, pitch, fov: persp.fov };
      const tmp = new THREE.Object3D(); tmp.position.copy(c.position); tmp.lookAt(c.target);
      const d = new THREE.Vector3().subVectors(c.target, c.position).normalize();
      let ty = Math.atan2(-d.x, -d.z); while (ty - from.yaw > Math.PI) ty -= 2 * Math.PI; while (ty - from.yaw < -Math.PI) ty += 2 * Math.PI;
      fly = { t0: performance.now(), dur: 900, from, to: { p: c.position, yaw: ty, pitch: Math.asin(d.y), fov: screenFov(c.fov) } };
    }
    setRoomLights(v.room || roomAt(level0, [c.position.x, c.position.z])?.id);
    document.querySelectorAll('#room-list button').forEach((x) => x.classList.toggle('on', x.dataset.view === v.id));
  }

  function setMode(m, reposition = true) {
    mode = m;
    document.querySelectorAll('.modes button').forEach((x) => x.classList.toggle('on', x.dataset.mode === m));
    orbit.enabled = m === 'dollhouse';
    showInterior(m === 'walk');
    house.groups.plan.visible = m === 'plan';
    house.groups.scenery.visible = m === 'walk';
    renderer.clippingPlanes = m === 'plan' ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), PLAN_CUT + 0.002)] : [];
    $('#crosshair').hidden = true;
    if (m !== 'walk' && document.pointerLockElement) document.exitPointerLock();
    if (m === 'walk') { camera = persp; setRoomLights(roomAt(level0, [persp.position.x, persp.position.z])?.id); }
    if (m === 'dollhouse') {
      camera = persp; setRoomLights(null);
      if (reposition) {
        const r = Math.max(b.w, b.h);
        persp.fov = 38; persp.updateProjectionMatrix();
        persp.position.set(b.cx - r * 0.55, r * 1.05, b.maxY + r * 0.75);
        orbit.target.set(b.cx, 0, b.cy); persp.up.set(0, 1, 0); orbit.update();
      }
    }
    if (m === 'plan') { camera = ortho; setRoomLights(null); fitPlan(); }
    hint();
    drawOverlay();
  }

  // Plan view: orthographic, north up, fixed pixels-per-metre (reported in window.studio.plan)
  const planInfo = {};
  function fitPlan() {
    const [w, h] = size(); const m = 1.6;
    const ppm = Math.floor(Math.min(w / (b.w + 2 * m), (h - (CAPTURE ? 0 : 60)) / (b.h + 2 * m)));
    Object.assign(planInfo, { ppm, cx: b.cx, cy: b.cy, width: w, height: h });
    ortho.left = -w / 2 / ppm; ortho.right = w / 2 / ppm; ortho.top = h / 2 / ppm; ortho.bottom = -h / 2 / ppm;
    ortho.position.set(b.cx, 60, b.cy); ortho.up.set(0, 0, -1); ortho.lookAt(b.cx, 0, b.cy); ortho.updateProjectionMatrix();
  }
  function toScreen(x, y) { // plan metres -> overlay pixels (plan mode)
    return [planInfo.width / 2 + (x - planInfo.cx) * planInfo.ppm, planInfo.height / 2 + (y - planInfo.cy) * planInfo.ppm];
  }
  function drawOverlay() {
    const [w, h] = size(); overlay.width = w; overlay.height = h; overlay.style.width = w + 'px'; overlay.style.height = h + 'px';
    const g = overlay.getContext('2d'); g.clearRect(0, 0, w, h);
    if (mode !== 'plan') return;
    const ppm = planInfo.ppm;
    // 1 m grid
    g.strokeStyle = 'rgba(40,60,90,0.13)'; g.lineWidth = 1;
    for (let x = Math.floor(b.minX - 1); x <= b.maxX + 1; x++) { const [sx] = toScreen(x, 0); g.beginPath(); g.moveTo(sx + 0.5, toScreen(0, b.minY - 1)[1]); g.lineTo(sx + 0.5, toScreen(0, b.maxY + 1)[1]); g.stroke(); }
    for (let y = Math.floor(b.minY - 1); y <= b.maxY + 1; y++) { const [, sy] = toScreen(0, y); g.beginPath(); g.moveTo(toScreen(b.minX - 1, 0)[0], sy + 0.5); g.lineTo(toScreen(b.maxX + 1, 0)[0], sy + 0.5); g.stroke(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const lev of spec.levels.slice(0, 1)) for (const room of lev.rooms || []) {
      const poly = cleanPolygon(room.polygon); const bb = bbox(poly); const area = Math.abs(polygonArea(poly));
      const rect = Math.abs(area - bb.w * bb.h) < 0.01;
      const [sx, sy] = toScreen(...(room.label_at || [bb.cx, bb.cy]));
      const l1 = room.name, l2 = rect ? `${bb.w.toFixed(2)} × ${bb.h.toFixed(2)} m` : `${area.toFixed(1)} m²`;
      g.font = '600 13px ui-sans-serif, system-ui, sans-serif'; const tw = Math.max(g.measureText(l1).width, 90);
      g.fillStyle = 'rgba(255,255,255,0.82)'; g.fillRect(sx - tw / 2 - 6, sy - 17, tw + 12, 34);
      g.fillStyle = '#1f1d1a'; g.fillText(l1, sx, sy - 7);
      g.font = '12px ui-sans-serif, system-ui, sans-serif'; g.fillStyle = '#5a554e'; g.fillText(l2, sx, sy + 8);
    }
    // scale bar + north arrow + ppm
    const x0 = 24, y0 = h - 30; g.fillStyle = '#1f1d1a';
    for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#1f1d1a'; g.fillRect(x0 + i * ppm, y0, ppm, 7); }
    g.strokeStyle = '#1f1d1a'; g.strokeRect(x0, y0, 5 * ppm, 7); g.fillStyle = '#1f1d1a'; g.font = '12px ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText(`0      5 m   ·   ${ppm} px = 1 m   ·   grid 1 m`, x0, y0 - 12);
    const nx = w - 40, ny = 40; g.beginPath(); g.moveTo(nx, ny - 16); g.lineTo(nx + 8, ny + 10); g.lineTo(nx, ny + 4); g.lineTo(nx - 8, ny + 10); g.closePath(); g.fill(); g.textAlign = 'center'; g.fillText('N', nx, ny + 24);
  }

  // ---------- walk controls: pointer lock + WASD, collision with walls/furniture
  const keys = new Set();
  const RADIUS = 0.22;
  function collide(px, pz) {
    let p = [px, pz];
    for (let iter = 0; iter < 3; iter++) for (const c of house.colliders) {
      const ca = Math.cos(-c.angle), sa = Math.sin(-c.angle);
      const rx = p[0] - c.c[0], ry = p[1] - c.c[1];
      const lx = rx * ca - ry * sa, ly = rx * sa + ry * ca;
      const cx = Math.max(-c.hx, Math.min(c.hx, lx)), cy = Math.max(-c.hy, Math.min(c.hy, ly));
      let dx = lx - cx, dy = ly - cy; const d = Math.hypot(dx, dy);
      if (d >= RADIUS) continue;
      let nx, ny, push;
      if (d < 1e-6) { // centre inside the box: leave along the shallowest axis
        const px2 = c.hx - Math.abs(lx), py2 = c.hy - Math.abs(ly);
        if (px2 < py2) { nx = Math.sign(lx) || 1; ny = 0; push = px2 + RADIUS; } else { nx = 0; ny = Math.sign(ly) || 1; push = py2 + RADIUS; }
      } else { nx = dx / d; ny = dy / d; push = RADIUS - d; }
      const wx = nx * Math.cos(c.angle) - ny * Math.sin(c.angle), wy = nx * Math.sin(c.angle) + ny * Math.cos(c.angle);
      p = [p[0] + wx * push, p[1] + wy * push];
    }
    return p;
  }

  if (!CAPTURE) {
    canvas.addEventListener('click', () => { if (mode === 'walk' && !matchMedia('(pointer: coarse)').matches) canvas.requestPointerLock?.(); });
    document.addEventListener('pointerlockchange', () => { $('#crosshair').hidden = document.pointerLockElement !== canvas; hint(); });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas || mode !== 'walk') return;
      yaw -= e.movementX * 0.0022; pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -1.3, 1.3); fly = null;
    });
    addEventListener('keydown', (e) => { keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', (e) => keys.delete(e.code));
    addEventListener('blur', () => keys.clear());
    // touch / no pointer lock: drag to look
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => { if (mode === 'walk' && e.pointerType !== 'mouse') drag = { x: e.clientX, y: e.clientY }; });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return; yaw += (e.clientX - drag.x) * 0.005; pitch = THREE.MathUtils.clamp(pitch + (e.clientY - drag.y) * 0.005, -1.2, 1.2); drag = { x: e.clientX, y: e.clientY }; fly = null;
    });
    addEventListener('pointerup', () => { drag = null; });
    document.querySelectorAll('.modes button').forEach((btn) => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
    addEventListener('resize', resize);
  }

  function hint() {
    const touch = matchMedia('(pointer: coarse)').matches;
    $('#hint').textContent = mode === 'walk'
      ? touch ? 'Drag to look around · tap a room to go there' : document.pointerLockElement ? 'W A S D to walk · mouse to look · Shift to hurry · Esc to release' : 'Click to look around · W A S D to walk · pick a room on the left'
      : mode === 'dollhouse' ? 'Drag to orbit · scroll to zoom · pick a room to walk in' : 'Plan view, to scale · 1 m grid';
  }

  // room list
  const list = $('#room-list');
  for (const v of views) {
    const li = document.createElement('li'); const btn = document.createElement('button');
    btn.textContent = v.label || v.id; btn.dataset.view = v.id; btn.addEventListener('click', () => goToViewpoint(v));
    li.appendChild(btn); list.appendChild(li);
  }

  function resize() {
    const [w, h] = size(); renderer.setSize(w, h, false); canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    persp.aspect = w / h; persp.updateProjectionMatrix(); if (mode === 'plan') fitPlan(); drawOverlay();
  }
  resize();

  // initial view
  const start = q.get('view') || views[0]?.id;
  if (start === 'dollhouse') setMode('dollhouse');
  else if (start === 'plan') setMode('plan');
  else {
    const v = views.find((x) => x.id === start) || views[0];
    if (v) goToViewpoint(v, false);
    else { lookFrom(new THREE.Vector3(b.cx, eye, b.cy), new THREE.Vector3(b.cx + 1, eye, b.cy), 60); }
    setMode('walk', false);
  }

  window.studio = {
    spec, views: views.map((v) => v.id), plan: planInfo, mode: () => mode,
    collide: (x, z) => collide(x, z).map((v) => +v.toFixed(3)), // test hook: where a walker at (x, z) gets pushed
    camera: () => ({ position: persp.position.toArray().map((x) => +x.toFixed(3)), yaw: +yaw.toFixed(3), room: roomAt(level0, [persp.position.x, persp.position.z])?.id || null }),
    setView: (id) => { if (id === 'dollhouse' || id === 'plan') setMode(id); else goToViewpoint(views.find((x) => x.id === id), false); renderOnce(); },
  };

  function renderOnce() { renderer.render(scene, camera); }

  await house.lib.ready();
  await renderer.compileAsync(scene, camera);
  if (CAPTURE) {
    renderOnce(); await new Promise((r) => requestAnimationFrame(r)); renderOnce();
    await new Promise((r) => requestAnimationFrame(r));
    window.__SPATIAL_READY = true; document.body.dataset.ready = '1';
    return;
  }

  // animation loop (interactive only)
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'walk') {
      if (fly) {
        const k = Math.min(1, (now - fly.t0) / fly.dur); const e = k * k * (3 - 2 * k);
        persp.position.lerpVectors(fly.from.p, fly.to.p, e);
        yaw = fly.from.yaw + (fly.to.yaw - fly.from.yaw) * e; pitch = fly.from.pitch + (fly.to.pitch - fly.from.pitch) * e;
        persp.fov = fly.from.fov + (fly.to.fov - fly.from.fov) * e; persp.updateProjectionMatrix();
        if (k >= 1) fly = null;
      } else {
        const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
        if (f || s) {
          const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 2.6 : 1.4) * dt;
          const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const [nx, nz] = collide(persp.position.x + (fx * f + rx * s) * speed, persp.position.z + (fz * f + rz * s) * speed);
          persp.position.x = nx; persp.position.z = nz;
          persp.position.y += (eye + (level0.elevation || 0) - persp.position.y) * Math.min(1, dt * 4);
          const r = roomAt(level0, [nx, nz]); if (r) setRoomLights(r.id);
        }
      }
      persp.rotation.set(pitch, yaw, 0);
    } else if (mode === 'dollhouse') orbit.update();
    renderer.render(scene, camera);
  });
}

main().catch((e) => fail(String(e?.stack || e)));
