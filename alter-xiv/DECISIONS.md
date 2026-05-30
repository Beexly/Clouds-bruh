# ALTER XIV — ENGINEERING DECISIONS

_One line per non-obvious autonomous decision. Logged in build order._

| # | Phase | Decision | Rationale |
|---|-------|----------|-----------|
| 1 | 0 | Native Postgres 16 + Redis instead of Docker | Docker daemon unavailable in container; apt-installed pgvector, started pg_ctlcluster and redis-server directly |
| 2 | 0 | `shamefully-hoist=true` in `.npmrc` | Medusa admin Vite bundler needs flat node_modules to resolve React / dashboard deps across pnpm isolation |
| 3 | 0 | React 18 override in pnpm | `@medusajs/dashboard` requires React 18; overridden workspace-wide to avoid duplicate React instances in Vite bundler |
| 4 | 0 | `moduleResolution: "NodeNext"` in backend tsconfig | Medusa v2 uses ESM subpath exports (`@medusajs/framework/utils`) that require NodeNext or bundler module resolution |
| 5 | 0 | Intelligence `build: "tsc"` (emit) vs `--noEmit` | Turbo requires actual output files to cache; `--noEmit` produced no outputs and logged a warning |
