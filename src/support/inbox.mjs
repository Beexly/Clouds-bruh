import { readJson, writeJson } from '../lib/jsonfile.mjs';
import { shortHash } from '../lib/hash.mjs';
import { now } from '../lib/clock.mjs';
import { findMacro, MACROS } from './macros.mjs';
import { loadOrders } from '../orders/store.mjs';

/**
 * Customer support inbox. A message arrives `new`; the support agent drafts a
 * reply (`drafted`) from the macro library + order context; a human sends it
 * (`sent`). Sending is the gated step — agents draft, humans send.
 */

// Keyword → intent classifier (deterministic, dependency-free).
const RULES = [
  { intent: 'where_is_my_order', kw: ['where', 'track', 'shipped', 'arrive', 'delivery', 'status'] },
  { intent: 'return_request', kw: ['return', 'refund', 'exchange', 'send back'] },
  { intent: 'sizing', kw: ['size', 'fit', 'measurement', 'too big', 'too small'] },
  { intent: 'restock', kw: ['restock', 'sold out', 'back in stock', 'available again', 'waitlist'] },
  { intent: 'materials', kw: ['material', 'fabric', 'gsm', 'made of', 'cotton', 'wool', 'leather'] },
];

export function classifyIntent(text = '') {
  const t = text.toLowerCase();
  for (const r of RULES) if (r.kw.some((k) => t.includes(k))) return r.intent;
  return 'general';
}

export function createMessage(input = {}) {
  const at = input.createdAt || now();
  const body = input.body || '';
  return {
    id: input.id || 'msg_' + shortHash([input.email, body, at], 10),
    email: input.email,
    orderNumber: input.orderNumber || null,
    subject: input.subject || '(no subject)',
    body,
    intent: input.intent || classifyIntent(`${input.subject || ''} ${body}`),
    status: input.status || 'new',
    draft: input.draft || null,
    createdAt: at,
    sentAt: input.sentAt,
  };
}

export async function loadInbox(paths) {
  return readJson(paths.support, []);
}
export async function saveInbox(paths, messages) {
  await writeJson(paths.support, messages);
  return messages;
}
export async function addMessage(paths, input) {
  const inbox = await loadInbox(paths);
  const msg = createMessage(input);
  inbox.push(msg);
  await saveInbox(paths, inbox);
  return msg;
}

/** Fill a macro body with order context where available. */
function fillMacro(body, order) {
  return body
    .replace('{{number}}', order?.number || 'your order')
    .replace('{{status}}', order?.status || 'being processed')
    .replace('{{tracking}}', order?.fulfillment?.trackingUrl || 'not yet assigned');
}

/**
 * Agent action: draft replies for all `new` messages. Looks up order context by
 * number when present. Returns the count drafted. Does NOT send.
 */
export async function draftReplies(paths) {
  const [inbox, orders] = await Promise.all([loadInbox(paths), loadOrders(paths)]);
  let drafted = 0;
  for (const m of inbox) {
    if (m.status !== 'new') continue;
    const macro = findMacro(m.intent);
    const order = m.orderNumber ? orders.find((o) => o.number === m.orderNumber) : null;
    m.draft = macro
      ? fillMacro(macro.body, order)
      : 'Thanks for reaching out — a member of the team will follow up shortly.';
    m.status = 'drafted';
    drafted++;
  }
  if (drafted) await saveInbox(paths, inbox);
  return drafted;
}

/** Human-gated: send a drafted reply (optionally overriding the text). */
export async function sendReply(paths, messageId, actor, overrideText) {
  if (actor?.kind && actor.kind !== 'human') throw new Error('Only a human can send a support reply');
  const inbox = await loadInbox(paths);
  const m = inbox.find((x) => x.id === messageId);
  if (!m) throw new Error('Message not found: ' + messageId);
  if (overrideText) m.draft = overrideText;
  if (!m.draft) throw new Error('No draft to send');
  m.status = 'sent';
  m.sentAt = now();
  await saveInbox(paths, inbox);
  return m;
}

export function inboxSummary(messages = []) {
  const byStatus = {};
  for (const m of messages) byStatus[m.status] = (byStatus[m.status] || 0) + 1;
  return {
    total: messages.length,
    byStatus,
    macros: MACROS.length,
    recent: [...messages]
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      .slice(0, 20)
      .map((m) => ({ id: m.id, email: m.email, subject: m.subject, intent: m.intent, status: m.status, draft: m.draft })),
  };
}
