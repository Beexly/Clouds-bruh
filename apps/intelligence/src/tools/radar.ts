import type { Tool } from './index';
import { radarDiscover, type RadarSource } from '@lumera/shared';

/**
 * supplier_radar — discover scorable product candidates from a marketplace radar source
 * (AliExpress / Alibaba / Shein / Amazon) via the shared Oxylabs/Apify transport. Returns
 * normalized, compliance-scored candidates ready for the curation board. Read-only and
 * fixture-safe: empty until OXYLABS/APIFY credentials are present. Discovery only — a scraped
 * listing is not directly orderable, so each candidate is flagged to assign a fulfilment route
 * (CJ / manual) and re-shoot media before publish.
 */
export const supplierRadar: Tool = {
  name: 'supplier_radar',
  description:
    'Discover trending product candidates from AliExpress/Alibaba/Shein/Amazon (managed scraping). Returns normalized, scored candidates for the curation board. Read-only; empty until OXYLABS/APIFY creds are set.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      source: { type: 'string', enum: ['aliexpress', 'alibaba', 'shein', 'amazon', 'generic'] },
      limit: { type: 'number', default: 12 },
      fulfillment_vendor: { type: 'string', enum: ['cj', 'manual', 'printify', 'printful'] },
    },
    required: ['query'],
  },
  run: async ({ query, source = 'aliexpress', limit = 12, fulfillment_vendor }) => {
    const candidates = await radarDiscover({
      query,
      source: source as RadarSource,
      limit,
      fulfillmentVendor: fulfillment_vendor,
    }).catch((e) => {
      throw new Error(`supplier_radar failed: ${(e as Error).message}`);
    });
    return {
      source,
      query,
      count: candidates.length,
      candidates,
      note: candidates.length
        ? 'Discovery candidates scored. Assign a fulfilment route + re-shoot media before publish.'
        : 'No live discovery results (set OXYLABS/APIFY creds, or configure an Apify Actor for this source).',
    };
  },
};
