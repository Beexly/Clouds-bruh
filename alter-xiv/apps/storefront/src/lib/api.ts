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

export async function createCart() {
  return apiFetch('/store/carts', { method: 'POST', body: JSON.stringify({}) });
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
