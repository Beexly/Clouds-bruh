import { customersFrom, rfm, lapseState, predictedLtvMinor } from './engine.mjs';
import { loadOrders } from '../orders/store.mjs';
import { addMessage } from '../support/inbox.mjs';
import { BRAND } from '../brand.mjs';
import { now } from '../lib/clock.mjs';

/**
 * Lifecycle-flow engine (R7, docs/research/08). Deterministic rules that PROPOSE
 * lifecycle outreach for a human to approve and send — never auto-send, never
 * auto-discount. Reuses the support inbox (agent drafts → human sends). The
 * decisive flow is the second-purchase nudge (27%→54% inflection).
 *
 * Every flow is no-offer by default; any incentive must clear the brand margin
 * floor and is proposed, never applied. Honest, consent-based, profanity-free.
 */

const DAY = 86_400_000;

/** The canonical flows, each a pure predicate over a customer + a draft builder. */
export const FLOWS = Object.freeze([
  {
    id: 'second_purchase',
    when: (c, st) => c.count === 1 && (st.lapse === 'due' || st.lapse === 'lapsing'),
    subject: 'A second piece for the collection',
    body: (c) =>
      `You acquired your first Eclipse piece. When you're ready, the house has new work that pairs with it — no rush, no pressure. ${BRAND.tagline}`,
  },
  {
    id: 'post_purchase_care',
    when: (c, st) => c.count >= 1 && st.recencyDays <= 14,
    subject: 'Caring for your piece',
    body: () =>
      'A short note on keeping your piece at its best — storage, cleaning, and the small rituals that make it last. Thank you for choosing the house.',
  },
  {
    id: 'winback',
    when: (c, st) => c.count >= 1 && st.lapse === 'dormant',
    subject: 'The house has moved on — see what is new',
    body: () =>
      'It has been a while. The Vault has turned over since your last visit; a few pieces seem made for you. Come see when the moment is right.',
  },
  {
    id: 'vip_recognition',
    when: (c, st) => st.segment === 'champion',
    subject: 'Early access to the next drop',
    body: () =>
      'You are among the house’s most valued. The next drop opens to you first — a quiet window before it reaches anyone else.',
  },
]);

/**
 * Evaluate flows for all customers and return PROPOSALS (not sent). Each
 * proposal is idempotent per (flow, email) so re-runs don't spam.
 */
export async function evaluateFlows(paths, opts = {}) {
  const orders = await loadOrders(paths);
  const customers = customersFrom(orders);
  const nowMs = Date.parse(now());
  const proposals = [];
  for (const c of customers) {
    const st = { ...rfm(c, nowMs), lapse: lapseState(c, nowMs), ltvMinor: predictedLtvMinor(c, nowMs) };
    for (const flow of FLOWS) {
      if (flow.when(c, st)) {
        proposals.push({
          flow: flow.id,
          email: c.email,
          subject: flow.subject,
          body: flow.body(c),
          segment: st.segment,
          lapse: st.lapse,
          predictedLtvMinor: st.ltvMinor,
        });
      }
    }
  }
  return proposals;
}

/**
 * Materialize flow proposals into the support inbox as drafted messages for a
 * human to review and send. Idempotent: skips an (email, flow) already present.
 * Returns the count newly proposed. NEVER sends.
 */
export async function proposeFlows(paths, opts = {}) {
  const proposals = await evaluateFlows(paths, opts);
  const { loadInbox } = await import('../support/inbox.mjs');
  const existing = await loadInbox(paths);
  const seen = new Set(existing.map((m) => `${m.email}|${m.flow}`));
  let proposed = 0;
  for (const p of proposals) {
    if (seen.has(`${p.email}|${p.flow}`)) continue;
    const msg = await addMessage(paths, {
      email: p.email,
      subject: p.subject,
      body: p.body,
      intent: 'lifecycle',
    });
    // Tag the message with its flow + draft so it shows as ready for human send.
    const { loadInbox: reload, saveInbox } = await import('../support/inbox.mjs');
    const inbox = await reload(paths);
    const stored = inbox.find((m) => m.id === msg.id);
    if (stored) {
      stored.flow = p.flow;
      stored.draft = p.body;
      stored.status = 'drafted';
      stored.outbound = true;
      await saveInbox(paths, inbox);
    }
    seen.add(`${p.email}|${p.flow}`);
    proposed++;
  }
  return { proposed, total: proposals.length };
}
