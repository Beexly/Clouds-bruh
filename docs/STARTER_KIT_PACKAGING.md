# Lumera AI Commerce Starter Kit — Commercial Packaging Guide ($399)

> [!CAUTION]
> **MANDATORY PRE-COMMERCIALIZATION SECURITY CHECKLIST**
> Before publishing or selling this starter kit on Gumroad / LemonSqueezy:
> 1. **Rotate `COCKPIT_KEY`** (and `UNSUBSCRIBE_SECRET`, Medusa `JWT_SECRET` / `COOKIE_SECRET`, Stripe webhook secrets, and any Anthropic/OpenAI API keys) across all deployed environments.
> 2. **Set the GitHub repository (`Beexly/Clouds-bruh`) to PRIVATE** before launching paid distribution so the commercial codebase is not publicly cloneable for free.
> 3. **Verify zero secrets in the archive** by running `./scripts/package-starter-kit.sh` (which excludes `.env*`, `.git`, `node_modules`, `.next`, `dist`, and any local credential files) and inspecting the zip manifest before upload.

---

## Gumroad / LemonSqueezy Listing Copy ($399)

### Product Title
**Lumera AI Commerce Starter Kit — Medusa v2 + Next.js + Autonomous Intelligence Layer**

### Price
**$399** (One-time license · Full TypeScript monorepo source code)

### Subtitle / Hook
Ship a drop-culture luxury commerce platform with a built-in intelligence layer: real-time behavioral signals, pgvector personalization, autonomous agent departments, and a gated operator cockpit.

### Description (Copy-Paste Ready)

Stop stitching together brittle Shopify apps and toy AI wrappers. **Lumera AI Commerce Starter Kit** is a production-structured TypeScript monorepo built on **Medusa v2**, **Next.js**, **Postgres + pgvector**, **Redis**, and the **Anthropic SDK**.

#### What's Inside the Monorepo
- **Medusa v2 Commerce + Intelligence Modules (`apps/backend`):**
  - `signal` — Event taxonomy & behavioral tracking
  - `personalization` — Customer affinity & embedding profiles
  - `recommendation` — Vector-backed product recommendations
  - `drops` — Drop-culture release & scarcity workflows
  - **Operator Cockpit (`/cockpit`):** Gated by `COCKPIT_KEY` (`authorizeOps`, fail-closed in production) with human-in-the-loop approval queues.
- **Storefront ("The Broadcast", `apps/storefront`):**
  - Next.js storefront emitting typed `SIGNAL` events on every meaningful shopper interaction.
- **Autonomous Agent & Learning Layer (`apps/intelligence`):**
  - Least-privilege tool-use loop on `@anthropic-ai/sdk` with explicit human approval gates before any spend, publish, or delete action.
- **Shared Domain Types & Catalog Seed (`packages/shared`, `packages/data`, `scripts/seed.ts`):**
  - Strict TypeScript everywhere—zero `any` in domain code.

---

## Buyer Quick-Start Setup Guide

### Prerequisites
- Node.js 22+ & `pnpm`
- Docker (for Postgres + pgvector and Redis via `docker-compose.yml`)
- Anthropic API key (for `apps/intelligence`)

### 1. Unzip & Install Dependencies
```bash
unzip lumera-ai-commerce-starter-kit.zip -d lumera-starter-kit
cd lumera-starter-kit
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Fill in fresh, randomly generated secrets in `.env`:
- `COCKPIT_KEY` — Generate with `openssl rand -hex 32`
- `UNSUBSCRIBE_SECRET` — Generate with `openssl rand -hex 32`
- `DATABASE_URL` & `REDIS_URL` — Match `docker-compose.yml`
- `ANTHROPIC_API_KEY` — Your Anthropic API key

### 3. Start Infrastructure & Seed Database
```bash
docker compose up -d
pnpm --filter backend run db:migrate
pnpm run seed
```

### 4. Run Dev Servers & Tests
```bash
pnpm dev
pnpm test
```

---

## Packaging the Release Archive
Run from the repository root:
```bash
chmod +x scripts/package-starter-kit.sh
./scripts/package-starter-kit.sh
```
This outputs `dist/lumera-ai-commerce-starter-kit.zip` (or the path specified as `$1`) with `.env*`, `node_modules`, `.git`, `.next`, and `dist` strictly excluded.
