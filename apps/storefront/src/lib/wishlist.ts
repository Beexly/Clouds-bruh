/**
 * Wishlist — pure, dependency-free state logic for the persistent wishlist.
 *
 * The reducer here is the single source of truth for add/remove/has and is fully unit-tested.
 * The React provider (context/wishlist.tsx) is a thin shell over these helpers + localStorage +
 * a best-effort customer-metadata sync. Keeping the logic pure means the storefront's wishlist
 * behaviour is verifiable without a DOM, a backend, or a signed-in customer.
 *
 * We store only the minimal display data needed to render a saved item offline — never a full
 * product record. The shape is deliberately small + flat so it survives JSON round-trips.
 */

/** The localStorage key for the persisted wishlist (mirrors the `axiv_*` family). */
export const WISHLIST_KEY = 'axiv_wishlist';

/** Minimal saved-item display data — enough to render a card without re-fetching the catalog. */
export interface WishlistItem {
  id: string;
  handle: string;
  title: string;
  image?: string;
  price?: string;
  chapter?: string;
  /** Epoch ms — used to show newest-first. */
  added_at: number;
}

/** What a caller passes to add an item; `added_at` is stamped by the reducer if omitted. */
export type WishlistInput = Omit<WishlistItem, 'added_at'> & { added_at?: number };

/** True when the product id is already on the list. Pure + null-safe. */
export function has(items: readonly WishlistItem[], id: string): boolean {
  if (!id) return false;
  return items.some((i) => i.id === id);
}

/**
 * Add an item. Idempotent: adding an id that's already present is a no-op (returns the SAME array
 * reference so React can skip re-renders). Newest items go to the front.
 */
export function add(items: readonly WishlistItem[], input: WishlistInput): WishlistItem[] {
  if (!input?.id) return items as WishlistItem[];
  if (has(items, input.id)) return items as WishlistItem[];
  const item: WishlistItem = { ...input, added_at: input.added_at ?? Date.now() };
  return [item, ...items];
}

/** Remove an item by id. Removing an absent id returns the SAME array reference (no-op). */
export function remove(items: readonly WishlistItem[], id: string): WishlistItem[] {
  if (!has(items, id)) return items as WishlistItem[];
  return items.filter((i) => i.id !== id);
}

/**
 * Toggle an item: present → removed, absent → added. The atomic primitive behind the heart button.
 */
export function toggle(items: readonly WishlistItem[], input: WishlistInput): WishlistItem[] {
  return has(items, input.id) ? remove(items, input.id) : add(items, input);
}

/**
 * Parse a persisted/synced payload into a clean, de-duplicated item list. Defensive against every
 * malformed shape (non-array, missing fields, dupes, non-string ids) so a corrupted localStorage
 * value or stale customer-metadata blob can never crash the provider.
 */
export function parse(raw: unknown): WishlistItem[] {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  const out: WishlistItem[] = [];
  const seen = new Set<string>();
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === 'string' ? e.id : '';
    const handle = typeof e.handle === 'string' ? e.handle : '';
    const title = typeof e.title === 'string' ? e.title : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      handle,
      title,
      image: typeof e.image === 'string' ? e.image : undefined,
      price: typeof e.price === 'string' ? e.price : undefined,
      chapter: typeof e.chapter === 'string' ? e.chapter : undefined,
      added_at: typeof e.added_at === 'number' && Number.isFinite(e.added_at) ? e.added_at : Date.now(),
    });
  }
  return out;
}

/**
 * Merge two item lists (e.g. local + customer-metadata on sign-in), preferring the richer entry and
 * keeping the earliest `added_at`. Pure — the provider uses this to reconcile without losing items.
 */
export function merge(a: readonly WishlistItem[], b: readonly WishlistItem[]): WishlistItem[] {
  const byId = new Map<string, WishlistItem>();
  for (const item of [...a, ...b]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...existing,
      ...item,
      // Keep the earliest add time, and never let an empty field clobber a populated one.
      added_at: Math.min(existing.added_at, item.added_at),
      title: item.title || existing.title,
      handle: item.handle || existing.handle,
      image: item.image ?? existing.image,
      price: item.price ?? existing.price,
      chapter: item.chapter ?? existing.chapter,
    });
  }
  return [...byId.values()].sort((x, y) => y.added_at - x.added_at);
}
