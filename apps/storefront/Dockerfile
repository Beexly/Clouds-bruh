# Lumera — storefront ("The Broadcast") deployment unit.
# Build from the REPO ROOT (needs the pnpm workspace + lockfile):
#   docker build -f apps/storefront/Dockerfile -t lumera-storefront .
#
# NEXT_PUBLIC_* values are inlined at BUILD time — pass them as build args / env for the target
# environment (a build baked with localhost will point the browser at localhost). Fonts are
# self-hosted (next/font/local), so the build needs no outbound Google Fonts access.
# Correctness-first (replicates the verified `pnpm install` + `next build` + `next start`).
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/storefront/package.json apps/storefront/
RUN pnpm install --frozen-lockfile --filter @lumera/shared... --filter storefront...

COPY packages/shared packages/shared
COPY apps/storefront apps/storefront
ARG NEXT_PUBLIC_MEDUSA_URL
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
RUN pnpm --filter @lumera/shared build && pnpm --filter storefront build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "storefront", "start"]
