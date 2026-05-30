import { appendNdjson, readNdjson } from '../lib/ndjson.mjs';
import { readJson, writeJson } from '../lib/jsonfile.mjs';
import { now } from '../lib/clock.mjs';
import { applyTransition } from './transitions.mjs';
import { system } from '../lib/actor.mjs';
import { QueueStatus } from '../model/enums.mjs';

/**
 * Append-only queue. Each create and each post-transition state is appended as a
 * snapshot to candidates.ndjson. The current state (index.json) is a projection:
 * replay all snapshots, keep the latest per id. Order-stable and idempotent.
 */

export async function appendSnapshot(paths, candidate) {
  await appendNdjson(paths.queueEvents, candidate);
  return candidate;
}

/** Replay snapshots → {byId: Map, idemSeen: Map(idempotencyKey→id)}. */
export async function replayQueue(paths) {
  const rows = await readNdjson(paths.queueEvents);
  const byId = new Map();
  const idemSeen = new Map();
  for (const row of rows) {
    byId.set(row.id, row); // latest snapshot wins
    if (row.idempotencyKey && !idemSeen.has(row.idempotencyKey)) {
      idemSeen.set(row.idempotencyKey, row.id); // first writer of an idem key wins
    }
  }
  return { byId, idemSeen };
}

export async function rebuildQueueIndex(paths) {
  const { byId } = await replayQueue(paths);
  const items = [...byId.values()].sort((a, b) =>
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  );
  const index = { items, count: items.length, updatedAt: now() };
  await writeJson(paths.queueIndex, index);
  return index;
}

export async function loadQueue(paths) {
  const idx = await readJson(paths.queueIndex, null);
  if (idx) return idx.items;
  const { byId } = await replayQueue(paths);
  return [...byId.values()];
}

export async function getCandidate(paths, id) {
  const { byId } = await replayQueue(paths);
  return byId.get(id) || null;
}

/**
 * Enqueue a NEW candidate. Duplicate idempotencyKey → no-op (returns dedupedTo).
 * The system advances a freshly proposed candidate to `queued` on append.
 */
export async function enqueueCandidate(paths, candidate) {
  const { idemSeen } = await replayQueue(paths);
  if (candidate.idempotencyKey && idemSeen.has(candidate.idempotencyKey)) {
    return { created: false, candidate: null, dedupedTo: idemSeen.get(candidate.idempotencyKey) };
  }
  const toStore =
    candidate.status === QueueStatus.PROPOSED
      ? applyTransition(candidate, QueueStatus.QUEUED, system())
      : candidate;
  await appendSnapshot(paths, toStore);
  await rebuildQueueIndex(paths);
  return { created: true, candidate: toStore };
}

/** Persist a post-transition snapshot of an existing candidate. */
export async function saveCandidate(paths, candidate) {
  await appendSnapshot(paths, candidate);
  await rebuildQueueIndex(paths);
  return candidate;
}
