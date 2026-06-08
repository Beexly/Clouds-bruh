#!/usr/bin/env bash
###############################################################################
# Alter XIV — verify:api
# One reproducible command: ensure infra → migrate → seed → boot → run the 21
# API regressions → tear down. Non-interactive, fail-fast, logs to stdout.
#
#   pnpm verify:api            (from repo root: alter-xiv/)
#
# Requires Postgres (5432) + optionally Redis (6379). If Redis is absent the
# backend uses in-memory defaults (migrations never hang waiting on Redis).
###############################################################################
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="${DATABASE_URL:-postgres://alterxiv:alterxiv@localhost:5432/alterxiv}"
export PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-pk_3597340b67d6e63689846700f8264afde0105aed898356d6d630df566afd3050}"

# Ephemeral secrets so `medusa start` (which boots in production mode) clears the launch-safety guard
# in medusa-config.ts (refuses prod boot without these). Throwaway values for the verify run ONLY —
# never real credentials. Booting in production mode makes verify:api a faithful proxy for the deploy.
export JWT_SECRET="${JWT_SECRET:-verify_ephemeral_jwt_not_for_prod}"
export COOKIE_SECRET="${COOKIE_SECRET:-verify_ephemeral_cookie_not_for_prod}"
export STORE_CORS="${STORE_CORS:-http://localhost:9000,http://localhost:3000}"
export ADMIN_CORS="${ADMIN_CORS:-http://localhost:9000,http://localhost:3000}"
export AUTH_CORS="${AUTH_CORS:-http://localhost:9000,http://localhost:3000}"

PORT="${PORT:-9000}"
LOG="/tmp/alterxiv-verify-backend.log"
BACKEND_PID=""

