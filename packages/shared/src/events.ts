/**
 * SIGNAL — the behavioral event taxonomy.
 * The contract between The Broadcast (emit) and the intelligence layer (consume).
 * Every meaningful storefront interaction MUST emit one of these.
 */

export const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
export type Chapter = (typeof CHAPTERS)[number];

export const EVENT_TYPES = [
  'page_view',
  'product_view',
  'dwell',               // value = ms on entity
  'scroll_depth',        // value = 0..1
  'search',              // value = query
  'filter_apply',
  'add_to_cart',
  'remove_from_cart',
  'wishlist_add',
  'checkout_step',       // value = step name
  'purchase',            // value = order total
  'drop_view',
  'countdown_view',
  'chapter_enter',
  'share',
  'recommendation_impression',
  'recommendation_click',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface EventContext {
  chapter?: Chapter;
  category?: string;       // primary category (from the product's category_tree) — feeds category affinity
  price_band?: PriceBand;  // coarse price tier of the entity — feeds price-sensitivity affinity
  aesthetic?: string;      // aesthetic/style tag — feeds aesthetic affinity (reserved for a future taxonomy)
  channel?: 'web' | 'mobile' | 'app';
  device?: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
  experiment?: string;     // experiment variant id, if assigned
}

/** Coarse price tiers — the emitter (storefront) classifies, so personalization stays O(1) (no DB lookup). */
export const PRICE_BANDS = ['entry', 'core', 'premium', 'luxury'] as const;
export type PriceBand = (typeof PRICE_BANDS)[number];

/**
 * Approximate units-per-USD scale used only to make the coarse price bands currency-aware — a price
 * is normalized to a USD-equivalent before banding, so ¥60,000 and $400 both land in `luxury` rather
 * than JPY amounts always reading as `luxury`. Only the order of magnitude matters here; unknown
 * currencies fall back to 1 (treated as USD-scale). Keep this in sync with supported store currencies.
 */
export const CURRENCY_BAND_SCALE: Record<string, number> = {
  usd: 1, eur: 1, gbp: 1, chf: 1,
  cad: 1.4, aud: 1.5, nzd: 1.6,
  jpy: 150, krw: 1300, inr: 85, cny: 7.2, mxn: 18, brl: 5,
  sek: 11, nok: 11, dkk: 7, pln: 4, zar: 18, aed: 3.7,
};

/**
 * Classify a `finalPrice` (in the given currency's MAJOR units) into a coarse price band.
 * `currency` is an ISO-4217-ish code (case-insensitive); defaults to USD so existing callers are
 * unchanged. Non-finite/negative prices return `entry` (safe default).
 */
export function priceBand(finalPrice: number, currency: string = 'usd'): PriceBand {
  const scale = CURRENCY_BAND_SCALE[(currency || 'usd').toLowerCase()] ?? 1;
  const usd = Number.isFinite(finalPrice) ? finalPrice / scale : NaN;
  if (!Number.isFinite(usd) || usd < 50) return 'entry';
  if (usd < 150) return 'core';
  if (usd < 400) return 'premium';
  return 'luxury';
}

/**
 * The aesthetic identity of each chapter — the default style signal used when a product carries no
 * explicit `aesthetic` tag. This makes the `aesthetic` affinity dimension live (it was declared but
 * never populated) without requiring a full style taxonomy yet.
 */
export const CHAPTER_AESTHETIC: Record<Chapter, string> = {
  stillness: 'minimal',
  armor: 'utilitarian',
  signal: 'avant',
  altar: 'ceremonial',
  relentless: 'sport',
};

/**
 * Resolve a product's aesthetic tag for the SIGNAL context: an explicit product tag wins (lower-cased),
 * otherwise fall back to the chapter's aesthetic identity. Returns undefined when neither is known.
 */
export function productAesthetic(chapter?: string | null, explicit?: string | null): string | undefined {
  if (explicit && explicit.trim()) return explicit.trim().toLowerCase().slice(0, 40);
  if (chapter && (CHAPTERS as readonly string[]).includes(chapter)) return CHAPTER_AESTHETIC[chapter as Chapter];
  return undefined;
}

export interface SignalEvent {
  id: string;
  visitor_id: string;      // anonymous-first; merges to customer on identify
  session_id: string;
  type: EventType;
  entity_id?: string;      // product/drop/chapter id
  value?: string | number;
  context: EventContext;
  ts: string;              // ISO
}

/** Reward signal weights used by ORACLE's bandit + the Learning Loop. Tune over time. */
export const REWARD_WEIGHTS: Partial<Record<EventType, number>> = {
  recommendation_click: 1,
  product_view: 1,
  add_to_cart: 5,
  wishlist_add: 3,
  purchase: 20,
};
