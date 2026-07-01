'use client';
import type { EventType } from '@lumera/shared';
import { DEMO } from './demo';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Visitor identity, anonymous-first. Prefer the `axiv_vid` cookie set by middleware
 * (so the SAME id is used on the server for first-paint personalization), falling back
 * to localStorage, then minting one.
 */
export function visitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = readCookie('axiv_vid') || localStorage.getItem('axiv_vid');
  if (!id) {
    id = crypto.randomUUID();
    document.cookie = `axiv_vid=${id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }
  localStorage.setItem('axiv_vid', id);
  return id;
}

export function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = sessionStorage.getItem('axiv_sid');
  if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('axiv_sid', id); }
  return id;
}

/** Fire a SIGNAL event. Call on every meaningful interaction — this is how the system learns. */
export function signal(type: EventType, entity_id?: string, value?: string | number, context: any = {}) {
  if (typeof window === 'undefined') return;
  // Demo mode has no backend to receive events — skip the (guaranteed-failing) request so a shared
  // preview stays quiet in the network tab. The learning loop only runs against a real backend.
  if (DEMO) return;
  const body = JSON.stringify({
    id: crypto.randomUUID(),
    visitor_id: visitorId(),
    session_id: sessionId(),
    type,
    entity_id: entity_id ?? null,
    value: value != null ? String(value) : null,
    context: { channel: 'web' as const, ...context },
    ts: new Date().toISOString(),
  });
  fetch(`${BASE}/store/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': PK },
    body,
    keepalive: true,
  }).catch(() => {});
}
