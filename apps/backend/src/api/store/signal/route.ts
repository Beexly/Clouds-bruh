import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';
import { SIGNAL_MODULE } from '../../../modules/signal';
import { PERSONALIZATION_MODULE } from '../../../modules/personalization';
import { EVENT_TYPES, CHAPTERS, PRICE_BANDS, type SignalEvent } from '@alterxiv/shared';

const EVENT_TYPE_SET = new Set<string>(EVENT_TYPES as readonly string[]);
const CHAPTER_SET = new Set<string>(CHAPTERS as readonly string[]);
const PRICE_BAND_SET = new Set<string>(PRICE_BANDS as readonly string[]);
const MAX_FIELD = 256; // cap individual id/value strings
const MAX_CONTEXT_KEYS = 16; // cap context breadth
const MAX_BUCKET_KEY = 64; // affinity bucket keys (category/aesthetic) stay short + bounded
const MAX_BODY_BYTES = 16_384; // reject oversized payloads

/**
 * Validate + normalize an inbound SIGNAL event. The storefront fires this UNAUTHENTICATED on every
 * interaction, so the endpoint must reject malformed/oversized payloads before they reach the signal
 * store and real-time personalization — otherwise arbitrary/oversized writes (junk entity ids, giant
 * strings, wrong types) flow straight into MIND/ORACLE behind only the IP rate limiter.
 * Returns a clean SignalEvent, or an error string for a 400.
 */
export function validateSignal(raw: unknown): { event: SignalEvent } | { error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'event body must be an object' };
  const b = raw as Record<string, unknown>;
  if (typeof b.type !== 'string' || !EVENT_TYPE_SET.has(b.type)) return { error: 'invalid or unknown event type' };
  if (typeof b.visitor_id !== 'string' || !b.visitor_id || b.visitor_id.length > MAX_FIELD) {
    return { error: 'visitor_id is required' };
  }
  const str = (v: unknown): string | undefined => (v == null ? undefined : String(v).slice(0, MAX_FIELD));
  const ctxRaw =
    b.context && typeof b.context === 'object' && !Array.isArray(b.context) ? (b.context as Record<string, unknown>) : {};
  const context: Record<string, unknown> = {};
  for (const k of Object.keys(ctxRaw).slice(0, MAX_CONTEXT_KEYS)) {
    const v = ctxRaw[k];
    // Enforce the typed enums at the trust boundary: a malformed chapter/price_band is DROPPED (not
    // rejected — one bad field shouldn't discard a whole event) so it can never create a junk affinity
    // bucket downstream in MIND. Free-string bucket keys (category/aesthetic) are lower-cased + bounded.
    if (k === 'chapter') { if (typeof v === 'string' && CHAPTER_SET.has(v)) context[k] = v; continue; }
    if (k === 'price_band') { if (typeof v === 'string' && PRICE_BAND_SET.has(v)) context[k] = v; continue; }
    if (k === 'category' || k === 'aesthetic') {
      if (typeof v === 'string' && v.trim()) context[k] = v.trim().toLowerCase().slice(0, MAX_BUCKET_KEY);
      continue;
    }
    context[k] = typeof v === 'string' ? v.slice(0, MAX_FIELD) : v;
  }
  const event: SignalEvent = {
    id: str(b.id) ?? '',
    visitor_id: b.visitor_id,
    session_id: str(b.session_id) ?? '',
    type: b.type as SignalEvent['type'],
    entity_id: str(b.entity_id),
    value: typeof b.value === 'number' ? b.value : str(b.value),
    context: context as SignalEvent['context'],
    ts: str(b.ts) ?? new Date().toISOString(),
  };
  return { event };
}

// POST /store/signal — the storefront fires every interaction here (unauthenticated).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // Cheap size guard before any module work (DoS / oversized-write protection). Prefer the
  // Content-Length header (real byte count); fall back to a byte-accurate measure of the parsed body
  // for header-less/chunked requests.
  const declared = Number(req.headers['content-length'] ?? 0);
  const actual = declared || (typeof req.body === 'object' ? Buffer.byteLength(JSON.stringify(req.body ?? '')) : 0);
  if (actual > MAX_BODY_BYTES) return res.status(413).json({ error: 'event payload too large' });

  const parsed = validateSignal(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });

  const signal = req.scope.resolve(SIGNAL_MODULE) as any;
  const mind = req.scope.resolve(PERSONALIZATION_MODULE) as any;
  await signal.ingest(parsed.event);
  await mind.observe(parsed.event); // real-time personalization
  res.status(202).json({ ok: true });
}

// GET /store/signal?visitor_id=:id — retrieve current visitor profile (anonymous, visitor-keyed).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const visitorId = req.query.visitor_id as string;
  if (!visitorId) return res.status(400).json({ error: 'visitor_id required' });
  const mind = req.scope.resolve(PERSONALIZATION_MODULE) as any;
  const profiles = await mind.listVisitorProfiles({ visitor_id: visitorId }, { take: 1 }).catch(() => []);
  const profile = profiles[0] ?? null;
  res.json({ profile });
}
