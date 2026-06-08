'use client';

/**
 * Best-effort customer-metadata sync for the wishlist. NEVER throws and NEVER blocks the UI — when
 * a customer is signed in we mirror their wishlist into Medusa customer.metadata so it follows them
 * across devices; if the backend is down, the token is stale, or the customer is anonymous, every
 * function quietly no-ops and localStorage remains the source of truth.
 */

import { authHeaders, type Customer } from './customer';
import { parse, type WishlistItem } from './wishlist';

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';

/** The customer.metadata key we mirror the wishlist into. */
export const METADATA_KEY = 'wishlist';

/** Read the persisted token from the httpOnly session cookie via the route handler. */
async function readToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/session', { cache: 'no-store' });
    if (!res.ok) return null;
    const { token } = await res.json();
    return typeof token === 'string' && token ? token : null;
  } catch {
    return null;
  }
}

/** Pull the wishlist saved on the customer's metadata. Returns [] on any failure. */
export async function fetchRemote(): Promise<WishlistItem[]> {
  try {
    const token = await readToken();
    if (!token) return [];
    const res = await fetch(`${BASE}/store/customers/me?fields=id,metadata`, {
      headers: authHeaders(token),
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const { customer } = (await res.json()) as { customer?: Customer };
    return parse(customer?.metadata?.[METADATA_KEY]);
  } catch {
    return [];
  }
}

/**
 * Push the wishlist onto the customer's metadata. Fire-and-forget — resolves regardless of outcome.
 * Medusa merges metadata keys, so we only send our one key and leave everything else untouched.
 */
export async function pushRemote(items: readonly WishlistItem[]): Promise<void> {
  try {
    const token = await readToken();
    if (!token) return;
    await fetch(`${BASE}/store/customers/me`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ metadata: { [METADATA_KEY]: items } }),
    });
  } catch {
    /* best-effort — ignore */
  }
}
