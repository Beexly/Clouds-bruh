'use client';

/**
 * Wishlist provider — persistent across reloads (localStorage `axiv_wishlist`) and, when the
 * customer is signed in, best-effort mirrored to Medusa customer.metadata so it follows them across
 * devices. The remote sync NEVER blocks: localStorage is always the source of truth and every
 * network call is fire-and-forget. All state transitions delegate to the pure reducer in
 * lib/wishlist (unit-tested) so this file stays a thin, side-effecting shell.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  WISHLIST_KEY,
  parse,
  has as hasItem,
  toggle as toggleItem,
  remove as removeItem,
  merge as mergeItems,
  type WishlistItem,
  type WishlistInput,
} from '../lib/wishlist';
import { fetchRemote, pushRemote } from '../lib/wishlist-sync';
import { useCustomer } from './customer';
import { signal } from '../lib/signal';

interface WishlistCtx {
  items: WishlistItem[];
  count: number;
  ready: boolean;
  has: (id: string) => boolean;
  toggle: (input: WishlistInput) => void;
  remove: (id: string) => void;
}

const WishlistContext = createContext<WishlistCtx>({
  items: [],
  count: 0,
  ready: false,
  has: () => false,
  toggle: () => {},
  remove: () => {},
});

function readLocal(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    return parse(localStorage.getItem(WISHLIST_KEY));
  } catch {
    return [];
  }
}

function writeLocal(items: readonly WishlistItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  } catch {
    /* quota / private-mode — non-fatal */
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);
  const { customer } = useCustomer();
  // Avoid re-merging remote on every customer object identity change.
  const mergedFor = useRef<string | null>(null);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setItems(readLocal());
    setReady(true);
  }, []);

  // On sign-in, reconcile local + remote (union, earliest-add wins) and push the merged result
  // back. Defensive: if the fetch fails we keep the local list untouched.
  useEffect(() => {
    if (!ready || !customer?.id) {
      if (!customer?.id) mergedFor.current = null;
      return;
    }
    if (mergedFor.current === customer.id) return;
    mergedFor.current = customer.id;
    let active = true;
    (async () => {
      const remote = await fetchRemote();
      if (!active || remote.length === 0) return;
      setItems((prev) => {
        const merged = mergeItems(prev, remote);
        writeLocal(merged);
        void pushRemote(merged);
        return merged;
      });
    })();
    return () => {
      active = false;
    };
  }, [ready, customer?.id]);

  const toggle = useCallback(
    (input: WishlistInput) => {
      setItems((prev) => {
        const adding = !hasItem(prev, input.id);
        const next = toggleItem(prev, input);
        writeLocal(next);
        if (customer?.id) void pushRemote(next);
        // SIGNAL has no wishlist event; record as a lightweight save/unsave page action.
        signal('page_view', input.id, undefined, {
          surface: adding ? 'wishlist_add' : 'wishlist_remove',
          chapter: input.chapter,
        });
        return next;
      });
    },
    [customer?.id],
  );

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = removeItem(prev, id);
        if (next === prev) return prev;
        writeLocal(next);
        if (customer?.id) void pushRemote(next);
        signal('page_view', id, undefined, { surface: 'wishlist_remove' });
        return next;
      });
    },
    [customer?.id],
  );

  const has = useCallback((id: string) => hasItem(items, id), [items]);

  return (
    <WishlistContext.Provider
      value={{ items, count: items.length, ready, has, toggle, remove }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