say()  { printf '\n\033[1;33m▸ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$*"; cleanup; exit 1; }

cleanup() {
  if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

port_up() { (exec 3<>"/dev/tcp/localhost/$1") 2>/dev/null && return 0 || return 1; }

# ── 1. Infra ────────────────────────────────────────────────────────────────
say "Checking infrastructure"
if port_up 5432; then ok "Postgres up on 5432"; else
  service postgresql start >/dev/null 2>&1 || true
  sleep 3
  port_up 5432 || die "Postgres is not reachable on 5432 — start it (docker compose up postgres) and retry."
  ok "Postgres started"
fi
if port_up 6379; then
  export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
  ok "Redis up on 6379 (full event-bus + workflow-engine)"
else
  redis-server --daemonize yes --save '' >/dev/null 2>&1 || true
  sleep 2
  if port_up 6379; then export REDIS_URL="redis://localhost:6379"; ok "Redis started";
  else unset REDIS_URL || true; ok "No Redis — backend will use in-memory defaults (still valid)"; fi
fi

# ── 1b. Build the shared workspace package ───────────────────────────────────
# The backend's modules/config import @alterxiv/shared from its built dist (main:
# dist/index.js). Medusa's loader resolves it from node_modules and does NOT transpile
# workspace deps, so without this build every migrate/seed/boot crashes at config load.
say "Building @alterxiv/shared"
( cd "$ROOT" && pnpm --filter @alterxiv/shared build ) >/tmp/alterxiv-verify-shared.log 2>&1 \
  && ok "@alterxiv/shared built" \
  || { tail -50 /tmp/alterxiv-verify-shared.log; die "@alterxiv/shared build failed — see log above"; }

cd "$ROOT/apps/backend"

# ── 2. Migrate (timeout so it can never hang the run) ────────────────────────
say "Running migrations"
timeout 180 npx medusa db:migrate >/tmp/alterxiv-verify-migrate.log 2>&1 \
  && ok "Migrations complete" \
  || { tail -80 /tmp/alterxiv-verify-migrate.log; die "Migrations failed/timed out — see log above"; }

# ── 3. Seed (idempotent chain) ───────────────────────────────────────────────
say "Seeding (idempotent — skips when data already present)"
# Parse the target DB name from DATABASE_URL so the idempotency check hits the SAME database
# the backend will boot against (not a hardcoded one).
DBNAME="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*/([^/?]+).*#\1#')"
PRODUCTS=$(PGPASSWORD=alterxiv psql -U alterxiv -h localhost -d "$DBNAME" -tAc "SELECT count(*) FROM product WHERE deleted_at IS NULL;" 2>/dev/null || echo 0)
if [ "${PRODUCTS:-0}" -lt 1 ]; then
  timeout 300 npx medusa exec ../../scripts/seed.ts            || die "catalog seed failed"
  timeout 180 npx medusa exec ../../scripts/setup-commerce.ts  || die "commerce setup failed"
  timeout 180 npx medusa exec ../../scripts/setup-prices.ts    || die "price setup failed"
  timeout 180 npx medusa exec ../../scripts/setup-inventory.ts || die "inventory setup failed"
  ( cd "$ROOT" && DATABASE_URL="$DATABASE_URL" timeout 120 npx tsx scripts/setup-embeddings.ts ) || die "embedding setup failed"
  ok "Catalog + commerce + ORACLE embeddings seeded into '$DBNAME'"
else
  ok "Catalog already present in '$DBNAME' ($PRODUCTS products) — skipping catalog seed"
  ( cd "$ROOT" && DATABASE_URL="$DATABASE_URL" timeout 120 npx tsx scripts/setup-embeddings.ts ) >/dev/null 2>&1 || true
fi
timeout 120 npx medusa exec ../../scripts/seed-monetization.ts || die "monetization seed failed"
ok "Membership tiers seeded"

# Ensure a publishable key exists + is linked to the sales channel(s); capture it so the
# regression authenticates against THIS database (a fresh DB has no pre-existing key).
say "Ensuring publishable API key"
PK_OUT="$(timeout 120 npx medusa exec ../../scripts/ensure-publishable-key.ts 2>/dev/null || true)"
CAPTURED_PK="$(printf '%s\n' "$PK_OUT" | sed -nE 's/^PUBLISHABLE_KEY=(pk_[A-Za-z0-9]+).*/\1/p' | tail -1)"
if [ -n "$CAPTURED_PK" ]; then PUBLISHABLE_KEY="$CAPTURED_PK"; ok "Publishable key ready (${PUBLISHABLE_KEY:0:12}…)"; else ok "Using provided PUBLISHABLE_KEY"; fi

# ── 4. Build + boot backend ──────────────────────────────────────────────────
say "Building backend"
# Reuse only a COMPLETE build for the current mode. With the admin enabled the server needs
# .medusa/server/public/admin/index.html; a partial build (e.g. an asset fetch failed) must rebuild,
# not boot into a "Could not find index.html" crash. Admin-disabled boots need only the server bundle.
if [ "${MEDUSA_ADMIN_DISABLED:-}" = "true" ]; then
  _build_ok() { [ -d ".medusa/server" ]; }
else
  _build_ok() { [ -f ".medusa/server/public/admin/index.html" ]; }
fi
if _build_ok; then ok "Build present (reusing)"; else npx medusa build >/dev/null 2>&1; _build_ok && ok "Build complete" || die "build failed/incomplete"; fi

say "Booting backend on :$PORT"
# Medusa cold boot on a clean CI runner (module graph load + workflow engine) can exceed 60s,
# so allow more headroom; surface the boot log on failure and bail immediately if the process dies.
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
if port_up "$PORT"; then ok "Backend already running on :$PORT"; else
  ( npx medusa start >"$LOG" 2>&1 ) & BACKEND_PID=$!
  for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then ok "Backend healthy after ${i}s"; break; fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      printf '\n----- backend exited during boot; last 100 lines of %s -----\n' "$LOG"; tail -100 "$LOG" || true
      die "Backend process exited during boot — see log above"
    fi
    sleep 1
    if [ "$i" -eq "$HEALTH_TIMEOUT" ]; then
      printf '\n----- backend not healthy in %ss; last 100 lines of %s -----\n' "$HEALTH_TIMEOUT" "$LOG"; tail -100 "$LOG" || true
      die "Backend did not become healthy in ${HEALTH_TIMEOUT}s — see log above"
    fi
  done
fi

# ── 5. API regression ────────────────────────────────────────────────────────
say "Running the 23 API regressions"
cd "$ROOT"
if MEDUSA_BACKEND_URL="http://localhost:$PORT" PUBLISHABLE_KEY="$PUBLISHABLE_KEY" npx tsx scripts/api-regression.ts; then
  ok "API regression GREEN"
  echo; ok "verify:api PASSED — infra → migrate → seed → boot → 23 regressions all green."
else
  die "API regression failed"
fi
