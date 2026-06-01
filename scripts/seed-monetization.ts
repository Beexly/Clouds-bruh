/**
 * Seed the default membership tiers (idempotent). Run from apps/backend:
 *   npx medusa exec ../../scripts/seed-monetization.ts
 */
const MONETIZATION_MODULE = 'monetization';
const TIERS = [
  {
    key: 'disciple',
    name: 'Disciple',
    description: 'Early access to drops and member pricing.',
    price_cents: 900,
    interval: 'month',
    entitlements: ['early_access', 'member_pricing'],
  },
  {
    key: 'patron',
    name: 'Patron',
    description: 'The inner sanctuary — first access, patron pricing, free shipping, and Altar Credits each month.',
    price_cents: 2500,
    interval: 'month',
    entitlements: ['early_access', 'patron_pricing', 'free_shipping', 'monthly_credits', 'patron_drops'],
  },
];

export default async function seedMonetization({ container }: { container: any }) {
  const svc: any = container.resolve(MONETIZATION_MODULE);
  for (const t of TIERS) {
    const existing = await svc.listMembershipTiers({ key: t.key });
    if (existing.length) {
      await svc.updateMembershipTiers([{ selector: { key: t.key }, data: t }]);
      console.log(`[seed-monetization] updated tier: ${t.key}`);
    } else {
      await svc.createMembershipTiers([t]);
      console.log(`[seed-monetization] created tier: ${t.key}`);
    }
  }
  console.log('[seed-monetization] done.');
}
