import type { Chapter } from './events';

export type VendorId = 'printify' | 'printful' | 'cj' | 'manual' | 'radar';

export type VendorMode = 'live' | 'sandbox' | 'fixture' | 'missing_credentials' | 'blocked';

export interface VendorConnection {
  id: VendorId;
  label: string;
  mode: VendorMode;
  connected: boolean;
  can_publish: boolean;
  can_submit_orders: boolean;
  last_checked_at: string;
  missing_env: string[];
  message: string;
}

export interface VendorConnector {
  id: VendorId;
  label: string;
  healthCheck: () => Promise<VendorConnection>;
  searchProducts: (query: string, limit?: number) => Promise<ProductCandidate[]>;
  getProductDetails: (supplierSku: string) => Promise<ProductCandidate | null>;
  getVariantInventory: (supplierSku: string) => Promise<{ supplier_sku: string; stock: number; lead_time_days: number; source: VendorMode }>;
  quoteShipping: (input: { supplier_sku: string; country_code?: string; postal_code?: string; quantity?: number }) => Promise<{ min_days: number; max_days: number; cost_cents: number; source: VendorMode }>;
  createDraftOrder: (input: { external_order_id: string; items: Array<{ supplier_sku: string; quantity: number }>; shipping_address?: unknown }) => Promise<{ vendor_order_id: string; status: string; source: VendorMode }>;
  submitOrder: (vendorOrderId: string) => Promise<{ vendor_order_id: string; status: string; source: VendorMode }>;
  cancelOrder: (vendorOrderId: string) => Promise<{ vendor_order_id: string; status: string; source: VendorMode }>;
  getTracking: (vendorOrderId: string) => Promise<{ vendor_order_id: string; tracking_number?: string; tracking_url?: string; status: string; source: VendorMode }>;
  handleWebhook: (payload: unknown, headers?: Record<string, string>) => Promise<{ event_type: string; valid: boolean; message: string }>;
}

export type CandidateStatus =
  | 'ingested'
  | 'enriched'
  | 'scored'
  | 'ready_for_review'
  | 'approved'
  | 'published'
  | 'live'
  | 'needs_sample'
  | 'duplicate'
  | 'compliance_blocked'
  | 'margin_blocked'
  | 'shipping_blocked'
  | 'media_blocked'
  | 'supplier_blocked'
  | 'rejected'
  | 'expired';

export interface CandidateVariant {
  sku: string;
  title: string;
  supplier_sku: string;
  option_values: Record<string, string>;
  cost_cents: number;
  retail_cents: number;
  stock: number;
}

export interface ProductCandidate {
  id: string;
  vendor: VendorId;
  supplier_id: string;
  supplier_name: string;
  supplier_sku: string;
  title: string;
  description: string;
  handle: string;
  category: string;
  category_tree: string[];
  chapter: Chapter;
  source_url?: string;
  image_url?: string;
  media_rights: 'verified' | 'supplier_license' | 'unknown' | 'blocked';
  brand_risk: 'low' | 'medium' | 'high';
  quality_risk: 'known' | 'unknown' | 'high';
  counterfeit_risk: 'low' | 'medium' | 'high';
  recalled_risk: 'low' | 'unknown' | 'high';
  regulated_risk: 'low' | 'medium' | 'high';
  supplier_reliability: number;
  demand_score: number;
  brand_fit_score: number;
  novelty_score: number;
  return_risk_score: number;
  lead_time_days: number;
  warehouse_region: string;
  cost_cents: number;
  retail_cents: number;
  stock: number;
  variants: CandidateVariant[];
  reasons: string[];
  created_at: string;
  updated_at: string;
  status: CandidateStatus;
  score?: CandidateScore;
  compliance?: ComplianceReview;
}

export interface CandidateScore {
  total: number;
  demand: number;
  margin: number;
  supplier: number;
  shipping: number;
  quality: number;
  brand: number;
  returns: number;
  novelty: number;
  gross_margin: number;
  margin_cents: number;
  recommended_status: CandidateStatus;
  blockers: string[];
  needs_sample: boolean;
}

