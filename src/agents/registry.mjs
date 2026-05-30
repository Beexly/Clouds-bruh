import { createAgent } from '../model/agent-task.mjs';

/**
 * The agent registry — single source of truth for roles, cadence, and
 * governance. The rule the whole system enforces: agents PROPOSE and PREPARE;
 * humans APPROVE and PUBLISH. No agent lists a publish action as autonomous.
 */
export const AGENTS = Object.freeze([
  createAgent({
    id: 'agent.sourcing',
    role: 'sourcing',
    name: 'Sourcing',
    description: 'Researches and proposes product candidates into the review queue.',
    inputs: ['brand context', 'research', 'concepts'],
    outputs: ['product candidates'],
    cadence: { kind: 'interval', everyMinutes: 60 },
    governance: {
      autonomous: ['research', 'write_product_candidate', 'request_imagery'],
      gated: ['approve_product', 'publish_product'],
      forbidden: ['mutate_catalog_directly', 'commit_secret'],
    },
  }),
  createAgent({
    id: 'agent.trends',
    role: 'trends',
    name: 'Trends',
    description: 'Detects on-brand trend opportunities and proposes them into the review queue.',
    inputs: ['search signals', 'social signals', 'marketplace velocity', 'internal demand gaps'],
    outputs: ['trend candidates'],
    cadence: { kind: 'interval', everyMinutes: 720 },
    governance: {
      autonomous: ['detect_trends', 'write_trend_candidate'],
      gated: ['approve_sourcing_from_trend', 'publish_product'],
      forbidden: ['fabricate_demand', 'create_product_directly'],
    },
  }),
  createAgent({
    id: 'agent.catalog',
    role: 'catalog',
    name: 'Catalog',
    description: 'Normalizes approved candidates into draft products (still hidden).',
    inputs: ['approved candidates'],
    outputs: ['draft products'],
    cadence: { kind: 'event', onEvent: 'candidate.approved' },
    governance: {
      autonomous: ['normalize_approved_candidate', 'create_draft_product'],
      gated: ['set_visible', 'publish_product'],
      forbidden: ['flip_visibility_without_publish', 'commit_secret'],
    },
  }),
  createAgent({
    id: 'agent.pricing',
    role: 'pricing',
    name: 'Pricing & Margin',
    description: 'Computes margin, flags below-floor pricing, proposes price changes.',
    inputs: ['supplier costs', 'brand floor'],
    outputs: ['pricing scores', 'price-change candidates'],
    cadence: { kind: 'interval', everyMinutes: 1440 },
    governance: {
      autonomous: ['compute_margin', 'attach_pricing_score', 'propose_price_change'],
      gated: ['apply_below_floor_price', 'publish_price'],
      forbidden: ['hide_margin_from_reviewer'],
    },
  }),
  createAgent({
    id: 'agent.imagery',
    role: 'imagery',
    name: 'Imagery',
    description: 'Requests and attaches product imagery (unapproved until a human approves).',
    inputs: ['product specs', 'imagegen'],
    outputs: ['media refs'],
    cadence: { kind: 'event', onEvent: 'candidate.created' },
    governance: {
      autonomous: ['request_imagery', 'attach_unapproved_media'],
      gated: ['approve_imagery'],
      forbidden: ['use_unapproved_media_on_storefront'],
    },
  }),
  createAgent({
    id: 'agent.support',
    role: 'support',
    name: 'Support',
    description: 'Drafts customer replies and classifies intent; sending is gated.',
    inputs: ['inbound message', 'order data', 'FAQ'],
    outputs: ['draft replies', 'intents'],
    cadence: { kind: 'event', onEvent: 'support.inbound' },
    governance: {
      autonomous: ['draft_reply', 'classify_intent'],
      gated: ['send_reply', 'issue_refund'],
      forbidden: ['auto_refund_without_gate'],
    },
  }),
  createAgent({
    id: 'agent.orders',
    role: 'orders',
    name: 'Orders',
    description: 'Advances order fulfillment within autonomy bounds; refunds are gated.',
    inputs: ['orders', 'routing', 'carrier'],
    outputs: ['advanced orders', 'tracking'],
    cadence: { kind: 'interval', everyMinutes: 15 },
    governance: {
      autonomous: ['advance_routed', 'advance_in_fulfillment', 'advance_shipped', 'advance_delivered', 'attach_tracking'],
      gated: ['issue_refund', 'force_cancel_paid', 'enable_live_payments'],
      forbidden: ['capture_funds_v1'],
    },
  }),
  createAgent({
    id: 'agent.restock',
    role: 'restock',
    name: 'Restock',
    description: 'Detects low inventory and writes restock candidates to the queue.',
    inputs: ['inventory levels', 'thresholds'],
    outputs: ['restock signals', 'restock candidates'],
    cadence: { kind: 'interval', everyMinutes: 360 },
    governance: {
      autonomous: ['emit_restock_signal', 'write_restock_candidate'],
      gated: ['approve_restock', 'change_live_inventory'],
      forbidden: ['auto_restock_without_gate'],
    },
  }),
  createAgent({
    id: 'agent.qa',
    role: 'qa',
    name: 'QA & Governance',
    description: 'Audits queue/gate invariants and can BLOCK publishes — it approves nothing.',
    inputs: ['queue index', 'gates', 'event log'],
    outputs: ['audit findings', 'blocks'],
    cadence: { kind: 'interval', everyMinutes: 30 },
    governance: {
      autonomous: ['audit_invariants', 'flag_stale', 'block_publish'],
      gated: ['escalate_to_human'],
      forbidden: ['approve_candidate', 'publish_product', 'enable_anything'],
    },
  }),
]);

export function getAgent(idOrRole) {
  return AGENTS.find((a) => a.id === idOrRole || a.role === idOrRole) || null;
}

export function agentRoles() {
  return AGENTS.map((a) => a.role);
}
