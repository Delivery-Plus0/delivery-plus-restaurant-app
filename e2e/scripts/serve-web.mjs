// Serves the static Expo web export for UI tests.
// Expo writes one HTML file per route, with dynamic segments literally named `[id].html`, so a deep
// link such as /order/<uuid> must fall back to order/[id].html. Anything else unknown falls back to
// the root, which lets Expo Router render its own not-found screen.
//
// Usage: node e2e/scripts/serve-web.mjs [dir=e2e/.web-build] [port=8083]
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.argv[2] ?? 'e2e/.web-build');
const port = Number(process.argv[3] ?? process.env.E2E_WEB_PORT ?? 8083);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

/** Resolve `/order/abc` → `order/[id].html` by matching bracketed file/dir names segment by segment. */
function resolveDynamic(segments) {
  let dir = root;
  for (let i = 0; i < segments.length; i++) {
    const last = i === segments.length - 1;
    const entries = existsSync(dir) ? readdirSync(dir) : [];
    const exact = last ? `${segments[i]}.html` : segments[i];
    if (entries.includes(exact)) {
      dir = join(dir, exact);
      continue;
    }
    const dynamic = entries.find((name) => (last ? /^\[.+\]\.html$/ : /^\[.+\]$/).test(name));
    if (!dynamic) return null;
    dir = join(dir, dynamic);
  }
  return isFile(dir) ? dir : null;
}

function fileFor(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^[/\\]+/, '');
  const direct = join(root, clean);
  if (!direct.startsWith(root + sep) && direct !== root) return null; // path traversal guard
  if (clean === '' || clean === '.') return join(root, 'index.html');
  if (isFile(direct)) return direct;
  if (isFile(`${direct}.html`)) return `${direct}.html`;
  if (isFile(join(direct, 'index.html'))) return join(direct, 'index.html');
  return resolveDynamic(clean.split(/[/\\]/).filter(Boolean)) ?? join(root, 'index.html');
}

if (!existsSync(join(root, 'index.html'))) {
  console.error(`No web build at ${root}. Run the export first (see e2e/README.md).`);
  process.exit(1);
}

createServer((req, res) => {
  const file = fileFor(req.url ?? '/');
  if (!file) {
    res.writeHead(400).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} on http://localhost:${port}`));
