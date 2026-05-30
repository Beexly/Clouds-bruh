# ALTER XIV — CODEX HANDOFF

_Only genuine blockers — things Claude Code cannot resolve without Garrett. Not tasks that could be solved._

## Needs Garrett (human-only inputs)

### Required to run at full intelligence
- **ANTHROPIC_API_KEY** — required for agent runtime (CONGREGATION, INTROSPECTION, Learning Loop, db-gpt Claude Haiku fallback). Mock adapters used until provided.

### Optional / enhancements
- **HIGGSFIELD_API_KEY** — required for Artisan AI imagery generation. Mock adapter used until provided.
- **STRIPE_API_KEY** — optional. `pp_system_default` test-mode payments work without it. Stripe is wired in `medusa-config.ts` and activates automatically when key is present.
- **OXYLABS_USER / OXYLABS_PASS** — required for Curator's live price-scraping from Shein/Amazon. Mock dataset used until provided.

### Deployment (Garrett to action)
- **Deploy backend** to a host (Render, Railway, Fly.io, self-hosted). `docker-compose.yml` provides postgres+pgvector+redis for local/staging. Backend `Dockerfile` needs to be written for production.
- **Deploy storefront** (Next.js) to Vercel or equivalent. Set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` in Vercel env.
- **Deploy intelligence** (CONGREGATION) as a long-running Node process. Ensure `REDIS_URL` and `DATABASE_URL` point to production.
- **Run migrations + seed** on first deploy: `medusa db:migrate` then `pnpm seed`.
- **DNS / domain**: point `alterxiv.com` to storefront deployment.
- **Publishable API key**: after first deploy, create API key in Medusa Admin and set `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` in storefront env.

### Money / publishing (require explicit approval)
- **Go live / publish**: no content, drop, or payment processing should be made public until Garrett approves.
- **Real Stripe keys**: switch from `pp_system_default` to Stripe live keys only with Garrett's explicit approval.
- **First real drop**: creation and launch of live drops require Garrett's sign-off.
