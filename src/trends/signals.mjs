import { mulberry32, seedFromString } from '../lib/rng.mjs';

/**
 * Mock signal source. Generates deterministic, seeded time series shaped by a
 * term's trajectory profile, for each signal channel. This is the default
 * (offline) implementation; live data arrives later via request.mjs → MCP/HTTP
 * → recorded back, following the Eclipse integration pattern.
 */

function genSeries(profile, rng, points) {
  const out = [];
  switch (profile) {
    case 'emerging': {
      // accelerating upward
      let v = 8;
      let g = 1.5;
      for (let i = 0; i < points; i++) {
        out.push(v + rng() * 4);
        v += g;
        g *= 1.25;
      }
      break;
    }
    case 'steady': {
      let v = 20;
      for (let i = 0; i < points; i++) {
        out.push(v + rng() * 4);
        v += 3;
      }
      break;
    }
    case 'peaked': {
      for (let i = 0; i < points; i++) {
        const x = points > 1 ? i / (points - 1) : 0;
        out.push(85 * Math.sin(Math.PI * x * 0.92) + rng() * 4);
      }
      break;
    }
    case 'declining': {
      let v = 85;
      for (let i = 0; i < points; i++) {
        out.push(Math.max(0, v) + rng() * 4);
        v -= 7;
      }
      break;
    }
    default: {
      for (let i = 0; i < points; i++) out.push(40 + rng() * 5); // flat
    }
  }
  return out.map((x) => Math.max(0, Math.min(100, x)));
}

const risingFor = (profile) =>
  profile === 'emerging' ? 0.9 : profile === 'steady' ? 0.5 : profile === 'peaked' ? 0.2 : 0.05;

/** Collect all signal series for one term. Deterministic given (term, seed). */
export function collectSignals(termObj, { seed = 1, points } = {}) {
  const p = points ?? termObj.points ?? 12;
  const profile = termObj.profile || 'flat';
  const chan = (prefix, prof) => genSeries(prof, mulberry32(seedFromString(prefix + termObj.term) ^ seed), p);
  return {
    searchTrend: chan('search:', profile),
    social: chan('social:', profile),
    marketplaceVelocity: chan('mkt:', profile),
    // First-party demand gaps read stronger when flagged.
    internalDemand: chan('intern:', termObj.demandGap ? 'emerging' : profile),
    rising: risingFor(profile),
    seasonAdj: termObj.seasonAdj ?? 1,
    points: p,
  };
}
