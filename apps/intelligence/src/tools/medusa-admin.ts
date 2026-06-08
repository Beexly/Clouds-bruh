import type { Tool } from './index';
const BASE = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';

function adminHeaders() {
  const token = process.env.MEDUSA_ADMIN_API_TOKEN || process.env.MEDUSA_ADMIN_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export const medusaAdminRead: Tool = {
  name: 'medusa_admin_read',
  description: 'Read products, orders, inventory, customers from the Medusa Admin API.',
  inputSchema: { type: 'object', properties: { resource: { type: 'string' }, query: { type: 'object' } }, required: ['resource'] },
  run: async ({ resource, query }) => {
    if (!process.env.MEDUSA_ADMIN_API_TOKEN && !process.env.MEDUSA_ADMIN_TOKEN) {
      return { resource, query, items: [], status: 'blocked_missing_MEDUSA_ADMIN_API_TOKEN' };
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (Array.isArray(value)) value.forEach((v) => params.append(`${key}[]`, String(v)));
      else if (value != null) params.set(key, String(value));
    }
    const url = `${BASE}/admin/${resource}${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, { headers: adminHeaders() });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { resource, query, ok: res.ok, status: res.status, ...body };
  },
};

export const medusaAdminWriteOrder: Tool = {
  name: 'medusa_admin_write_order',
  description: 'Update an order (routing, fulfillment notes). Refunds/cancels are NOT permitted here (escalation).',
  inputSchema: { type: 'object', properties: { orderId: { type: 'string' }, patch: { type: 'object' } }, required: ['orderId'] },
  run: async ({ orderId, patch }) => {
    if (!process.env.MEDUSA_ADMIN_API_TOKEN && !process.env.MEDUSA_ADMIN_TOKEN) {
      return { orderId, patch, ok: false, status: 'blocked_missing_MEDUSA_ADMIN_API_TOKEN' };
    }
    const res = await fetch(`${BASE}/admin/orders/${orderId}`, {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify(patch ?? {}),
    });
    const body = await res.json().catch(() => ({}));
    return { orderId, patch, ok: res.ok, status: res.status, response: body };
  },
};
