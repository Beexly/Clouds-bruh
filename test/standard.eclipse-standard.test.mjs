import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateStandard, summarize, SUBJECT_TYPES } from '../src/standard/eclipse-standard.mjs';
import { createProduct } from '../src/model/product.mjs';
import { completeProductInput } from './helpers.mjs';

test('one report shape across every subject type', () => {
  const product = evaluateStandard('product', createProduct(completeProductInput()), { humanApproved: true });
  const copy = evaluateStandard('copy', { title: 'XIV Hoodie', subtitle: '500GSM French Terry', description: 'Cut from 500GSM French terry, set-in sleeves, embroidered mark.', bulletBenefits: ['500GSM French terry', 'Set-in sleeves', 'Embroidered mark'], priceMinor: 12800 });
  const imagery = evaluateStandard('imagery', []);
  const trend = evaluateStandard('trend', { term: 'oxblood leather harness', category: 'accessory', tags: ['leather'] });
  for (const r of [product, copy, imagery, trend]) {
    assert.equal(r.standard, 'eclipse-standard/v1');
    assert.ok(SUBJECT_TYPES.includes(r.subjectType));
    assert.equal(typeof r.passed, 'boolean');
    assert.ok(r.score >= 0 && r.score <= 100);
    assert.ok(Array.isArray(r.hardGates) && Array.isArray(r.blockers));
    assert.ok(r.evidence && r.evaluatedAt);
  }
});

test('product subject: human approval is a required hard gate', () => {
  const product = createProduct(completeProductInput());
  const without = evaluateStandard('product', product, { humanApproved: false });
  const withh = evaluateStandard('product', product, { humanApproved: true });
  assert.equal(without.passed, false);
  assert.ok(without.hardGates.some((g) => g.id === 'human_approved' && !g.passed));
  assert.equal(withh.passed, true);
});

test('copy subject: fabricated claim hard-blocks', () => {
  const r = evaluateStandard('copy', { title: 'X', subtitle: '500GSM', description: 'Great piece. Only 3 left, selling fast!', bulletBenefits: ['a', 'b', 'c'], priceMinor: 9800 });
  assert.equal(r.passed, false);
  assert.ok(r.hardGates.some((g) => g.id === 'honest' && !g.passed));
});

test('imagery subject: missing required shots block', () => {
  const r = evaluateStandard('imagery', [{ role: 'hero', approved: true }]);
  assert.equal(r.passed, false);
  assert.ok(r.hardGates.some((g) => g.id === 'required_shots' && !g.passed));
  assert.ok(r.evidence.missingShots.length >= 1);
});

test('trend subject: off-brand motif scores 0 and blocks', () => {
  const bad = evaluateStandard('trend', { term: 'fidget spinner gadget', category: 'gadgets', tags: [] });
  assert.equal(bad.passed, false);
  assert.equal(bad.score, 0);
  const good = evaluateStandard('trend', { term: 'gothic silver ring', category: 'jewelry', tags: ['silver', 'gothic'] });
  assert.ok(good.score > 0);
});

test('summarize gives a one-line verdict', () => {
  const r = evaluateStandard('trend', { term: 'gothic silver ring', category: 'jewelry', tags: ['gothic'] });
  assert.match(summarize(r), /\[Eclipse Standard\] trend (PASS|BLOCKED) \d+\/100/);
});

test('unknown subject type throws', () => {
  assert.throws(() => evaluateStandard('bogus', {}));
});
