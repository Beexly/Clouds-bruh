'use client';

import { useEffect } from 'react';

/**
 * Registers the offline app-shell service worker — production only, and only when the browser
 * supports it. Guarded so it never runs during SSR or `next dev` (a stale dev SW is a notorious
 * source of "why isn't my change showing" confusion). Registration is fire-and-forget: failure is
 * non-fatal and leaves the storefront working exactly as before.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };
    // Defer to load so registration never competes with first paint.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
