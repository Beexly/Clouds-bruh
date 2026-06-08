'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getCustomer,
  associateGuestCart,
  type Customer,
  type RegisterInput,
  type Credentials,
} from '../lib/customer';
import { signal } from '../lib/signal';

interface CustomerCtx {
  customer: Customer | null;
  loading: boolean;
  login: (creds: Credentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const CustomerContext = createContext<CustomerCtx>({
  customer: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

/** Read the httpOnly session cookie via the route handler. Defensive: returns null on any failure. */
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

async function persistToken(token: string): Promise<void> {
  await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {});
}

async function clearToken(): Promise<void> {
  await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
}

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Read the session on mount and hydrate the profile. Never throws — a missing backend or an
  // expired token simply leaves us signed-out.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await readToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }
      try {
        const c = await getCustomer(token);
        if (active) setCustomer(c);
      } catch {
        // Token invalid/expired or backend down → clear and stay signed-out.
        await clearToken();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const finishAuth = useCallback(async (token: string) => {
    await persistToken(token);
    // Best-effort cart association — must never block the auth flow.
    await associateGuestCart(token);
    const c = await getCustomer(token);
    setCustomer(c);
  }, []);

  const login = useCallback(
    async (creds: Credentials) => {
      const { token } = await apiLogin(creds);
      await finishAuth(token);
      // No dedicated auth event in the SIGNAL taxonomy — record as an account page_view.
      signal('page_view', undefined, undefined, { surface: 'account_login' });
    },
    [finishAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { token } = await apiRegister(input);
      await finishAuth(token);
      signal('page_view', undefined, undefined, { surface: 'account_register' });
    },
    [finishAuth],
  );

  const logout = useCallback(async () => {
    await clearToken();
    setCustomer(null);
    signal('page_view', undefined, undefined, { surface: 'account_logout' });
  }, []);

  return (
    <CustomerContext.Provider value={{ customer, loading, login, register, logout }}>
      {children}
    </CustomerContext.Provider>
  );
}

export const useCustomer = () => useContext(CustomerContext);
