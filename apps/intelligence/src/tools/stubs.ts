/**
 * Stub tools for agents that require external APIs (Higgsfield, Oxylabs, etc.)
 * These return realistic mock responses so the CONGREGATION loop runs end-to-end
 * without real credentials. Swap with real implementations when keys are available.
 */
import type { Tool } from './index';

export const datasetQuery: Tool = {
  name: 'dataset_query',
  description: 'Query the Lumera product catalog and signal data for curation insights.',
  inputSchema: { type: 'object', properties: { q: { type: 'string' }, chapter: { type: 'string' } } },
  run: async ({ q, chapter }) => ({
    query: q,
    chapter,
    results: [
      { title: 'Mock Trending Product — Armor Chapter', asin: 'MOCK001', final_price: '$89.99', rating: 4.6, chapter: 'armor' },
      { title: 'Mock Tactical Jacket — Drop Candidate', asin: 'MOCK002', final_price: '$149.99', rating: 4.4, chapter: 'armor' },
    ],
    trending_signals: { top_chapter: chapter ?? 'armor', demand_score: 0.87 },
  }),
};

export const productDraft: Tool = {
  name: 'product_draft',
  description: 'Create a draft product in Medusa Admin (status=draft, not published). Requires Garrett approval to publish.',
  inputSchema: {
    type: 'object',
    properties: { title: { type: 'string' }, chapter: { type: 'string' }, price: { type: 'number' }, description: { type: 'string' }, rationale: { type: 'string' } },
    required: ['title', 'chapter', 'price'],
  },
  run: async (input) => {
    const id = `draft-${Date.now()}`;
    console.log(`[product_draft] DRAFT created (needs Garrett approval): ${input.title} — ${input.chapter} @ $${input.price}`);
    return { id, status: 'draft', ...input, created_at: new Date().toISOString(), message: 'Draft created. Awaiting Garrett approval before publish.' };
  },
};

export const contentDraft: Tool = {
  name: 'content_draft',
  description: 'Draft SEO copy, meta descriptions, product copy in Lumera brand voice. Returns draft content.',
  inputSchema: {
    type: 'object',
    properties: { entity_type: { type: 'string' }, entity_id: { type: 'string' }, type: { type: 'string' } },
    required: ['entity_type', 'entity_id'],
  },
  run: async (input) => ({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    draft_content: `[DRAFT] Luminous editorial copy for ${input.entity_type} ${input.entity_id}. Dark, sparse, on-brand.`,
    status: 'draft',
  }),
};

export const schemaWrite: Tool = {
  name: 'schema_write',
  description: 'Write JSON-LD Product/Offer/Review schema to a product page. Draft only — needs review.',
  inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, schema_type: { type: 'string' } }, required: ['product_id'] },
  run: async (input) => ({
    product_id: input.product_id,
    schema_type: input.schema_type ?? 'Product',
    json_ld: { '@context': 'https://schema.org', '@type': 'Product', 'name': 'Draft product' },
    status: 'draft',
  }),
};

export const imageTemplates: Tool = {
  name: 'image_templates',
  description: 'List available Higgsfield image templates for Lumera (hero, packshot, editorial, etc.)',
  inputSchema: { type: 'object', properties: { chapter: { type: 'string' } } },
  run: async (input) => ({
    templates: [
      { id: 'hero_armor', name: 'Hero — Armor Chapter', style: 'dark luminous editorial', chapter: 'armor' },
      { id: 'editorial_luxury', name: 'Magazine Editorial — Luxury Atmospherics', style: 'fashion editorial', chapter: 'all' },
      { id: 'packshot_clean', name: 'Packshot — Clean', style: 'product photography', chapter: 'all' },
    ],
    chapter_filter: input.chapter,
  }),
};

export const imageWrite: Tool = {
  name: 'image_write',
  description: 'Generate and save product imagery via Higgsfield (mock when key not set).',
  inputSchema: { type: 'object', properties: { product_id: { type: 'string' }, template_id: { type: 'string' }, prompt: { type: 'string' } }, required: ['product_id'] },
  run: async (input) => {
    const hasKey = !!process.env.HIGGSFIELD_API_KEY;
    return {
      product_id: input.product_id,
      template: input.template_id,
      image_url: hasKey ? `[HIGGSFIELD_URL]` : `[MOCK_IMAGE]`,
      status: hasKey ? 'generated' : 'mock',
      iptc_label: 'TrainedAlgorithmicMedia',
    };
  },
};

export const brandAudit: Tool = {
  name: 'brand_audit',
  description: 'Audit a product, drop, or image against Lumera brand standards (dark, luminous editorial luxury).',
  inputSchema: { type: 'object', properties: { entity_type: { type: 'string' }, entity_id: { type: 'string' }, content: { type: 'object' } }, required: ['entity_type'] },
  run: async (input) => ({
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    passed: true,
    score: 0.82,
    findings: ['Dark editorial tone: ✓', 'Chapter alignment: ✓', 'Chapter alignment: confirmed'],
    recommendation: 'Minor: add a chapter rationale before publish.',
  }),
};

export const ledgerTool: Tool = {
  name: 'ledger',
  description: 'Read agent history, past decisions, and audits from the Ledger for informed action.',
  inputSchema: { type: 'object', properties: { agent: { type: 'string' }, limit: { type: 'number' } } },
  run: async (input) => {
    const { Ledger } = await import('../memory/ledger');
    const history = await Ledger.history(input.agent ?? 'curator', input.limit ?? 10);
    const audits = await Ledger.openAudits();
    return { history, open_audits: audits.slice(0, 5) };
  },
};
