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
# Admin UI is built by default; pass --build-arg MEDUSA_ADMIN_DISABLED=true to skip it (API-only image).
ARG MEDUSA_ADMIN_DISABLED=false
ENV MEDUSA_ADMIN_DISABLED=$MEDUSA_ADMIN_DISABLED
RUN pnpm --filter @alterxiv/shared build && pnpm --filter backend build
# When admin is enabled, fail fast if its bundle is incomplete (e.g. restricted egress during
# `medusa build`) rather than crash-looping on `medusa start` at runtime — the bundle lands at
# .medusa/server/public/admin/index.html (verified). See MEDUSA_CLOUD_IMPORT_READINESS.md.
RUN if [ "$MEDUSA_ADMIN_DISABLED" != "true" ]; then \
      test -f apps/backend/.medusa/server/public/admin/index.html \
      || { echo "ERROR: admin bundle missing after medusa build (restricted egress?). Build with --build-arg MEDUSA_ADMIN_DISABLED=true for an API-only image."; exit 1; }; \
    fi

ENV NODE_ENV=production
EXPOSE 9000
WORKDIR /repo/apps/backend
# medusa start serves the built admin + store/api from .medusa/server.
CMD ["pnpm", "exec", "medusa", "start"]