export interface ComplianceReview {
  status: 'pass' | 'blocked' | 'needs_review';
  blockers: string[];
  warnings: string[];
  checked_at: string;
}

export interface ProductTruth {
  product_id?: string;
  handle: string;
  title: string;
  supplier_name: string;
  supplier_region: string;
  fulfillment_provider: VendorId | 'unknown';
  estimated_ship_days: number;
  return_window_days: number;
  quality_checks: string[];
  price_logic: string;
  stock_freshness: string;
  verified_reviews_count: number;
  selected_because: string[];
}

export interface ShippingPromise {
  min_days: number;
  max_days: number;
  provider: string;
  message: string;
  requires_delay_consent: boolean;
}

export const DEFAULT_MARGIN_FLOOR = 0.38;
export const DEFAULT_MAX_SHIPPING_DAYS = 12;
export const AUTO_REJECT_MARGIN_FLOOR = 0.25;
export const AUTO_REJECT_SHIPPING_DAYS = 21;

const BLOCKED_CATEGORY_TERMS = [
  'baby',
  'child',
  'children',
  'toy',
  'supplement',
  'vitamin',
  'ingestible',
  'food',
  'cosmetic',
  'makeup',
  'skin care',
  'skincare',
  'medical',
  'device',
  'weapon',
  'knife',
  'firearm',
  'battery',
  'charger',
  'ppe',
  'mask',
  'hazardous',
  'replica',
  'counterfeit',
  'adult',
];

export function grossMargin(costCents: number, retailCents: number): number {
  if (!retailCents || retailCents <= 0) return 0;
  return (retailCents - costCents) / retailCents;
}

export function evaluateCompliance(candidate: ProductCandidate): ComplianceReview {
  const text = [candidate.title, candidate.category, candidate.category_tree.join(' '), candidate.description]
    .join(' ')
    .toLowerCase();
  const blockers: string[] = [];
  const warnings: string[] = [];

  const blockedTerm = BLOCKED_CATEGORY_TERMS.find((term) => text.includes(term));
  if (blockedTerm) blockers.push(`blocked_category:${blockedTerm}`);
  if (candidate.media_rights === 'blocked' || candidate.media_rights === 'unknown') {
    blockers.push(`media_rights:${candidate.media_rights}`);
  }
  if (candidate.counterfeit_risk === 'high') blockers.push('counterfeit_risk:high');
  if (candidate.recalled_risk === 'high' || candidate.recalled_risk === 'unknown') {
    blockers.push(`recalled_risk:${candidate.recalled_risk}`);
  }
  if (candidate.regulated_risk === 'high') blockers.push('regulated_risk:high');
  if (candidate.brand_risk === 'high') warnings.push('brand_risk:high');
  if (candidate.quality_risk === 'unknown') warnings.push('quality_risk:unknown');
  if (candidate.supplier_reliability < 70) warnings.push('supplier_reliability:low');

  return {
    status: blockers.length ? 'blocked' : warnings.length ? 'needs_review' : 'pass',
    blockers,
    warnings,
    checked_at: new Date().toISOString(),
  };
}

