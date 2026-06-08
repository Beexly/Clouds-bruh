/**
 * Gift-card helpers — pure, dependency-free amount/code handling for the gift-card UX. The backend
 * stores balances in cents (1 Lumen = 1 credit = 1¢), so the storefront collects dollars and the
 * helpers here convert + validate before any network call.
 */

const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export const GIFT_CARD_PATH = '/store/monetization/gift-cards';
/** Suggested denominations (USD) for the purchase form. */
export const GIFT_CARD_PRESETS = [25, 50, 100, 250] as const;

/**
 * Convert a user-entered dollar string to an integer cent amount, or null when invalid. Pure +
 * defensive: rejects empty/NaN/≤0 and over-precise inputs, strips a leading `$` and commas.
 */
export function dollarsToCents(input: string | number): number | null {
  const raw = typeof input === 'number' ? String(input) : input;
  if (raw == null) return null;
  const cleaned = String(raw).trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars <= 0) return null;
  return Math.round(dollars * 100);
}

/** Format a cent amount as USD for display. Pure. */
export function centsToUsd(cents?: number | null): string {
  if (cents == null || !Number.isFinite(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

/** Normalize a gift-card code: trim + uppercase (codes are issued uppercased). Pure. */
export function normalizeCode(code: string): string {
  return (code ?? '').trim().toUpperCase();
}

export interface IssueResult {
  issued: true;
  code: string;
  balance: number;
}
export interface RedeemResult {
  redeemed: number;
  wallet_balance: number;
}

async function post<T>(body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${GIFT_CARD_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': PK },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Issue a gift card for `cents`. Returns the generated code + balance. Throws on failure. */
export function issueGiftCard(cents: number, purchaserId?: string, message?: string): Promise<IssueResult> {
  return post<IssueResult>({ amount: cents, purchaser_id: purchaserId, message });
}

/** Redeem a code into a customer's Lumens wallet. Throws on failure (invalid/spent code). */
export function redeemGiftCard(code: string, customerId: string): Promise<RedeemResult> {
  return post<RedeemResult>({ redeem: true, code: normalizeCode(code), customer_id: customerId });
}
