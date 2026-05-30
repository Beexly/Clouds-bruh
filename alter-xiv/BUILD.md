# BUILD.md — the runbook (get to a working product tonight)

Prereqs: Node 20+, pnpm, Docker, an `ANTHROPIC_API_KEY`. Copy `.env.example` → `.env` and fill it.

## 0. Infra
```bash
docker compose up -d            # Postgres(pgvector) on 5432, Redis on 6379
pnpm install                    # install workspace
```

## 1. Backend (Medusa v2 + custom modules)
```bash
cd apps/backend
# Initialize Medusa into this app if not present (follow Medusa v2 docs), keeping medusa-config.ts.
npx medusa db:migrate           # runs core + custom-module migrations (signal, personalization, recommendation, drops)
pnpm seed                       # seeds catalog from packages/data (Bright Data samples) — see scripts/seed.ts
pnpm dev                        # Medusa API + admin
```
Register custom modules in `medusa-config.ts` (already stubbed): `signal`, `personalization`, `recommendation`, `drops`.

## 2. Intelligence app (agents + learning + introspection)
```bash
cd apps/intelligence
pnpm dev                        # starts the orchestrator (cron + event consumers)
```
First agents to enable (content engine): **Curator → Artisan → Scribe**. Then Quartermaster, Shepherd, Herald, Sourcer, Treasurer, OracleKeeper. Turn on INTROSPECTION self-audits last.

## 3. Storefront (The Broadcast)
```bash
cd apps/storefront
pnpm dev                        # Next.js on :3000
```
Wire `lib/signal.ts` (fire events) and `lib/recommendations.ts` (ORACLE) into the home + product pages. Apply the brand with the frontend-design skill.

## 4. SEO (Scribe's toolkit)
Install the claude-seo plugin in Claude Code, then have Scribe run `/seo audit`, `/seo schema`, `/seo ecommerce`, `/seo geo` against the storefront.

## 5. Verify (non-negotiable)
```bash
pnpm test                       # Vitest unit/integration
# APIAuto: point at the Medusa/GraphQL API for regression before calling anything "done".
```

## Build order (from ARCHITECTURE §7)
1 infra → 2 data models (`packages/shared`) → 3 SIGNAL + MIND → 4 ORACLE (recs + bandit) →
5 storefront → 6 orchestrator + Curator/Artisan/Scribe → 7 rest of CONGREGATION + INTROSPECTION →
8 Learning Loop → 9 tests → 10 (optional) Solana Pay + token drops.

## Definition of done
Renders. Compiles. Tests pass. Self-audit clean. On-brand. Personalized. Only then is it done.
