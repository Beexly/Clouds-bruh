import { createHash } from 'node:crypto';

/** Stable SHA-256 hex of a string or JSON-able value. */
export function sha256hex(input) {
  const str = typeof input === 'string' ? input : stableStringify(input);
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Short, lowercase Crockford-ish base32 hash — used for content-addressed IDs
 * and idempotency keys. Deterministic for identical input.
 */
const B32 = '0123456789abcdefghjkmnpqrstvwxyz';
export function shortHash(input, len = 10) {
  const str = typeof input === 'string' ? input : stableStringify(input);
  const buf = createHash('sha256').update(str).digest();
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    if (out.length >= len) break;
  }
  return out.slice(0, len);
}

/** JSON.stringify with sorted keys so hashing is order-independent. */
export function stableStringify(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
}
