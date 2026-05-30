import type { SignalEvent } from '@alterxiv/shared';
import { REWARD_WEIGHTS } from '@alterxiv/shared';

/**
 * THE LEARNING LOOP — what makes Alter XIV self-improving.
 * Outcomes from SIGNAL flow back into three places so the system is smarter tomorrow:
 *   1. embeddings — retrain product + visitor vectors on fresh behavior
 *   2. bandit — reward the Broadcast block / recommendation that led to the action
 *   3. agent memory — record which curation/copy/imagery/campaign outcomes won, in the Ledger
 */
export async function learnFrom(event: SignalEvent) {
  const reward = REWARD_WEIGHTS[event.type];
  if (reward) {
    // 2. attribute reward to the rec/block that produced this action (ORACLE.reward / attribute)
    // TODO: resolve the originating recommendation/block from session context → apply reward
  }
  if (event.type === 'purchase') {
    // 1. queue embedding refresh for the purchased products + this visitor
    // 3. mark the drop's sell-through; feed Curator/Herald memory
  }
}

/** Nightly batch (OracleKeeper-driven): retrain embeddings, conclude experiments, promote winners. */
export async function nightlyConsolidation() {
  // TODO: recompute product embeddings; recompute visitor embeddings from recent events;
  //       conclude experiments with enough power; promote winning variants; log to Ledger.
}
