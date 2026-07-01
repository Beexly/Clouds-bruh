import { MedusaService } from '@medusajs/framework/utils';
import { VisitorProfile } from './models/visitor-profile';
import type { SignalEvent, Segment } from '@lumera/shared';
import { REWARD_WEIGHTS } from '@lumera/shared';

const DECAY = 0.95;
const HIGH_INTENT_EVENTS = new Set(['add_to_cart', 'checkout_step', 'purchase', 'wishlist_add']);
const BASE_AFFINITY_WEIGHT = 0.1;

type AffinityMap = Record<string, number>;
interface StoredAffinity {
  chapter: AffinityMap;
  category: AffinityMap;
  price_band: AffinityMap;
  aesthetic: AffinityMap;
  _intent: number;
}

function emptyAffinity(): StoredAffinity {
  return { chapter: {}, category: {}, price_band: {}, aesthetic: {}, _intent: 0 };
}

function decayAffinity(a: StoredAffinity): StoredAffinity {
  const decay = (m: AffinityMap): AffinityMap =>
    Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v * DECAY]));
  return { ...a, chapter: decay(a.chapter), category: decay(a.category), price_band: decay(a.price_band), aesthetic: decay(a.aesthetic) };
}

function addSignal(affinity: StoredAffinity, event: SignalEvent, weight: number, intentDelta: number): StoredAffinity {
  const a = { ...affinity, chapter: { ...affinity.chapter }, category: { ...affinity.category }, price_band: { ...affinity.price_band }, aesthetic: { ...affinity.aesthetic } };
  const ctx = event.context;
  if (ctx.chapter) a.chapter[ctx.chapter] = (a.chapter[ctx.chapter] ?? 0) + weight;
  if (ctx.category) a.category[ctx.category] = (a.category[ctx.category] ?? 0) + weight;
  if (ctx.price_band) a.price_band[ctx.price_band] = (a.price_band[ctx.price_band] ?? 0) + weight;
  if (ctx.aesthetic) a.aesthetic[ctx.aesthetic] = (a.aesthetic[ctx.aesthetic] ?? 0) + weight;
  a._intent = (a._intent ?? 0) + intentDelta;
  return a;
}

class PersonalizationService extends MedusaService({ VisitorProfile }) {
  /** Update a visitor's affinity vectors + segment from a new event. O(1) per event. */
  async observe(event: SignalEvent) {
    const existing = await this.listVisitorProfiles(
      { visitor_id: event.visitor_id },
      { take: 1 }
    ).catch(() => []) as any[];
    const profile = existing[0] ?? null;

    const rewardWeight = (REWARD_WEIGHTS[event.type] ?? 1) * BASE_AFFINITY_WEIGHT;
    const intentDelta = HIGH_INTENT_EVENTS.has(event.type) ? (REWARD_WEIGHTS[event.type] ?? 1) : 0;
    const currentAffinity: StoredAffinity = profile?.affinity ? (profile.affinity as StoredAffinity) : emptyAffinity();
    const decayed = decayAffinity(currentAffinity);
    const updated = addSignal(decayed, event, rewardWeight, intentDelta);
    const segment = this.segmentFor(updated, updated._intent);
    const now = new Date();

    if (!profile) {
      await this.createVisitorProfiles([{
        visitor_id: event.visitor_id,
        segment,
        affinity: updated,
        last_seen: now,
      } as any]);
    } else {
      // MedusaService update signature: updateFoo([{ selector: {...}, data: {...} }])
      await this.updateVisitorProfiles([{
        selector: { visitor_id: event.visitor_id },
        data: { segment, affinity: updated, last_seen: now },
      }] as any);
    }
  }

