import type { Metadata } from 'next';
import {
  approveCandidate,
  approveDraftCandidate,
  designVariant,
  rejectCandidate,
  requestSample,
  runCuration,
} from './actions';
import { CONSTELLATION } from '@alterxiv/shared';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
// Server-only secret (NOT NEXT_PUBLIC) — gates the internal ops endpoint in production.
const COCKPIT_KEY = process.env.COCKPIT_KEY || '';

export const metadata: Metadata = { title: 'The Cockpit', robots: { index: false, follow: false } };

async function fetchCockpit() {
  try {
    const res = await fetch(`${API}/store/cockpit`, {
      cache: 'no-store',
      headers: { 'x-publishable-api-key': PK, ...(COCKPIT_KEY ? { 'x-cockpit-key': COCKPIT_KEY } : {}) },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchCurationBoard() {
  try {
    const res = await fetch(`${API}/admin/lumera/curation-board`, {
      cache: 'no-store',
      headers: { ...(COCKPIT_KEY ? { 'x-cockpit-key': COCKPIT_KEY } : {}) },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-micro uppercase text-neutral-600">{label}</p>
      <p className="mt-1 font-serif text-2xl text-neutral-100">{value}</p>
    </div>
  );
}

/** Money arrives as integer cents (see ARCHITECTURE §4) — divide by 100 for display. */
function usd(cents: number | undefined): string {
  const amount = (cents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

type RunLite = { agent: string; status?: string; escalated?: boolean; started_at?: string };

function workerStatusStyle(status: string): string {
  switch (status) {
    case 'success':
      return 'text-neutral-400';
    case 'awaiting_approval':
      return 'text-altar-goldlight';
    case 'idle':
      return 'text-neutral-700';
    default:
      return 'text-chapter-relentless';
  }
}

/**
 * The Constellation — the full autonomous workforce. The roster comes from the shared manifest (so it
 * renders even when telemetry is dark); each worker's live status is overlaid from recent runs.
 */
function Workforce({ runs }: { runs: RunLite[] }) {
  const latest = new Map<string, RunLite>();
  for (const r of runs) if (r?.agent && !latest.has(r.agent)) latest.set(r.agent, r); // recent_runs is newest-first
  return (
    <section className="rounded-sm border border-white/[0.07] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-label uppercase text-neutral-400">The Constellation — Autonomous Workforce</h2>
        <span className="text-micro uppercase text-neutral-600">{CONSTELLATION.length} workers</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONSTELLATION.map((m) => {
          const status = latest.get(m.key)?.status ?? 'idle';
          return (
            <div key={m.key} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-serif text-lg text-neutral-100">{m.name}</p>
                  <p className="text-micro uppercase text-neutral-600">{m.department}</p>
                </div>
                <span className={`shrink-0 text-micro uppercase ${workerStatusStyle(status)}`}>{status.replace(/_/g, ' ')}</span>
              </div>
              <p className="mt-3 text-sm text-neutral-400">{m.role}</p>
              <p className="mt-3 text-micro uppercase text-neutral-600">{m.cadence}</p>
              {m.gated.length > 0 && (
                <div className="mt-3 border-t border-white/[0.05] pt-3">
                  <p className="text-micro uppercase text-neutral-600">Needs your approval</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.gated.map((g) => (
                      <span key={g} className="rounded-full border border-altar-gold/25 px-2 py-0.5 text-micro uppercase text-altar-goldlight">
                        {g.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The Founder's Cockpit — the company, running itself. You approve; it operates. */
export default async function Cockpit() {
  const [d, board] = await Promise.all([fetchCockpit(), fetchCurationBoard()]);

  if (!d && !board) {
    return (
      <main className="min-h-screen bg-void bg-sacred-grain px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <header className="mb-10 text-center">
            <p className="text-micro uppercase text-neutral-600">The Cockpit</p>
            <h1 className="mt-2 font-serif text-4xl font-light tracking-[0.1em] text-foil">The Company, Running Itself</h1>
            <p className="mt-3 text-sm italic text-neutral-500">Telemetry is dark — is the backend awake? Your workforce, regardless:</p>
          </header>
          <Workforce runs={[]} />
        </div>
      </main>
    );
  }

  const op = d?.operator;
  const audits: any[] = d?.audits_7d ?? [];
  const drops: any[] = d?.drops ?? [];
  const inbox: any[] = d?.approval_inbox ?? [];
  const runs: any[] = d?.recent_runs ?? [];
  const warns = audits.find((a) => a.severity === 'warn')?.count ?? 0;
  const errors = audits.find((a) => a.severity === 'error' || a.severity === 'critical')?.count ?? 0;
  const kpis: any = d?.kpis ?? {};
  const topProducts: any[] = kpis.top_products ?? [];
  const lowStockDrops: any[] = kpis.low_stock_drops ?? [];
  const returnRatePct = ((kpis.return_rate_30d ?? 0) * 100).toFixed(1);

  return (
    <main className="min-h-screen bg-void bg-sacred-grain px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <p className="text-micro uppercase text-neutral-600">The Cockpit</p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-[0.1em] text-foil">
            The Company, Running Itself
          </h1>
          <p className="mt-3 text-sm italic text-neutral-500">You approve. It operates.</p>
        </header>

        {/* OPERATOR status */}
        <section className="mb-8 rounded-sm border border-altar-gold/20 bg-altar-gold/[0.03] p-5">
          <div className="flex items-center justify-between">
            <span className="text-label uppercase text-altar-goldlight">OPERATOR — Last Daily Loop</span>
            <span className="text-micro uppercase text-neutral-500">
              Ledger: {op?.ledger_health ?? 'unknown'}
            </span>
          </div>
          <p className="mt-3 font-serif text-xl text-neutral-100">{op?.summary ?? 'No loop has run yet.'}</p>
          {op?.ran_at && (
            <p className="mt-1 text-micro uppercase text-neutral-600">
              {new Date(op.ran_at).toLocaleString()}
            </p>
          )}
        </section>

        {/* Stats */}
        <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Signals · 7d" value={d?.signals_7d?.total ?? 0} />
          <Stat label="Purchases · 7d" value={d?.signals_7d?.purchases ?? 0} />
          <Stat label="Audit warnings" value={`${warns + errors}`} />
          <Stat label="Approvals waiting" value={inbox.length} />
        </section>

        {/* Business KPIs — the founder's ledger at a glance */}
        <section className="mb-8 rounded-sm border border-altar-gold/15 bg-altar-gold/[0.02] p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-label uppercase text-altar-goldlight">Business · The Numbers</span>
            <span className="text-micro uppercase text-neutral-600">Live, read-only</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Revenue · 7d" value={usd(kpis.revenue_7d_cents)} />
            <Stat label="Revenue · 30d" value={usd(kpis.revenue_30d_cents)} />
            <Stat label="Orders · 30d" value={kpis.order_count_30d ?? 0} />
            <Stat label="AOV · 30d" value={usd(kpis.aov_30d_cents)} />
            <Stat label="Return rate · 30d" value={`${returnRatePct}%`} />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {/* Top products by engagement */}
            <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="mb-3 text-micro uppercase text-neutral-500">Top Products · 7d</p>
              {topProducts.length === 0 ? (
                <p className="text-sm text-neutral-600">No signal yet.</p>
              ) : (
                <ul className="space-y-2">
                  {topProducts.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-neutral-200">
                        {p.title}
                        {p.chapter && <span className="ml-2 text-micro uppercase text-neutral-600">{p.chapter}</span>}
                      </span>
                      <span className="shrink-0 text-micro uppercase text-altar-goldlight">
                        {p.signals} sig · {p.cart_adds} cart
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Low-stock live drops */}
            <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-4">
              <p className="mb-3 text-micro uppercase text-neutral-500">Low-Stock Drops</p>
              {lowStockDrops.length === 0 ? (
                <p className="text-sm text-neutral-600">Inventory holding steady.</p>
              ) : (
                <ul className="space-y-2">
                  {lowStockDrops.map((dr, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate text-neutral-200">
                        {dr.name}
                        <span className="ml-2 text-micro uppercase text-neutral-600">{dr.chapter}</span>
                      </span>
                      <span className="shrink-0 text-micro uppercase text-chapter-relentless">
                        {dr.units_remaining}/{dr.units_total} · {dr.pct_remaining}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 border border-altar-gold/20 bg-black/25 p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-label uppercase text-altar-goldlight">Curation Board</h2>
              <p className="mt-1 text-sm text-neutral-500">Pick the items. The gates decide whether they can publish.</p>
            </div>
            <form action={runCuration}>
              <button className="border border-altar-gold/40 px-4 py-3 text-micro uppercase text-altar-goldlight transition hover:border-altar-gold">
                Curate Now
              </button>
            </form>
          </div>

          {board ? (
            <>
              <div className="mb-5 grid gap-2 sm:grid-cols-3">
                {board.connections?.slice(0, 3).map((c: any) => (
                  <div key={c.id} className="border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="text-micro uppercase text-neutral-500">{c.label}</p>
                    <p className={`mt-1 text-xs ${c.connected ? 'text-altar-goldlight' : 'text-neutral-600'}`}>
                      {c.mode} {c.can_submit_orders ? '· order-ready' : '· gated'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {(board.candidates ?? []).map((candidate: any) => {
                  const margin = Math.round((candidate.score?.gross_margin ?? 0) * 100);
                  const blocked = ['compliance_blocked', 'margin_blocked', 'shipping_blocked', 'media_blocked', 'supplier_blocked'].includes(candidate.status);
                  return (
                    <article key={candidate.id} className="grid gap-4 border border-white/[0.07] p-4 md:grid-cols-[112px_1fr]">
                      <div className="aspect-square overflow-hidden bg-neutral-950">
                        {candidate.image_url ? (
                          <img src={candidate.image_url} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-micro uppercase text-altar-goldlight">{candidate.chapter} · {candidate.vendor}</p>
                            <h3 className="mt-1 font-serif text-xl text-neutral-100">{candidate.title}</h3>
                            <p className="mt-1 text-xs text-neutral-500">{candidate.supplier_name} · {candidate.warehouse_region}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-serif text-2xl text-neutral-100">{candidate.score?.total ?? 0}</p>
                            <p className="text-micro uppercase text-neutral-600">{candidate.status}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-neutral-400 sm:grid-cols-4">
                          <p>Margin <span className="text-neutral-100">{margin}%</span></p>
                          <p>Retail <span className="text-neutral-100">${(candidate.retail_cents / 100).toFixed(2)}</span></p>
                          <p>Ship <span className="text-neutral-100">{candidate.lead_time_days}d</span></p>
                          <p>Stock <span className="text-neutral-100">{candidate.stock}</span></p>
                        </div>

                        {candidate.score?.blockers?.length > 0 && (
                          <p className="mt-3 text-xs text-chapter-relentless">
                            Blocked: {candidate.score.blockers.slice(0, 3).join(', ')}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <form action={approveCandidate}>
                            <input type="hidden" name="id" value={candidate.id} />
                            <button
                              disabled={blocked}
                              className="border border-altar-gold/40 px-3 py-2 text-micro uppercase text-altar-goldlight disabled:border-neutral-800 disabled:text-neutral-700"
                            >
                              Approve + Publish
                            </button>
                          </form>
                          <form action={approveDraftCandidate}>
                            <input type="hidden" name="id" value={candidate.id} />
                            <button className="border border-white/10 px-3 py-2 text-micro uppercase text-neutral-400">Approve Draft</button>
                          </form>
                          <form action={requestSample}>
                            <input type="hidden" name="id" value={candidate.id} />
                            <button className="border border-white/10 px-3 py-2 text-micro uppercase text-neutral-400">Need Sample</button>
                          </form>
                          <form action={designVariant}>
                            <input type="hidden" name="id" value={candidate.id} />
                            <button className="border border-white/10 px-3 py-2 text-micro uppercase text-neutral-400">Design Variant</button>
                          </form>
                          <form action={rejectCandidate}>
                            <input type="hidden" name="id" value={candidate.id} />
                            <button className="border border-white/10 px-3 py-2 text-micro uppercase text-neutral-600">Reject</button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-neutral-600">Curation board unavailable. Backend ops API may be gated.</p>
          )}
        </section>

        {/* Approval inbox */}
        <section className="mb-6 rounded-sm border border-white/[0.07] p-5">
          <h2 className="mb-4 text-label uppercase text-neutral-400">Founder Approval Inbox</h2>
          {inbox.length === 0 ? (
            <p className="text-sm text-neutral-600">Nothing needs you. The gate is quiet.</p>
          ) : (
            <ul className="space-y-3">
              {inbox.map((i) => (
                <li key={i.id} className="border-b border-white/5 pb-2">
                  <span className="text-micro uppercase text-altar-goldlight">{i.agent}</span>
                  <p className="text-sm text-neutral-300">{i.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* The Constellation — full autonomous workforce roster + live status */}
        <Workforce runs={runs} />

        {/* Drops */}
        <section className="mt-6 rounded-sm border border-white/[0.07] p-5">
          <h2 className="mb-4 text-label uppercase text-neutral-400">Drops</h2>
          <div className="flex flex-wrap gap-3">
            {drops.map((dr) => (
              <span key={dr.status} className="rounded-full border border-white/10 px-3 py-1 text-micro uppercase text-neutral-400">
                {dr.status}: {dr.count}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
