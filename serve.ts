// serve.ts — a development-only static server for app/ (Node 22+, standard
// library only). Lets the guide be tried in a browser without a build step:
//
//   node serve.ts               serves app/ on http://127.0.0.1:8080
//   node serve.ts --port 9000   serves it on another port instead
//
// It serves only files inside app/, sends the MIME type each file needs, and
// answers 404 for anything else. It is a local convenience, not a server
// for the internet: it binds loopback only and serves no directory listing.

import { readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const DEFAULT_PORT = 8080;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.webmanifest', 'application/manifest+json'],
]);

function pickPort(argv) {
  const flagAt = argv.indexOf('--port');
  if (flagAt === -1) return DEFAULT_PORT;
  const wanted = Number(argv[flagAt + 1]);
  if (!Number.isInteger(wanted) || wanted < 1 || wanted > 65535) {
    console.error(`serve.ts: --port needs a number from 1 to 65535, got ${argv[flagAt + 1] ?? '(nothing)'}`);
    return DEFAULT_PORT;
  }
  return wanted;
}

function resolveInsideRoot(pathname) {
  const cleaned = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = resolve(join(APP_ROOT, normalize(cleaned)));
  if (file !== APP_ROOT && !file.startsWith(APP_ROOT + sep)) return null;
  return file;
}

const port = pickPort(process.argv.slice(2));

const server = createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain' }).end('bad request');
    return;
  }
  const file = resolveInsideRoot(pathname);
  if (file === null) {
    response.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
    return;
  }
  let body;
  try {
    if (!statSync(file).isFile()) throw new Error('not a file');
    body = readFileSync(file);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': MIME_TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': body.length,
    'cache-control': 'no-store',
  });
  response.end(body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Trophy Guide: app/ is on http://127.0.0.1:${port} — open it in a browser to try the guide.`);
});
