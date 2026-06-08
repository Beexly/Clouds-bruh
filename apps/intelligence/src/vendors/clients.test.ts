import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { allVendorClients, PrintifyClient, SpocketClient, SynceeClient } from './clients';

const savedEnv = { ...process.env };

describe('vendor clients', () => {
  beforeEach(() => {
    process.env = { ...savedEnv };
    delete process.env.PRINTIFY_TOKEN;
    delete process.env.PRINTIFY_SHOP_ID;
    delete process.env.VENDOR_LIVE_MODE;
    delete process.env.AUTO_SUBMIT_VENDOR_ORDERS;
    delete process.env.VENDOR_DRAFT_ORDER_PROOF;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('returns fixture-backed candidates when credentials are missing', async () => {
    const client = new PrintifyClient();
    const health = await client.healthCheck();
    const candidates = await client.searchProducts('lumera', 2);

    expect(health.connected).toBe(false);
    expect(health.mode).toBe('missing_credentials');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].score).toBeDefined();
  });

  it('gates provider draft orders unless explicit proof is enabled', async () => {
    process.env.PRINTIFY_TOKEN = 'test-token';
    process.env.PRINTIFY_SHOP_ID = 'test-shop';

    const client = new PrintifyClient();
    const draft = await client.createDraftOrder({
      external_order_id: 'unit-test',
      items: [{ supplier_sku: 'LUM-CARRY-001-BLK', quantity: 1 }],
    });

    expect(draft.status).toBe('draft_order_proof_gated');
    expect(draft.source).toBe('sandbox');
  });

  it('exposes the launch vendor client set incl. SaaS bridges', () => {
    expect(allVendorClients().map((client) => client.id)).toEqual([
      'printify',
      'printful',
      'cj',
      'spocket',
      'syncee',
      'manual',
    ]);
  });

  it('SaaS bridges are fixture-safe without creds and report bridge-managed submission', async () => {
    for (const Client of [SpocketClient, SynceeClient]) {
      const client = new Client();
      const health = await client.healthCheck();
      expect(health.connected).toBe(false);
      expect(health.mode).toBe('missing_credentials');
      const candidates = await client.searchProducts('lumera', 2);
      expect(candidates.length).toBeGreaterThan(0);
      // Order submission for bridges is managed inside the bridge platform — never a fake "submitted".
      const submit = await client.submitOrder('bridge-order-1');
      expect(submit.status).toBe('submission_gated');
    }
  });
});
