/** Tool registry. Agents get only the tools named in their def (least privilege). */
export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;     // JSON schema for Claude tool-use
  run: (input: any) => Promise<unknown>;
}

import { medusaAdminRead, medusaAdminWriteOrder } from './medusa-admin';
import { sheinScraper, priceScraper } from './scraper';
import { higgsfield } from './higgsfield';
import { claudeSeo } from './seo';
import { apify } from './apify';
import { dbGpt } from './db-gpt';
import { voc } from './voc';

export const TOOLS: Record<string, Tool> = {
  medusa_admin_read: medusaAdminRead,
  medusa_admin_write_order: medusaAdminWriteOrder,
  shein_scraper: sheinScraper,
  price_scraper: priceScraper,
  higgsfield,
  claude_seo: claudeSeo,
  apify,                 // Apify MCP — thousands of scrapers (data radar upgrade)
  nl_analytics: dbGpt,   // DB-GPT — NL analytics over the commerce DB
  voc_reviews: voc,      // Voice-of-Customer review analysis
  // Stub the rest as thin wrappers over Medusa Admin / module services:
  // dataset_query, product_draft, content_draft, schema_write, image_templates, image_write,
  // brand_audit, supplier_api, order_lookup, reply_draft, recommendation_read/admin,
  // experiment_admin, signal_query, invoice_generate, pdf_render, calendar_write, ledger.
};

/** Resolve an agent's allowed tools into Claude tool-use definitions. */
export function toolsFor(names: string[]) {
  return names.map((n) => TOOLS[n]).filter(Boolean);
}
