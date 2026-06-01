import type { Metadata } from 'next';

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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-micro uppercase text-neutral-600">{label}</p>
      <p className="mt-1 font-serif text-2xl text-neutral-100">{value}</p>
    </div>
  );
}

/** The Founder's Cockpit — the company, running itself. You approve; it operates. */
export default async function Cockpit() {
  const d = await fetchCockpit();

  if (!d) {
    return (
      <main className="min-h-screen bg-void px-6 py-24 text-center">
        <p className="text-micro uppercase text-neutral-600">The Cockpit</p>
        <p className="mt-4 font-serif text-2xl text-neutral-300">The control room is dark.</p>
        <p className="mt-2 text-sm text-neutral-600">No telemetry — is the backend awake?</p>
      </main>
    );
  }

  const op = d.operator;
  const audits: any[] = d.audits_7d ?? [];
  const drops: any[] = d.drops ?? [];
  const inbox: any[] = d.approval_inbox ?? [];
  const runs: any[] = d.recent_runs ?? [];
  const warns = audits.find((a) => a.severity === 'warn')?.count ?? 0;
  const errors = audits.find((a) => a.severity === 'error' || a.severity === 'critical')?.count ?? 0;

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
          <Stat label="Signals · 7d" value={d.signals_7d?.total ?? 0} />
          <Stat label="Purchases · 7d" value={d.signals_7d?.purchases ?? 0} />
          <Stat label="Audit warnings" value={`${warns + errors}`} />
          <Stat label="Approvals waiting" value={inbox.length} />
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Approval inbox */}
          <section className="rounded-sm border border-white/[0.07] p-5">
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

          {/* Recent agent runs */}
          <section className="rounded-sm border border-white/[0.07] p-5">
            <h2 className="mb-4 text-label uppercase text-neutral-400">The Constellation — Recent Runs</h2>
            <ul className="space-y-2">
              {runs.map((r, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-300">{r.agent}</span>
                  <span
                    className={`text-micro uppercase ${
                      r.status === 'success'
                        ? 'text-neutral-500'
                        : r.status === 'awaiting_approval'
                          ? 'text-altar-goldlight'
                          : 'text-chapter-relentless'
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

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
