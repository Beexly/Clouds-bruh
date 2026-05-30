/**
 * Live trend-data request artifacts (Phase: trends-live). The Node runtime
 * cannot call MCP tools, so this builds the request descriptors the Claude agent
 * fulfills via search/social/marketplace MCPs, then records the series back into
 * data/trends/signals.ndjson. No network calls, no spend from here.
 */
export function buildTrendDataRequests(terms = [], opts = {}) {
  const window = opts.window || 'last_90_days';
  return terms.map((t) => ({
    term: typeof t === 'string' ? t : t.term,
    window,
    requests: [
      { method: 'search_interest', source: 'google-trends', params: { q: typeof t === 'string' ? t : t.term, window } },
      { method: 'social_velocity', source: 'social-mcp', params: { q: typeof t === 'string' ? t : t.term, window } },
      { method: 'marketplace_velocity', source: 'marketplace-feed', params: { q: typeof t === 'string' ? t : t.term } },
      { method: 'rising_queries', source: 'google-trends', params: { seed: typeof t === 'string' ? t : t.term } },
    ],
    note: 'Fulfill via MCP/HTTP; append normalized 0–100 series to data/trends/signals.ndjson, then recompute on next tick.',
  }));
}
