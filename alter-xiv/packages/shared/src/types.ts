/** Domain types — realized as Medusa module models. Build these FIRST (hard to reverse). */
import type { Chapter } from './events';

export interface Money { initial: number; final: number; currency: string }

export interface Variant {
  id: string;
  sku: string;
  color?: string;
  size?: string;
  inventory: number;
  supplier_sku?: string;
  supplier_price?: number;
}

/** Product schema = best of Amazon/Walmart/Shein datasets + Alter XIV faith/drop fields. */
export interface Product {
  id: string;
  sku: string;
  gtin?: string;
  upc?: string;
  model_number?: string;
  brand: string;
  title: string;
  description: string;
  handle: string;
  category_tree: string[];
  chapter: Chapter;
  scripture_ref?: string;
  price: Money;
  variants: Variant[];
  media: { main_image: string; image_urls: string[]; image_count: number; video?: string };
  social: { rating?: number; reviews_count?: number; badge?: string };
  merch: { related_product_ids: string[]; bs_rank?: number; units_total?: number; units_remaining?: number };
  supplier: { id: string; supplier_sku: string; supplier_price: number; lead_time_days: number };
  ai: {
    embedding?: number[];
    image_audit_status: 'pending' | 'pass' | 'off_brand';
    copy_audit_status: 'pending' | 'pass' | 'weak';
    trained_algorithmic_media: boolean; // IPTC label for AI-generated imagery
  };
}

/** Drop — the unit of "The Broadcast". */
export interface Drop {
  id: string;
  name: string;
  series: string;
  chapter: Chapter;
  status: 'scheduled' | 'live' | 'sold_out' | 'archived';
  starts_at: string;
  ends_at: string;
  units_total: number;
  units_remaining: number;
  product_ids: string[];
}

export type Segment = 'new_seeker' | 'armor_devotee' | 'high_intent' | 'lapsed' | 'patron';

export interface VisitorProfile {
  visitor_id: string;
  customer_id?: string;
  segment: Segment;
  embedding?: number[];
  affinity: {
    chapter: Record<string, number>;
    category: Record<string, number>;
    price_band: Record<string, number>;
    aesthetic: Record<string, number>;
  };
  last_seen: string;
  ltv_estimate?: number;
}

export type RecStrategy = 'for_you' | 'because_you_viewed' | 'complete_the_set' | 'trending_in_chapter' | 'graph_rec';

export interface Recommendation {
  id: string;
  visitor_id: string;
  strategy: RecStrategy;
  product_ids: string[];
  score: number;
  served_at: string;
  clicked: boolean;
  converted: boolean;
}

/** Every autonomous agent action — fully auditable. */
export interface AgentRun {
  id: string;
  agent: string;
  trigger: 'cron' | 'event' | 'manual';
  input: unknown;
  output: unknown;
  tools_used: string[];
  decisions: string[];
  outcome?: string;
  status: 'running' | 'success' | 'error' | 'awaiting_approval';
  escalated: boolean;
  started_at: string;
  finished_at?: string;
}

export interface Audit {
  id: string;
  type: 'catalog' | 'brand' | 'conversion' | 'seo' | 'margin' | 'integrity';
  severity: 'info' | 'warn' | 'critical';
  finding: string;
  recommendation: string;
  falsifiable_check: string;     // "how would we know this failed?"
  auto_corrected: boolean;
  entity_ref?: string;
  created_at: string;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  variants: string[];
  metric: string;
  status: 'draft' | 'running' | 'concluded';
  winner?: string;
  lift?: number;
}
