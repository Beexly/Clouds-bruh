/**
 * Tiny dependency-free schema validator. A schema maps field → rule:
 *   { required?, type?, enum?, min?, max?, arrayOf? }
 * type ∈ 'string'|'number'|'integer'|'boolean'|'object'|'array'.
 */
export function validate(obj, schema) {
  const errors = [];
  const record = obj ?? {};
  for (const [key, rule] of Object.entries(schema)) {
    const v = record[key];
    const missing = v === undefined || v === null;
    if (rule.required && missing) {
      errors.push(`${key} is required`);
      continue;
    }
    if (missing) continue;

    if (rule.type && !checkType(v, rule.type)) {
      errors.push(`${key} must be of type ${rule.type}`);
      continue;
    }
    if (rule.enum && !rule.enum.includes(v)) {
      errors.push(`${key} must be one of [${rule.enum.join(', ')}]`);
    }
    if (rule.min != null && typeof v === 'number' && v < rule.min) {
      errors.push(`${key} must be >= ${rule.min}`);
    }
    if (rule.max != null && typeof v === 'number' && v > rule.max) {
      errors.push(`${key} must be <= ${rule.max}`);
    }
    if (rule.arrayOf && Array.isArray(v)) {
      v.forEach((item, i) => {
        if (!checkType(item, rule.arrayOf)) {
          errors.push(`${key}[${i}] must be of type ${rule.arrayOf}`);
        }
      });
    }
  }
  return { ok: errors.length === 0, errors };
}

export function assertValid(obj, schema, label = 'record') {
  const result = validate(obj, schema);
  if (!result.ok) {
    throw new Error(`Invalid ${label}: ${result.errors.join('; ')}`);
  }
  return obj;
}

function checkType(v, t) {
  if (t === 'array') return Array.isArray(v);
  if (t === 'integer') return Number.isInteger(v);
  if (t === 'object') return v !== null && typeof v === 'object' && !Array.isArray(v);
  return typeof v === t;
}
