/**
 * Seed the default membership tiers (idempotent).
 *
 * Standalone: from apps/backend → `npx medusa exec ../../scripts/seed-monetization.ts`
 * Also called by scripts/seed.ts so the main catalog seed guarantees the tiers exist — without
 * them monetization.subscribe() throws 'Unknown tier' and the entire Memberships/Patron feature
 * (entitlements + the 2x Luminance reward multiplier) silently no-ops.
 */
export const MONETIZATION_MODULE = 'monetization';

export const MEMBERSHIP_TIERS = [
  {
    key: 'disciple',
    name: 'Ember',
    description: 'Early access to drops and member pricing.',
    price_cents: 900,
    interval: 'month',
    entitlements: ['early_access', 'member_pricing'],
  },
  {
    key: 'patron',
    name: 'Luminary',
    description: 'The inner circle — first access, member pricing, free shipping, and Lumens each month.',
    price_cents: 2500,
    interval: 'month',
    entitlements: ['early_access', 'patron_pricing', 'free_shipping', 'monthly_credits', 'patron_drops'],
  },
];

/** Upsert the default tiers against a resolved monetization service. Idempotent. */
export async function seedMembershipTiers(svc: any): Promise<void> {
  for (const t of MEMBERSHIP_TIERS) {
    const existing = await svc.listMembershipTiers({ key: t.key });
    if (existing.length) {
      await svc.updateMembershipTiers([{ selector: { key: t.key }, data: t }]);
      console.log(`[seed-monetization] updated tier: ${t.key}`);
    } else {
      await svc.createMembershipTiers([t]);
      console.log(`[seed-monetization] created tier: ${t.key}`);
    }
  }
}

export default async function seedMonetization({ container }: { container: any }) {
  const svc: any = container.resolve(MONETIZATION_MODULE);
  await seedMembershipTiers(svc);
  console.log('[seed-monetization] done.');
}
