import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize, sep } from 'node:path';
import { createPaths } from '../lib/paths.mjs';
import { renderStorefront } from '../storefront/render.mjs';
import { loadQueue } from '../queue/store.mjs';
import { boardFrom } from '../queue/board.mjs';
import { computeLedger } from '../ops/progress.mjs';
import { ordersView } from '../ops/orders-view.mjs';
import { analytics } from '../ops/analytics.mjs';
import { addMessage, loadInbox, inboxSummary } from '../support/inbox.mjs';
import { AGENTS } from '../agents/registry.mjs';
import { createCheckout, orderConfirmation } from '../orders/checkout.mjs';
import { queryCatalog, parseQuery } from '../storefront/query.mjs';
import { recommendationsFor, mostCoveted } from '../storefront/recommend.mjs';
import { submitReview, loadReviews, ratingSummary } from '../storefront/reviews.mjs';
import { loadOrders } from '../orders/store.mjs';

/** Units sold per product id from realized (non-intake/cancelled/refunded) orders. */
async function unitsByProduct(paths) {
  const orders = await loadOrders(paths);
  const map = {};
  for (const o of orders) {
    if (['intake', 'cancelled', 'refunded'].includes(o.status)) continue;
    for (const i of o.items || []) map[i.productId] = (map[i.productId] || 0) + i.qty;
  }
  return map;
}

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

function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > limit) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    // — Read APIs (keep the UIs data-driven without a separate server) —
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
        orders: await ordersView(paths),
      });
    }
    if (url.pathname === '/api/analytics.json') {
      return sendJson(res, await analytics(paths));
    }
    if (url.pathname === '/api/support.json') {
      return sendJson(res, inboxSummary(await loadInbox(paths)));
    }
    // Catalog query: facet/sort/paginate over the public projection.
    if (url.pathname === '/api/catalog.json') {
      const data = await renderStorefront(paths);
      const result = queryCatalog(data.products, parseQuery(url.searchParams));
      return sendJson(res, result);
    }
    // Honest "most coveted this week" from realized sales.
    if (url.pathname === '/api/coveted.json') {
      const data = await renderStorefront(paths);
      return sendJson(res, { items: mostCoveted(data.products, await unitsByProduct(paths), 6) });
    }
    // Single live product for the PDP — enriched with recommendations + reviews.
    if (url.pathname === '/api/product') {
      const data = await renderStorefront(paths);
      const product = data.products.find(
        (p) => p.slug === url.searchParams.get('slug') || p.id === url.searchParams.get('id')
      );
      if (!product) return sendJson(res, { error: 'Not found' }, 404);
      const reviews = ratingSummary(await loadReviews(paths), product.id);
      const recommendations = recommendationsFor(product, data.products, 4);
      return sendJson(res, { ...product, reviews, recommendations });
    }
    // Public reviews summary for a product.
    if (url.pathname === '/api/reviews.json') {
      const id = url.searchParams.get('productId');
      return sendJson(res, ratingSummary(await loadReviews(paths), id));
    }

    // — Command APIs —
    // Checkout: cart → order through the existing lifecycle. Payment stays
    // intent-only (no charge). Returns a confirmation, not internal order fields.
    if (url.pathname === '/api/checkout' && req.method === 'POST') {
      try {
        const { cart, customer, shippingMinor, taxMinor } = await readBody(req);
        const order = await createCheckout(paths, cart, customer, { shippingMinor, taxMinor });
        return sendJson(res, orderConfirmation(order), 201);
      } catch (e) {
        return sendJson(res, { error: e.message }, 400);
      }
    }
    // Customer submits a product review (verified against real orders; stays
    // pending until a human moderates — honest social proof, never fabricated).
    if (url.pathname === '/api/reviews' && req.method === 'POST') {
      try {
        const { productId, email, rating, title, body } = await readBody(req);
        if (!productId || !email || !rating) throw new Error('productId, email, and rating are required');
        const r = await submitReview(paths, { productId, email, rating, title, body });
        return sendJson(res, { id: r.id, status: r.status, verified: r.verified, note: 'Thank you — your review will appear after moderation.' }, 201);
      } catch (e) {
        return sendJson(res, { error: e.message }, 400);
      }
    }
    // Customer submits a support message.
    if (url.pathname === '/api/support' && req.method === 'POST') {
      try {
        const { email, subject, body, orderNumber } = await readBody(req);
        if (!email || !body) throw new Error('Email and message are required');
        const msg = await addMessage(paths, { email, subject, body, orderNumber });
        return sendJson(res, { id: msg.id, status: msg.status, intent: msg.intent, note: 'Received — we will reply by email.' }, 201);
      } catch (e) {
        return sendJson(res, { error: e.message }, 400);
      }
    }

    // — Static files —
    let p = normalize(decodeURIComponent(url.pathname));
    if (p === '/' || p === '\\') p = '/index.html';
    if (p.endsWith('/')) p += 'index.html';
    const filePath = join(root, p);
    // Defense-in-depth: never serve outside the root directory.
    if (filePath !== root && !filePath.startsWith(root + sep)) {
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

// Bind to loopback by default — the ops API exposes internal cost/supplier data.
// Override with HOST=0.0.0.0 only when you intend to expose it on the network.
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`Eclipse · Galaxy Network — serving ${root} at http://${host}:${port}  (ops console at /ops/)`);
});
