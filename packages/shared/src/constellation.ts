/**
 * The Constellation — the public roster of Lumera's autonomous workforce (the CONGREGATION of agents).
 *
 * This is the DISPLAY manifest for the Founder's Cockpit: who each worker is, what it owns, and when
 * it runs. It is intentionally separate from the rich agent definitions in apps/intelligence (which
 * carry tools, escalation gates, and system prompts) — but the keys MUST stay in sync with that
 * registry, which `apps/intelligence/src/agents/constellation.test.ts` enforces so the dash can never
 * silently drift from the real workforce.
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
}

export const CONSTELLATION: ConstellationMember[] = [
  { key: 'curator', name: 'Curator', department: 'Merchandising / Curation', role: 'Discovers trending products and drafts on-brand drops for your approval.', cadence: 'Daily · 06:00' },
  { key: 'artisan', name: 'Artisan', department: 'Creative / Media', role: 'Shoots luxury-grade product imagery — never AI-looking, always on-brand.', cadence: 'Event · on product created' },
  { key: 'scribe', name: 'Scribe', department: 'SEO / Content', role: 'Makes Lumera the cited answer in AI search; schema-perfect, GEO-tuned.', cadence: 'Daily · 03:00' },
  { key: 'quartermaster', name: 'Quartermaster', department: 'Operations / OMS', role: 'Routes every order to the best supplier; watches fulfillment and returns.', cadence: 'Event · on order / stuck shipment' },
  { key: 'shepherd', name: 'Polaris', department: 'Customer Service', role: 'The concierge — answers customers, styles chapters, guides returns.', cadence: 'Event · on support message' },
  { key: 'herald', name: 'Herald', department: 'Marketing / Social', role: 'Builds drop anticipation; drafts posts and teaser videos (staged).', cadence: 'Weekly · Mon 07:00' },
  { key: 'sourcer', name: 'Sourcer', department: 'Sourcing / Purchasing', role: 'Keeps SKUs in stock and on margin; scouts reliable suppliers.', cadence: 'Every 6 hours' },
  { key: 'treasurer', name: 'Treasurer', department: 'Finance', role: 'Reconciles the numbers and drafts invoices — read-only, protects margin.', cadence: 'Weekly · Mon 08:00' },
  { key: 'oracle_keeper', name: 'Oracle-Keeper', department: 'Merch Intelligence', role: 'Tunes recommendations and the Broadcast to convert better every day.', cadence: 'Daily · 02:00' },
  { key: 'analyst', name: 'Analyst', department: 'Business Intelligence', role: 'Answers business questions in plain English with honest numbers (read-only).', cadence: 'Event · on report requested' },
  { key: 'loyalist', name: 'Loyalist', department: 'Retention / Lifecycle', role: 'Wins back lapsed buyers, elevates VIPs, catches churn early.', cadence: 'Daily · 09:00' },
  { key: 'rainmaker', name: 'Rainmaker', department: 'Growth / Revenue', role: 'Proposes new revenue streams — bundles, memberships, wholesale.', cadence: 'Weekly · Tue 09:00' },
  { key: 'forecaster', name: 'Forecaster', department: 'Forecasting / Planning', role: 'Predicts demand, revenue, stockouts, and runway before they hit.', cadence: 'Daily · 05:00' },
  { key: 'refiner', name: 'Refiner', department: 'Product Optimization / CRO', role: 'Tunes PDP titles, copy, price, and placement from real behavior.', cadence: 'Daily · 04:00' },
];

/** Quick lookup by registry key. */
export const CONSTELLATION_BY_KEY: Record<string, ConstellationMember> = Object.fromEntries(
  CONSTELLATION.map((m) => [m.key, m])
);
