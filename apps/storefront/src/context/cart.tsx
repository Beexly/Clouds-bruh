'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createCart, getCart, addToCart, removeFromCart, getRegions } from '../lib/api';
import { signal } from '../lib/signal';
import { DEMO, demoLineItem } from '../lib/demo';

// Demo mode keeps a fully client-side cart (no backend) so "Add to Cart" actually works in the
// zero-config Vercel preview: items add/remove, the header count updates, the cart page renders them.
const DEMO_CART_KEY = 'lumera_demo_cart';
function loadDemoCart(): any {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(DEMO_CART_KEY) : null;
    return raw ? JSON.parse(raw) : { id: 'demo_cart', items: [] };
  } catch {
    return { id: 'demo_cart', items: [] };
  }
}
function saveDemoCart(c: any) {
  try {
    localStorage.setItem(DEMO_CART_KEY, JSON.stringify(c));
  } catch {
    /* ignore quota/private-mode errors */
  }
}

interface CartCtx {
  cart: any;
  lineCount: number;
  add: (variantId: string, productId: string, chapter?: string) => Promise<void>;
  remove: (lineItemId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartCtx>({
  cart: null, lineCount: 0, add: async () => {}, remove: async () => {}, refresh: async () => {},
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<any>(null);

  const getOrCreateCart = useCallback(async () => {
    if (DEMO) {
      const c = loadDemoCart();
      setCart(c);
      return c;
    }
    let cartId = localStorage.getItem('axiv_cart');
    if (cartId) {
      try {
        const { cart: c } = await getCart(cartId);
        setCart(c);
        return c;
      } catch { localStorage.removeItem('axiv_cart'); }
    }
    const regions = await getRegions().catch(() => []);
    const regionId = regions[0]?.id;
    const { cart: c } = await createCart(regionId);
    localStorage.setItem('axiv_cart', c.id);
    setCart(c);
    return c;
  }, []);

  useEffect(() => { getOrCreateCart().catch(() => {}); }, [getOrCreateCart]);

  const add = useCallback(async (variantId: string, productId: string, chapter?: string) => {
    if (DEMO) {
      const c = cart ?? loadDemoCart();
      const items = [...(c.items ?? [])];
      const existing = items.find((li: any) => li.product_id === productId);
      if (existing) existing.quantity += 1;
      else {
        const li = demoLineItem(productId);
        if (li) items.push(li);
      }
      const updated = { ...c, items };
      saveDemoCart(updated);
      setCart(updated);
      signal('add_to_cart', productId, undefined, { chapter });
      return;
    }
    const c = cart ?? await getOrCreateCart();
    const { cart: updated } = await addToCart(c.id, variantId);
    setCart(updated);
    signal('add_to_cart', productId, undefined, { chapter });
  }, [cart, getOrCreateCart]);

  const remove = useCallback(async (lineItemId: string) => {
    if (DEMO) {
      const c = cart ?? loadDemoCart();
      const updated = { ...c, items: (c.items ?? []).filter((li: any) => li.id !== lineItemId) };
      saveDemoCart(updated);
      setCart(updated);
      signal('remove_from_cart', lineItemId);
      return;
    }
    if (!cart) return;
    const { cart: updated } = await removeFromCart(cart.id, lineItemId);
    setCart(updated);
    signal('remove_from_cart', lineItemId);
  }, [cart]);

  const refresh = useCallback(async () => { await getOrCreateCart(); }, [getOrCreateCart]);

  const lineCount = cart?.items?.length ?? 0;
  return (
    <CartContext.Provider value={{ cart, lineCount, add, remove, refresh }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
