# Lumera — CONGREGATION (autonomous agent runtime) deployment unit.
# Runs the long-lived orchestrator: SIGNAL/approval event consumers, department crons,
# INTROSPECTION self-audit, the OPERATOR pipeline, and approval execution. Without this unit the
# autonomous runtime only ran via `pnpm dev` on a dev machine.
#
# Build from the REPO ROOT (needs the pnpm workspace + lockfile):
#   docker build -f apps/intelligence/Dockerfile -t lumera-intelligence .
#
# Correctness-first (replicates the verified `pnpm install/build/start` steps); harden/slim later.
FROM node:22-slim AS base
RUN corepack enable
WORKDIR /repo

# Manifests first so dependency install layers cache across source-only changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/intelligence/package.json apps/intelligence/
RUN pnpm install --frozen-lockfile --filter @alterxiv/shared... --filter intelligence...

# Source + build (shared is a workspace dependency and must be built first).
COPY packages/shared packages/shared
COPY apps/intelligence apps/intelligence
RUN pnpm --filter @alterxiv/shared build && pnpm --filter intelligence build

ENV NODE_ENV=production
# Override CMD with `pnpm --filter intelligence start:operator` to run the OPERATOR one-shot instead.
CMD ["pnpm", "--filter", "intelligence", "start"]
