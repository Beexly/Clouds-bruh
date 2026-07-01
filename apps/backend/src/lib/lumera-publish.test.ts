import { describe, expect, it, afterEach, vi } from 'vitest';
import { fixtureCandidates } from '@lumera/shared';
import { buildProductPayload, findExistingLumeraProduct, publishCandidateToMedusa } from './lumera-publish';

const envKeys = [
  'MEDUSA_ADMIN_API_TOKEN',
  'MEDUSA_ADMIN_TOKEN',
  'MEDUSA_BACKEND_URL',
  'LUMERA_SALES_CHANNEL_ID',
  'LUMERA_SHIPPING_PROFILE_ID',
  'SUPPLIER_MARGIN_FLOOR',
  'MAX_SHIPPING_DAYS',
  'MANUAL_SUPPLIER_VERIFIED',
  'VENDOR_LIVE_MODE',
  'STRIPE_API_KEY',
] as const;

const savedEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of envKeys) {
    const value = savedEnv.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe('lumera publish helper', () => {
  afterEach(() => {
    restoreEnv();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a Medusa product payload with launch routing metadata', () => {
    process.env.LUMERA_SALES_CHANNEL_ID = 'sc_lumera';
    process.env.LUMERA_SHIPPING_PROFILE_ID = 'sp_lumera';
    const candidate = fixtureCandidates('printify')[0]!;

    const payload = buildProductPayload(candidate, true);

    expect(payload.status).toBe('published');
    expect(payload.handle).toBe(candidate.handle);
    expect(payload.sales_channels).toEqual([{ id: 'sc_lumera' }]);
    expect(payload.shipping_profile_id).toBe('sp_lumera');
    expect(payload.metadata).toMatchObject({
      lumera_candidate_id: candidate.id,
      supplier_sku: candidate.supplier_sku,
      fulfillment_provider: candidate.vendor,
      verified_reviews_count: 0,
    });
    expect(payload.variants).toHaveLength(candidate.variants.length);
  });

  it('blocks publish without a Medusa admin token but returns the product payload', async () => {
    const candidate = fixtureCandidates('printify')[0]!;

    const result = await publishCandidateToMedusa(candidate, false);

    expect(result.ok).toBe(false);
    expect(result.operation).toBe('blocked');
    expect(result.message).toMatch(/Missing MEDUSA_ADMIN_API_TOKEN/);
    expect(result.payload).toMatchObject({ handle: candidate.handle, status: 'draft' });
  });

  it('finds an existing product by Lumera candidate id before creating', async () => {
    const candidate = fixtureCandidates('printify')[0]!;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        products: [
          { id: 'prod_other', handle: candidate.handle, metadata: { lumera_candidate_id: 'different', supplier_sku: 'other' } },
          { id: 'prod_existing', handle: candidate.handle, metadata: { lumera_candidate_id: candidate.id } },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findExistingLumeraProduct('http://localhost:9000', { Authorization: 'Bearer token' }, candidate);

    expect(match).toEqual({ id: 'prod_existing', handle: candidate.handle });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`handle=${candidate.handle}`),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) })
    );
  });

  it('can match an existing product by supplier sku metadata', async () => {
    const candidate = fixtureCandidates('printify')[0]!;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        products: [{ id: 'prod_supplier_match', handle: candidate.handle, metadata: { supplier_sku: candidate.supplier_sku } }],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const match = await findExistingLumeraProduct('http://localhost:9000', { Authorization: 'Bearer token' }, candidate);

    expect(match).toEqual({ id: 'prod_supplier_match', handle: candidate.handle });
  });

  it('blocks publish when media rights are not cleared (e.g. radar discovery)', async () => {
    process.env.MEDUSA_ADMIN_API_TOKEN = 'test-token';
    const candidate = { ...fixtureCandidates('printify')[0]!, media_rights: 'unknown' as const, status: 'approved' as const };

    const result = await publishCandidateToMedusa(candidate, true);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect((result.payload as any).blockers).toContain('media_rights:unknown');
  });

  it('creates a new product when no existing match is found', async () => {
    process.env.MEDUSA_ADMIN_API_TOKEN = 'test-token';
    process.env.MEDUSA_BACKEND_URL = 'http://medusa.test';
    const candidate = fixtureCandidates('printify')[0]!;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/admin/products?')) return { ok: true, json: async () => ({ products: [] }) };
      return { ok: true, json: async () => ({ product: { id: 'prod_new' } }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishCandidateToMedusa(candidate, true);

    expect(result.ok).toBe(true);
    expect(result.operation).toBe('created');
    expect(result.product_id).toBe('prod_new');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://medusa.test/admin/products',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updates existing products instead of duplicating them', async () => {
    process.env.MEDUSA_ADMIN_API_TOKEN = 'test-token';
    process.env.MEDUSA_BACKEND_URL = 'http://medusa.test';
    const candidate = fixtureCandidates('printify')[0]!;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/admin/products?')) {
        return {
          ok: true,
          json: async () => ({ products: [{ id: 'prod_existing', handle: candidate.handle, metadata: {} }] }),
        };
      }
      return {
        ok: true,
        json: async () => ({ product: { id: 'prod_existing' } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishCandidateToMedusa(candidate, true);

    expect(result.ok).toBe(true);
    expect(result.operation).toBe('updated');
    expect(result.product_id).toBe('prod_existing');
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://medusa.test/admin/products/prod_existing',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    );
  });
});
