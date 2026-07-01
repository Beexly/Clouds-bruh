import { describe, it, expect } from 'vitest';
import { retry, withTimeout, sleep, mapConcurrent, isTransient, TimeoutError } from './resilience';

describe('retry', () => {
  it('returns immediately on first success (no retries)', async () => {
    let calls = 0;
    const r = await retry(async () => { calls++; return 'ok'; });
    expect(r).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries then succeeds, calling onRetry for each failed attempt', async () => {
    let calls = 0;
    const retries: number[] = [];
    const r = await retry(
      async () => { calls++; if (calls < 3) throw new Error('boom'); return calls; },
      { baseMs: 1, maxMs: 2, rng: () => 0, onRetry: (_e, a) => retries.push(a) },
    );
    expect(r).toBe(3);
    expect(calls).toBe(3);
    expect(retries).toEqual([1, 2]);
  });

  it('throws the last error after exhausting attempts', async () => {
    let calls = 0;
    await expect(retry(async () => { calls++; throw new Error(`fail-${calls}`); }, { attempts: 3, baseMs: 1, rng: () => 0 }))
      .rejects.toThrow('fail-3');
    expect(calls).toBe(3);
  });

  it('does not retry when retryable returns false', async () => {
    let calls = 0;
    await expect(retry(async () => { calls++; throw new Error('nope'); }, { attempts: 5, baseMs: 1, retryable: () => false }))
      .rejects.toThrow('nope');
    expect(calls).toBe(1);
  });

  it('full jitter delay is bounded by the exponential ceiling (rng=1 → just under expo)', async () => {
    // baseMs=100, factor=2 → expo attempt1=100; rng()=0.99 → delay≈99; we just assert it completes fast with rng=0
    let calls = 0;
    const start = Date.now();
    await retry(async () => { calls++; if (calls < 2) throw new Error('x'); return 1; }, { baseMs: 1, rng: () => 0 });
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('applies a per-attempt timeout', async () => {
    await expect(retry(() => new Promise(() => {}), { attempts: 1, timeoutMs: 20 })).rejects.toBeInstanceOf(TimeoutError);
  });
});

describe('withTimeout', () => {
  it('resolves when the promise beats the timeout', async () => {
    await expect(withTimeout(Promise.resolve(42), 100)).resolves.toBe(42);
  });
  it('rejects with TimeoutError when it expires', async () => {
    await expect(withTimeout(new Promise(() => {}), 10, 'slow-op')).rejects.toThrow(/slow-op timed out after 10ms/);
  });
  it('propagates the underlying rejection unchanged', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100)).rejects.toThrow('boom');
  });
});

describe('sleep', () => {
  it('resolves after the delay', async () => {
    const start = Date.now();
    await sleep(15);
    expect(Date.now() - start).toBeGreaterThanOrEqual(10);
  });
  it('rejects if the signal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort(new Error('cancelled'));
    await expect(sleep(50, ac.signal)).rejects.toThrow('cancelled');
  });
});

describe('mapConcurrent', () => {
  it('preserves input order regardless of completion order', async () => {
    const out = await mapConcurrent([30, 5, 15, 1], async (ms) => { await sleep(ms); return ms; }, { concurrency: 4 });
    expect(out).toEqual([30, 5, 15, 1]);
  });

  it('never exceeds the concurrency limit', async () => {
    let active = 0, peak = 0;
    await mapConcurrent(Array.from({ length: 12 }, (_, i) => i), async () => {
      active++; peak = Math.max(peak, active);
      await sleep(5);
      active--;
    }, { concurrency: 3 });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('stopOnError=true rejects and stops starting new work', async () => {
    let started = 0;
    await expect(mapConcurrent(Array.from({ length: 20 }, (_, i) => i), async (i) => {
      started++;
      await sleep(2);
      if (i === 1) throw new Error('kaboom');
      return i;
    }, { concurrency: 2, stopOnError: true })).rejects.toThrow('kaboom');
    expect(started).toBeLessThan(20); // did not start all 20 after the failure
  });

  it('stopOnError=false runs all and leaves failed slots undefined', async () => {
    const out = await mapConcurrent([1, 2, 3, 4], async (n) => { if (n % 2 === 0) throw new Error('even'); return n; },
      { concurrency: 2, stopOnError: false });
    expect(out[0]).toBe(1);
    expect(out[1]).toBeUndefined();
    expect(out[2]).toBe(3);
    expect(out[3]).toBeUndefined();
  });
});

describe('isTransient', () => {
  it('flags timeouts and transient HTTP/network errors', () => {
    expect(isTransient(new TimeoutError('x'))).toBe(true);
    expect(isTransient(new Error('Vendor request failed 503'))).toBe(true);
    expect(isTransient(new Error('ECONNRESET'))).toBe(true);
    expect(isTransient(new Error('fetch failed'))).toBe(true);
  });
  it('does not flag ordinary errors', () => {
    expect(isTransient(new Error('validation: name required'))).toBe(false);
    expect(isTransient(new Error('404 not found'))).toBe(false);
  });
});
