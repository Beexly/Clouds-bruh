#!/usr/bin/env bash
###############################################################################
# Medusa Cloud predeploy hook — runs on EVERY deploy, after build, before the
# app starts (Medusa Cloud invokes the package.json "predeploy" script).
#
#   1) migrations            — FATAL: a bad/way-behind schema must block release.
#   2) store bootstrap       — idempotent, env-gated, NON-FATAL: seeds catalog /
#                              commerce / prices / inventory / tiers / publishable
#                              key so a fresh Cloud DB becomes a real store on its
#                              own. Safe to run every deploy (skips existing data).
#
# Turn the seed off without a code change:  set AUTO_BOOTSTRAP=false in the Cloud
# backend env (migrations still run). Embeddings for ORACLE rails / hybrid search
# are a separate optional step (needs the pgvector extension) — see docs/PROVISION.md.
###############################################################################
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/../apps/backend" && pwd)"

echo "[predeploy] ▸ migrations…"
npx medusa db:migrate
echo "[predeploy] ✓ migrations"

if [ "${AUTO_BOOTSTRAP:-true}" = "false" ]; then
  echo "[predeploy] AUTO_BOOTSTRAP=false — skipping store bootstrap (catalog/commerce/key)."
else
  echo "[predeploy] ▸ store bootstrap (idempotent)…"
  if npx medusa exec ../../scripts/bootstrap.ts; then
    echo "[predeploy] ✓ store bootstrap"
  else
    echo "[predeploy] ⚠ bootstrap failed (non-fatal) — deploy continues; store may be unseeded. Check logs."
  fi
fi
echo "[predeploy] done."
