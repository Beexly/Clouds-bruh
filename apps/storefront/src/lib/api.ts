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
