/**
 * Injectable clock. Factories read `now()` so tests can freeze time for
 * deterministic, reproducible records. Default is real wall-clock ISO-8601.
 */
let _now = () => new Date().toISOString();

export function now() {
  return _now();
}

/** Freeze or override time. Pass an ISO string or a function returning one. */
export function setNow(value) {
  _now = typeof value === 'function' ? value : () => value;
}

export function resetNow() {
  _now = () => new Date().toISOString();
}