export function scoreCandidate(
  candidate: ProductCandidate,
  marginFloor = DEFAULT_MARGIN_FLOOR,
  maxShippingDays = DEFAULT_MAX_SHIPPING_DAYS
): CandidateScore {
  const compliance = candidate.compliance ?? evaluateCompliance(candidate);
  const margin = grossMargin(candidate.cost_cents, candidate.retail_cents);
  const blockers = [...compliance.blockers];

  if (candidate.cost_cents <= 0 || candidate.retail_cents <= 0) blockers.push('price_or_cost_missing');
  if (candidate.stock <= 0) blockers.push('stock_unavailable');
  if (candidate.supplier_reliability < 55) blockers.push('supplier_reliability:blocking');
  if (margin < AUTO_REJECT_MARGIN_FLOOR) blockers.push('margin_below_auto_reject_floor');
  if (candidate.lead_time_days > AUTO_REJECT_SHIPPING_DAYS) blockers.push('shipping_above_auto_reject_days');

  const demand = clamp(candidate.demand_score, 0, 100) * 0.2;
  const marginPart = clamp((margin / marginFloor) * 100, 0, 100) * 0.2;
  const supplier = clamp(candidate.supplier_reliability, 0, 100) * 0.15;
  const shipping = clamp(((maxShippingDays + 4 - candidate.lead_time_days) / (maxShippingDays + 4)) * 100, 0, 100) * 0.1;
  const quality = (candidate.quality_risk === 'known' ? 92 : candidate.quality_risk === 'unknown' ? 62 : 20) * 0.1;
  const brand = clamp(candidate.brand_fit_score, 0, 100) * 0.1;
  const returns = clamp(100 - candidate.return_risk_score, 0, 100) * 0.05;
  const novelty = clamp(candidate.novelty_score, 0, 100) * 0.05;
  const total = Math.round(demand + marginPart + supplier + shipping + quality + brand + returns + novelty);
  const needsSample =
    total >= 82 &&
    (candidate.quality_risk === 'unknown' || candidate.cost_cents >= 5000 || /size|fit|wear|apparel|shoe/i.test(candidate.category));

  let recommended_status: CandidateStatus = 'ready_for_review';
  if (blockers.some((b) => b.startsWith('blocked_category') || b.startsWith('counterfeit') || b.startsWith('recalled') || b.startsWith('regulated'))) {
    recommended_status = 'compliance_blocked';
  } else if (blockers.some((b) => b.startsWith('media_rights'))) {
    recommended_status = 'media_blocked';
  } else if (margin < marginFloor) {
    recommended_status = 'margin_blocked';
  } else if (candidate.lead_time_days > maxShippingDays) {
    recommended_status = 'shipping_blocked';
  } else if (blockers.some((b) => b.includes('supplier') || b.includes('stock'))) {
    recommended_status = 'supplier_blocked';
  } else if (needsSample) {
    recommended_status = 'needs_sample';
  } else if (total < 76) {
    recommended_status = 'scored';
  }

  return {
    total,
    demand: Math.round(demand),
    margin: Math.round(marginPart),
    supplier: Math.round(supplier),
    shipping: Math.round(shipping),
    quality: Math.round(quality),
    brand: Math.round(brand),
    returns: Math.round(returns),
    novelty: Math.round(novelty),
    gross_margin: Number(margin.toFixed(4)),
    margin_cents: candidate.retail_cents - candidate.cost_cents,
    recommended_status,
    blockers,
    needs_sample: needsSample,
  };
}

export function attachReview(candidate: ProductCandidate, marginFloor?: number, maxShippingDays?: number): ProductCandidate {
  const compliance = evaluateCompliance(candidate);
  const score = scoreCandidate({ ...candidate, compliance }, marginFloor, maxShippingDays);
  return {
    ...candidate,
    compliance,
    score,
    status: score.recommended_status,
    updated_at: new Date().toISOString(),
  };
}

export function candidateToProductTruth(candidate: ProductCandidate): ProductTruth {
  return {
    handle: candidate.handle,
    title: candidate.title,
    supplier_name: candidate.supplier_name,
    supplier_region: candidate.warehouse_region,
    fulfillment_provider: candidate.vendor,
    estimated_ship_days: candidate.lead_time_days,
    return_window_days: 30,
    quality_checks: [
      `Supplier reliability ${candidate.supplier_reliability}/100`,
      `Stock checked at ${candidate.updated_at}`,
      candidate.media_rights === 'verified' ? 'Media rights verified' : 'Supplier media license recorded',
    ],
    price_logic: `${Math.round(grossMargin(candidate.cost_cents, candidate.retail_cents) * 100)}% estimated gross margin after supplier cost`,
    stock_freshness: `${candidate.stock} units reported by supplier feed`,
    verified_reviews_count: 0,
    selected_because: candidate.reasons,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
