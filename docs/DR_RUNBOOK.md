# Lumera — Disaster Recovery (DR) Runbook

How Lumera's data is backed up, how to restore it, and the targets we hold ourselves to.
Pair this with [`INCIDENT_RUNBOOK.md`](INCIDENT_RUNBOOK.md) (what to do when something is on fire)
and [`../SECURITY.md`](../SECURITY.md) (secret rotation + reporting).

> **Verify, don't assume.** The cadence and retention numbers below are our *intended*
> policy. Confirm the actual managed-Postgres backup cadence and retention with the
> provider (see "Managed Postgres" below) and record the confirmed values here.

---

## What we protect

| Data store | What it holds | Backed up by |
|---|---|---|
| **PostgreSQL** (pgvector) | Catalog, orders, customers, drops, SIGNAL events, MIND profiles, embeddings, Ledger | Managed provider backups **+** `pnpm backup` (`pg_dump`) |
| **Redis** | Event streams, bandit state, locks, caches | **Ephemeral by design** — reconstructable from Postgres + live events; not a backup target |
| **Object storage (S3/MinIO)** | Uploaded/generated media | Provider versioning/lifecycle (configure on the bucket) |
| **Secrets / env** | Credentials, API keys | Stored in the deploy platform's secret manager — **never** in git. See SECURITY.md rotation. |

Redis is treated as a cache/stream, not a system of record. If Redis is lost, bandit state
re-warms and streams resume; nothing of record is lost.

---

## Backup cadence (target)

| Layer | Mechanism | Cadence | Retention |
|---|---|---|---|
| Managed Postgres (Medusa Cloud / provider) | Provider automated backups + PITR | Continuous / daily (confirm) | Per provider (confirm; aim ≥ 7 days PITR, ≥ 30 days snapshots) |
| Application-level dump | `pnpm backup` → `lumera-<ts>.sql.gz` | Daily via scheduled runner; ad-hoc before risky migrations | ≥ 30 days off-host |
| Off-host copy | `aws s3 cp` of the dump to `BACKUP_S3_BUCKET` | Same as the dump | ≥ 30 days, lifecycle-expire after |

**Always take a fresh `pnpm backup` immediately before any schema migration or destructive
data operation.**

---

## `pnpm backup` (application-level dump)

```bash
# Local / runner with DB access:
DATABASE_URL=postgres://user:pass@host:5432/db pnpm backup
```

- Writes a gzip'd `pg_dump` to `BACKUP_DIR` (default `./backups`) named `lumera-<ISO-timestamp>.sql.gz`.
- **No-ops cleanly** (exit 0, prints guidance) if `DATABASE_URL` or `pg_dump` is missing — safe in CI / clean checkouts.
- Redacts credentials in its logs.
- **Off-host upload (opt-in):** set `BACKUP_S3_BUCKET` (and optional `BACKUP_S3_PREFIX`) and the
  script prints the exact `aws s3 cp` command. Wire that into the scheduled runner with credentials
  in the environment. (The script does not run the AWS CLI for you.)
- **Keep dumps out of git.** `BACKUP_DIR` (default `./backups`) should be gitignored or live
  outside the repo. A `.sql.gz` dump contains real data and must never be committed.

---

## Managed Postgres (Medusa Cloud / provider)

Medusa Cloud runs managed Postgres; the provider takes automated backups. **Action: confirm
with the provider** (and write the answers here):

- [ ] Backup mechanism (snapshots? PITR / WAL archiving?)
- [ ] Cadence and retention window
- [ ] How to trigger a restore / clone to a point in time
- [ ] Whether `vector` (pgvector) extension state is preserved in restores
- [ ] Cross-region copy availability

The `pnpm backup` dump is our **portable, provider-independent** copy — it does not replace
provider backups, it complements them (and lets us restore into any Postgres).

---

## Restore drill (run quarterly — do not wait for an incident)

Restore into a **scratch** database, never over production, until verified.

```bash
# 1. Pick a dump (local or pulled from S3).
ls -lt backups/                          # or: aws s3 ls s3://$BACKUP_S3_BUCKET/lumera/db/

# 2. Create a scratch DB.
createdb lumera_restore_test             # or provision a throwaway managed DB

# 3. Restore. The dump uses --clean --if-exists, so it's safe to load into a fresh DB.
gunzip -c backups/lumera-<timestamp>.sql.gz | psql "postgres://user:pass@host:5432/lumera_restore_test"

# 4. If recommendations/search are needed, ensure pgvector is enabled, then:
DATABASE_URL=postgres://.../lumera_restore_test npx tsx scripts/setup-embeddings.ts

# 5. Verify (verified, not assumed):
psql "$RESTORE_URL" -c "select count(*) from product;"        # catalog present
psql "$RESTORE_URL" -c "select count(*) from \"order\";"       # orders present
DATABASE_URL=$RESTORE_URL pnpm verify:api                      # operational pipeline (optional, heavier)
```

**Record each drill:** date, dump used, restore duration (→ informs RTO), row counts, pass/fail.

---

## RPO / RTO targets

| Target | Definition | Goal |
|---|---|---|
| **RPO** (Recovery Point Objective) | Max acceptable data loss | **≤ 24h** from `pnpm backup`; **near-zero** if provider PITR is enabled (confirm) |
| **RTO** (Recovery Time Objective) | Max acceptable downtime to restore service | **≤ 4h** for a full DB restore + reboot of services |

Drive RPO toward zero by enabling provider PITR; drive RTO down by rehearsing the restore
drill so the steps are muscle memory.

---

## After any restore

1. Re-point services at the restored DB; confirm migrations are current (`npx medusa db:migrate`).
2. Re-enable pgvector / re-run `setup-embeddings.ts` if recommendations/search are needed.
3. Redis re-warms on its own; force a cache flush if stale data is suspected.
4. **Rotate any secret that may have been exposed during the incident** (see SECURITY.md).
5. Run `pnpm verify:api` and smoke-test the storefront before declaring recovery complete.
