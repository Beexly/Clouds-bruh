# Lumera Security

Defensive security posture for the Lumera platform. Scope: our own backend (Medusa v2), storefront
(Next.js), and intelligence runtime. Aligned to the OWASP Top 10.

## Authentication & authorization
- **Founder cockpit / ops APIs** (`/store/cockpit`, `/store/analyst`, `/admin/lumera/*`) are gated by
  `COCKPIT_KEY`, **header-only** (`x-cockpit-key`) — never via query string (avoids log/proxy leakage).
  Fail-closed in production: if `COCKPIT_KEY` is unset, these endpoints return 401.
- **Agent actions** that move money, publish, or submit a supplier order require founder approval
  (escalation gate) and the live flags `VENDOR_LIVE_MODE` / `AUTO_SUBMIT_VENDOR_ORDERS` /
  `VENDOR_DRAFT_ORDER_PROOF`. Nothing autonomous bypasses these.

## Secrets & cryptography
- Production **refuses to boot** without `JWT_SECRET` and `COOKIE_SECRET` (no insecure fallback).
- All secrets come from env; none are committed. `.env` is gitignored; `.env.example` holds placeholders.
- **Webhooks** are signature-verified: vendor webhooks via HMAC-SHA256 (timing-safe compare); Stripe via
  the real `t,v1` scheme over the **raw body** (`preserveRawBody` middleware) with timestamp tolerance.

## Injection
- All raw SQL is parameterized (`$1,$2,…`); no string interpolation of input into SQL.
- The Analyst BI endpoint runs a fixed **allowlist** of read-only SELECTs inside a `BEGIN READ ONLY`
  transaction — no dynamic SQL, no writes.
- Input validation on public endpoints: `/store/shepherd` caps message count + length; `/store/preferences`
  caps array size and accepts only known chapter values.

## Availability & abuse
- **Per-IP rate limiting** on `/store/*` and `/admin/lumera/*` (in-memory; tunable via `RATE_LIMIT_*`;
  auto-disabled under test). For multi-instance deployments, front with a Redis-backed limiter.
- Outbound calls (Anthropic, Medusa Admin) use abort **timeouts** so a slow upstream can't hang a route.
- An SSRF guard (`assertSafeOutboundUrl`) is available for any fetch whose URL could derive from
  user/scraped input (blocks loopback, link-local metadata, private IPs; optional host allowlist).

## Transport / headers (storefront)
- `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Strict-Transport-Security` (HSTS preload), `Permissions-Policy`, and a **Content-Security-Policy
  (Report-Only)** that can be promoted to enforcing after reviewing reports.

## CI security gates
- `pnpm audit --audit-level=high` (surfaced in logs) and a **secret scan** that fails the build on
  obvious leaked private keys / live tokens in source.

## Pre-launch checklist
- [ ] `JWT_SECRET`, `COOKIE_SECRET`, `COCKPIT_KEY` set to strong random values (32+ bytes).
- [ ] `STORE_CORS` / `ADMIN_CORS` set to exact origins (no wildcards).
- [ ] All webhook secrets set (`STRIPE_WEBHOOK_SECRET`, `*_WEBHOOK_SECRET`).
- [ ] Tighten `RATE_LIMIT_MAX` for production traffic; add Redis-backed limiting if multi-instance.
- [ ] Review CSP-Report-Only output, then promote to enforcing `Content-Security-Policy`.
- [ ] `pnpm audit` shows no unresolved high/critical.

## Known limitations / future work
- Rate limiting is per-instance (in-memory) until a Redis limiter is wired.
- No MFA on the cockpit key (single strong secret); consider TOTP/WebAuthn for the founder surface.
- Structured audit logging of admin actions is partial (escalations are logged to the Ledger).

## Reporting
This is a private commercial platform. Report suspected vulnerabilities directly to the founder.
