/**
 * money.ts — pure PayPal money-boundary helpers, deliberately free of any Medusa/SDK imports so they
 * can be exercised standalone (e.g. scripts/paypal-capture-proof.ts) and remain the SINGLE SOURCE OF
 * TRUTH for the cents↔decimal conversion that checkout actually uses. service.ts imports + re-exports
 * these, so the provider and the proof test the exact same code.
 */

/** Select the PayPal API base URL. Live only when env === 'live'; everything else → sandbox. */
export function paypalBaseUrl(env?: string): string {
  return String(env).toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Lumera money convention: amounts are stored as **integer cents** throughout (catalog, cart, email),
 * matching the storefront (which divides by 100 for display). PayPal's REST API wants a 2-decimal
 * string in major units, so we convert cents → dollars only here, at the external boundary.
 * (Verify with one PayPal sandbox capture before going live — see SECURITY.md money-unit note.)
 */
export function formatPayPalAmount(amountCents: unknown): string {
  const n = Number(amountCents);
  if (!Number.isFinite(n) || n < 0) return '0.00';
  return (n / 100).toFixed(2);
}
