import type { Tool } from './index';
import { apifyConfigured, runApifyActor } from '@lumera/shared';

/**
 * Apify — thousands of ready-made Actors (scrapers/crawlers) for AliExpress, Alibaba, Amazon,
 * Shein, TikTok, etc. Second source for the data radar (alongside Oxylabs). Uses the shared
 * transport in `@lumera/shared/sourcing`. Degrades to an empty dataset when APIFY_TOKEN is
 * absent so the loop/tests run. Production-preferred: register mcp.apify.com (see ../mcp.config.ts).
 */
export const apify: Tool = {
  name: 'apify',
  description:
    'Run an Apify Actor (ready-made scraper/crawler) — e.g. aliexpress-listings, alibaba, amazon-product, shein. Returns structured dataset items. Read-only; empty until APIFY_TOKEN is set.',
  inputSchema: {
    type: 'object',
    properties: { actor: { type: 'string' }, input: { type: 'object' } },
    required: ['actor', 'input'],
  },
  run: async ({ actor, input }) => {
    if (!apifyConfigured()) {
      return { actor, input, items: [], source: 'unconfigured', note: 'Set APIFY_TOKEN to enable live Actor runs.' };
    }
    const items = await runApifyActor(actor, input ?? {}).catch((e) => [{ error: String((e as Error).message) }]);
    return { actor, input, items, source: 'live' };
  },
};
