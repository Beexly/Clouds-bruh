/**
 * Luminance loyalty ladder — ascending light by lifetime Lumens (see BRAND.md).
 * Pure + dependency-free so it's unit-testable (monetization.test.ts) and can't silently regress.
 */
export const LOYALTY_LADDER = [
  { name: 'Spark', at: 0 },
  { name: 'Glow', at: 2500 },
  { name: 'Aurora', at: 10000 },
  { name: 'Zenith', at: 50000 },
] as const;

export function resolveLoyaltyTier(lifetimeEarned: number): {
  current: string;
  next: string | null;
  credits_to_next: number;
} {
  let current: { name: string; at: number } = LOYALTY_LADDER[0];
  let next: { name: string; at: number } | null = null;
  for (const t of LOYALTY_LADDER) {
    if (lifetimeEarned >= t.at) current = t;
    else {
      next = t;
      break;
    }
  }
  return {
    current: current.name,
    next: next?.name ?? null,
    credits_to_next: next ? next.at - lifetimeEarned : 0,
  };
}
