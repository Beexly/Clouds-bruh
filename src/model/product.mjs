import {
  Lifecycle,
  Visibility,
  StockState,
  Currency,
  MediaProvenance,
  values,
} from './enums.mjs';
import { productId, variantId, mediaId, skuFrom, slugify } from './ids.mjs';
import { assertValid } from './validate.mjs';
import { now } from '../lib/clock.mjs';
import { int } from '../lib/num.mjs';
import { BRAND } from '../brand.mjs';

const productSchema = {
  title: { required: true, type: 'string' },
  description: { required: true, type: 'string' },
  category: { required: true, type: 'string' },
  lifecycle: { required: true, enum: values(Lifecycle) },
  visibility: { required: true, enum: values(Visibility) },
  stockState: { required: true, enum: values(StockState) },
};

export function createMediaRef(input = {}) {
  const role = input.role || 'hero';
  const url = input.url || '';
  return {
    id: input.id || mediaId([role, url, input.alt || '']),
    role,
    url,
    alt: input.alt || '',
    width: input.width,
    height: input.height,
    provenance: input.provenance || MediaProvenance.PLACEHOLDER,
    // Measured quality metrics (R4) — set by the imagery agent / enhancement MCP;
    // consulted by the hard media gate. Undefined = unmeasured.
    metrics: input.metrics,
    // Imagery is NOT approved until a human approves it — only approved media counts toward the gate.
    approved: input.approved === true,
  };
}

/**
 * Variant with a generic `attributes` map (R2). Luxury breadth needs more than
 * color/size — material, carat, length, fragrance volume, finish. `attributes`
 * is the canonical bag; `color`/`size` remain as derived, backwards-compatible
 * conveniences (and the default attributes for apparel). `label` is the
 * human-readable variant name derived from attributes.
 */
export function createVariant(input = {}, category = 'item') {
  // Merge legacy color/size into the canonical attributes map.
  const attributes = { ...(input.attributes || {}) };
  if (input.color != null && attributes.color == null) attributes.color = input.color;
  if (input.size != null && attributes.size == null) attributes.size = input.size;

  const color = attributes.color ?? 'Default';
  const size = attributes.size ?? 'OS';

  // SKU stays stable for apparel (category/color/size); for attribute-only
  // variants it derives from the joined attribute values.
  const skuSeed =
    attributes.color != null || attributes.size != null
      ? { category, color, size }
      : { category, color: Object.values(attributes)[0] || 'X', size: Object.values(attributes)[1] || 'OS' };

  // Human label: prefer real attribute values; fall back to color/size.
  const label = Object.keys(attributes).length
    ? Object.values(attributes).join(' / ')
    : `${color} / ${size}`;

  return {
    id: input.id || variantId([input.sku || skuFrom(skuSeed)]),
    sku: input.sku || skuFrom(skuSeed),
    attributes,
    label,
    color, // back-compat
    size, // back-compat
    priceMinor: input.priceMinor,
    inventory: {
      onHand: int(input.inventory?.onHand, 0),
      reserved: int(input.inventory?.reserved, 0),
      restockThreshold: int(input.inventory?.restockThreshold, 5),
    },
    stockState: input.stockState || StockState.OUT,
    barcode: input.barcode,
  };
}

export function createProduct(input = {}) {
  const title = input.title || 'Untitled';
  const slug = input.slug || slugify(title);
  const category = input.category || 'item';
  const at = input.createdAt || now();
  const product = {
    id: input.id || productId([slug, category, input.origin?.candidateId || '']),
    // Tenancy seam (R2): single-tenant today; the key is planted now so events,
    // queue, and projections can be tenant-scoped when Eclipse is sold/multi-tenant.
    tenantId: input.tenantId || BRAND.tenant,
    slug,
    title,
    subtitle: input.subtitle,
    description: input.description || '',
    bulletBenefits: input.bulletBenefits || [],
    emotionalHooks: input.emotionalHooks || [],
    collectionId: input.collectionId,
    categoryId: input.categoryId, // taxonomy node (createCategory); distinct from curated collection
    brand: input.brand || BRAND.name,
    tier: input.tier || BRAND.tiers.vault,
    category,
    tags: input.tags || [],
    specs: input.specs || {},
    variants: (input.variants || []).map((v) => createVariant(v, category)),
    media: (input.media || []).map(createMediaRef),
    pricing: {
      listMinor: int(input.pricing?.listMinor, 0),
      currency: input.pricing?.currency || Currency.USD,
      floorMinor: int(input.pricing?.floorMinor, 0),
      marginPct: input.pricing?.marginPct,
    },
    lifecycle: input.lifecycle || Lifecycle.DRAFT,
    visibility: input.visibility || Visibility.HIDDEN,
    stockState: input.stockState || StockState.OUT,
    supplierId: input.supplierId,
    scores: {
      readiness: int(input.scores?.readiness, 0),
      media: int(input.scores?.media, 0),
      supplier: int(input.scores?.supplier, 0),
    },
    origin: input.origin || { source: 'seed' },
    productionRun: input.productionRun,
    approvedBy: input.approvedBy,
    approvedAt: input.approvedAt,
    createdAt: at,
    updatedAt: input.updatedAt || at,
  };
  assertValid(product, productSchema, 'product');
  return product;
}
