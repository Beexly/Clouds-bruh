import type { Tool } from './index';

/**
 * Apify MCP — thousands of ready-made scrapers/crawlers (social, search, maps, e-commerce)
 * exposed as tools via mcp.apify.com (OAuth/URL). UPGRADE to the data radar: Curator/Sourcer/
 * Herald no longer depend on a single hand-rolled scraper — they can run any Apify Actor.
 *
 * Preferred wiring: register mcp.apify.com as an MCP server (see ../mcp.config.ts) so the
 * agent gets Apify's tools natively. This wrapper is the fallback for direct Actor calls.
 */
export const apify: Tool = {
  name: 'apify',
  description: 'Run an Apify Actor (ready-made scraper/crawler) — e.g. amazon-product, shein, instagram, google-maps, tiktok. Returns structured dataset items.',
  inputSchema: {
    type: 'object',
    properties: { actor: { type: 'string' }, input: { type: 'object' } },
    required: ['actor', 'input'],
  },
  run: async ({ actor, input }) => {
    // TODO: POST https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items with APIFY_TOKEN.
    // Or rely on the mcp.apify.com MCP server registered in mcp.config.ts (preferred).
    return { actor, input, items: [] };
  },
};
