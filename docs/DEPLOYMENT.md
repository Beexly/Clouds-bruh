# Lumera — Deployment

Three long-lived services + two datastores. All five are defined in `docker-compose.yml`.

| Service | What it is | Build | Prod start | Port |
|---|---|---|---|---|
| `backend` | Medusa v2 commerce core + custom modules + admin | `pnpm --filter backend build` (`medusa build`) | `pnpm --filter backend start` (`medusa start`) | 9000 |
| `storefront` | Next.js "The Broadcast" | `pnpm --filter storefront build` | `pnpm --filter storefront start` | 3000 |
| `intelligence` | CONGREGATION — autonomous agent runtime (event consumers, crons, INTROSPECTION, OPERATOR, approval execution) | `pnpm --filter intelligence build` | `pnpm --filter intelligence start` | — |
| `postgres` | Postgres 16 + **pgvector** (recs/search embeddings) | — | — | 5432 |
| `redis` | event bus (SIGNAL + approval streams), bandit state, rate limiting | — | — | 6379 |

> Before this change the `intelligence` runtime had **no production entrypoint** — it only ran via
> `pnpm dev`. It now has real `start` (orchestrator) and `start:operator` (one-shot OPERATOR) scripts
> and a Dockerfile, so the autonomous layer actually runs in a deploy.

## First boot (once)

```bash
# 1. migrate the schema (creates Medusa tables + the pgvector product_embedding table)
pnpm --filter backend exec medusa db:migrate
# 2. seed catalog + membership tiers (idempotent)
pnpm --filter backend seed
# 3. embeddings for recommendations (idempotent; safe to re-run)
pnpm setup:embeddings
```

## Run the whole stack with Docker Compose

```bash
docker compose up --build
# one-time, after backend is healthy:
docker compose run --rm backend pnpm exec medusa db:migrate
docker compose run --rm backend pnpm --filter backend seed
```

The Dockerfiles (`apps/*/Dockerfile`) are **correctness-first** — they replicate the verified
`pnpm install → build → start` steps rather than a slimmed multi-stage image. They are not yet
validated by a `docker build` in CI; run one in your target environment and slim/harden as needed
(distroless runtime, prune dev deps, Next standalone output).

## Environment

`.env.example` (repo root) is the source of truth for every variable. The launch-blocking,
human-only ones (real DB/Redis, secrets, publishable key, vendor + Stripe/PayPal credentials, and
the founder approval flags) are tracked in `docs/LUMERA_OWNER_ACTIONS.md`. All live-mode flags
(`VENDOR_LIVE_MODE`, `AUTO_SUBMIT_VENDOR_ORDERS`, `CHANNEL_LIVE_MODE`) default OFF and must be
explicitly enabled.

## Launch gates

Run `pnpm launch:preflight` — it chains the proof layers (test → build → preflight →
vendor:preflight → launch:proof). See `docs/LUMERA_LAUNCH_GATE_CHECKLIST.md`. Keep code health,
commerce env, and vendor readiness reported as **separate** proof layers; do not blend them.
