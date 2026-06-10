/**
 * The Constellation — the public roster of Lumera's autonomous workforce (the CONGREGATION of agents).
 *
 * This is the DISPLAY manifest for the Founder's Cockpit: who each worker is, what it owns, when it
 * runs, and — critically — what it may NEVER do without Garrett's approval. It is intentionally
 * separate from the rich agent definitions in apps/intelligence (which carry tools, escalation gates,
 * and system prompts), but it MUST stay in sync with that registry:
 * `apps/intelligence/src/agents/constellation.test.ts` asserts both the key set AND each worker's
 * `gated` list against the real escalation gate, so the dash can never drift or misstate a guardrail.
 */
export interface ConstellationMember {
  /** Registry key — must match an agent in apps/intelligence AGENTS. */
  key: string;
  /** Display name (the worker's identity in the cockpit). */
  name: string;
  /** Department / function. */
  department: string;
  /** One-line, founder-facing description of what this worker owns. */
  role: string;
  /** Human-readable cadence (schedule or event trigger). */
  cadence: string;
  /**
   * Actions this worker may NEVER take autonomously — each requires Garrett's explicit approval.
   * MUST equal the agent's real escalation gate (enforced by constellation.test.ts).
   */
  gated: string[];
}

export const CONSTELLATION: ConstellationMember[] = [
  { key: 'curator', name: 'Curator', department: 'Merchandising / Curation', role: 'Discovers trending products and drafts on-brand drops for your approval.', cadence: 'Daily · 06:00', gated: ['publish_product', 'publish_drop'] },
  { key: 'artisan', name: 'Artisan', department: 'Creative / Media', role: 'Shoots luxury-grade product imagery — never AI-looking, always on-brand.', cadence: 'Event · on product created', gated: ['publish_image', 'spend_generation', 'image_write'] },
  { key: 'scribe', name: 'Scribe', department: 'SEO / Content', role: 'Makes Lumera the cited answer in AI search; schema-perfect, GEO-tuned.', cadence: 'Daily · 03:00', gated: ['publish_content'] },
  { key: 'quartermaster', name: 'Quartermaster', department: 'Operations / OMS', role: 'Routes every order to the best supplier; watches fulfillment and returns.', cadence: 'Event · on order / stuck shipment', gated: ['issue_refund', 'cancel_order'] },
  { key: 'shepherd', name: 'Polaris', department: 'Customer Service', role: 'The concierge — answers customers, styles chapters, guides returns.', cadence: 'Event · on support message', gated: ['issue_refund', 'send_public_reply'] },
  { key: 'herald', name: 'Herald', department: 'Marketing / Social', role: 'Builds drop anticipation; drafts posts and teaser videos (staged).', cadence: 'Weekly · Mon 07:00', gated: ['publish_social', 'launch_campaign', 'spend_budget'] },
  { key: 'sourcer', name: 'Sourcer', department: 'Sourcing / Purchasing', role: 'Keeps SKUs in stock and on margin; scouts reliable suppliers.', cadence: 'Every 6 hours', gated: ['change_supplier', 'change_price'] },
  { key: 'treasurer', name: 'Treasurer', department: 'Finance', role: 'Reconciles the numbers and drafts invoices — read-only, protects margin.', cadence: 'Weekly · Mon 08:00', gated: ['send_invoice', 'move_money'] },
  { key: 'oracle_keeper', name: 'Oracle-Keeper', department: 'Merch Intelligence', role: 'Tunes recommendations and the Broadcast to convert better every day.', cadence: 'Daily · 02:00', gated: ['ship_pricing_change'] },
  { key: 'analyst', name: 'Analyst', department: 'Business Intelligence', role: 'Answers business questions in plain English with honest numbers (read-only).', cadence: 'Event · on report requested', gated: ['run_write_query', 'mutate_data'] },
  { key: 'loyalist', name: 'Loyalist', department: 'Retention / Lifecycle', role: 'Wins back lapsed buyers, elevates VIPs, catches churn early.', cadence: 'Daily · 09:00', gated: ['send_campaign', 'issue_store_credit'] },
  { key: 'rainmaker', name: 'Rainmaker', department: 'Growth / Revenue', role: 'Proposes new revenue streams — bundles, memberships, wholesale.', cadence: 'Weekly · Tue 09:00', gated: ['launch_experiment', 'change_pricing', 'publish_offer'] },
  { key: 'forecaster', name: 'Forecaster', department: 'Forecasting / Planning', role: 'Predicts demand, revenue, stockouts, and runway before they hit.', cadence: 'Daily · 05:00', gated: ['trigger_reorder', 'commit_purchase_plan'] },
  { key: 'refiner', name: 'Refiner', department: 'Product Optimization / CRO', role: 'Tunes PDP titles, copy, price, and placement from real behavior.', cadence: 'Daily · 04:00', gated: ['apply_product_changes', 'change_pricing'] },
  { key: 'warden', name: 'Warden', department: 'Compliance / Quality Control', role: 'Screens every product and supplier for IP, safety, and policy risk; vets quality before anything ships.', cadence: 'Daily · 01:00', gated: ['delist_product', 'suspend_supplier', 'approve_restricted_category'] },
];

/** Quick lookup by registry key. */
export const CONSTELLATION_BY_KEY: Record<string, ConstellationMember> = Object.fromEntries(
  CONSTELLATION.map((m) => [m.key, m])
);
