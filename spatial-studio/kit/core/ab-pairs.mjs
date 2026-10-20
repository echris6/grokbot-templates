#!/usr/bin/env node
// Reference photo vs our capture, side by side, one JPEG per viewpoint that has a photo.
//
//   node ab-pairs.mjs --spec house.json --captures <dir> --out <dir> [--height 720]
//
// Each pair is cropped to the SAME aspect (the capture's) and height, then put through the same
// JPEG encode, so neither side wins on resolution or compression. Left = reference, right = ours,
// with a small caption bar. Needs ffmpeg. The critic still opens the full-size files itself; the
// pair sheet is for the A/B verdict and for the client's before/after.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (!arg('spec') || !arg('captures') || !arg('out')) { console.error('usage: ab-pairs.mjs --spec house.json --captures dir --out dir'); process.exit(2); }
const specPath = resolve(arg('spec')); const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const caps = resolve(arg('captures')), out = resolve(arg('out')); const H = Number(arg('height', 720));
mkdirSync(out, { recursive: true });
const meta = existsSync(join(caps, 'captures.json')) ? JSON.parse(readFileSync(join(caps, 'captures.json'), 'utf8')) : { size: [1280, 800] };
const [cw, ch] = meta.size; const W = Math.round((H * cw) / ch / 2) * 2;
const made = [], skipped = [];
for (const v of spec.viewpoints || []) {
  if (!v.photo) { skipped.push(`${v.id}: no photo`); continue; }
  const photo = resolve(dirname(specPath), v.photo), ours = join(caps, `${v.id}.png`);
  if (!existsSync(photo)) { skipped.push(`${v.id}: photo missing (${photo})`); continue; }
  if (!existsSync(ours)) { skipped.push(`${v.id}: capture missing (${ours})`); continue; }
  const file = join(out, `${v.id}-ab.jpg`);
  const fit = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1`;
  const label = (t) => `drawbox=x=0:y=0:w=iw:h=28:color=black@0.55:t=fill,drawtext=text='${t}':x=10:y=7:fontsize=16:fontcolor=white`;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', photo, '-i', ours, '-filter_complex',
      `[0:v]${fit},${label('REFERENCE  ' + v.id)}[a];[1:v]${fit},${label('OURS  ' + v.id)}[b];[a][b]hstack=inputs=2`, '-q:v', '3', file], { stdio: 'ignore' });
  } catch {
    // drawtext needs a font; fall back to unlabelled pairs (left = reference, right = ours)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', photo, '-i', ours, '-filter_complex', `[0:v]${fit}[a];[1:v]${fit}[b];[a][b]hstack=inputs=2`, '-q:v', '3', file]);
  }
  made.push(file);
}
writeFileSync(join(out, 'pairs.json'), JSON.stringify({ made, skipped, note: 'left = reference photo, right = our capture' }, null, 2));
console.log(`${made.length} pair(s) → ${out}${skipped.length ? `\nskipped: ${skipped.join('; ')}` : ''}`);
