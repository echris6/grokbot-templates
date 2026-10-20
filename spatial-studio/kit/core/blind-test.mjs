#!/usr/bin/env node
// Blind test (Gauntlet tier): can the critic tell our captures from the client's photos?
//
//   node blind-test.mjs make   --ours a.png,b.png,… --ref p1.jpg,p2.jpg,… --out-dir <round>/blind [--seed N]
//   node blind-test.mjs reveal --ours … --ref … --out-dir <round>/blind --seed N        (only after the report)
//   node blind-test.mjs score  --ours … --ref … --seed N --report <round>/critic.md      (only after the report)
//
// make: crops every image to the same 16:10 frame at 1280x800 and passes it through the SAME JPEG
// encode (ffmpeg), so size, aspect and compression are not a tell; names them A01.jpg … in a seeded
// shuffle. It writes NO mapping file (_shared/gauntlet.md): it prints the seed, which the Lead keeps in
// its own message to the user. reveal writes mapping.md; score reads lines like "A07: ours" or
// "A07 reference" from the report. 9+ correct of 12 = the critic can tell, so we are not done.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [cmd, ...argv] = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const list = (k) => (arg(k, '') || '').split(',').map((s) => s.trim()).filter(Boolean).map((p) => resolve(p));
if (!['make', 'reveal', 'score'].includes(cmd)) { console.error('usage: blind-test.mjs make|reveal|score --ours … --ref … [--seed N] [--out-dir d] [--report r]'); process.exit(2); }
const ours = list('ours'), ref = list('ref');
if (!ours.length || ours.length !== ref.length) { console.error('give the same number of --ours and --ref images (6 + 6 for the Gauntlet tier)'); process.exit(2); }
const seed = Number(arg('seed', cmd === 'make' ? Math.floor(1000 + Math.random() * 9000) : NaN));
if (!Number.isFinite(seed)) { console.error('--seed is required for reveal/score'); process.exit(2); }

function shuffle(n, s) { // mulberry32, deterministic per seed
  let a = s >>> 0; const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const idx = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } return idx;
}
const items = [...ours.map((p) => ({ p, label: 'ours' })), ...ref.map((p) => ({ p, label: 'reference' }))];
const order = shuffle(items.length, seed);
const named = order.map((k, i) => ({ name: `A${String(i + 1).padStart(2, '0')}`, ...items[k] }));

if (cmd === 'make') {
  const dir = resolve(arg('out-dir', 'blind')); mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^A\d\d\.jpg$/.test(f) || f === 'mapping.md') rmSync(join(dir, f));
  for (const it of named) execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', it.p, '-vf', 'scale=1280:800:force_original_aspect_ratio=increase,crop=1280:800,setsar=1', '-q:v', '4', join(dir, `${it.name}.jpg`)]);
  console.log(`made ${named.length} images in ${dir}\nblind seed: ${seed}   (keep this out of every file the critic can open)`);
} else if (cmd === 'reveal') {
  const dir = resolve(arg('out-dir', 'blind'));
  writeFileSync(join(dir, 'mapping.md'), `# Blind test mapping (seed ${seed})\n\n${named.map((x) => `- ${x.name}: ${x.label} · ${x.p}`).join('\n')}\n`);
  console.log(`wrote ${join(dir, 'mapping.md')}`);
} else {
  const text = readFileSync(resolve(arg('report')), 'utf8');
  let correct = 0, answered = 0;
  for (const x of named) {
    const m = text.match(new RegExp(`${x.name}\\b[^\\n]*?\\b(reference|ref|photo|ours|new|render)\\b`, 'i'));
    if (!m) continue; answered++;
    const said = /ours|new|render/i.test(m[1]) ? 'ours' : 'reference';
    if (said === x.label) correct++;
  }
  console.log(JSON.stringify({ seed, answered, correct, of: named.length, critic_can_tell: correct >= Math.ceil(named.length * 0.75) }));
}
