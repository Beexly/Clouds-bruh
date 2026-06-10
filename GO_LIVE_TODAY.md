# GO LIVE TODAY — the founder's morning runbook

> One sitting, ~45 minutes of your hands. Everything else is already built, tested (308 unit + 23 API
> regressions), deployed code. Work top to bottom; don't skip the verify step. Your agents (local
> Claude/Codex) can drive 4–6 for you — the only parts that MUST be you are logins behind 2FA.

## 0 · What is already done (no action)
- Platform built + green; deploy branch fast-forwarded to the fixed build (`bb2806d`+).
- Domain **lumeralabel.com** purchased (Porkbun, privacy on, auto-renew on).
- Code canonicalized to lumeralabel.com; cockpit shows the full 15-worker Constellation,
  per-worker approval gates, and the Ignition panel; compliance/QC department (Warden) wired
  into the daily OPERATOR loop; legal pages carry real policy copy.

## 1 · Collect 4 keys (~10 min, the only true human-only step)
| Key | Where | Note |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys | **Set a monthly spend cap first** (Settings → Limits; $20–25 to start). |
| `STRIPE_API_KEY` = `sk_test_…` | dashboard.stripe.com → Developers → API keys | TEST mode key. Reuse your existing Stripe account. |
| `RESEND_API_KEY` | resend.com → API keys | Free tier is fine (100 emails/day). |
| `PORKBUN_API_KEY` + secret | porkbun.com → Account → API Access | Lets your agent do DNS for you. |

## 2 · Paste backend env (Medusa Cloud → backend service → env, ~5 min)
```
STORE_CORS=https://lumeralabel.com,https://www.lumeralabel.com
AUTH_CORS=https://lumeralabel.com
NOTIFICATION_EMAIL_FROM=no-reply@lumeralabel.com
COCKPIT_KEY=731b563aae28b8ee103f8eadf034942e9bd32d29c7769e2ea2f61d63d0cd895c
ANTHROPIC_API_KEY=sk-ant-PASTE
RESEND_API_KEY=re_PASTE
STRIPE_API_KEY=sk_test_PASTE
```
Mark the four keys **Sensitive**. Leave Build+Runtime ON. Do **not** touch `JWT_SECRET`,
`COOKIE_SECRET`, `ADMIN_CORS`; never set `DATABASE_URL`/`REDIS_URL` (Cloud injects them). Redeploy.

## 3 · Seed the live catalog (~5 min)
From the repo, with the Cloud DB URL from the Cloud console:
```
DATABASE_URL=<cloud-db-url> pnpm bootstrap
```
Idempotent. It prints `PUBLISHABLE_KEY=pk_…` + sales-channel + shipping-profile ids — copy them.
Then add to the **backend** env: `LUMERA_SALES_CHANNEL_ID`, `LUMERA_SHIPPING_PROFILE_ID`,
`MEDUSA_ADMIN_API_TOKEN`. Also change the admin password off `secret` (Cloud admin → settings).

## 4 · Storefront env (Medusa Cloud → storefront service, ~3 min)
```
NEXT_PUBLIC_SITE_URL=https://lumeralabel.com
NEXT_PUBLIC_MEDUSA_URL=<backend url, e.g. https://gegege.medusajs.app>
MEDUSA_BACKEND_URL=<same backend url>
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<pk_… from step 3>
COCKPIT_KEY=731b563aae28b8ee103f8eadf034942e9bd32d29c7769e2ea2f61d63d0cd895c
```
`NEXT_PUBLIC_*` are public by design: Sensitive OFF, Build ON. Redeploy.

## 5 · Domain (~10 min + DNS propagation)
1. Cloud → storefront → Settings → Domains → add `lumeralabel.com` + `www.lumeralabel.com`;
   copy the DNS targets it shows (source of truth — don't guess).
2. Porkbun (or hand your agent the API keys): **turn OFF URL Forwarding**, delete parking
   records, add Cloud's records (ALIAS at root, CNAME for www). TLS auto-issues.
3. Propagation can take minutes→hours; poll, don't panic: `dig +short lumeralabel.com`.

## 6 · Stripe webhook (~5 min)
Stripe dashboard → Developers → Webhooks → Add endpoint → point at the backend's Medusa Stripe
hook URL (your agent can confirm the exact v2 path from the Medusa docs MCP) → copy the signing
secret → backend env `STRIPE_WEBHOOK_SECRET=whsec_…` → redeploy.

## 7 · Verify (the gate — all must pass before you tell a soul)
- [ ] Backend deploy green (no `FATAL: … must be set` in the build log)
- [ ] `https://lumeralabel.com` loads with valid TLS; products render
- [ ] View-source: canonical/OG say lumeralabel.com
- [ ] `/cockpit` (with your key): Ignition shows Anthropic LIVE; workers leave "idle"
- [ ] Test purchase with card `4242 4242 4242 4242` → order appears; confirmation email arrives
- [ ] `DATABASE_URL=<cloud-db-url> pnpm preflight` → READY

## 8 · Founder gates (your judgment, not code)
- Approve the first ~20 products on `/cockpit` (Warden screens them at 01:00; Curator drafts daily 06:00).
- Stripe **test → live** only after the §7 test purchase passes. Then a real $1 self-purchase.
- Vendor live submission stays OFF until a supplier relationship is real
  (`VENDOR_LIVE_MODE` + `AUTO_SUBMIT_VENDOR_ORDERS` stay false).

## Money truth (read once, believe it)
- Fixed burn from here ≈ Medusa Cloud plan + domain ($11/yr, paid) + Anthropic usage (capped by
  you, ~$20–25/mo to start). Stripe/Resend/vendor accounts are $0 until volume. Keep total under
  ~$75/mo until revenue covers it.
- A store going live ≠ revenue. First sales come from traffic you earn (content, social, the
  Herald's drafted campaigns) — typically weeks, not hours. Don't spend on ads before the first
  organic proof. The machine's job is to make every visitor count; yours is to send it visitors.
