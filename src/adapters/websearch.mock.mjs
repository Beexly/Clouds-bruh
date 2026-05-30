/**
 * Stand-in research. Returns the source links a reviewer needs to vet a
 * candidate. Real mode (Phase 5) swaps in live web search. Links are obvious
 * example.com placeholders so nothing pretends to be a verified source.
 */
export function research(name) {
  const q = encodeURIComponent(name);
  return [
    { label: `Trend scan — ${name}`, url: `https://example.com/trends?q=${q}`, kind: 'trend' },
    { label: `Competitor listings — ${name}`, url: `https://example.com/market?q=${q}`, kind: 'competitor' },
    { label: `Supplier candidates — ${name}`, url: `https://example.com/suppliers?q=${q}`, kind: 'supplier' },
  ];
}
