#!/usr/bin/env node
// Package a walkable site for one spec.
//
//   node build-site.mjs --spec house.json --out <dir> [--title "…"] [--index yes|no] [--zip]
//
// Writes:
//   <out>/dist/client/           static site: index.html, app.js, engine/, vendor/three/, house.json, textures
//                                 (the layout Whop's Vite plugin serves: "assets from dist/client are served directly")
//   <out>/whop-app/              a minimal Vite project for `whop apps deploy` (Path B in references/delivery.md):
//                                 public/tour/ = the site, index.html redirects to /tour/
//   <out>/<slug>.zip             (with --zip) the same static site for clients who host it themselves
// Reference photos are NOT copied: they are the client's material and stay in the job folder.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!arg('spec') || !arg('out')) { console.error('usage: build-site.mjs --spec house.json --out dir [--title …] [--index no] [--zip]'); process.exit(2); }
const specPath = resolve(arg('spec')), out = resolve(arg('out'));
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const title = arg('title', spec.meta?.name ? `${spec.meta.name} · Interactive floor plan` : 'Interactive floor plan');
const allowIndex = arg('index', 'no') === 'yes';
const slug = (spec.meta?.name || 'house').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'house';

const client = join(out, 'dist', 'client');
rmSync(join(out, 'dist'), { recursive: true, force: true });
mkdirSync(client, { recursive: true });
const web = join(HERE, 'web');
for (const f of ['app.js', 'style.css']) cpSync(join(web, f), join(client, f));
cpSync(join(web, 'engine'), join(client, 'engine'), { recursive: true });
cpSync(join(web, 'vendor'), join(client, 'vendor'), { recursive: true });

// spec + any textures it references (paths relative to the spec)
const copied = [];
const shipped = JSON.parse(JSON.stringify(spec));
for (const [name, m] of Object.entries(shipped.materials || {})) {
  if (!m.texture || /^https?:/.test(m.texture)) continue;
  const src = resolve(dirname(specPath), m.texture);
  if (!existsSync(src)) { console.warn(`warning: texture for ${name} not found: ${src}`); continue; }
  const dest = join('textures', basename(m.texture)); mkdirSync(join(client, 'textures'), { recursive: true });
  cpSync(src, join(client, dest)); m.texture = dest; copied.push(dest);
}
for (const v of shipped.viewpoints || []) delete v.photo; // never publish the client's reference photos by accident
writeFileSync(join(client, 'house.json'), JSON.stringify(shipped));

let html = readFileSync(join(web, 'index.html'), 'utf8');
html = html.replace(/<title>.*?<\/title>/, `<title>${title.replace(/</g, '&lt;')}</title>`);
const head = [`<meta name="description" content="Walk through ${String(spec.meta?.name || 'this home').replace(/"/g, '')} in 3D, to scale from the floor plan." />`];
if (!allowIndex) head.push('<meta name="robots" content="noindex, nofollow" />');
html = html.replace('</head>', `  ${head.join('\n  ')}\n</head>`);
writeFileSync(join(client, 'index.html'), html);

// Path B: a minimal Vite project for `whop apps deploy` (UNVERIFIED end to end: see references/delivery.md)
const app = join(out, 'whop-app');
rmSync(join(app, 'public', 'tour'), { recursive: true, force: true });
mkdirSync(join(app, 'public'), { recursive: true });
cpSync(client, join(app, 'public', 'tour'), { recursive: true });
writeFileSync(join(app, 'index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title.replace(/</g, '&lt;')}</title>${allowIndex ? '' : '<meta name="robots" content="noindex, nofollow">'}\n<script>location.replace('/tour/index.html' + location.search + location.hash)</script></head>\n<body><a href="/tour/index.html">Open the 3D tour</a></body></html>\n`);
if (!existsSync(join(app, 'package.json'))) writeFileSync(join(app, 'package.json'), JSON.stringify({
  name: slug, private: true, type: 'module',
  scripts: { dev: 'vite', build: 'vite build', deploy: 'vite build', typecheck: 'echo "static site: nothing to typecheck"' },
  devDependencies: { vite: '7.3.6', '@whop/cli': '0.28.0' },
}, null, 2));
if (!existsSync(join(app, 'vite.config.js'))) writeFileSync(join(app, 'vite.config.js'), `import { defineConfig } from 'vite';\nimport { whop } from '@whop/cli/vite';\n\n// Static site: Whop serves dist/client. Check \`whop apps deploy --preview\` output before promoting.\nexport default defineConfig({\n  plugins: [whop()],\n  build: { outDir: 'dist/client', emptyOutDir: true },\n});\n`);

let zipPath = null;
if (argv.includes('--zip')) {
  zipPath = join(out, `${slug}.zip`); rmSync(zipPath, { force: true });
  try { execFileSync('zip', ['-qr', zipPath, '.'], { cwd: client }); }
  catch { execFileSync('python3', ['-m', 'zipfile', '-c', zipPath, ...['index.html', 'app.js', 'style.css', 'house.json', 'engine', 'vendor', ...(copied.length ? ['textures'] : [])]], { cwd: client }); }
}

const size = execFileSync('du', ['-sk', client]).toString().split('\t')[0];
console.log(JSON.stringify({ client, whop_app: app, zip: zipPath, size_kb: Number(size), textures: copied, noindex: !allowIndex }, null, 2));
