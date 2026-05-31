const MONETIZATION_MODULE = 'monetization';

/** Verify Altar Rewards: Patron 2× earn + tier progression. Run via medusa exec. */
export default async function verifyRewards({ container }: { container: any }) {
  const svc: any = container.resolve(MONETIZATION_MODULE);
  const account = `reward-verify-${Date.now()}`;

  // Non-patron: $100 order → 5% = 500 credits.
  const a1 = await svc.awardForPurchase(account, 10000);
  console.log(`[verify] non-patron $100 order → ${a1} credits (expect 500)`);

  // Make them Patron, then $100 order → 5% ×2 = 1000 credits.
  await svc.subscribe(account, 'patron');
  const a2 = await svc.awardForPurchase(account, 10000);
  console.log(`[verify] patron $100 order → ${a2} credits (expect 1000)`);

  const summary = await svc.rewardsSummary(account);
  console.log('[verify] summary:', JSON.stringify(summary));
  console.log(
    `[verify] RESULT: ${a1 === 500 && a2 === 1000 && summary.lifetime_earned === 1500 && summary.reward_tier === 'Seeker' && summary.credits_to_next === 1000 && summary.multiplier === 2 ? 'PASS' : 'FAIL'}`
  );
}
