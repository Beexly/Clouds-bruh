import { int } from '../lib/num.mjs';

/**
 * Size & fit data model (R-CX, from docs/research/10). Apparel's #1 returns cause
 * is fit; accurate sizing is a trust + margin lever. All lengths are INTEGER
 * MILLIMETERS — mirroring the money rule (never floats) so measurements are
 * exact and comparable.
 *
 * FitProfile  — how a garment runs vs. its label (declared, or learned from returns).
 * SizeChart   — per-size measurement rows.
 * Measurement — a body or garment point in integer mm with a tolerance.
 */

export const FIT = Object.freeze({ SMALL: 'runs_small', TRUE: 'true', LARGE: 'runs_large' });
export const MEASURE_POINTS = Object.freeze(['chest', 'waist', 'hip', 'length', 'inseam', 'shoulder', 'sleeve']);
export const RETURN_REASONS = Object.freeze([
  'too_small',
  'too_large',
  'not_as_described',
  'quality_defect',
  'changed_mind',
  'wrong_item',
  'other',
]);

export function createMeasurement(input = {}) {
  return {
    point: input.point,
    type: input.type === 'body' ? 'body' : 'garment',
    valueMm: int(input.valueMm, 0),
    tolMm: int(input.tolMm, 10),
  };
}

export function createFitProfile(input = {}) {
  const fit = [FIT.SMALL, FIT.TRUE, FIT.LARGE].includes(input.fit) ? input.fit : FIT.TRUE;
  return {
    fit,
    confidence: input.confidence || 'med',
    basis: input.basis === 'returns_signal' ? 'returns_signal' : 'declared',
    modelWears: input.modelWears
      ? { heightMm: int(input.modelWears.heightMm, 0), sizeLabel: input.modelWears.sizeLabel || '' }
      : undefined,
    sizeSystem: input.sizeSystem || 'US',
  };
}

export function createSizeChart(input = {}) {
  return {
    rows: (input.rows || []).map((r) => ({
      sizeLabel: r.sizeLabel,
      measurements: (r.measurements || []).map(createMeasurement),
    })),
  };
}

/** Convenience: build a garment size chart from a compact {label: {point: mm}} map. */
export function sizeChartFrom(map = {}, tolMm = 10) {
  return createSizeChart({
    rows: Object.entries(map).map(([sizeLabel, points]) => ({
      sizeLabel,
      measurements: Object.entries(points).map(([point, valueMm]) => ({ point, type: 'garment', valueMm, tolMm })),
    })),
  });
}
