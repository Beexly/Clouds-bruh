import { shortHash } from '../lib/hash.mjs';
import { BRAND } from '../brand.mjs';

/** URL/file-safe slug. */
export function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFKD') // splits accents into base char + combining mark
    .replace(/[^a-z0-9\s-]/g, '') // ASCII-only filter also drops the combining marks
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

/** Content-addressed IDs. Deterministic for identical seed parts. */
export const productId = (seed) => 'prod_' + shortHash(seed, 12);
export const variantId = (seed) => 'var_' + shortHash(seed, 12);
export const supplierId = (seed) => 'sup_' + shortHash(seed, 10);
export const collectionId = (seed) => 'col_' + shortHash(seed, 10);
export const candidateId = (seed) => 'cand_' + shortHash(seed, 12);
export const orderId = (seed) => 'ord_' + shortHash(seed, 12);
export const signalId = (seed) => 'sig_' + shortHash(seed, 10);
export const mediaId = (seed) => 'med_' + shortHash(seed, 10);
export const taskId = (seed) => 'task_' + shortHash(seed, 10);

/** Idempotency key — pure content hash, no prefix, used to dedupe proposals. */
export const idempotencyKey = (payload) => shortHash(payload, 16);

const token = (str, len = 4) =>
  String(str)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, len) || 'X';

/** SKU like ECL-HOOD-BLK-M. Brand prefix comes from src/brand.mjs. */
export function skuFrom({ category, color, size }) {
  return [BRAND.skuPrefix, token(category, 4), token(color, 3), token(size, 3)]
    .filter(Boolean)
    .join('-');
}

/** Human order number like ECL-2026-000123. */
export function orderNumber(seq, year = new Date().getUTCFullYear()) {
  return `${BRAND.orderPrefix}-${year}-${String(seq).padStart(6, '0')}`;
}
