import { Lifecycle, Visibility, StockState } from '../model/enums.mjs';

/**
 * THE default-deny read model. A product is public ONLY when it is published,
 * visible, AND in stock. This single predicate is the guarantee that no draft,
 * hidden, or out-of-stock item ever reaches the storefront.
 */
export function isLive(product) {
  return (
    product.lifecycle === Lifecycle.PUBLISHED &&
    product.visibility === Visibility.VISIBLE &&
    product.stockState === StockState.IN
  );
}

/** Strip internal fields (cost, supplier, scores, origin) for public output. */
export function toPublic(p) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    bulletBenefits: p.bulletBenefits || [],
    emotionalHooks: p.emotionalHooks || [],
    brand: p.brand,
    tier: p.tier,
    category: p.category,
    tags: p.tags || [],
    specs: p.specs || {},
    collectionId: p.collectionId,
    price: { listMinor: p.pricing?.listMinor || 0, currency: p.pricing?.currency || 'USD' },
    variants: (p.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      priceMinor: v.priceMinor,
    })),
    media: (p.media || []).filter((m) => m.approved).map((m) => ({ role: m.role, url: m.url, alt: m.alt })),
    productionRun: p.productionRun,
  };
}

export function projectStorefront(catalog = { products: [] }) {
  const products = (catalog.products || []).filter(isLive).map(toPublic);
  return { products, count: products.length };
}