  /** Merge an anonymous visitor profile into an identified customer on login/checkout. */
  async identify(visitorId: string, customerId: string) {
    const profiles = await this.listVisitorProfiles({ visitor_id: visitorId }, { take: 1 }).catch(() => []) as any[];
    if (!profiles[0]) return;
    const profile = profiles[0];

    const customerProfiles = await this.listVisitorProfiles({ customer_id: customerId }, { take: 1 }).catch(() => []) as any[];
    const existing = customerProfiles[0];
    if (existing && existing.visitor_id !== visitorId) {
      const merged = this.mergeAffinity(profile.affinity as StoredAffinity, existing.affinity as StoredAffinity);
      await this.updateVisitorProfiles([{
        selector: { customer_id: customerId },
        data: { affinity: merged, segment: this.segmentFor(merged, merged._intent), last_seen: new Date() },
      }] as any);
      await this.updateVisitorProfiles([{
        selector: { visitor_id: visitorId },
        data: { customer_id: `merged:${customerId}` },
      }] as any).catch(() => {});
    } else {
      await this.updateVisitorProfiles([{
        selector: { visitor_id: visitorId },
        data: { customer_id: customerId },
      }] as any);
    }
  }

  /**
   * "Tune the Broadcast" — explicit visitor controls. Following a chapter boosts its affinity
   * so every ORACLE strategy (for_you / trending / complete_the_set) leans toward it; muting
   * zeroes it so the Broadcast de-emphasizes it. The visitor steers the algorithm.
   */
  async setPreferences(visitorId: string, followed: string[] = [], muted: string[] = []) {
    const FOLLOW_BOOST = 5;
    const profiles = await this.listVisitorProfiles({ visitor_id: visitorId }, { take: 1 }).catch(() => []) as any[];
    const profile = profiles[0] ?? null;
    const affinity: StoredAffinity = profile?.affinity ? (profile.affinity as StoredAffinity) : emptyAffinity();
    const chapter = { ...affinity.chapter };
    for (const c of followed) chapter[c] = Math.max(chapter[c] ?? 0, FOLLOW_BOOST);
    for (const c of muted) chapter[c] = 0;
    const updated: StoredAffinity = { ...affinity, chapter };
    const preferences = { followed: [...new Set(followed)], muted: [...new Set(muted)] };
    const segment = this.segmentFor(updated, updated._intent ?? 0);
    const now = new Date();

    if (!profile) {
      await this.createVisitorProfiles([{ visitor_id: visitorId, segment, affinity: updated, preferences, last_seen: now } as any]);
    } else {
      await this.updateVisitorProfiles([{ selector: { visitor_id: visitorId }, data: { affinity: updated, preferences, segment, last_seen: now } }] as any);
    }
    return preferences;
  }

  async getPreferences(visitorId: string): Promise<{ followed: string[]; muted: string[] }> {
    const profiles = await this.listVisitorProfiles({ visitor_id: visitorId }, { take: 1 }).catch(() => []) as any[];
    const p = profiles[0]?.preferences as { followed?: string[]; muted?: string[] } | undefined;
    return { followed: p?.followed ?? [], muted: p?.muted ?? [] };
  }

  segmentFor(affinity: StoredAffinity, intentScore: number): Segment {
    if (intentScore >= 20) return 'high_intent';
    const chapterEntries = Object.entries(affinity.chapter ?? {});
    if (chapterEntries.length > 0) {
      const dominant = chapterEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
      if (dominant === 'armor') return 'armor_devotee';
    }
    if (intentScore >= 5) return 'patron';
    return 'new_seeker';
  }

  private mergeAffinity(a: StoredAffinity, b: StoredAffinity): StoredAffinity {
    const mergeMap = (x: AffinityMap, y: AffinityMap): AffinityMap => {
      const out: AffinityMap = { ...x };
      for (const [k, v] of Object.entries(y)) out[k] = Math.max(out[k] ?? 0, v);
      return out;
    };
    return {
      chapter: mergeMap(a.chapter, b.chapter),
      category: mergeMap(a.category, b.category),
      price_band: mergeMap(a.price_band, b.price_band),
      aesthetic: mergeMap(a.aesthetic, b.aesthetic),
      _intent: Math.max(a._intent ?? 0, b._intent ?? 0),
    };
  }
}

export default PersonalizationService;
