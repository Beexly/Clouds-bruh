'use client';
import type { EventType } from '@alterxiv/shared';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export function visitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = localStorage.getItem('axiv_vid');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('axiv_vid', id); }
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
