import { Lifecycle } from '../model/enums.mjs';
import { loadCatalog } from '../catalog/store.mjs';
import { BRAND } from '../brand.mjs';

/**
 * Stripe sync (Phase 4 groundwork). Builds the request artifacts needed to
 * create a Stripe product + price for each PUBLISHED product. It performs NO
 * Stripe calls and spends nothing — the Node runtime cannot call MCP tools.
 * An operator (or the Claude agent) fulfills these via the Stripe MCP in TEST
 * mode, then records the resulting IDs back. This mirrors the GitHub flow.
 *
 * Safety: only published products are eligible; amounts are integer minor units;
 * every request is explicitly test-mode and idempotency-keyed.
 */

export function productCreateRequest(product) {
  return {
    method: 'create_product',
    idempotencyKey: `prod-${product.id}`,
    params: {
      name: `${product.title}${product.subtitle ? ' — ' + product.subtitle : ''}`,
      description: (product.description || '').slice(0, 500),
      metadata: {
        eclipse_product_id: product.id,
        sku_root: (product.variants?.[0]?.sku || '').split('-').slice(0, 2).join('-'),
        brand: BRAND.name,
        tier: product.tier || '',
      },
    },
  };
}

export function priceCreateRequest(product) {
  return {
    method: 'create_price',
    idempotencyKey: `price-${product.id}`,
    params: {
      // product ID is filled in after the product create resolves
      product: `\${created:${product.id}}`,
      currency: (product.pricing?.currency || 'USD').toLowerCase(),
      unit_amount: product.pricing?.listMinor || 0,
      metadata: { eclipse_product_id: product.id },
    },
  };
}

/** Build the full sync plan for all eligible (published) products. */
export async function buildStripeSyncPlan(paths) {
  const catalog = await loadCatalog(paths);
  const published = (catalog.products || []).filter((p) => p.lifecycle === Lifecycle.PUBLISHED);
  return {
    mode: 'test', // never live from this exporter
    note: 'Fulfill via Stripe MCP in TEST mode. Going live is a separate, deliberate operator action.',
    requests: published.flatMap((p) => [productCreateRequest(p), priceCreateRequest(p)]),
    productCount: published.length,
  };
}
