# Lumera — Incident Runbook

Playbooks for when something is broken in production. Goal: diagnose fast, restore service,
then write down what happened. Pair with [`DR_RUNBOOK.md`](DR_RUNBOOK.md) (backups/restore)
and [`RUNBOOK.md`](../RUNBOOK.md) (bring-up + readiness gates).

> **Verified, not assumed.** Confirm a hypothesis with a signal (a log line, a healthcheck,
> a metric) before acting. Note the timestamp of every action so the timeline is reconstructable.

---

## 0. First five minutes (any incident)

1. **Confirm scope.** Storefront down, backend down, or one subsystem? Hit the healthchecks:
   - Backend `/health`, storefront homepage, payment provider status page.
2. **Declare.** Note start time. If customers are affected, treat it as SEV-1.
3. **Look at the signals (where to look):**
   - **Sentry** — application errors/traces. DSN via `SENTRY_DSN` (backend) / `NEXT_PUBLIC_SENTRY_DSN` (storefront).
     *(If Sentry is not yet configured, errors live in the platform/runtime logs only — wire the DSN to get alerting.)*
   - **Platform logs** — Medusa Cloud / host runtime logs for the backend and storefront.
   - **Datastores** — Postgres and Redis reachability (commands below).
4. **Stabilize before perfecting.** Restore service first (restart, roll back, failover); root-cause after.
5. **Respect the gates even under pressure.** No autonomous money movement / publishing /
   destructive action without founder approval — incidents do not waive the escalation gate.

**Escalation:** notify the founder (Garrett) for any SEV-1, any data-loss risk, any action that
moves money or touches production data destructively, or any restore-from-backup. This is a
private commercial platform — escalate directly to the founder.

---

## 1. PostgreSQL down / unreachable

**Symptoms:** backend 5xx, `/health` failing, `ECONNREFUSED 5432`, `pg_isready` failing.

**Diagnose**
```bash
pg_isready -d "$DATABASE_URL"
psql "$DATABASE_URL" -c "select 1;"     # auth/connectivity
```
**Act**
- Managed (Medusa Cloud): check provider status/console; the DB may be restarting/failing over. Wait out a transient failover.
- Connection-pool exhaustion? Look for "too many clients". Restart the backend to release leaked connections; tune pool size.
- Disk full? Check provider metrics; expand storage; clear bloat.
- If the data is corrupt/lost → **restore from backup** (see DR_RUNBOOK, and §6 below).

**Recover:** once reachable, confirm migrations current (`npx medusa db:migrate`), then `pnpm verify:api`.

---

## 2. Redis down / unreachable

**Symptoms:** event streams stalled, bandit not updating, slow routes, `ECONNREFUSED 6379`.

**Key fact:** Redis is a **cache/stream, not a system of record** (see DR_RUNBOOK). Backend
modules that need Redis load **only when `REDIS_URL` is set** — so the API stays up without it,
using in-memory defaults; some intelligence features degrade.

**Diagnose**
```bash
redis-cli -u "$REDIS_URL" ping          # expect PONG
```
**Act**
- Restart Redis / check the managed instance.
- If unrecoverable quickly, the system continues to serve commerce; bandit state re-warms and
  streams resume once Redis is back. No restore needed (nothing of record is in Redis).
- Multi-instance rate limiting is per-instance without Redis — see SECURITY.md.

---

## 3. Anthropic API outage / degraded

**Symptoms:** agent runs failing/timing out, Shepherd conversational replies erroring, copy/audit jobs stuck.

**Key fact:** the agent runtime **degrades gracefully**. With no/invalid `ANTHROPIC_API_KEY`,
`run-agent.ts` runs in **mock mode** (records a run, skips Claude) instead of crashing.
Outbound Anthropic calls use abort **timeouts** so a slow upstream can't hang a route.

**Diagnose:** check Anthropic status; check Sentry/logs for 429/5xx/timeout from `api.anthropic.com`.

**Act**
- Transient/rate-limited: back off and retry; agent runs are not on the customer checkout path, so
  pause/queue non-urgent agent work rather than hammering.
- Sustained outage: customer-facing commerce (browse → cart → checkout) is unaffected. Conversational
  support (Shepherd) degrades — fall back to static FAQ / human reply. Do **not** disable the
  escalation gate to "work around" it.
- Verify `ANTHROPIC_API_KEY` validity if errors are auth (401), not provider-side.

---

## 4. Orchestrator / intelligence runtime crash

**Symptoms:** scheduled agents (Curator daily, Treasurer weekly) not running; event-driven agents
(Shepherd, Quartermaster, Artisan) not reacting; the `apps/intelligence` process is down.

**Key fact:** the orchestrator is **not** on the customer checkout path — commerce keeps working
while it is down. Entry points: `apps/intelligence/src/orchestrator/{index,run-agent,flow}.ts`.

**Diagnose:** check the intelligence process logs / Sentry for the crash stack. Common causes:
unhandled tool error, bad env, Anthropic/Redis dependency down (see §2, §3).

**Act**
- Restart the intelligence app. Each agent run records to the **Ledger** (memory/audit) — inspect
  recent runs to see where it died and whether anything escalated.
- Tool-use loop is **bounded** (12 steps) and tool errors are caught per-tool, so one bad tool
  shouldn't wedge the loop; if it does, identify the tool from the Ledger decisions and disable it
  from that agent's least-privilege set until fixed.
- Re-run the missed scheduled job manually once stable.

---

## 5. Vendor / supplier outage (dropship)

**Symptoms:** vendor stock/price lookups failing, fulfillment submission errors, supplier webhooks silent.

**Key fact:** live supplier order submission is **off** unless `VENDOR_LIVE_MODE=true` **and**
`AUTO_SUBMIT_VENDOR_ORDERS=true`. So a vendor outage during normal operation queues work rather
than failing live orders.

**Diagnose:** check the vendor's status; check logs for the failing vendor connector; run
`pnpm vendor:preflight` to see readiness/credential state.

**Act**
- Stock/price lookups failing: serve last-known data; flag affected SKUs; pause new drops sourced
  from the down vendor.
- Outbound orders failing: leave them queued. Do **not** flip the live flags to brute-force a
  submission. When the vendor recovers, run the normal submission flow (`pnpm vendor-orders:submit`)
  and confirm acks.
- Webhook verification failures (not outage): check the HMAC secret — a rotated/missing
  `*_WEBHOOK_SECRET` looks like an outage. See SECURITY.md rotation.

---

## 6. Restore from backup

Use when data is corrupted or lost and provider PITR/restore isn't sufficient. **Full procedure
(scratch-DB-first, verification, drill cadence) lives in [`DR_RUNBOOK.md`](DR_RUNBOOK.md).** Short version:

```bash
# Restore into a SCRATCH db first — never straight over production.
gunzip -c backups/lumera-<timestamp>.sql.gz | psql "$RESTORE_URL"
# Verify row counts, re-enable pgvector if needed, then cut services over.
```

After any restore: re-run migrations, re-warm/clear Redis, **rotate any potentially exposed
secrets** (SECURITY.md), then `pnpm verify:api` + storefront smoke test before declaring recovery.

---

## After every incident (post-mortem)

1. **Timeline** — detection → diagnosis → mitigation → resolution (with timestamps).
2. **Root cause** — the actual failing component, backed by a signal (not a guess).
3. **Customer impact** — duration, scope, any orders/payments affected.
4. **Action items** — concrete fixes + owner + due date (e.g. wire Sentry alerting, add a healthcheck,
   tune the pool, enable PITR).
5. **Update the runbooks** — if a playbook was wrong or missing, fix it here so the next person is faster.
