# ALTER XIV — RUNBOOK

How to bring the system up and verify it from a clean checkout. Three explicit readiness
gates — don't conflate them.

## Prerequisites
- Node 20+, pnpm 9, PostgreSQL 16 with the `pgvector` extension, (optional) Redis 7.
- `docker compose up -d` brings up Postgres+pgvector and Redis locally (see `docker-compose.yml`).
- Copy `.env.example` → `.env`. The bootstrap **auto-creates a publishable key** if one is absent;
  it prints `PUBLISHABLE_KEY=...` and writes it to `/tmp/alterxiv-pk`.

## The one command
```bash
pnpm install --frozen-lockfile
pnpm verify:api
```
`verify:api` (scripts/verify-api.sh) is non-interactive and fail-fast. It:
1. ensures Postgres (and Redis if available — otherwise the backend uses in-memory defaults),
2. runs migrations (timeout-guarded; **never hangs on Redis** — the Redis modules load only when
   `REDIS_URL` is set),
3. seeds idempotently into the DB named in `DATABASE_URL`: catalog → commerce (region/shipping/
   sales-channel) → prices → inventory → **ORACLE embeddings** → membership tiers,
4. ensures + links a publishable API key and captures it,
5. builds + boots the backend, waits for `/health`,
6. runs the **21 API regressions** and reports PASS/FAIL.

Target a throwaway DB to prove the clean path:
```bash
DATABASE_URL=postgres://alterxiv:alterxiv@localhost:5432/alterxiv_verify pnpm verify:api
```

## Readiness gates (keep these separate)
- **Implementation green** — `pnpm build` (4 pkgs) · `pnpm test` (46 unit) · `pnpm lint`
  (real `tsc --noEmit` across all 4 packages) · `git diff --check`.
- **Operational green** — `pnpm verify:api` → 21/21 (migrate + seed + boot + API regression from clean).
- **Launch green** — human-only: Lighthouse on a deploy, live MinIO upload, Stripe live keys,
  tax/legal/domain, and founder approval for any publish/spend. Tracked in `CODEX_HANDOFF.md`.

## Individual commands
```bash
pnpm build            # all apps
pnpm test             # 46 unit tests (turbo)
pnpm test:unit        # vitest only
pnpm lint             # tsc --noEmit across packages
pnpm test:regression  # 21 API regressions (needs a backend on :9000)
```

## Notes
- Mocked-until-keyed surfaces (agents, Shepherd, imagery, scrapers) run in mock mode without API
  keys and flip to live when the keys in `.env` are set. None publish, spend, or move real money.
- Redis is optional for dev/verify; recommended in production for the event bus + workflow engine
  and the SIGNAL stream / bandit state.
