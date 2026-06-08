/*
 * Lumera — minimal offline app-shell service worker.
 *
 * Strategy:
 *   - Precache a tiny shell (offline fallback + icons) on install.
 *   - Navigations: network-first, falling back to the cached offline shell when offline.
 *   - API/cross-origin/non-GET: always go to the network (never cache personalized or mutating
 *     traffic — signals, cart, auth, catalog must stay live).
 *   - Same-origin static GETs: stale-while-revalidate for a fast repeat paint.
 *
 * Deliberately dependency-free and conservative so it can never serve stale commerce data or break
 * a logged-in session. Registered only in production (see components/ServiceWorker.tsx).
 */

const VERSION = 'lumera-shell-v1';
const SHELL = ['/offline.html', '/icon.svg', '/icon-maskable.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  // Treat Medusa store traffic + Next data/route handlers as live-only.
  return (
    url.pathname.startsWith('/store/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Only handle same-origin GETs; let the browser deal with everything else (CDN images, Medusa).
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  // Navigations: network-first with an offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/offline.html')),
      ),
    );
    return;
  }

  // Static same-origin assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
