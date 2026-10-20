#!/usr/bin/env node
// Tiny static server for the walkthrough page (no dependencies).
//   node serve.mjs [--spec /path/to/house.json] [--port 8787] [--root web]
// Serves web/ at /, and the spec's folder at /spec/ (so textures and photos next to the
// spec resolve). Open http://127.0.0.1:8787/?spec=/spec/<file>.json
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' };

function safeJoin(base, rel) {
  const p = normalize(join(base, decodeURIComponent(rel)));
  return p.startsWith(base) ? p : null;
}

export function startServer({ root = join(HERE, 'web'), specDir = null, port = 0, host = '127.0.0.1' } = {}) {
  root = resolve(root);
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let file = null;
    if (url.pathname.startsWith('/spec/') && specDir) file = safeJoin(resolve(specDir), url.pathname.slice(6));
    else file = safeJoin(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
    if (file && existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(port, host, () => ok({ server, port: server.address().port, url: `http://${host}:${server.address().port}` })));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? [...a, [x.slice(2), arr[i + 1]]] : a), []));
  const spec = args.spec ? resolve(args.spec) : null;
  const { url } = await startServer({ root: args.root || join(HERE, 'web'), specDir: spec ? dirname(spec) : null, port: Number(args.port || 8787) });
  console.log(`serving ${url}/` + (spec ? `?spec=/spec/${basename(spec)}` : ''));
}
