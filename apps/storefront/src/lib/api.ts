'use client';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export const headers = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PK,
};

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const params = ids.map((id) => `id[]=${id}`).join('&');
  const res = await apiFetch(`/store/products?${params}&fields=id,title,handle,thumbnail,metadata,variants`);
  return (res.products ?? []) as any[];
}

export async function getProductByHandle(handle: string) {
  const res = await apiFetch(`/store/products?handle=${encodeURIComponent(handle)}&fields=id,title,handle,description,thumbnail,metadata,variants,images`);
  return (res.products?.[0] ?? null) as any;
}

export async function getBroadcast(visitorId: string) {
  return apiFetch(`/store/broadcast?visitor_id=${encodeURIComponent(visitorId)}`);
}

export async function getRecs(visitorId: string, strategy = 'for_you', limit = 12) {
  return apiFetch(`/store/recommendations?visitor_id=${encodeURIComponent(visitorId)}&strategy=${strategy}&limit=${limit}`);
}

export async function getRegions() {
  const res = await apiFetch('/store/regions');
  return (res.regions ?? []) as any[];
}

export async function createCart(regionId?: string) {
  const body = regionId ? { region_id: regionId } : {};
  return apiFetch('/store/carts', { method: 'POST', body: JSON.stringify(body) });
}

export async function getCart(cartId: string) {
  return apiFetch(`/store/carts/${cartId}`);
}

export async function addToCart(cartId: string, variantId: string, quantity = 1) {
  return apiFetch(`/store/carts/${cartId}/line-items`, {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
}

export async function removeFromCart(cartId: string, lineItemId: string) {
  return apiFetch(`/store/carts/${cartId}/line-items/${lineItemId}`, { method: 'DELETE' });
}

export async function getShippingOptions(cartId: string) {
  const res = await apiFetch(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`);
  return (res.shipping_options ?? []) as any[];
}

export async function getShippingEstimate(items: Array<{ lead_time_days?: number }> = []) {
  const res = await apiFetch('/store/shipping-estimate', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return res.promise as any;
}

export async function addShippingMethod(cartId: string, optionId: string) {
  return apiFetch(`/store/carts/${cartId}/shipping-methods`, {
    method: 'POST',
    body: JSON.stringify({ option_id: optionId }),
  });
}

export async function createPaymentCollection(cartId: string) {
  const res = await apiFetch('/store/payment-collections', {
    method: 'POST',
    body: JSON.stringify({ cart_id: cartId }),
  });
  return res.payment_collection as any;
}

export async function initPaymentSession(collectionId: string, providerId: string) {
  const res = await apiFetch(`/store/payment-collections/${collectionId}/payment-sessions`, {
    method: 'POST',
    body: JSON.stringify({ provider_id: providerId }),
  });
  return res.payment_collection as any;
}

export async function completeCart(cartId: string) {
  return apiFetch(`/store/carts/${cartId}/complete`, { method: 'POST' });
}

// ── Payment providers ──────────────────────────────────────────────────────────

/**
 * The Medusa session provider id for our custom PayPal provider. Medusa builds it as
 * `pp_{static identifier}_{config id}`; our provider's static identifier is `paypal` and it is wired
 * in medusa-config with `id: 'paypal'`, so the resolved id is `pp_paypal_paypal`.
 */
export const PAYPAL_PROVIDER_ID = 'pp_paypal_paypal';

/**
 * List the payment providers Medusa has enabled for a region. Used to detect whether the PayPal
 * provider is actually active on the backend before offering PayPal in the UI — so a stray
 * NEXT_PUBLIC_PAYPAL_CLIENT_ID without a configured backend provider degrades to the test flow.
 */
export async function getPaymentProviders(regionId: string): Promise<Array<{ id: string }>> {
  if (!regionId) return [];
  try {
    const res = await apiFetch(`/store/payment-providers?region_id=${encodeURIComponent(regionId)}`);
    return (res.payment_providers ?? []) as Array<{ id: string }>;
  } catch {
    return [];
  }
}

/** True if the PayPal provider is enabled for the region. */
export async function paypalProviderAvailable(regionId: string): Promise<boolean> {
  const providers = await getPaymentProviders(regionId);
  return providers.some((p) => p.id === PAYPAL_PROVIDER_ID || p.id.includes('paypal'));
}

/**
 * Resolve the active PayPal session id from a payment collection. Our backend provider stores the
 * PayPal Orders v2 order id under session.data.id (the value the JS SDK's createOrder must return).
 */
export function paypalOrderIdFromCollection(collection: any): string | null {
  const sessions = (collection?.payment_sessions ?? []) as any[];
  const session = sessions.find(
    (s) => s?.provider_id === PAYPAL_PROVIDER_ID || String(s?.provider_id ?? '').includes('paypal')
  );
  const id = session?.data?.id ?? session?.data?.order_id;
  return id ? String(id) : null;
}

// ── Stripe ────────────────────────────────────────────────────────────────────

/**
 * Medusa v2 resolves payment provider ids as `pp_{static identifier}_{config id}`; the official
 * Stripe provider's identifier is `stripe` and it is wired in medusa-config with `id: 'stripe'`,
 * so the resolved id is `pp_stripe_stripe`.
 */
export const STRIPE_PROVIDER_ID = 'pp_stripe_stripe';

/** Pure matcher (unit-tested): true if a region's provider list contains the Stripe provider. */
export function hasStripeProvider(providers: Array<{ id: string }>): boolean {
  return providers.some((p) => p?.id === STRIPE_PROVIDER_ID || String(p?.id ?? '').includes('stripe'));
}

/** True if the Stripe provider is enabled for the region. Defensive: any failure → false. */
export async function stripeProviderAvailable(regionId: string): Promise<boolean> {
  const providers = await getPaymentProviders(regionId);
  return hasStripeProvider(providers);
}

/**
 * Resolve the Stripe PaymentIntent client_secret from a payment collection. The official provider
 * stores it under session.data.client_secret. Money note: the intent (and its amount, integer cents)
 * is created server-side by the provider — the browser only references the server-issued secret and
 * never computes or transmits the charge amount.
 */
export function stripeClientSecretFromCollection(collection: any): string | null {
  const sessions = (collection?.payment_sessions ?? []) as any[];
  const session = sessions.find(
    (s) => s?.provider_id === STRIPE_PROVIDER_ID || String(s?.provider_id ?? '').includes('stripe')
  );
  const secret = session?.data?.client_secret;
  return secret ? String(secret) : null;
}

// ── Reviews ─────────────────────────────────────────────────────────────────────

export interface StoreReview {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  body: string;
  verified: boolean;
  created_at: string;
}

export interface StoreReviewStats {
  count: number;
  average: number;
}

export async function getReviews(
  productId: string
): Promise<{ reviews: StoreReview[]; stats: StoreReviewStats }> {
  try {
    const res = await apiFetch(`/store/reviews?product_id=${encodeURIComponent(productId)}`);
    return {
      reviews: (res.reviews ?? []) as StoreReview[],
      stats: (res.stats ?? { count: 0, average: 0 }) as StoreReviewStats,
    };
  } catch {
    return { reviews: [], stats: { count: 0, average: 0 } };
  }
}

export async function submitReview(input: {
  product_id: string;
  rating: number;
  body: string;
  title?: string;
  email?: string;
  order_id?: string;
}): Promise<{ review?: StoreReview; error?: string }> {
  const res = await fetch(`${BASE}/store/reviews`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.error ?? `Could not submit review (${res.status})` };
  return { review: data.review as StoreReview };
}
