import type { ProductCandidate } from '@alterxiv/shared';
import { candidateToProductTruth } from '@alterxiv/shared';

export interface PublishResult {
  ok: boolean;
  status: 'published' | 'drafted' | 'blocked';
  operation?: 'created' | 'updated' | 'blocked';
  product_id?: string;
  message: string;
  payload?: Record<string, unknown>;
}

export async function publishCandidateToMedusa(candidate: ProductCandidate, publish = true): Promise<PublishResult> {
  const blocked = publishBlockers(candidate);
  if (blocked.length) {
    return {
      ok: false,
      status: 'blocked',
      operation: 'blocked',
      message: `Candidate is blocked: ${blocked.join(', ')}`,
      payload: { blockers: blocked },
    };
  }

  const token = process.env.MEDUSA_ADMIN_API_TOKEN || process.env.MEDUSA_ADMIN_TOKEN;
  if (!token) {
    return {
      ok: false,
      status: 'blocked',
      operation: 'blocked',
      message: 'Missing MEDUSA_ADMIN_API_TOKEN; generated product payload but did not publish.',
      payload: buildProductPayload(candidate, publish),
    };
  }

  const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
  const headers = adminHeaders(token);
  const productPayload = buildProductPayload(candidate, publish);
  const existing = await findExistingLumeraProduct(base, headers, candidate);
  const operation = existing ? 'updated' : 'created';
  const endpoint = existing ? `${base}/admin/products/${existing.id}` : `${base}/admin/products`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(productPayload),
  });

  const body = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    return {
      ok: false,
      status: 'blocked',
      operation: 'blocked',
      message: `Medusa product ${operation} failed: ${res.status}`,
      payload: { ...body, operation, matched_existing_product: existing },
    };
  }

  return {
    ok: true,
    status: publish ? 'published' : 'drafted',
    operation,
    product_id: body.product?.id,
    message: publish
      ? `Product ${operation} and published through Medusa Admin API.`
      : `Product draft ${operation} through Medusa Admin API.`,
    payload: { ...body, operation, matched_existing_product: existing },
  };
}

export function buildProductPayload(candidate: ProductCandidate, publish = true): Record<string, unknown> {
  const truth = candidateToProductTruth(candidate);
  const optionTitles: string[] = Array.from(
    new Set<string>(candidate.variants.flatMap((variant) => Object.keys(variant.option_values)).filter(Boolean))
  );
  const options = optionTitles.length
    ? optionTitles.map((title) => ({ title, values: Array.from(new Set(candidate.variants.map((v) => v.option_values[title]).filter(Boolean))) }))
    : [{ title: 'Default', values: ['Default'] }];

  const payload: Record<string, unknown> = {
    title: candidate.title,
    subtitle: `${candidate.supplier_name} - ${candidate.warehouse_region}`,
    description: candidate.description,
    handle: candidate.handle,
    status: publish ? 'published' : 'draft',
    thumbnail: candidate.image_url,
    images: candidate.image_url ? [{ url: candidate.image_url }] : [],
    options,
    variants: candidate.variants.map((variant) => ({
      title: variant.title,
      sku: variant.sku,
      manage_inventory: false,
      options: Object.keys(variant.option_values).length ? variant.option_values : { Default: 'Default' },
      prices: [{ currency_code: 'usd', amount: variant.retail_cents }],
      metadata: {
        supplier_sku: variant.supplier_sku,
        supplier_cost_cents: variant.cost_cents,
        stock_snapshot: variant.stock,
      },
    })),
    metadata: {
      chapter: candidate.chapter,
      lumera_candidate_id: candidate.id,
      supplier_id: candidate.supplier_id,
      supplier_name: candidate.supplier_name,
      supplier_sku: candidate.supplier_sku,
      fulfillment_provider: candidate.vendor,
      lead_time_days: candidate.lead_time_days,
      supplier_cost_cents: candidate.cost_cents,
      gross_margin: candidate.score?.gross_margin,
      verified_reviews_count: 0,
      media_rights: candidate.media_rights,
      lumera_truth: truth,
      curation_score: candidate.score,
      compliance_review: candidate.compliance,
    },
  };

  const salesChannelId = process.env.LUMERA_SALES_CHANNEL_ID || process.env.MEDUSA_SALES_CHANNEL_ID;
  const shippingProfileId = process.env.LUMERA_SHIPPING_PROFILE_ID || process.env.MEDUSA_SHIPPING_PROFILE_ID;
  if (salesChannelId) payload.sales_channels = [{ id: salesChannelId }];
  if (shippingProfileId) payload.shipping_profile_id = shippingProfileId;
  return payload;
}

export async function findExistingLumeraProduct(
  base: string,
  headers: Record<string, string>,
  candidate: ProductCandidate
): Promise<{ id: string; handle?: string } | null> {
  const products = await fetchProducts(base, headers, candidate.handle);
  const exact =
    products.find((product) => product.metadata?.lumera_candidate_id === candidate.id) ??
    products.find((product) => product.metadata?.supplier_sku === candidate.supplier_sku) ??
    products.find((product) => product.handle === candidate.handle);
  if (exact?.id) return { id: String(exact.id), handle: exact.handle };
  return null;
}

async function fetchProducts(base: string, headers: Record<string, string>, handle: string) {
  const query = new URLSearchParams({
    limit: '100',
    fields: 'id,handle,metadata',
    handle,
  });
  const url = `${base}/admin/products?${query.toString()}`;
  const res = await fetch(url, { headers }).catch(() => null);
  if (!res?.ok) return [] as Array<{ id?: string; handle?: string; metadata?: Record<string, unknown> }>;
  const body = (await res.json().catch(() => ({}))) as any;
  return Array.isArray(body.products)
    ? (body.products as Array<{ id?: string; handle?: string; metadata?: Record<string, unknown> }>)
    : [];
}

function adminHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function publishBlockers(candidate: ProductCandidate) {
  const blockers = [...(candidate.score?.blockers ?? []), ...(candidate.compliance?.blockers ?? [])];
  if (!['ready_for_review', 'approved', 'published', 'live'].includes(candidate.status)) blockers.push(`status:${candidate.status}`);
  if (candidate.media_rights === 'unknown' || candidate.media_rights === 'blocked') blockers.push(`media_rights:${candidate.media_rights}`);
  if (candidate.score && candidate.score.gross_margin < Number(process.env.SUPPLIER_MARGIN_FLOOR ?? 0.38)) {
    blockers.push('margin_below_launch_floor');
  }
  if (candidate.lead_time_days > Number(process.env.MAX_SHIPPING_DAYS ?? 12)) blockers.push('shipping_above_launch_limit');
  if (candidate.vendor === 'manual' && process.env.MANUAL_SUPPLIER_VERIFIED !== 'true') blockers.push('manual_supplier_not_verified');
  if (process.env.VENDOR_LIVE_MODE === 'true' && process.env.STRIPE_API_KEY?.startsWith('sk_test')) blockers.push('stripe_still_test_mode');
  return Array.from(new Set(blockers));
}
