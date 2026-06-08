'use client';

/**
 * Customer identity — Medusa v2 native store auth + customer APIs.
 *
 * Auth model (Medusa v2):
 *   1. POST /auth/customer/emailpass/register → { token }      (create auth identity)
 *   2. POST /store/customers  (Bearer token)  → { customer }   (create the profile)
 *   3. POST /auth/customer/emailpass          → { token }      (login)
 *   4. GET  /store/customers/me (Bearer)      → { customer }
 *   5. GET  /store/orders / /store/orders/:id (Bearer)         (order history + tracking)
 *
 * The JWT is persisted in a cookie via the /api/session route handler (NOT localStorage) so
 * it is sent automatically and is harder to exfiltrate via XSS than a localStorage token.
 *
 * Every function is defensive: when the backend or a customer is unavailable the callers can
 * catch and fall back to graceful empty / signed-out states — the storefront must still work.
 */

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Credentials {
  email: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  first_name?: string;
  last_name?: string;
}

export interface Customer {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  created_at?: string;
  metadata?: Record<string, unknown> | null;
}

export interface OrderLineItem {
  id: string;
  title: string;
  quantity: number;
  unit_price?: number;
  thumbnail?: string | null;
  variant_title?: string | null;
}

export interface OrderFulfillment {
  id: string;
  shipped_at?: string | null;
  delivered_at?: string | null;
  tracking_numbers?: string[];
  labels?: Array<{ tracking_number?: string | null; tracking_url?: string | null }>;
}

export interface Order {
  id: string;
  display_id?: number;
  status?: string;
  fulfillment_status?: string;
  payment_status?: string;
  created_at?: string;
  currency_code?: string;
  email?: string;
  total?: number;
  items?: OrderLineItem[];
  fulfillments?: OrderFulfillment[];
}

// ── Pure helpers (unit-tested) ───────────────────────────────────────────────

/**
 * Build request headers for an authenticated store call. Pure + dependency-free so it can be
 * unit-tested. Always includes the publishable key; adds Bearer + JSON content-type when a token
 * is present. An empty/blank token yields no Authorization header (graceful anonymous fallback).
 */
export function authHeaders(token?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PK,
  };
  if (token && token.trim()) h.Authorization = `Bearer ${token.trim()}`;
  return h;
}

/**
 * Format a money amount for display. Lumera's convention is integer CENTS end-to-end (catalog, cart,
 * orders, email) — divide by 100 only at display, like the rest of the storefront. `divisor` defaults
 * to 100 for that; pass 1 only if a caller ever hands an already-major-unit value. Pure + defensive:
 * a nullish amount renders an em dash. (Confirm against a live order during the money-unit go-live check.)
 */
export function formatMoney(amount?: number | null, currency = 'usd', divisor = 100): string {
  if (amount == null || Number.isNaN(amount)) return '—';
  const value = amount / divisor;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(value);
  } catch {
    // Unknown currency code → fall back to a plain dollar string.
    return `$${value.toFixed(2)}`;
  }
}

/** Human order number — prefers Medusa's `display_id`, falls back to a short id slug. */
export function orderNumber(order: Pick<Order, 'display_id' | 'id'>): string {
  if (order.display_id != null) return `#${order.display_id}`;
  return order.id ? `#${order.id.slice(-8)}` : '#—';
}

/** Title-case a snake_case status (e.g. "not_fulfilled" → "Not Fulfilled"). Pure. */
export function statusLabel(status?: string | null): string {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/**
 * Extract the best available tracking info from an order's fulfillments. Pure + defensive across
 * the shapes Medusa returns (top-level tracking_numbers vs. per-label tracking_number/url).
 */
export function trackingFor(order: Pick<Order, 'fulfillments'>): Array<{ number: string; url?: string }> {
  const out: Array<{ number: string; url?: string }> = [];
  for (const f of order.fulfillments ?? []) {
    for (const label of f.labels ?? []) {
      if (label.tracking_number) {
        out.push({ number: label.tracking_number, url: label.tracking_url ?? undefined });
      }
    }
    for (const n of f.tracking_numbers ?? []) {
      if (n && !out.some((t) => t.number === n)) out.push({ number: n });
    }
  }
  return out;
}

// ── Network helpers ───────────────────────────────────────────────────────────

async function call<T>(path: string, init?: RequestInit, token?: string | null): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(token), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message || body?.error || '';
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail || `${res.status} ${path}`);
  }
  // Some endpoints (logout-style) return no body.
  const text = await res.text();
  return (text ? JSON.parse(text) : ({} as T)) as T;
}

// ── Auth + customer API ──────────────────────────────────────────────────────

/**
 * Register a new customer: create the auth identity, then the store profile. Returns the JWT
 * (the caller persists it via the session route). Throws on failure (e.g. email already taken).
 */
export async function register(input: RegisterInput): Promise<{ token: string; customer: Customer }> {
  const { token } = await call<{ token: string }>('/auth/customer/emailpass/register', {
    method: 'POST',
    body: JSON.stringify({ email: input.email, password: input.password }),
  });
  if (!token) throw new Error('Registration did not return a session token.');

  const { customer } = await call<{ customer: Customer }>(
    '/store/customers',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
      }),
    },
    token,
  );
  return { token, customer };
}

/** Log in with email + password. Returns the JWT for the caller to persist. */
export async function login(creds: Credentials): Promise<{ token: string }> {
  const { token } = await call<{ token: string }>('/auth/customer/emailpass', {
    method: 'POST',
    body: JSON.stringify(creds),
  });
  if (!token) throw new Error('Login did not return a session token.');
  return { token };
}

/** Fetch the signed-in customer's profile. */
export async function getCustomer(token: string): Promise<Customer> {
  const { customer } = await call<{ customer: Customer }>('/store/customers/me', {}, token);
  return customer;
}

/** List the signed-in customer's orders (most recent first). */
export async function listOrders(token: string): Promise<Order[]> {
  const res = await call<{ orders?: Order[] }>(
    '/store/orders?fields=id,display_id,status,fulfillment_status,payment_status,created_at,currency_code,total,*items&order=-created_at',
    {},
    token,
  );
  return res.orders ?? [];
}

/** Fetch a single order with items + fulfillment/tracking detail. */
export async function getOrder(token: string, id: string): Promise<Order | null> {
  const res = await call<{ order?: Order }>(
    `/store/orders/${encodeURIComponent(id)}?fields=id,display_id,status,fulfillment_status,payment_status,created_at,currency_code,email,total,*items,*fulfillments,*fulfillments.labels`,
    {},
    token,
  );
  return res.order ?? null;
}

/**
 * Best-effort: associate the existing guest cart (localStorage `axiv_cart`) with the now signed-in
 * customer. Medusa sets the customer when a Bearer token is present on a cart update. Never throws —
 * a failed association must never block login.
 */
export async function associateGuestCart(token: string): Promise<void> {
  try {
    if (typeof window === 'undefined') return;
    const cartId = localStorage.getItem('axiv_cart');
    if (!cartId) return;
    await call(`/store/carts/${encodeURIComponent(cartId)}`, { method: 'POST', body: JSON.stringify({}) }, token);
  } catch {
    /* best-effort — ignore */
  }
}
