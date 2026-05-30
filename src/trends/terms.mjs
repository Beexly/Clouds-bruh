/**
 * Candidate term universe for trend detection (mock mode). Each term carries a
 * trajectory profile the mock signal generator uses, plus category/tags for
 * brand-fit. Live mode (later) replaces this with rising-query discovery via the
 * request artifacts in request.mjs. `demandGap` marks first-party unmet demand
 * (on-site searches / notify-me with no matching product) — the strongest signal.
 */
export const TREND_TERMS = Object.freeze([
  { term: 'oxblood leather harness', profile: 'emerging', category: 'accessory', tags: ['leather', 'gothic', 'oxblood'], demandGap: true },
  { term: 'chrome heart pendant', profile: 'emerging', category: 'jewelry', tags: ['silver', 'chrome', 'gothic'] },
  { term: 'platform leather boots', profile: 'emerging', category: 'footwear', tags: ['leather', 'platform'] },
  { term: 'gothic silver ring', profile: 'steady', category: 'jewelry', tags: ['silver', 'gothic'] },
  { term: 'oversized wool overcoat', profile: 'steady', category: 'outerwear', tags: ['wool', 'tailored'] },
  { term: 'velvet opera gloves', profile: 'emerging', category: 'accessory', tags: ['velvet', 'luxe'] },
  { term: 'pleated midi skirt', profile: 'peaked', category: 'bottoms', tags: ['pleated'] },
  { term: 'distressed cargo pants', profile: 'declining', category: 'bottoms', tags: ['street'] },
  // Off-brand: disallowed category → brand fit 0 → filtered out (safety gate test).
  { term: 'fidget spinner gadget', profile: 'emerging', category: 'gadgets', tags: [] },
]);
