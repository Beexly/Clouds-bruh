import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tempPaths } from './helpers.mjs';
import { addMessage, draftReplies, sendReply, loadInbox, classifyIntent } from '../src/support/inbox.mjs';
import { runAgent } from '../src/agents/runtime.mjs';
import { human, agent } from '../src/lib/actor.mjs';

test('intent classifier maps keywords to intents', () => {
  assert.equal(classifyIntent('Where is my order?'), 'where_is_my_order');
  assert.equal(classifyIntent('I want to return this'), 'return_request');
  assert.equal(classifyIntent('what fabric is this'), 'materials');
  assert.equal(classifyIntent('hello there'), 'general');
});

test('agent drafts replies for new messages; human sends (gated)', async () => {
  const paths = await tempPaths();
  await addMessage(paths, { email: 'a@example.com', subject: 'Sizing', body: 'Does this run true to size?' });

  const drafted = await draftReplies(paths);
  assert.equal(drafted, 1);
  let inbox = await loadInbox(paths);
  assert.equal(inbox[0].status, 'drafted');
  assert.ok(inbox[0].draft.length > 0);

  // An agent actor may not send.
  await assert.rejects(() => sendReply(paths, inbox[0].id, agent('support')), /human/i);

  const sent = await sendReply(paths, inbox[0].id, human('operator'));
  assert.equal(sent.status, 'sent');
  assert.ok(sent.sentAt);
});

test('the support agent run drafts pending messages', async () => {
  const paths = await tempPaths();
  await addMessage(paths, { email: 'b@example.com', subject: 'Return', body: 'I need to return an item' });
  const { result } = await runAgent('support', paths, {});
  assert.match(result.notes, /drafted 1/);
  const inbox = await loadInbox(paths);
  assert.equal(inbox[0].status, 'drafted');
});

test('order context fills the order-status macro', async () => {
  const paths = await tempPaths();
  await addMessage(paths, { email: 'c@example.com', subject: 'Tracking', body: 'where is my order', orderNumber: 'ECL-2026-000001' });
  const n = await draftReplies(paths);
  assert.equal(n, 1);
  const inbox = await loadInbox(paths);
  assert.ok(inbox[0].draft.includes('ECL-2026-000001') || inbox[0].draft.includes('your order'));
});
