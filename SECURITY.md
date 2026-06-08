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
- `assertSafeOutboundUrl` is hostname/literal-CIDR based (blocks loopback, link-local metadata,
  private ranges) — it does not resolve DNS, so a public hostname that resolves to a private IP
  (DNS-rebinding) isn't caught. It's a first line for user/scraped URLs; vendor/channel/payment
  fetches target fixed provider hosts. Resolve-and-check before wiring it to user-supplied URLs.

## ⚠️ Pre-launch money-unit verification (do before any live payment/carrier flag)
Medusa v2 hands payment providers amounts in **major units** (the official Stripe provider ×100s to
cents at its boundary). This repo's catalog/storefront use a **"prices as integer cents"** convention
(`scripts/setup-prices.ts` seeds `9900` = $99; the storefront divides by 100 for display). These two
conventions must be reconciled, or a real provider could charge **100×**. This is **pre-existing**
(it equally affects the already-configured Stripe provider) and is invisible in test mode because
`pp_system_default` never captures. **Must-do:** run ONE PayPal **sandbox** capture and ONE live
carrier quote and confirm the charged/quoted amount equals the displayed price before flipping
`PAYPAL_ENV=live` or setting `EASYPOST_API_KEY`/`SHIPPO_API_KEY` in production. Adjust the seed
convention or the provider boundary (`formatPayPalAmount`, fulfillment `calculated_amount`) once the
sandbox result is known — do not guess.

## Reporting
This is a private commercial platform. Report suspected vulnerabilities directly to the founder.
