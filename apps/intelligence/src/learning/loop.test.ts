import { describe, it, expect, beforeEach } from 'vitest';
import { inferBlock, learnFrom, claimReward } from './loop';
import type { SignalEvent } from '@lumera/shared';
import { REWARD_WEIGHTS } from '@lumera/shared';

describe('claimReward (at-most-once dedup)', () => {
  beforeEach(() => {
    delete process.env.REDIS_URL; // force the deterministic in-memory path for the unit test
  });
  it('claims an id the first time and rejects redelivery', async () => {
    const id = `evt-${Math.random()}`;
    expect(await claimReward(id)).toBe(true);
    expect(await claimReward(id)).toBe(false);
    expect(await claimReward(id)).toBe(false);
  });
  it('lets events without an id through (cannot dedup)', async () => {
    expect(await claimReward(undefined)).toBe(true);
    expect(await claimReward('')).toBe(true);
  });
});

function makeEvent(type: SignalEvent['type']): SignalEvent {
  return {
    id: 'test-' + type,
    visitor_id: 'v1',
    session_id: 's1',
    type,
    context: {},
    ts: new Date().toISOString(),
  };
}

describe('inferBlock', () => {
  it('purchase maps to for_you', () => {
    expect(inferBlock(makeEvent('purchase'))).toBe('for_you');
  });

  it('add_to_cart maps to for_you', () => {
    expect(inferBlock(makeEvent('add_to_cart'))).toBe('for_you');
  });

  it('product_view maps to trending_in_chapter', () => {
    expect(inferBlock(makeEvent('product_view'))).toBe('trending_in_chapter');
  });

  it('drop_view maps to live_drops', () => {
    expect(inferBlock(makeEvent('drop_view'))).toBe('live_drops');
  });

  it('page_view returns null (no block reward)', () => {
    expect(inferBlock(makeEvent('page_view'))).toBeNull();
  });

  it('recommendation_click returns null', () => {
    expect(inferBlock(makeEvent('recommendation_click'))).toBeNull();
  });
});

/**
 * Reward gating is the only pure branch of learnFrom that needs no DB/redis: events with no
 * reward weight (or a non-positive one) must short-circuit before any redis/pg/Ledger access.
 * We assert that path here (REDIS_URL unset → redis() is null, so a rewarded event also no-ops
 * cleanly). We do NOT exercise the DB paths — those require a pg pool and are out of scope.
 */
describe('learnFrom reward gating (DB-free)', () => {
  it('REWARD_WEIGHTS encodes the expected gate: page_view has no reward', () => {
    expect(REWARD_WEIGHTS.page_view ?? 0).toBe(0);
    expect(REWARD_WEIGHTS.purchase ?? 0).toBeGreaterThan(0);
  });

  it('resolves without throwing for an unweighted event (short-circuits, no DB touched)', async () => {
    await expect(learnFrom(makeEvent('page_view'))).resolves.toBeUndefined();
  });

  it('resolves without throwing for a rewarded event when redis is unconfigured', async () => {
    const saved = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    try {
      // redis() returns null with no REDIS_URL → rewardBandit/queueEmbeddingRefresh early-return;
      // Ledger.audit has an in-memory fallback. Must not throw.
      await expect(learnFrom(makeEvent('add_to_cart'))).resolves.toBeUndefined();
    } finally {
      if (saved === undefined) delete process.env.REDIS_URL;
      else process.env.REDIS_URL = saved;
    }
  });
});
