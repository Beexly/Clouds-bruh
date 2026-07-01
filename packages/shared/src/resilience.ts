/**
 * Resilience primitives — retry (exponential backoff + full jitter), timeouts, and bounded
 * structured concurrency. Pure and dependency-free (uses only `setTimeout`/`AbortSignal`, available
 * in Node and the browser), so any app (backend, intelligence, storefront) can use them for network
 * calls. This is the TypeScript analogue of Python `tenacity` + Go `errgroup`/`context` patterns.
 */

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Sleep for `ms`, rejecting early if `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'));
    const t = setTimeout(resolve, Math.max(0, ms));
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new Error('aborted'));
      },
      { once: true },
    );
  });
}

/** Race a promise against a timeout (and optional abort). Rejects with TimeoutError on expiry. */
export function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation', signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const done = (fn: (v: any) => void, v: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      signal?.removeEventListener('abort', onAbort);
      fn(v);
    };
    const t = setTimeout(() => done(reject, new TimeoutError(`${label} timed out after ${ms}ms`)), ms);
    const onAbort = () => done(reject, signal!.reason ?? new Error('aborted'));
    if (signal) {
      if (signal.aborted) return done(reject, signal.reason ?? new Error('aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
    }
    p.then((v) => done(resolve, v), (e) => done(reject, e));
  });
}

export interface RetryOptions {
  /** Total attempts including the first (default 4). */
  attempts?: number;
  /** Base backoff in ms (default 200). */
  baseMs?: number;
  /** Cap for any single backoff delay (default 8000). */
  maxMs?: number;
  /** Exponential factor (default 2). */
  factor?: number;
  /** Jitter strategy — 'full' (default) picks a random delay in [0, expo); 'none' uses expo exactly. */
  jitter?: 'full' | 'none';
  /** Per-attempt timeout in ms (optional). */
  timeoutMs?: number;
  /** Abort the whole retry loop. */
  signal?: AbortSignal;
  /** Decide whether an error is retryable (default: retry everything). */
  retryable?: (err: unknown, attempt: number) => boolean;
  /** Observability hook fired before each backoff wait. */
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
  /** Injectable RNG for deterministic tests (default Math.random). */
  rng?: () => number;
}

/**
 * Run `fn` with retries. Backoff is exponential (`baseMs * factor^(n-1)`, capped at `maxMs`) with
 * full jitter by default, so concurrent clients don't retry in lock-step (thundering herd). Throws
 * the last error after exhausting attempts or when `retryable` returns false.
 */
export async function retry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    attempts = 4, baseMs = 200, maxMs = 8000, factor = 2, jitter = 'full',
    timeoutMs, signal, retryable = () => true, onRetry, rng = Math.random,
  } = opts;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (signal?.aborted) throw signal.reason ?? new Error('aborted');
    try {
      return timeoutMs ? await withTimeout(fn(attempt), timeoutMs, `attempt ${attempt}`, signal) : await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !retryable(err, attempt)) break;
      const expo = Math.min(maxMs, baseMs * Math.pow(factor, attempt - 1));
      const delay = jitter === 'full' ? Math.floor(rng() * expo) : expo;
      onRetry?.(err, attempt, delay);
      await sleep(delay, signal);
    }
  }
  throw lastErr;
}

export interface ConcurrentOptions {
  /** Max in-flight tasks (default 8). */
  concurrency?: number;
  /** Cancel pulling new work when aborted. */
  signal?: AbortSignal;
  /**
   * errgroup semantics. true (default): the first task error cancels new work and rejects.
   * false: run everything; failed slots are `undefined` (like Promise.allSettled but returning values).
   */
  stopOnError?: boolean;
}

/**
 * Map `fn` over `items` with a bounded worker pool — the TS analogue of a Go errgroup with a
 * semaphore. Preserves input order in the results array. With `stopOnError` (default), the first
 * failure stops new work from starting and rejects; in-flight tasks are allowed to settle (JS
 * promises aren't cancellable, but pass the `signal` into `fn` to cooperate).
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  opts: ConcurrentOptions = {},
): Promise<R[]> {
  const { concurrency = 8, signal, stopOnError = true } = opts;
  const results: (R | undefined)[] = new Array(items.length);
  let next = 0;
  let failed = false;
  async function worker(): Promise<void> {
    for (;;) {
      if (failed || signal?.aborted) return;
      const i = next++;
      if (i >= items.length) return;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        if (stopOnError) {
          failed = true;
          throw err;
        }
        results[i] = undefined;
      }
    }
  }
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results as R[];
}

/** A retry predicate for network-ish errors: retry on TimeoutError and common transient HTTP status hints. */
export function isTransient(err: unknown): boolean {
  if (err instanceof TimeoutError) return true;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /\b(429|408|500|502|503|504)\b|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|network|fetch failed/i.test(msg);
}
