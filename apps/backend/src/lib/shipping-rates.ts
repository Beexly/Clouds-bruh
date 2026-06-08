/**
 * Live shipping-rate lookup — gated, fixture-safe carrier rating for the Lumera fulfillment provider.
 *
 * Mirrors the gating discipline used elsewhere in Lumera (apps/intelligence/src/vendors/clients.ts,
 * apps/backend/src/modules/lumera-fulfillment/service.ts): with no carrier credentials present, this
 * module makes ZERO network calls and returns `null`, so the backend compiles, tests pass, and nothing
 * reaches a live carrier API. All network is wrapped in try/catch and degrades to `null` on any failure.
 *
 * Provider precedence: EasyPost (if EASYPOST_API_KEY) → Shippo (if SHIPPO_API_KEY) → null.
 * Uses the global `fetch` only — no SDK packages, no new dependencies.
 */

export type ShippingRateInput = {
  to_country?: string;
  to_postal?: string;
  from_postal?: string;
  weight_oz?: number;
  items?: Array<{ quantity: number }>;
};

export type ShippingRate = {
  amount_cents: number;
  currency: string;
  carrier: string;
  service: string;
  est_days: number;
};

/** Whether a live carrier rating provider is configured (EasyPost or Shippo). */
export function shippingRatesConfigured(): boolean {
  return Boolean(process.env.EASYPOST_API_KEY || process.env.SHIPPO_API_KEY);
}

const DEFAULT_FROM_POSTAL = process.env.SHIP_FROM_POSTAL || '90001'; // Los Angeles, CA fallback origin
const DEFAULT_FROM_COUNTRY = process.env.SHIP_FROM_COUNTRY || 'US';

/** Total package weight in ounces — explicit weight wins, else ~6oz per unit, floored at 1oz. */
function totalWeightOz(input: ShippingRateInput): number {
  if (typeof input.weight_oz === 'number' && Number.isFinite(input.weight_oz) && input.weight_oz > 0) {
    return input.weight_oz;
  }
  const units = (input.items ?? []).reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0);
  return Math.max(1, units * 6 || 6);
}

/**
 * Get the cheapest live shipping rate for a destination, or `null` when no carrier is configured
 * or the lookup fails. Never throws.
 */
export async function getLiveShippingRate(input: ShippingRateInput): Promise<ShippingRate | null> {
  if (process.env.EASYPOST_API_KEY) {
    return easypostRate(input).catch(() => null);
  }
  if (process.env.SHIPPO_API_KEY) {
    return shippoRate(input).catch(() => null);
  }
  return null;
}

// ── EasyPost ────────────────────────────────────────────────────────────────
// POST https://api.easypost.com/v2/shipments with HTTP Basic auth (key as username, blank password).
// Response: { rates: [{ rate, currency, carrier, service, delivery_days, est_delivery_days, ... }] }.
async function easypostRate(input: ShippingRateInput): Promise<ShippingRate | null> {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) return null;
  const auth = Buffer.from(`${key}:`).toString('base64');
  const weight = totalWeightOz(input);
  const body = {
    shipment: {
      to_address: {
        country: input.to_country || DEFAULT_FROM_COUNTRY,
        zip: input.to_postal || '',
      },
      from_address: {
        country: DEFAULT_FROM_COUNTRY,
        zip: input.from_postal || DEFAULT_FROM_POSTAL,
      },
      parcel: { weight },
    },
  };
  const res = await fetch('https://api.easypost.com/v2/shipments', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    rates?: Array<{
      rate?: string | number;
      currency?: string;
      carrier?: string;
      service?: string;
      delivery_days?: number | null;
      est_delivery_days?: number | null;
    }>;
  };
  const rates = Array.isArray(data.rates) ? data.rates : [];
  let best: ShippingRate | null = null;
  for (const r of rates) {
    const dollars = Number(r.rate);
    if (!Number.isFinite(dollars)) continue;
    const cents = Math.round(dollars * 100);
    if (best && cents >= best.amount_cents) continue;
    best = {
      amount_cents: cents,
      currency: (r.currency || 'USD').toUpperCase(),
      carrier: r.carrier || 'unknown',
      service: r.service || 'standard',
      est_days: Number(r.delivery_days ?? r.est_delivery_days ?? 0) || 0,
    };
  }
  return best;
}

// ── Shippo ──────────────────────────────────────────────────────────────────
// POST https://api.goshippo.com/shipments/ with header `Authorization: ShippoToken {key}`.
// Use async=false so rates come back inline. Response:
// { rates: [{ amount, currency, provider, servicelevel: { name, token }, estimated_days, ... }] }.
async function shippoRate(input: ShippingRateInput): Promise<ShippingRate | null> {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) return null;
  const weight = totalWeightOz(input);
  const body = {
    address_from: {
      country: DEFAULT_FROM_COUNTRY,
      zip: input.from_postal || DEFAULT_FROM_POSTAL,
    },
    address_to: {
      country: input.to_country || DEFAULT_FROM_COUNTRY,
      zip: input.to_postal || '',
    },
    parcels: [
      {
        weight: String(weight),
        mass_unit: 'oz',
        length: '6',
        width: '6',
        height: '4',
        distance_unit: 'in',
      },
    ],
    async: false,
  };
  const res = await fetch('https://api.goshippo.com/shipments/', {
    method: 'POST',
    headers: { Authorization: `ShippoToken ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    rates?: Array<{
      amount?: string | number;
      currency?: string;
      provider?: string;
      servicelevel?: { name?: string; token?: string };
      estimated_days?: number | null;
    }>;
  };
  const rates = Array.isArray(data.rates) ? data.rates : [];
  let best: ShippingRate | null = null;
  for (const r of rates) {
    const dollars = Number(r.amount);
    if (!Number.isFinite(dollars)) continue;
    const cents = Math.round(dollars * 100);
    if (best && cents >= best.amount_cents) continue;
    best = {
      amount_cents: cents,
      currency: (r.currency || 'USD').toUpperCase(),
      carrier: r.provider || 'unknown',
      service: r.servicelevel?.name || r.servicelevel?.token || 'standard',
      est_days: Number(r.estimated_days ?? 0) || 0,
    };
  }
  return best;
}
