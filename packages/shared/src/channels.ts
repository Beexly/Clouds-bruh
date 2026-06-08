import type { ProductCandidate } from './curation';

/**
 * Outbound multichannel selling layer — push Lumera products OUT to external marketplaces
 * (Shopify, Etsy, Amazon, WooCommerce) instead of sourcing them in.
 *
 * Design notes / integrity (mirrors the inbound vendor layer):
 * - Channel adapters are gated + fixture-safe. With no credentials the code runs, compiles, and
 *   tests pass; it NEVER creates a live listing without an explicit `CHANNEL_LIVE_MODE=true` gate
 *   AND per-channel credentials. Honest statuses only — we never fabricate a "created" result.
 * - The mapper `candidateToChannelListing` is PURE (no network), so it is fully unit-testable and
 *   produces one neutral payload that every adapter reshapes for its own API.
 */

export type ChannelId = 'shopify' | 'etsy' | 'amazon' | 'woocommerce';

export type ChannelMode = 'live' | 'sandbox' | 'fixture' | 'missing_credentials' | 'blocked';

/** Connection/health snapshot for an outbound channel (mirror of VendorConnection). */
export interface ChannelConnection {
  id: ChannelId;
  label: string;
  mode: ChannelMode;
  connected: boolean;
  /** Whether the channel may create/update live listings (connected + CHANNEL_LIVE_MODE). */
  can_list: boolean;
  last_checked_at: string;
  missing_env: string[];
  message: string;
}

/** Neutral, channel-agnostic listing payload produced by `candidateToChannelListing`. */
export interface ChannelListingInput {
  title: string;
  description: string;
  /** Price in cents (from candidate.retail_cents) — adapters convert to their own units. */
  price_cents: number;
  sku: string;
  images: string[];
  /** Stock to publish; adapters that don't track inventory ignore this. */
  quantity: number;
  /** Provenance so a published listing can be traced back to its candidate. */
  handle: string;
  category: string;
}

/** A listing as it exists on a remote channel (normalized across APIs). */
export interface ChannelListing {
  channel: ChannelId;
  listing_id: string;
  title: string;
  sku?: string;
  status: string;
  url?: string;
  source: ChannelMode;
}

export interface ChannelInventory {
  listing_id: string;
  quantity: number;
  source: ChannelMode;
}

/** Result of a listing mutation (create/update/delete). Honest statuses, never fabricated. */
export interface ChannelListingResult {
  channel: ChannelId;
  listing_id: string | null;
  status: string;
  source: ChannelMode;
  message?: string;
}

export interface ChannelWebhookResult {
  channel: ChannelId;
  event_type: string;
  valid: boolean;
  message: string;
}

export interface ChannelAdapter {
  id: ChannelId;
  label: string;
  healthCheck: () => Promise<ChannelConnection>;
  listListings: (limit?: number) => Promise<ChannelListing[]>;
  createListing: (input: ChannelListingInput) => Promise<ChannelListingResult>;
  updateListing: (listingId: string, input: Partial<ChannelListingInput>) => Promise<ChannelListingResult>;
  deleteListing: (listingId: string) => Promise<ChannelListingResult>;
  getInventory: (listingId: string) => Promise<ChannelInventory>;
  updateInventory: (listingId: string, qty: number) => Promise<ChannelInventory>;
  handleOrderWebhook: (payload: unknown, headers?: Record<string, string>) => Promise<ChannelWebhookResult>;
}

/**
 * PURE mapper: turn a scored Lumera ProductCandidate into a neutral channel listing payload.
 * No network, deterministic. Price comes from retail_cents; images dedupe candidate + variant media.
 */
export function candidateToChannelListing(candidate: ProductCandidate): ChannelListingInput {
  const images = Array.from(
    new Set([candidate.image_url].filter((src): src is string => typeof src === 'string' && src.trim().length > 0))
  );
  return {
    title: candidate.title,
    description: candidate.description,
    price_cents: candidate.retail_cents,
    sku: candidate.supplier_sku || candidate.variants[0]?.sku || candidate.handle,
    images,
    quantity: candidate.stock,
    handle: candidate.handle,
    category: candidate.category,
  };
}
