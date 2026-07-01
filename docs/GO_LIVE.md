# Lumera — Go Live (shortest path)

Two tracks. Track A puts a **shareable live URL** in your hands in ~2 minutes at **$0**. Track B turns
it into a **real store that takes money**. Everything the code can do is already done — these are the
steps only you can do (they need *your* accounts).

---

## Track A — Live demo URL (2 min, $0, no backend)

The storefront ships a **demo mode** (a static luxury catalog with real product imagery) that turns
on automatically when no backend is configured. Perfect for showing employers / customers / investors.

1. Go to **vercel.com** → sign in with GitHub.
2. **Add New… → Project** → import the repo **`Beexly/Clouds-bruh`** (or your fork).
3. Leave everything default and click **Deploy**. (`vercel.json` already sets the monorepo build; no
   environment variables are needed — it auto-enters demo mode.)
4. ~2 minutes later you have a live URL like `https://clouds-bruh.vercel.app`. Share it.

That's it. Checkout is intentionally inert in demo mode (real payments come in Track B).

---

## Track B — Real store that takes money (free tier)

You need 4 free accounts. Copy the values they give you into Vercel + your backend host.

### 1. Database — Neon (free, has pgvector)
- neon.tech → new project → copy the **connection string** → this is `DATABASE_URL`.

### 2. Redis — Upstash (free)
- upstash.com → create a Redis database → copy the **Redis URL** → this is `REDIS_URL`.

### 3. Backend — Render (free web service) or Railway
- New **Web Service** from the repo, **Docker**, Dockerfile path `apps/backend/Dockerfile`,
  build context = repo root, build arg `MEDUSA_ADMIN_DISABLED=true` (smaller image).
- Set env: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET` (any long random strings),
  `STORE_CORS=https://<your-vercel-domain>`, `ADMIN_CORS`/`AUTH_CORS` similarly, `NODE_ENV=production`.
- First boot, run once (Render "Shell" or a one-off job):
  `pnpm --filter backend exec medusa db:migrate && pnpm bootstrap && pnpm setup:embeddings`
  — the last line prints `PUBLISHABLE_KEY=pk_…`. Copy it.
- Your backend URL is e.g. `https://lumera-backend.onrender.com`.

### 4. Storefront — point Vercel at the backend
In the Vercel project → Settings → Environment Variables, add:
- `NEXT_PUBLIC_MEDUSA_URL` = your backend URL
- `MEDUSA_BACKEND_URL` = same backend URL
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` = the `pk_…` from step 3
- `NEXT_PUBLIC_DEMO_MODE` = `0`   ← turns demo mode OFF, uses the real catalog
Redeploy. The store now serves the real backend.

### 5. Payments — Stripe (test first, then live)
- Add to the **backend** env: `STRIPE_API_KEY` (start with the `sk_test_…` key), `STRIPE_WEBHOOK_SECRET`.
- Add a Stripe webhook → `https://<backend>/hooks/stripe`.
- Do a test checkout end-to-end. When it works, swap in the `sk_live_…` key (needs a Stripe account
  with your bank details) and you are taking real money.

### Go / no-go check
Run against the live DB: `pnpm launch:preflight --live` — it prints exactly what (if anything) is
still missing.

---

## Product imagery
The demo images live in `apps/storefront/public/demo/` (generated via Higgsfield). For real products,
use the Artisan agent or generate more via Higgsfield and attach them during curation
(`/lumera-curate` → `/cockpit` → `/lumera-publish-approved`).

## Honest notes
- Dropshipping needs real supplier accounts (Printify/Printful/CJ) + their API tokens before any
  live order is placed; every live-mode flag defaults **off**. See `docs/LUMERA_OWNER_ACTIONS.md`.
- Free tiers sleep when idle (first request is slow). Fine for validation; upgrade when you have traffic.
