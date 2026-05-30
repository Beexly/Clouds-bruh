/**
 * External MCP servers the CONGREGATION connects to. UPGRADE: instead of only hand-rolled
 * tools, agents gain whole tool ecosystems. Registered with the Claude Agent SDK at boot.
 */
export const MCP_SERVERS = [
  {
    name: 'apify',
    url: 'https://mcp.apify.com',            // OAuth/URL — thousands of scrapers as tools
    grantedTo: ['curator', 'sourcer', 'herald'],
  },
  // Add more as needed (e.g. a self-hosted DB-GPT MCP for nl_analytics).
];
