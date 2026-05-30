import { clamp } from '../lib/num.mjs';

/**
 * Copy gate / scorer (R-voice, from docs/research/09). Deterministic, pure,
 * testable. Scores product copy for Eclipse voice adherence, specificity,
 * reading ease, banned-word use, price presentation, and HONESTY — hard-failing
 * fabricated claims so off-voice or dishonest copy can never reach a human as
 * "ready." Slots beside the imagery quality gate in the candidate pipeline.
 *
 * The charter is enforceable in language: every dark tactic has a true
 * alternative, and the gate blocks the dark version.
 */

// (A) Hype/spam — banned outright (caps score, fails).
const HYPE = [
  'act now', 'buy now', 'shop now', 'hurry', "don't miss out", 'dont miss out', 'last chance',
  'while supplies last', 'limited time', 'today only', 'best-selling', 'best selling', 'world-class',
  'world class', 'ultimate', 'insane', 'must-have', 'must have', 'game-changer', 'game changer',
  'revolutionary', 'blowout', 'lowest price', 'cheap', 'bargain',
];

// (B) Empty filler — penalize, replace with a spec.
const FILLER = [
  'very', 'really', 'extremely', 'super', 'totally', 'literally', 'premium', 'high-quality',
  'high quality', 'luxurious', 'exquisite', 'finest', 'perfect', 'iconic', 'curated', 'elevate',
  'elevated', 'unlock', 'seamless', 'next-level', 'next level',
];

// (C) Dishonest — HARD FAIL (unless backed by a real, live data field). Note:
// "100%" is only dishonest as a guarantee ("100% guaranteed/satisfaction"), not
// as an honest material spec ("100% mulberry silk") — so it's matched in context.
const DISHONEST = [
  'only \\d+ left', 'selling fast', 'going fast', 'almost gone', 'thousands sold', 'millions sold',
  '#1', 'number one', 'the best', 'guaranteed',
  '100%\\s*(guarantee|guaranteed|satisfaction|authentic|risk)', 'was \\$', 'msrp', 'save \\$', 'compare at',
];

// (D) Profanity — HARD FAIL (a tiny, expandable list; charter is profanity-free).
const PROFANITY = ['damn', 'hell', 'crap', 'ass', 'shit', 'fuck', 'bitch'];

// Specificity markers — numbers + units + materials signal verifiable trust.
const UNIT = /\b\d+\s?(gsm|mm|cm|oz|ct|carat|micron|denier|%|in|inch|inches)\b/i;
const MATERIAL = /\b(cotton|wool|cashmere|leather|silk|fleece|terry|denim|brass|sterling|silver|gold|acetate|merino|lambskin|calfskin|nylon|linen|suede|velvet)\b/i;

const lc = (s) => String(s || '').toLowerCase();
const countHits = (text, list) => list.filter((w) => new RegExp(`\\b${w}\\b`, 'i').test(text)).length;
const regexHits = (text, list) => list.filter((re) => new RegExp(re, 'i').test(text)).length;

/** Flesch reading ease (approx; dependency-free). Higher = easier. */
export function fleschReadingEase(text) {
  const t = String(text || '').trim();
  if (!t) return 0;
  const sentences = (t.match(/[.!?]+/g) || []).length || 1;
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length || 1;
  const syllables = words.reduce((n, w) => n + countSyllables(w), 0) || 1;
  return Math.round(206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount));
}
function countSyllables(word) {
  const w = lc(word).replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.endsWith('e')) n--;
  return Math.max(1, n);
}

/** Luxury price rule: whole major units only; charm endings are off-brand. */
export function priceOnBrand(amountMinor) {
  if (amountMinor == null) return true; // no price to judge
  return amountMinor % 100 === 0; // whole dollars; rejects .99/.95/.98 etc.
}

/**
 * Score a product's copy. `copy` accepts { title, subtitle, description,
 * bulletBenefits[], priceMinor }. `liveFlags` lets a TRUE data field clear an
 * otherwise-dishonest phrase (e.g. real low stock) — absent by default.
 */
export function scoreCopy(copy = {}, opts = {}) {
  const title = copy.title || '';
  const subtitle = copy.subtitle || '';
  const description = copy.description || '';
  const bullets = copy.bulletBenefits || [];
  const blob = [title, subtitle, description, ...bullets].join(' \n ');
  const text = lc(blob);

  const hardFails = [];
  const violations = [];
  const reasons = [];

  // Hard fails first.
  if (countHits(text, PROFANITY) > 0) hardFails.push('profanity');
  const dishonest = opts.liveFlags?.realScarcity ? 0 : regexHits(text, DISHONEST);
  if (dishonest > 0) hardFails.push('dishonest/fabricated claim');
  if (!priceOnBrand(copy.priceMinor)) violations.push('price uses charm ending (luxury prices are whole)');

  // Scoring.
  let score = 100;
  const hype = countHits(text, HYPE);
  if (hype > 0) { score = Math.min(score, 60); violations.push(`${hype} hype/spam word(s)`); }
  const filler = countHits(text, FILLER);
  if (filler > 0) { score -= Math.min(25, filler * 6); violations.push(`${filler} empty-filler word(s)`); }

  // Specificity reward / requirement.
  const hasUnit = UNIT.test(blob);
  const hasMaterial = MATERIAL.test(blob);
  if (hasUnit) { score += 6; reasons.push('cites a measurable spec'); }
  if (hasMaterial) { score += 4; reasons.push('names a material'); }
  if (!hasUnit && !hasMaterial) { score -= 20; violations.push('no concrete spec (specificity is the proof)'); }

  // Structure.
  const titleWords = title.trim().split(/\s+/).filter(Boolean).length;
  if (titleWords < 1 || titleWords > 6) { score -= 6; violations.push('title should be 1–6 words'); }
  if (bullets.length < 3 || bullets.length > 5) { score -= 6; violations.push('use 3–5 benefit bullets'); }
  const descWords = description.trim().split(/\s+/).filter(Boolean).length;
  if (descWords > 60) { score -= 6; violations.push('description over ~55 words'); }
  if (/[A-Z]{6,}/.test(blob)) { score -= 6; violations.push('no shouting caps'); }

  // Reading ease (penalize, never hard-fail).
  const flesch = fleschReadingEase(description || blob);
  if (flesch < 45) { score -= 8; violations.push(`hard to read (Flesch ${flesch})`); }

  // Price violation caps the score.
  if (!priceOnBrand(copy.priceMinor)) score = Math.min(score, 70);

  const passed = hardFails.length === 0 && score >= (opts.min ?? 75);
  const finalScore = clamp(Math.round(score), 0, 100);
  const band = finalScore >= 85 ? 'on-voice' : finalScore >= 70 ? 'acceptable' : 'off-voice';
  return { score: finalScore, band, passed, hardFails, violations, reasons, flesch };
}
