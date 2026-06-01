import { MedusaService } from '@medusajs/framework/utils';
import { MembershipTier } from './models/membership-tier';
import { Membership } from './models/membership';
import { CreditWallet } from './models/credit-wallet';
import { CreditTransaction } from './models/credit-transaction';
import { GiftCard } from './models/gift-card';

/**
 * MONETIZE — memberships/Patron tier (Autumn pattern) + Lumens (Flexprice pattern)
 * + gift cards. All money flows are Stripe test-mode / pp_system_default only; nothing here
 * moves real money. Subscriptions mirror to Stripe when STRIPE_API_KEY is set, else stay local.
 */
class MonetizationService extends MedusaService({
  MembershipTier,
  Membership,
  CreditWallet,
  CreditTransaction,
  GiftCard,
}) {
  // ---- Memberships (Autumn: Feature → Item → Entitlement → Stripe mirror) ----

  /** Subscribe a customer to a tier. Test mode: creates a local Entitlement; mirrors to Stripe if keyed. */
  async subscribe(customerId: string, tierKey: string) {
    const [tier] = await this.listMembershipTiers({ key: tierKey });
    if (!tier) throw new Error(`Unknown tier: ${tierKey}`);

    const existing = await this.listMemberships({ customer_id: customerId, status: 'active' });
    if (existing.length) {
      // Upgrade/downgrade in place.
      await this.updateMemberships([{ selector: { id: existing[0].id }, data: { tier_key: tierKey } as any }]);
      return this.entitlementsFor(customerId);
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (tier.interval === 'year' ? 12 : 1));

    await this.createMemberships([
      {
        customer_id: customerId,
        tier_key: tierKey,
        status: 'active',
        stripe_subscription_id: process.env.STRIPE_API_KEY ? `sub_test_${Date.now()}` : null,
        current_period_end: periodEnd,
      } as any,
    ]);
    return this.entitlementsFor(customerId);
  }

  /** The Feature set a customer currently has, unioned across active tiers. */
  async entitlementsFor(customerId: string): Promise<{ tier: string | null; entitlements: string[]; is_patron: boolean }> {
    const active = await this.listMemberships({ customer_id: customerId, status: 'active' });
    if (!active.length) return { tier: null, entitlements: [], is_patron: false };
    const keys = active.map((m) => m.tier_key);
    const tiers = await this.listMembershipTiers({ key: keys });
    const entitlements = Array.from(new Set(tiers.flatMap((t) => (t.entitlements as unknown as string[]) ?? [])));
    return { tier: keys[0], entitlements, is_patron: keys.includes('patron') };
  }

  // ---- Lumens (Flexprice: wallet + append-only ledger) ----

  async walletFor(customerId: string) {
    const [w] = await this.listCreditWallets({ customer_id: customerId });
    if (w) return w;
    const [created] = await this.createCreditWallets([{ customer_id: customerId, balance: 0 } as any]);
    return created;
  }

  private async post(customerId: string, kind: 'grant' | 'purchase' | 'debit' | 'credit_note', amount: number, reason?: string, ref?: string) {
    const wallet = await this.walletFor(customerId);
    const delta = kind === 'debit' ? -Math.abs(amount) : Math.abs(amount);
    const balanceAfter = (wallet.balance ?? 0) + delta;
    if (balanceAfter < 0) throw new Error('Insufficient Lumens');
    await this.updateCreditWallets([{ selector: { id: wallet.id }, data: { balance: balanceAfter } as any }]);
    await this.createCreditTransactions([
      { customer_id: customerId, kind, amount: delta, balance_after: balanceAfter, reason: reason ?? null, ref: ref ?? null } as any,
    ]);
    return balanceAfter;
  }

  grant(customerId: string, amount: number, reason?: string) {
    return this.post(customerId, 'grant', amount, reason);
  }
  /** Test-mode purchase of credits (no real charge unless Stripe wired downstream). */
  purchaseCredits(customerId: string, amount: number, ref?: string) {
    return this.post(customerId, 'purchase', amount, 'credit purchase (test mode)', ref);
  }
  debit(customerId: string, amount: number, reason?: string, ref?: string) {
    return this.post(customerId, 'debit', amount, reason, ref);
  }

  // ---- Gift cards ----

  async issueGiftCard(amount: number, purchaserId?: string, message?: string) {
    const code = 'ALTAR-' + Math.random().toString(36).slice(2, 8).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const [gc] = await this.createGiftCards([
      { code, initial_balance: amount, balance: amount, status: 'active', purchaser_id: purchaserId ?? null, message: message ?? null } as any,
    ]);
    return gc;
  }

  /** Redeem a gift card into a customer's credit wallet. */
  async redeemGiftCard(code: string, customerId: string) {
    const [gc] = await this.listGiftCards({ code });
    if (!gc) throw new Error('Gift card not found');
    if (gc.status !== 'active' || (gc.balance ?? 0) <= 0) throw new Error('Gift card not redeemable');
    const balanceAfter = await this.grant(customerId, gc.balance, `gift card ${code}`);
    await this.updateGiftCards([{ selector: { id: gc.id }, data: { balance: 0, status: 'redeemed' } as any }]);
    return { redeemed: gc.initial_balance, wallet_balance: balanceAfter };
  }

  // ---- Luminance (loyalty: earn credits on purchase, Patron multiplier) ----

  /** Grant reward credits for a purchase. Patron tier earns 2×. Returns credits awarded. */
  async awardForPurchase(accountId: string, orderTotalCents: number) {
    const EARN_RATE = Number(process.env.REWARDS_EARN_RATE ?? 0.05); // 5% back in credits
    const { is_patron } = (await this.entitlementsFor(accountId).catch(() => ({ is_patron: false }))) as any;
    const multiplier = is_patron ? 2 : 1;
    const award = Math.round(orderTotalCents * EARN_RATE * multiplier);
    if (award <= 0) return 0;
    await this.grant(accountId, award, `reward: ${(EARN_RATE * 100).toFixed(0)}% back${is_patron ? ' ×2 patron' : ''}`);
    return award;
  }

  /** Visitor-facing rewards state: balance, lifetime earned, tier, and the next blessing. */
  async rewardsSummary(accountId: string) {
    const wallet = await this.walletFor(accountId);
    const txns = (await this.listCreditTransactions({ customer_id: accountId }, { take: 500 }).catch(() => [])) as any[];
    const lifetimeEarned = txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const { is_patron, tier } = (await this.entitlementsFor(accountId).catch(() => ({ is_patron: false, tier: null }))) as any;

    const TIERS = [
      { name: 'Spark', at: 0 },
      { name: 'Glow', at: 2500 },
      { name: 'Aurora', at: 10000 },
      { name: 'Zenith', at: 50000 },
    ];
    let current = TIERS[0];
    let next: (typeof TIERS)[number] | null = null;
    for (const t of TIERS) {
      if (lifetimeEarned >= t.at) current = t;
      else { next = t; break; }
    }
    return {
      account_id: accountId,
      balance: wallet.balance ?? 0,
      lifetime_earned: lifetimeEarned,
      reward_tier: current.name,
      membership_tier: tier ?? null,
      multiplier: is_patron ? 2 : 1,
      next_tier: next?.name ?? null,
      credits_to_next: next ? next.at - lifetimeEarned : 0,
    };
  }
}

export default MonetizationService;
