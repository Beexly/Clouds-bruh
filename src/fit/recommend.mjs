import { FIT } from './model.mjs';

/**
 * Deterministic size recommendation (R-CX, docs/research/10). Pure and
 * seedless — testable, explainable, never overconfident. Prefers measurement
 * matching; falls back to fit profile and purchase history. Returns a size, a
 * confidence, a human-readable rationale, and (honestly) an alternative when the
 * customer is between sizes.
 *
 * input: {
 *   sizeChart,            // createSizeChart (garment measurements, integer mm)
 *   fitProfile,           // createFitProfile
 *   body: { chestMm, waistMm, hipMm, ... },   // optional body measurements
 *   history: { lastKeptSize, returnedSmall, returnedLarge },  // optional
 * }
 */

// Ease bands (garment − body, mm) by point: how much room a luxury fit wants.
const EASE = { chest: [40, 120], waist: [20, 110], hip: [40, 120], length: [-30, 60], inseam: [-20, 40] };

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
function orderIndex(label, labels) {
  const u = SIZE_ORDER.indexOf(String(label).toUpperCase());
  if (u >= 0) return u + 100; // canonical apparel order
  return labels.indexOf(label); // fall back to chart order (numeric sizes, etc.)
}

function shift(labels, current, by) {
  if (by === 0 || current == null) return current;
  const sorted = [...labels].sort((a, b) => orderIndex(a, labels) - orderIndex(b, labels));
  const i = sorted.indexOf(current);
  if (i < 0) return current;
  return sorted[Math.max(0, Math.min(sorted.length - 1, i + by))];
}

function measurementPick(sizeChart, body) {
  const rows = sizeChart?.rows || [];
  if (!rows.length || !body) return null;
  const labels = rows.map((r) => r.sizeLabel);
  let best = null;
  for (const row of rows) {
    let inBand = 0;
    let total = 0;
    for (const m of row.measurements) {
      if (m.type !== 'garment') continue;
      const bodyKey = m.point + 'Mm';
      if (body[bodyKey] == null) continue;
      total++;
      const slack = m.valueMm - body[bodyKey];
      const band = EASE[m.point];
      if (band && slack >= band[0] && slack <= band[1]) inBand++;
    }
    if (total === 0) continue;
    const score = inBand / total;
    if (!best || score > best.score) best = { label: row.sizeLabel, score, total };
  }
  return best ? { ...best, labels } : null;
}

export function recommendSize(input = {}) {
  const { sizeChart, fitProfile, body, history } = input;
  const labels = (sizeChart?.rows || []).map((r) => r.sizeLabel);
  let label = null;
  let confidence = 'low';
  const reasons = [];

  // 1. Measurement path (preferred).
  const mp = measurementPick(sizeChart, body);
  if (mp && mp.score > 0) {
    label = mp.label;
    confidence = mp.score >= 0.99 ? 'high' : 'med';
    reasons.push(`measurements match size ${label}`);
  }

  // 3. History fallback / blend (if no measurement match).
  if (!label && history?.lastKeptSize) {
    label = history.lastKeptSize;
    confidence = 'med';
    reasons.push(`based on your kept size ${label}`);
    if ((history.returnedSmall || 0) > (history.returnedLarge || 0)) {
      label = shift(labels.length ? labels : [label], label, +1);
      reasons.push('you previously returned items for being too small — sized up');
    } else if ((history.returnedLarge || 0) > (history.returnedSmall || 0)) {
      label = shift(labels.length ? labels : [label], label, -1);
      reasons.push('you previously returned items for being too large — sized down');
    }
  }

  // 2. Fit-profile adjust (applies on top of either path).
  if (label && fitProfile) {
    if (fitProfile.fit === FIT.SMALL) {
      label = shift(labels, label, +1);
      reasons.push('this piece runs small — sized up');
    } else if (fitProfile.fit === FIT.LARGE) {
      label = shift(labels, label, -1);
      reasons.push('this piece runs large — sized down');
    }
  }

  // Fit-profile-only (no body, no history): low confidence, honest hedge.
  if (!label && fitProfile && labels.length) {
    label = fitProfile.modelWears?.sizeLabel || labels[Math.floor(labels.length / 2)];
    confidence = 'low';
    reasons.push('limited data — start near the middle of the range');
  }

  if (!label) return { sizeLabel: null, confidence: 'none', rationale: 'Not enough sizing data yet.', alternative: null };

  // Honest "between sizes" alternative when confidence isn't high.
  let alternative = null;
  if (confidence !== 'high' && labels.length > 1) {
    const up = shift(labels, label, +1);
    alternative = up !== label ? up : shift(labels, label, -1);
  }

  return {
    sizeLabel: label,
    confidence,
    rationale: reasons.join('; ') || `recommended ${label}`,
    alternative: alternative && alternative !== label ? alternative : null,
  };
}
