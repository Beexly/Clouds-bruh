import type { Tool } from './index';
import { rankVendorOptions, type VendorOption } from '@alterxiv/shared';

/**
 * vendor_select — decision support for the Quartermaster: rank candidate fulfilment vendors for a
 * product by margin, reliability, and shipping speed (connected vendors only) and choose the best,
 * with failover when the highest-margin option is slow/unreliable. Read-only; chooses, never submits.
 */
export const vendorSelect: Tool = {
  name: 'vendor_select',
  description:
    'Rank candidate fulfilment vendors for a product by margin/reliability/shipping speed and choose the best (with failover). Read-only decision support — never submits an order.',
  inputSchema: {
    type: 'object',
    properties: {
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            vendor: { type: 'string' },
            cost_cents: { type: 'number' },
            lead_time_days: { type: 'number' },
            reliability: { type: 'number' },
            connected: { type: 'boolean' },
          },
        },
      },
      retail_cents: { type: 'number' },
      max_days: { type: 'number' },
    },
    required: ['options'],
  },
  run: async ({ options, retail_cents, max_days }) => {
    return rankVendorOptions((options ?? []) as VendorOption[], {
      retailCents: retail_cents,
      maxShippingDays: max_days,
    });
  },
};
