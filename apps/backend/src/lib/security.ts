import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework';

/**
 * Defensive security utilities for Lumera's own surfaces (OWASP-aligned):
 * - in-memory per-IP rate limiting (DoS / brute-force / cost control on LLM endpoints)
 * - SSRF allowlist guard for any fetch whose URL could derive from user/scraped input
 * - fetchWithTimeout so an outbound call can never hang an API route / agent loop
 *
 * Rate limiting is in-memory (per process). For a multi-instance deployment, front it with a
 * Redis-backed limiter; per-instance limiting is still a meaningful first line of defense.
 */

// ── Rate limiting ───────────────────────────────────────────────────────────
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: MedusaRequest): string {
  const fwd = (req.headers['x-forwarded-for'] as string) || '';
  return fwd.split(',')[0]?.trim() || (req.socket as any)?.remoteAddress || 'unknown';
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  key?: (req: MedusaRequest) => string;
}

/**
 * Build an Express-style Medusa middleware that limits requests per IP per window.
 * Disabled automatically under NODE_ENV=test and when RATE_LIMIT_DISABLED=true, and tunable via
 * RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX so CI and dev are never throttled by accident.
 */
export function rateLimit(opts: RateLimitOptions = {}) {
  const windowMs = opts.windowMs ?? Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max = opts.max ?? Number(process.env.RATE_LIMIT_MAX ?? 240);
  const keyFn = opts.key ?? clientIp;

  return function rateLimiter(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
    if (process.env.NODE_ENV === 'test' || process.env.RATE_LIMIT_DISABLED === 'true') return next();
    const now = Date.now();
    const k = keyFn(req);
    const bucket = buckets.get(k);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(k, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'rate_limited', retry_after_seconds: retryAfter });
    }
    return next();
  };
}

// Opportunistic cleanup so the bucket map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 5 * 60_000).unref?.();

// ── Store-value minting guard ────────────────────────────────────────────────
/**
 * True when minting store value (gift cards, Lumens credits) must be REFUSED because it isn't
 * payment-bound: real-money mode (NODE_ENV=production + a live, non-test Stripe key) and not
 * explicitly allowed for controlled testing via MONETIZATION_ALLOW_UNPAID_ISSUE=true. In dev/test
 * (no live key) minting is permitted so local + CI flows work. Binding issuance to a captured
 * payment is the production follow-up.
 */
export function mintingBlocked(): boolean {
  const liveMoney =
    process.env.NODE_ENV === 'production' &&
    !!process.env.STRIPE_API_KEY &&
    !process.env.STRIPE_API_KEY.startsWith('sk_test');
  return liveMoney && process.env.MONETIZATION_ALLOW_UNPAID_ISSUE !== 'true';
}

// ── SSRF guard ──────────────────────────────────────────────────────────────
const BLOCKED_HOSTS = new Set(['localhost', '0.0.0.0', '::1', '169.254.169.254', 'metadata.google.internal', 'metadata']);

/**
 * Validate an outbound URL before fetching it. Use for ANY fetch whose host could come from
 * user input or scraped data. Blocks non-http(s), loopback/link-local, and private IP ranges,
 * and (optionally) enforces a host allowlist. (Do NOT use for trusted self-calls to a localhost
 * dev backend — those bypass this guard intentionally.)
 */
export function assertSafeOutboundUrl(raw: string, allowHosts?: string[]): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('ssrf_blocked:invalid_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error(`ssrf_blocked:protocol:${url.protocol}`);
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) throw new Error(`ssrf_blocked:host:${host}`);
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host)) {
    throw new Error(`ssrf_blocked:private_ip:${host}`);
  }
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) throw new Error(`ssrf_blocked:private_ip:${host}`);
  if (allowHosts && allowHosts.length && !allowHosts.includes(host)) throw new Error(`ssrf_blocked:not_allowlisted:${host}`);
  return url;
}

// ── Outbound fetch with timeout ──────────────────────────────────────────────
/** fetch that always has an abort timeout so a slow upstream can't hang the request/agent loop. */
export async function fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  return fetch(input, { ...init, signal: (init as any).signal ?? AbortSignal.timeout(timeoutMs) });
}
