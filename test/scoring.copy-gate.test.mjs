import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCopy, priceOnBrand, fleschReadingEase } from '../src/scoring/copy-gate.mjs';

const onVoice = {
  title: 'XIV Hoodie',
  subtitle: '500GSM French Terry',
  description: 'Cut from 500GSM French terry. Set-in sleeves hold the shoulder; the XIV mark is embroidered, not printed. Pre-washed — what arrives is what it remains.',
  bulletBenefits: [
    '500GSM French terry — measurably heavier than fast-fashion fleece',
    'Set-in sleeves hold the shoulder across repeated wear',
    'Embroidered XIV — raised thread, permanent, correct scale',
  ],
  priceMinor: 12800,
};

test('on-voice, specific, honest copy scores high and passes', () => {
  const res = scoreCopy(onVoice);
  assert.ok(res.score >= 85, `expected >=85, got ${res.score}`);
  assert.equal(res.passed, true);
  assert.equal(res.hardFails.length, 0);
});

test('fabricated scarcity hard-fails', () => {
  const res = scoreCopy({ ...onVoice, description: onVoice.description + ' Only 3 left — selling fast!' });
  assert.equal(res.passed, false);
  assert.ok(res.hardFails.includes('dishonest/fabricated claim'));
});

test('honest "100% mulberry silk" does NOT hard-fail (context-aware)', () => {
  const res = scoreCopy({
    title: 'Vesper Scarf',
    subtitle: '100% Mulberry Silk',
    description: 'Woven from 100% mulberry silk with a hand-rolled hem. Made in a controlled run.',
    bulletBenefits: ['100% mulberry silk — dense, fluid drape', 'Hand-rolled hem', 'Made in a small run'],
    priceMinor: 6400,
  });
  assert.equal(res.hardFails.length, 0);
});

test('profanity hard-fails', () => {
  const res = scoreCopy({ ...onVoice, description: onVoice.description + ' This is damn good.' });
  assert.equal(res.passed, false);
  assert.ok(res.hardFails.includes('profanity'));
});

test('hype words cap the score and fail it', () => {
  const res = scoreCopy({ ...onVoice, description: 'The ultimate must-have. Act now, last chance, best-selling!' });
  assert.ok(res.score <= 70); // hype caps the base to 60; a real spec elsewhere may add a little back
  assert.equal(res.passed, false);
  assert.ok(res.violations.some((v) => /hype/.test(v)));
});

test('charm pricing is off-brand (luxury prices are whole)', () => {
  assert.equal(priceOnBrand(12800), true);
  assert.equal(priceOnBrand(12799), false);
  const res = scoreCopy({ ...onVoice, priceMinor: 12799 });
  assert.ok(res.violations.some((v) => /charm/.test(v)));
});

test('copy with no concrete spec is penalized', () => {
  const res = scoreCopy({
    title: 'A Nice Thing',
    subtitle: 'Very premium',
    description: 'It is really luxurious and exquisite and perfect and the finest.',
    bulletBenefits: ['Luxurious', 'Premium', 'Exquisite'],
    priceMinor: 9800,
  });
  assert.ok(res.score < 75);
  assert.ok(res.violations.some((v) => /concrete spec/.test(v)));
});

test('flesch reading ease returns a sane number', () => {
  assert.ok(fleschReadingEase('The cat sat on the mat.') > 80);
});
