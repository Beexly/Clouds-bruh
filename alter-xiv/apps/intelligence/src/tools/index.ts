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
import {
  datasetQuery, productDraft, contentDraft, schemaWrite,
  imageTemplates, imageWrite, brandAudit, ledgerTool,
} from './stubs';

export const TOOLS: Record<string, Tool> = {
  medusa_admin_read: medusaAdminRead,
  medusa_admin_write_order: medusaAdminWriteOrder,
  shein_scraper: sheinScraper,
  price_scraper: priceScraper,
  higgsfield,
  claude_seo: claudeSeo,
  apify,
  nl_analytics: dbGpt,
  voc_reviews: voc,
  dataset_query: datasetQuery,
  product_draft: productDraft,
  content_draft: contentDraft,
  schema_write: schemaWrite,
  image_templates: imageTemplates,
  image_write: imageWrite,
  brand_audit: brandAudit,
  ledger: ledgerTool,
};

/** Resolve an agent's allowed tools into Claude tool-use definitions. */
export function toolsFor(names: string[]) {
  return names.map((n) => TOOLS[n]).filter(Boolean);
}
