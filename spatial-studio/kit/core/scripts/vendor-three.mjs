// Copy the pinned three.js build (package.json) into web/vendor so the site works offline
// and the Whop build ships no CDN dependency. Re-run after changing the three version.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(here, 'node_modules', 'three');
const out = join(here, 'web', 'vendor', 'three');
const files = {
  'build/three.module.js': 'three.module.js',
  'build/three.core.js': 'three.core.js',
  'examples/jsm/controls/OrbitControls.js': 'addons/OrbitControls.js',
  'examples/jsm/environments/RoomEnvironment.js': 'addons/RoomEnvironment.js',
  'examples/jsm/geometries/RoundedBoxGeometry.js': 'addons/RoundedBoxGeometry.js',
  'LICENSE': 'LICENSE',
};
mkdirSync(join(out, 'addons'), { recursive: true });
for (const [from, to] of Object.entries(files)) cpSync(join(src, from), join(out, to));
const version = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8')).version;
writeFileSync(join(out, 'VERSION'), version + '\n');
console.log(`vendored three@${version} -> ${out}`);
