#!/usr/bin/env node
// Deterministic screenshots of every named viewpoint, plus a dollhouse and a to-scale plan view.
//
//   node capture.mjs --spec <house.json> --out <dir> [--views all|id1,id2,plan,dollhouse]
//                    [--width 1280] [--height 800] [--gl swiftshader|gpu] [--timeout 120]
//                    [--root <web dir>]   (a job's copy of web/ with a custom scene module)
//
// Loads web/index.html?spec=…&view=<id>&capture=1 once per view in headless Chromium, waits for
// window.__SPATIAL_READY, and writes <out>/<id>.png plus <out>/captures.json (paths, plan scale,
// timings). Software GL (SwiftShader) is the default because the Grok Bot computer has no known GPU.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { startServer } from './serve.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const specPath = resolve(arg('spec', ''));
if (!arg('spec')) { console.error('usage: capture.mjs --spec house.json --out dir [--views all]'); process.exit(2); }
const out = resolve(arg('out', join(dirname(specPath), 'captures')));
const W = Number(arg('width', 1280)), H = Number(arg('height', 800));
const gl = arg('gl', 'swiftshader');
const timeout = Number(arg('timeout', 120)) * 1000;

const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const all = [...(spec.viewpoints || []).map((v) => v.id), 'dollhouse', 'plan'];
const want = arg('views', 'all') === 'all' ? all : arg('views').split(',').map((s) => s.trim()).filter(Boolean);
const unknown = want.filter((v) => !all.includes(v));
if (unknown.length) { console.error(`unknown view(s): ${unknown.join(', ')}. Known: ${all.join(', ')}`); process.exit(2); }

mkdirSync(out, { recursive: true });
const root = arg('root') ? resolve(arg('root')) : undefined;
const { server, url } = await startServer({ specDir: dirname(specPath), ...(root ? { root } : {}) });
const args = gl === 'swiftshader' ? ['--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--ignore-gpu-blocklist', '--enable-gpu'];
const browser = await chromium.launch({ headless: true, args });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

const results = [];
let failed = 0;
for (const view of want) {
  const t0 = Date.now();
  const u = `${url}/index.html?spec=/spec/${encodeURIComponent(basename(specPath))}&view=${encodeURIComponent(view)}&capture=1&w=${W}&h=${H}`;
  try {
    await page.goto(u, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__SPATIAL_READY === true || window.__SPATIAL_ERROR, null, { timeout, polling: 200 });
    const err = await page.evaluate(() => window.__SPATIAL_ERROR || null);
    if (err) throw new Error(err);
    const file = join(out, `${view}.png`);
    await page.screenshot({ path: file, type: 'png' });
    const extra = view === 'plan' ? await page.evaluate(() => ({ ...window.studio.plan })) : undefined;
    results.push({ view, file, ms: Date.now() - t0, ...(extra ? { plan: extra } : {}) });
    console.log(`ok   ${view.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(1)}s  ${file}`);
  } catch (e) {
    failed++; results.push({ view, error: String(e.message || e) });
    console.log(`FAIL ${view.padEnd(16)} ${e.message}`);
  }
}
const renderer = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c && c.getExtension('WEBGL_debug_renderer_info');
  return c ? (ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER)) : 'no webgl2';
}).catch(() => 'unknown');
await browser.close(); server.close();
writeFileSync(join(out, 'captures.json'), JSON.stringify({ spec: specPath, size: [W, H], gl, renderer, captured_at: new Date().toISOString(), results, console: logs.slice(0, 50) }, null, 2));
console.log(`${results.length - failed}/${results.length} views captured · renderer: ${renderer} · ${join(out, 'captures.json')}`);
if (logs.length) console.log(`console: ${logs.length} warning/error lines (see captures.json)`);
process.exit(failed ? 1 : 0);
