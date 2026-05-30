import { appendNdjson, readNdjson } from '../lib/ndjson.mjs';
import { shortHash } from '../lib/hash.mjs';
import { now } from '../lib/clock.mjs';

let _seq = 0;

/** Build a domain event. IDs are unique within a process even under a frozen clock. */
export function makeEvent(type, payload, actor = 'system') {
  const at = now();
  const seq = ++_seq;
  return { id: 'evt_' + shortHash([type, at, seq], 12), type, at, actor, payload };
}

export async function appendEvent(paths, event) {
  await appendNdjson(paths.events, event);
  return event;
}

export async function readEvents(paths) {
  return readNdjson(paths.events);
}

/** Test helper — reset the in-process sequence counter. */
export function _resetSeq() {
  _seq = 0;
}
