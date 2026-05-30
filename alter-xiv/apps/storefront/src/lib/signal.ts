'use client';
import type { SignalEvent, EventType } from '@alterxiv/shared';

const API = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';

function visitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let id = window.localStorage.getItem('axiv_vid');
  if (!id) { id = crypto.randomUUID(); window.localStorage.setItem('axiv_vid', id); }
  return id;
}

/** Fire a SIGNAL event. Call on EVERY meaningful interaction — this is how the system learns. */
export function signal(type: EventType, entity_id?: string, value?: string | number, context: any = {}) {
  const event: Partial<SignalEvent> = {
    visitor_id: visitorId(),
    session_id: sessionStorage.getItem('axiv_sid') || 'sess',
    type, entity_id, value, context: { channel: 'web', ...context }, ts: new Date().toISOString(),
  };
  navigator.sendBeacon?.(`${API}/store/signal`, JSON.stringify(event)) ||
    fetch(`${API}/store/signal`, { method: 'POST', body: JSON.stringify(event), keepalive: true });
}
export { visitorId };
