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

## Money convention (decided): integer cents end-to-end
Lumera stores **integer cents everywhere** (catalog/cart/shipping/email; `setup-prices.ts` seeds
`9900` = $99.00; the storefront divides by 100 for display). Convert to a decimal dollar string ONLY
at an external API boundary:
- **PayPal** (`formatPayPalAmount`) converts the incoming cents amount → `"99.00"` (÷100, 2 decimals).
- **Fulfillment** `calculatePrice` returns the carrier rate in **cents** (so the storefront's ÷100 renders correctly).

This removes the earlier dollars-vs-cents mismatch. One assumption remains to confirm with a single
non-charging check before going live: that Medusa hands the provider the stored **cents** amount (the
official Stripe provider treats its input as major units, so if your Medusa build passes major units
instead, flip the single ÷100 in `formatPayPalAmount`). **Do one PayPal sandbox capture** and confirm
the captured total equals the displayed price before `PAYPAL_ENV=live`. It's a one-line change, isolated
to the boundary helper.

## Secret rotation
All secrets come from env and are stored in the deploy platform's secret manager — never in git.
Rotate on a schedule and **immediately** on any suspected exposure (lost laptop, leaked log, a secret
that landed in a commit, contributor offboarding).

- **What to rotate:** `JWT_SECRET`, `COOKIE_SECRET`, `COCKPIT_KEY`, `ANTHROPIC_API_KEY`, payment
  keys (`STRIPE_*`, PayPal), every webhook secret (`STRIPE_WEBHOOK_SECRET`, `*_WEBHOOK_SECRET`),
  vendor/supplier API keys, `S3_*` storage credentials, and `DATABASE_URL` / `REDIS_URL` passwords.
- **Cadence:** rotate application secrets (`JWT_SECRET`, `COOKIE_SECRET`, `COCKPIT_KEY`) at least
  every 90 days; rotate provider keys per that provider's guidance; rotate **immediately** on exposure.
- **How (zero/low downtime):**
  1. Generate a strong value (32+ bytes random for app secrets): `openssl rand -base64 32`.
  2. Update it in the platform secret manager (not `.env` in git).
  3. Redeploy / restart the affected service so it picks up the new value.
  4. Where the provider supports overlap (e.g. a second valid API key, dual webhook secrets),
     add the new secret, cut traffic over, then revoke the old one — avoids a hard cutover gap.
  5. Verify: cockpit auth still works (`x-cockpit-key`), webhooks still verify, the app still boots
     (prod refuses to boot without `JWT_SECRET`/`COOKIE_SECRET`), then **revoke the old secret**.
- **`JWT_SECRET` caveat:** rotating it invalidates existing sessions/tokens — users re-authenticate.
  Schedule it for a low-traffic window unless rotating in response to a live exposure.
- **After a restore or incident:** rotate any secret that could have been exposed during the event
  (see the incident runbook).
- **If a secret was committed to git:** rotate it first (assume it's compromised the moment it's pushed),
  then purge it from history. CI's secret scan fails the build on obvious leaked keys/tokens, but
  rotation is the real remediation — scrubbing history is not enough.

## Incident response
For production incidents (Postgres/Redis down, Anthropic outage, orchestrator crash, vendor outage,
restore-from-backup), follow [`docs/INCIDENT_RUNBOOK.md`](docs/INCIDENT_RUNBOOK.md). For backups,
restore drills, and RPO/RTO targets, see [`docs/DR_RUNBOOK.md`](docs/DR_RUNBOOK.md). Any security
incident, suspected secret exposure, or data-loss risk escalates **directly to the founder**.

## Reporting
This is a private commercial platform. Report suspected vulnerabilities directly to the founder.
