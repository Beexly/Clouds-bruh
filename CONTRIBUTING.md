# Contributing to Lumera

Lumera is a pnpm + Turborepo monorepo: Medusa v2 backend, a Next.js storefront ("The
Broadcast"), an autonomous agent runtime, and shared types. Read
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) first — it is the source of truth — and
[`CLAUDE.md`](CLAUDE.md) for working conventions.

## Repo shape

- `apps/backend` — Medusa v2 + custom modules (`signal`, `personalization`, `recommendation`, `drops`).
- `apps/storefront` — Next.js "The Broadcast".
- `apps/intelligence` — the autonomous agent runtime + Learning Loop + INTROSPECTION.
- `packages/shared` — types + the SIGNAL event taxonomy (the contract between apps).
- `packages/data` — sample datasets for seeding/benchmarks.
- `scripts/` — operational scripts (seed, bootstrap, preflight, backup, verify).

## Prerequisites

- Node 20+ and **pnpm 9** (the repo pins `packageManager: pnpm@9`).
- Docker (for local Postgres + Redis).
- An `ANTHROPIC_API_KEY` for the intelligence runtime (agents run in mock mode without one).

## Setup

```bash
# 1. Infra — Postgres (pgvector) on :5432, Redis on :6379
docker compose up -d

# 2. Install the workspace
pnpm install --frozen-lockfile

# 3. Configure env
cp .env.example .env        # then fill in the values you need

# 4. Bootstrap the store (idempotent; catalog → commerce → prices → inventory → keys)
pnpm bootstrap
```

See [`BUILD.md`](BUILD.md) for the full runbook (backend migrations, storefront, intelligence app).

## The verify flow (non-negotiable)

**Verified, not assumed.** Nothing is "done" until it renders / compiles / passes. Before
opening a PR, run:

```bash
pnpm lint        # tsc --noEmit across the workspace (typecheck)
pnpm test        # Vitest unit/integration
pnpm build       # turbo build
```

When you touch the backend or any API, also run the operational pipeline:

```bash
pnpm verify:api  # migrate · seed · pgvector · boot · API regression
```

CI runs the same gates (`.github/workflows/ci.yml`) plus a dependency audit and a secret
scan. A PR should be green locally before it is green in CI.

## Database backups

`pnpm backup` runs a `pg_dump` of `DATABASE_URL` to a timestamped `.sql.gz` (default
`./backups`). It no-ops with guidance when `pg_dump` or `DATABASE_URL` is absent. See
[`docs/DR_RUNBOOK.md`](docs/DR_RUNBOOK.md) and [`docs/INCIDENT_RUNBOOK.md`](docs/INCIDENT_RUNBOOK.md).

## Branch & commit conventions

- **Branch off** the active integration branch; never commit directly to it.
- **Branch names:** `type/short-slug` — e.g. `feat/oracle-bandit`, `fix/signal-dedupe`,
  `docs/dr-runbook`, `chore/deps`.
- **Commits:** Conventional Commits — `type(scope): summary` — e.g.
  `feat(recommendation): add graph_rec strategy`. Keep them small and focused.
- **PRs:** fill in `.github/pull_request_template.md` completely (summary, verification,
  gates respected, screenshots for UI). Do not check a verification box you did not run.

## Gating non-negotiables (from `CLAUDE.md` — do not violate)

- **No autonomous money movement, publishing, or destructive action** by any agent without
  the founder's explicit approval. Approvals are wired as an escalation gate; keep them.
- Live supplier order submission stays **off** unless `VENDOR_LIVE_MODE=true` **and**
  `AUTO_SUBMIT_VENDOR_ORDERS=true`.
- **Least-privilege agents** — tools get the minimum scope they need.
- **Brand integrity** — dark luminous editorial luxury. Off-brand assets don't ship.
- **No committed secrets** — everything goes through `.env`; `.env.example` holds placeholders.
- **Personalization is first-class** — if a feature can be personalized, it is; every
  storefront interaction emits a SIGNAL event.

## Honest docs

Keep documentation matched to reality. Do not describe a tool/integration as "wired" or
"live" when it is a stub or unconfigured — say so explicitly. Overclaiming is a bug.
