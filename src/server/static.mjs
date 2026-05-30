import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { createPaths } from '../lib/paths.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { loadQueue } from '../queue/store.mjs';
import { boardFrom } from '../queue/board.mjs';
import { computeLedger } from '../ops/progress.mjs';
import { AGENTS } from '../agents/registry.mjs';

const root = join(process.cwd(), process.argv[2] || 'public');
const port = Number(process.argv[3] || 8080);
const paths = createPaths(process.cwd());

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, data) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    // Virtual read API — keeps the UIs data-driven without a separate server.
    if (url.pathname === '/api/storefront.json') {
      return sendJson(res, await renderStorefront(paths));
    }
    if (url.pathname === '/api/ops.json') {
      const items = await loadQueue(paths);
      return sendJson(res, {
        board: boardFrom(items),
        ledger: await computeLedger(paths),
        agents: AGENTS,
        queueCount: items.length,
      });
    }

    let p = normalize(decodeURIComponent(url.pathname));
    if (p === '/' || p === '\\') p = '/index.html';
    if (p.endsWith('/')) p += 'index.html';
    const filePath = join(root, p);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Eclipse · Galaxy Network — serving ${root} at http://localhost:${port}  (ops console at /ops/)`);
});
