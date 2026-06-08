import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { candidateToChannelListing, fixtureCandidates } from '@alterxiv/shared';
import {
  AmazonChannelAdapter,
  EtsyChannelAdapter,
  ShopifyChannelAdapter,
  WooCommerceChannelAdapter,
  allChannelAdapters,
  channelAdapter,
  channelConnections,
} from './index';
import { syncCandidateToChannels } from './sync';

const savedEnv = { ...process.env };

const CHANNEL_ENV = [
  'SHOPIFY_SHOP',
  'SHOPIFY_ACCESS_TOKEN',
  'WOOCOMMERCE_URL',
  'WOOCOMMERCE_KEY',
  'WOOCOMMERCE_SECRET',
  'ETSY_API_KEY',
  'ETSY_ACCESS_TOKEN',
  'ETSY_SHOP_ID',
  'AMAZON_SP_CLIENT_ID',
  'AMAZON_SP_CLIENT_SECRET',
  'AMAZON_SP_REFRESH_TOKEN',
  'AMAZON_SP_SELLER_ID',
  'CHANNEL_LIVE_MODE',
];

function clearChannelEnv() {
  for (const key of CHANNEL_ENV) delete process.env[key];
}

describe('channel adapters', () => {
  beforeEach(() => {
    process.env = { ...savedEnv };
    clearChannelEnv();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('exposes the outbound channel adapter set', () => {
    expect(allChannelAdapters().map((a) => a.id)).toEqual(['shopify', 'woocommerce', 'etsy', 'amazon']);
  });

  it('reports not-connected and is fixture-safe when credentials are missing', async () => {
    for (const Adapter of [ShopifyChannelAdapter, WooCommerceChannelAdapter, EtsyChannelAdapter]) {
      const adapter = new Adapter();
      const health = await adapter.healthCheck();
      expect(health.connected).toBe(false);
      expect(health.mode).toBe('missing_credentials');
      expect(health.can_list).toBe(false);
      expect(health.missing_env.length).toBeGreaterThan(0);

      // Fixture-safe: listing reads return [] and mutations never fabricate success.
      expect(await adapter.listListings()).toEqual([]);
      const created = await adapter.createListing(candidateToChannelListing(fixtureCandidates('manual')[0]));
      expect(created.status).toBe('fixture_not_connected');
      expect(created.source).toBe('fixture');
      expect(created.listing_id).toBeNull();
    }
  });

  it('gates live mutations when connected but CHANNEL_LIVE_MODE is off', async () => {
    process.env.SHOPIFY_SHOP = 'lumera-test';
    process.env.SHOPIFY_ACCESS_TOKEN = 'shpat_test';

    const adapter = new ShopifyChannelAdapter();
    const health = await adapter.healthCheck();
    expect(health.connected).toBe(true);
    expect(health.mode).toBe('sandbox');
    expect(health.can_list).toBe(false);

    const created = await adapter.createListing(candidateToChannelListing(fixtureCandidates('printify')[0]));
    expect(created.status).toBe('gated');
    expect(created.source).toBe('sandbox');
    expect(created.listing_id).toBeNull();
  });

  it('Amazon SP-API is honestly gated (never fabricates success), even with creds present', async () => {
    process.env.AMAZON_SP_CLIENT_ID = 'amzn1.app';
    process.env.AMAZON_SP_CLIENT_SECRET = 'secret';
    process.env.AMAZON_SP_REFRESH_TOKEN = 'Atzr|token';
    process.env.AMAZON_SP_SELLER_ID = 'A1SELLER';
    process.env.CHANNEL_LIVE_MODE = 'true';

    const adapter = new AmazonChannelAdapter();
    const health = await adapter.healthCheck();
    expect(health.connected).toBe(false);
    expect(health.can_list).toBe(false);

    const created = await adapter.createListing(candidateToChannelListing(fixtureCandidates('manual')[0]));
    expect(created.status).toBe('requires_sp_api_auth');
    expect(created.listing_id).toBeNull();
    expect(await adapter.listListings()).toEqual([]);
  });

  it('channelConnections reports honest health for every channel', async () => {
    const connections = await channelConnections();
    expect(connections.map((c) => c.id)).toEqual(['shopify', 'woocommerce', 'etsy', 'amazon']);
    expect(connections.every((c) => c.connected === false)).toBe(true);
    expect(channelAdapter('etsy').id).toBe('etsy');
  });
});

describe('candidateToChannelListing (pure mapper)', () => {
  it('maps a candidate to a neutral listing payload with price from retail_cents', () => {
    const candidate = fixtureCandidates('printify')[0];
    const listing = candidateToChannelListing(candidate);

    expect(listing.title).toBe(candidate.title);
    expect(listing.description).toBe(candidate.description);
    expect(listing.price_cents).toBe(candidate.retail_cents);
    expect(listing.sku).toBe(candidate.supplier_sku);
    expect(listing.quantity).toBe(candidate.stock);
    expect(listing.handle).toBe(candidate.handle);
    expect(Array.isArray(listing.images)).toBe(true);
    // Images are unique, non-empty strings only.
    expect(listing.images.every((src) => typeof src === 'string' && src.length > 0)).toBe(true);
    expect(new Set(listing.images).size).toBe(listing.images.length);
  });

  it('falls back to a variant/handle sku when supplier_sku is empty', () => {
    const base = fixtureCandidates('manual')[0];
    const listing = candidateToChannelListing({ ...base, supplier_sku: '' });
    expect(listing.sku).toBe(base.variants[0]?.sku ?? base.handle);
  });
});

describe('syncCandidateToChannels (gating)', () => {
  beforeEach(() => {
    process.env = { ...savedEnv };
    clearChannelEnv();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('returns all-gated results when CHANNEL_LIVE_MODE is not set', async () => {
    const results = await syncCandidateToChannels(fixtureCandidates('printify')[0]);
    expect(results.map((r) => r.channel)).toEqual(['shopify', 'woocommerce', 'etsy', 'amazon']);
    expect(results.every((r) => r.status === 'gated')).toBe(true);
    expect(results.every((r) => r.listing_id === null)).toBe(true);
  });

  it('honours an explicit channel subset and stays gated without the live flag', async () => {
    const results = await syncCandidateToChannels(fixtureCandidates('printify')[0], ['shopify', 'etsy']);
    expect(results.map((r) => r.channel)).toEqual(['shopify', 'etsy']);
    expect(results.every((r) => r.status === 'gated')).toBe(true);
  });

  it('skips (does not fabricate) unconnected channels even when live mode is on', async () => {
    process.env.CHANNEL_LIVE_MODE = 'true';
    const results = await syncCandidateToChannels(fixtureCandidates('printify')[0], ['shopify']);
    expect(results[0]?.status).toBe('skipped');
    expect(results[0]?.listing_id).toBeNull();
  });
});
