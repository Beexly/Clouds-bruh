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
    // Imagery is NOT approved until a human approves it — only approved media counts toward the gate.
    approved: input.approved === true,
  };
}

export function createVariant(input = {}, category = 'item') {
  const color = input.color || 'Default';
  const size = input.size || 'OS';
  const sku = input.sku || skuFrom({ category, color, size });
  return {
    id: input.id || variantId([sku]),
    sku,
    color,
    size,
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
    slug,
    title,
    subtitle: input.subtitle,
    description: input.description || '',
    bulletBenefits: input.bulletBenefits || [],
    emotionalHooks: input.emotionalHooks || [],
    collectionId: input.collectionId,
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
    // DEFAULT-DENY: every product is born draft, hidden, out-of-stock.
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
