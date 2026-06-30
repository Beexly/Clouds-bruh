# Lumera — commerce core (Medusa v2) deployment unit.
# Build from the REPO ROOT (needs the pnpm workspace + lockfile):
#   docker build -f apps/backend/Dockerfile -t lumera-backend .
#
# Correctness-first (replicates the verified `pnpm install` + `medusa build` + `medusa start`);
# harden/slim later. Run `pnpm --filter backend exec medusa db:migrate` once before first start.
FROM node:22-slim AS base
RUN corepack enable
# Medusa builds native deps (sharp, etc.) — provide the toolchain.
RUN apt-get update && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN pnpm install --frozen-lockfile --filter @alterxiv/shared... --filter backend...

COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @alterxiv/shared build && pnpm --filter backend build
# Fail fast if the admin bundle is incomplete (e.g. restricted egress during `medusa build`) rather
# than crash-looping on `medusa start` at runtime. See MEDUSA_CLOUD_IMPORT_READINESS.md. To skip the
# admin UI entirely, set MEDUSA_ADMIN_DISABLED=true and remove this check.
RUN test -f apps/backend/.medusa/server/public/admin/index.html \
  || (echo "ERROR: admin bundle missing after medusa build (restricted egress?). Set MEDUSA_ADMIN_DISABLED=true to skip admin." && exit 1)

ENV NODE_ENV=production
EXPOSE 9000
WORKDIR /repo/apps/backend
# medusa start serves the built admin + store/api from .medusa/server.
CMD ["pnpm", "exec", "medusa", "start"]
