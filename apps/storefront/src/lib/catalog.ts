/**
 * Catalog helpers. Medusa v2 only returns variant prices when given a region context and the
 * `*variants.calculated_price` field — without it, everything shows "Price on request".
 * priceCents/priceStr are pure (safe in client components); getRegionId fetches server-side.
 */
const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export const PRODUCT_FIELDS =
  'id,title,handle,thumbnail,description,metadata,images,variants.id,*variants.calculated_price';

let _region: string | null = null;
export async function getRegionId(): Promise<string> {
  if (_region) return _region;
  try {
    const res = await fetch(`${API}/store/regions`, { headers: { 'x-publishable-api-key': PK }, cache: 'force-cache' });
    const { regions } = await res.json();
    _region = regions?.[0]?.id ?? '';
  } catch {
    _region = '';
  }
  return _region!;
}

/** Cents for a product's first variant — prefers the region-calculated price. */
export function priceCents(p: any): number | null {
  const v = p?.variants?.[0];
  return v?.calculated_price?.calculated_amount ?? v?.prices?.[0]?.amount ?? null;
}

export function priceStr(p: any): string {
  const c = priceCents(p);
  return c != null ? `$${(c / 100).toFixed(2)}` : 'Price on request';
}
