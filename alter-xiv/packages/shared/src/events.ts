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
  channel?: 'web' | 'mobile' | 'app';
  device?: 'desktop' | 'mobile' | 'tablet';
  referrer?: string;
  experiment?: string;     // experiment variant id, if assigned
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
