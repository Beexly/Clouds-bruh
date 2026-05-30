import type { Tool } from './index';
const BASE = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';

export const medusaAdminRead: Tool = {
  name: 'medusa_admin_read',
  description: 'Read products, orders, inventory, customers from the Medusa Admin API.',
  inputSchema: { type: 'object', properties: { resource: { type: 'string' }, query: { type: 'object' } }, required: ['resource'] },
  run: async ({ resource, query }) => {
    // TODO: GET ${BASE}/admin/${resource} with admin auth; return JSON.
    return { resource, query, items: [] };
  },
};

export const medusaAdminWriteOrder: Tool = {
  name: 'medusa_admin_write_order',
  description: 'Update an order (routing, fulfillment notes). Refunds/cancels are NOT permitted here (escalation).',
  inputSchema: { type: 'object', properties: { orderId: { type: 'string' }, patch: { type: 'object' } }, required: ['orderId'] },
  run: async ({ orderId, patch }) => ({ orderId, patch, ok: true }),
};
