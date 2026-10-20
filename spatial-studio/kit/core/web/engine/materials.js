// Materials for house specs: named materials from spec.materials, procedural textures drawn
// on a canvas with a seeded PRNG (deterministic captures), or an image texture from the spec.
import * as THREE from 'three';
import { rng } from './geom.js';

const PPM = 256; // texture pixels per metre for procedural patterns

function hsl(hex) { const c = new THREE.Color(hex); const o = {}; c.getHSL(o); return o; }
function shade(hex, dl = 0, ds = 0, dh = 0) {
  const o = hsl(hex);
  return '#' + new THREE.Color().setHSL((o.h + dh + 1) % 1, Math.min(1, Math.max(0, o.s + ds)), Math.min(1, Math.max(0, o.l + dl))).getHexString();
}
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function speckle(ctx, w, h, rand, color, n, rMax, alpha) {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + 0.6 * rand());
    ctx.beginPath(); ctx.arc(rand() * w, rand() * h, 0.5 + rand() * rMax, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const PATTERNS = {
  // Engineered wood planks, staggered joints, per-plank tone and grain.
  planks(m, rand) {
    const size = m.pattern_size_m || 2.4; // tile repeats every size metres
    const W = Math.round(size * PPM); const [c, ctx] = canvas(W, W);
    const pw = (m.plank_width || 0.19) * PPM, pl = (m.plank_length || 1.2) * PPM;
    const rows = Math.round(W / pw); const rh = W / rows;
    for (let r = 0; r < rows; r++) {
      // planks around a circular row so the texture tiles seamlessly
      const start = rand() * pl; let x = start;
      while (x < start + W - 1) {
        let L = pl * (0.7 + rand() * 0.6);
        if (x + L > start + W - pl * 0.35) L = start + W - x; // last plank closes the row exactly
        const tone = shade(m.color, (rand() - 0.5) * (m.tone_var ?? 0.04), (rand() - 0.5) * 0.04, (rand() - 0.5) * 0.008);
        const grain = [];
        for (let gi = 0; gi < 10; gi++) grain.push([rand() * rh, 0.12 + rand() * 0.16, 0.5 + rand() * 1.2, rand() * 2.2, shade(tone, -0.05 - rand() * 0.05)]);
        for (const ox of [0, -W]) {
          const px = x + ox; if (px > W || px + L < 0) continue;
          ctx.fillStyle = tone; ctx.fillRect(px, r * rh, L, rh);
          for (const [gy, ga, gw, amp, gc] of grain) {
            ctx.strokeStyle = gc; ctx.globalAlpha = ga; ctx.lineWidth = gw; ctx.beginPath(); ctx.moveTo(px, r * rh + gy);
            for (let s2 = 1; s2 <= 8; s2++) ctx.lineTo(px + (L * s2) / 8, r * rh + gy + Math.sin(s2 * 1.3 + gy) * amp);
            ctx.stroke();
          }
          ctx.globalAlpha = 0.7; ctx.fillStyle = shade(m.color, -0.2); ctx.fillRect(px, r * rh, 1.2, rh); ctx.globalAlpha = 1;
        }
        x += L;
      }
      ctx.fillStyle = shade(m.color, -0.18); ctx.globalAlpha = 0.6; ctx.fillRect(0, r * rh, W, 1); ctx.globalAlpha = 1;
    }
    return { c, size };
  },
  // Square or rectangular tiles with grout.
  tiles(m, rand) {
    const tw = m.tile_size_m?.[0] ?? m.tile_size_m ?? 0.6, th = m.tile_size_m?.[1] ?? tw;
    const nx = Math.max(1, Math.round(2.4 / tw)), ny = Math.max(1, Math.round(2.4 / th));
    const size = [nx * tw, ny * th];
    const [c, ctx] = canvas(Math.round(size[0] * PPM), Math.round(size[1] * PPM));
    const grout = m.grout_color || shade(m.color, -0.12); const gw = Math.max(1.5, (m.grout_m || 0.003) * PPM);
    ctx.fillStyle = grout; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const off = m.stagger && j % 2 ? tw * PPM / 2 : 0;
      for (const dx of off ? [-c.width, 0] : [0]) {
        const x = i * tw * PPM + off + dx, y = j * th * PPM;
        ctx.fillStyle = shade(m.color, (rand() - 0.5) * 0.03);
        ctx.fillRect(x + gw / 2, y + gw / 2, tw * PPM - gw, th * PPM - gw);
      }
    }
    speckle(ctx, c.width, c.height, rand, shade(m.color, -0.08), 900, 1.2, 0.25);
    return { c, size };
  },
  carpet(m, rand) {
    const size = 1.2; const W = Math.round(size * PPM); const [c, ctx] = canvas(W, W);
    ctx.fillStyle = m.color; ctx.fillRect(0, 0, W, W);
    speckle(ctx, W, W, rand, shade(m.color, -0.07), 9000, 0.9, 0.35);
    speckle(ctx, W, W, rand, shade(m.color, 0.06), 6000, 0.8, 0.3);
    return { c, size };
  },
  // Quartz / marble-ish counter: soft veins.
  stone(m, rand) {
    const size = 1.6; const W = Math.round(size * PPM); const [c, ctx] = canvas(W, W);
    ctx.fillStyle = m.color; ctx.fillRect(0, 0, W, W);
    speckle(ctx, W, W, rand, shade(m.color, -0.1), 2500, 1.0, 0.18);
    for (let v = 0; v < 5; v++) {
      ctx.strokeStyle = m.vein_color || shade(m.color, -0.25); ctx.globalAlpha = 0.12 + rand() * 0.15; ctx.lineWidth = 0.8 + rand() * 1.8;
      let x = rand() * W, y = 0; ctx.beginPath(); ctx.moveTo(x, y);
      while (y < W) { x += (rand() - 0.5) * 60; y += 20 + rand() * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; return { c, size };
  },
  plaster(m, rand) {
    const size = 2; const W = 256; const [c, ctx] = canvas(W, W);
    ctx.fillStyle = m.color; ctx.fillRect(0, 0, W, W);
    speckle(ctx, W, W, rand, shade(m.color, -0.03), 1500, 2.5, 0.12);
    return { c, size };
  },
  grass(m, rand) {
    const size = 4; const W = 512; const [c, ctx] = canvas(W, W);
    ctx.fillStyle = m.color; ctx.fillRect(0, 0, W, W);
    speckle(ctx, W, W, rand, shade(m.color, -0.08), 14000, 1.3, 0.5);
    speckle(ctx, W, W, rand, shade(m.color, 0.07, 0.05), 9000, 1.0, 0.4);
    return { c, size };
  },
  fabric(m, rand) {
    const size = 0.5; const W = 256; const [c, ctx] = canvas(W, W);
    ctx.fillStyle = m.color; ctx.fillRect(0, 0, W, W);
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < W; i += 2) { ctx.fillStyle = i % 4 ? shade(m.color, 0.05) : shade(m.color, -0.05); ctx.fillRect(i, 0, 1, W); ctx.fillRect(0, i, W, 1); }
    ctx.globalAlpha = 1; speckle(ctx, W, W, rand, shade(m.color, -0.06), 1500, 0.7, 0.3);
    return { c, size };
  },
};

export const BUILTIN = {
  cream_wall: { color: '#ebe6dd', roughness: 0.92 },
  white_ceiling: { color: '#f3f1ec', roughness: 0.95, emissive: '#f3f1ec', emissive_intensity: 0.28 }, // emissive = cheap stand-in for light bounced off the floor
  oak_floor: { color: '#b8946c', roughness: 0.55, pattern: 'planks', plank_length: 1.6 },
  grey_tile: { color: '#cfcbc4', roughness: 0.35, pattern: 'tiles', tile_size_m: 0.6 },
  white_tile_wall: { color: '#eeece8', roughness: 0.25, pattern: 'tiles', tile_size_m: [0.3, 0.6], stagger: true, grout_color: '#d9d6d0' },
  beige_carpet: { color: '#c9bba6', roughness: 1, pattern: 'carpet' },
  exterior_render: { color: '#d8d3ca', roughness: 0.95, pattern: 'plaster' },
  wall_cut: { color: '#55524e', roughness: 0.9 },
  trim_white: { color: '#f4f2ee', roughness: 0.5 },
  quartz: { color: '#eeebe5', roughness: 0.25, pattern: 'stone' },
  lawn: { color: '#7d9461', roughness: 1, pattern: 'grass' },
  paving: { color: '#bdb6aa', roughness: 0.9, pattern: 'tiles', tile_size_m: 0.6 },
};

export class MaterialLibrary {
  constructor(spec, { baseUrl = '', anisotropy = 4, seed = 7 } = {}) {
    this.defs = { ...BUILTIN, ...(spec.materials || {}) };
    this.cache = new Map();
    this.baseUrl = baseUrl;
    this.anisotropy = anisotropy;
    this.seed = seed;
    this.pending = [];
    this.loader = new THREE.TextureLoader();
  }

  def(ref) {
    if (!ref) return null;
    if (typeof ref === 'object') return ref;
    if (ref.startsWith('#')) return { color: ref, roughness: 0.8 };
    return this.defs[ref] || { color: '#ff00ff', roughness: 1, _missing: ref };
  }

  /** Material in world-metre UV space (floors, walls, ceilings). */
  get(ref, { side = THREE.FrontSide, uvScale = 1 } = {}) {
    const key = JSON.stringify([ref, side, uvScale]);
    if (this.cache.has(key)) return this.cache.get(key);
    const m = this.def(ref);
    const mat = new THREE.MeshStandardMaterial({
      color: m.color || '#ffffff',
      roughness: m.roughness ?? 0.8,
      metalness: m.metalness ?? 0,
      side,
    });
    if (m.emissive) { mat.emissive = new THREE.Color(m.emissive); mat.emissiveIntensity = m.emissive_intensity ?? 1; }
    if (m.opacity !== undefined && m.opacity < 1) { mat.transparent = true; mat.opacity = m.opacity; mat.depthWrite = false; }
    if (m.texture) {
      const url = new URL(m.texture, this.baseUrl || location.href).href;
      const [sw, sh] = m.texture_size_m || [1, 1];
      this.pending.push(new Promise((res) => {
        this.loader.load(url, (t) => {
          t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.repeat.set(uvScale / sw, uvScale / sh); t.anisotropy = this.anisotropy;
          mat.map = t; mat.color.set('#ffffff'); mat.needsUpdate = true; res();
        }, undefined, () => { console.warn('texture failed', url); res(); });
      }));
    } else if (m.pattern && PATTERNS[m.pattern]) {
      const seed = this.seed + [...String(ref)].reduce((s, ch) => s + ch.charCodeAt(0), 0);
      const { c, size } = PATTERNS[m.pattern](m, rng(seed));
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = this.anisotropy;
      const [sx, sy] = Array.isArray(size) ? size : [size, size];
      t.repeat.set(uvScale / sx, uvScale / sy);
      if (m.rotate_deg) t.rotation = (m.rotate_deg * Math.PI) / 180;
      mat.map = t; mat.color.set('#ffffff');
    }
    this.cache.set(key, mat);
    return mat;
  }

  /** Plain colour material for furniture parts (cached by colour+roughness). */
  solid(color, roughness = 0.7, metalness = 0, extra = {}) {
    const key = JSON.stringify(['solid', color, roughness, metalness, extra]);
    if (this.cache.has(key)) return this.cache.get(key);
    const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    this.cache.set(key, mat);
    return mat;
  }

  /** A named or inline material for furniture: pattern textures are scaled to the part, not the room. */
  part(ref, fallback) {
    if (!ref) return this.solid(fallback);
    const m = this.def(ref);
    if (m.pattern || m.texture) return this.get(ref);
    return this.solid(m.color, m.roughness ?? 0.7, m.metalness ?? 0);
  }

  ready() { return Promise.all(this.pending); }
}
