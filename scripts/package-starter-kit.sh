#!/usr/bin/env bash
set -euo pipefail

# Packages a clean, secret-free lumera-ai-commerce-starter-kit.zip
# Excludes .env*, node_modules, .git, .next, dist, and any local key/cert files.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUT_ZIP="${1:-${REPO_ROOT}/lumera-ai-commerce-starter-kit.zip}"

# Ensure output directory exists and remove stale archive
mkdir -p "$(dirname "${OUT_ZIP}")"
rm -f "${OUT_ZIP}"

cd "${REPO_ROOT}"

# Use zip with strict exclusions; .env.example is kept, .env and .env.* are excluded
zip -r "${OUT_ZIP}" . \
  -x "*.git/*" \
  -x ".git/*" \
  -x "*node_modules/*" \
  -x "node_modules/*" \
  -x "*.next/*" \
  -x ".next/*" \
  -x "*dist/*" \
  -x "dist/*" \
  -x ".env" \
  -x ".env.local" \
  -x ".env.production" \
  -x ".env.development" \
  -x ".env.staging" \
  -x ".env.test" \
  -x "*/.env" \
  -x "*/.env.*" \
  -x "*.pem" \
  -x "*.key" \
  -x "*.sqlite" \
  -x "*.db" \
  -x "lumera-ai-commerce-starter-kit.zip"

# Verify no .env (other than .env.example) or node_modules/.git/.next/dist leaked into the zip
LEAKS="$(zipinfo -1 "${OUT_ZIP}" | grep -E '(^|/)(\.env($|\.(?!example))|node_modules/|\.git/|\.next/|dist/)' || true)"
if [[ -n "${LEAKS}" ]]; then
  echo "ERROR: Forbidden files detected in ${OUT_ZIP}:" >&2
  echo "${LEAKS}" >&2
  rm -f "${OUT_ZIP}"
  exit 1
fi

echo "OK: Clean starter kit archive written to ${OUT_ZIP}"
ls -lh "${OUT_ZIP}"
