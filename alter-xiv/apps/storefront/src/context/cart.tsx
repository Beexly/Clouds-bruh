'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { createCart, getCart, addToCart, removeFromCart } from '../lib/api';
import { signal } from '../lib/signal';

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
    let cartId = localStorage.getItem('axiv_cart');
    if (cartId) {
      try {
        const { cart: c } = await getCart(cartId);
        setCart(c);
        return c;
      } catch { localStorage.removeItem('axiv_cart'); }
    }
    const { cart: c } = await createCart();
    localStorage.setItem('axiv_cart', c.id);
    setCart(c);
    return c;
  }, []);

  useEffect(() => { getOrCreateCart().catch(() => {}); }, [getOrCreateCart]);

  const add = useCallback(async (variantId: string, productId: string, chapter?: string) => {
    const c = cart ?? await getOrCreateCart();
    const { cart: updated } = await addToCart(c.id, variantId);
    setCart(updated);
    signal('add_to_cart', productId, undefined, { chapter });
  }, [cart, getOrCreateCart]);

  const remove = useCallback(async (lineItemId: string) => {
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
