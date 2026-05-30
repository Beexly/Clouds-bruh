import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issuePayloadFor, transitionForLabels } from '../src/queue/mirror-github.mjs';
import { createCandidate } from '../src/model/review-queue-item.mjs';

test('issue payload carries the reviewer essentials', () => {
  const c = createCandidate({
    title: 'Obsidian Chain Belt',
    summary: 'A gothic-luxe chain belt candidate.',
    sourceLinks: [{ label: 'Trend scan', url: 'https://example.com/t', kind: 'trend' }],
    gate: { passed: true, blockers: [] },
    costs: { suggestedListMinor: 5800, unitCostMinor: 1400, marginPct: 76 },
    scores: { readiness: 88 },
  });
  const p = issuePayloadFor(c);
  assert.ok(p.title.includes('Obsidian Chain Belt'));
  assert.ok(p.body.includes(c.id), 'body references the candidate id');
  assert.ok(p.body.includes('https://example.com/t'), 'body includes the source link');
  assert.ok(p.body.includes('$58'), 'body includes the suggested price');
  assert.ok(p.labels.includes('eclipse:candidate'));
});

test('labels map back to queue transitions', () => {
  assert.equal(transitionForLabels(['approve']), 'approved');
  assert.equal(transitionForLabels(['needs-changes']), 'needs_changes');
  assert.equal(transitionForLabels(['reject']), 'rejected');
  assert.equal(transitionForLabels(['unrelated']), null);
});
