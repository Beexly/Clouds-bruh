import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS } from '../src/agents/registry.mjs';

test('every agent has cadence, non-empty governance, no overlap, and no autonomous publish', () => {
  assert.ok(AGENTS.length >= 8);
  for (const a of AGENTS) {
    assert.ok(a.cadence && a.cadence.kind, `${a.id} missing cadence`);
    assert.ok(a.governance.autonomous.length > 0, `${a.id} has no autonomous actions`);
    assert.ok(a.governance.forbidden.length > 0, `${a.id} has no forbidden actions`);
    const overlap = a.governance.autonomous.filter((x) => a.governance.gated.includes(x));
    assert.equal(overlap.length, 0, `${a.id} autonomous/gated overlap`);
    // No agent may INITIATE a publish autonomously (QA's "block_publish" is allowed).
    assert.ok(!a.governance.autonomous.some((x) => /^publish/.test(x)), `${a.id} lists a publish action as autonomous`);
  }
});

test('QA governance can never approve or publish', () => {
  const qa = AGENTS.find((a) => a.role === 'qa');
  assert.ok(qa.governance.forbidden.includes('approve_candidate'));
  assert.ok(qa.governance.forbidden.includes('publish_product'));
});
