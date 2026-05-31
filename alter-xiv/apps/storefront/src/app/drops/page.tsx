import type { Metadata } from 'next';
import { DropBoard } from '../../components/DropBoard';
import { PageSignal } from '../../components/PageSignal';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export const metadata: Metadata = {
  title: 'The Broadcast — All Drops',
  description: 'Every drop across the five chapters — live, scheduled, and sealed.',
};

async function fetchDrops() {
  try {
    const res = await fetch(`${API}/store/drops`, {
      cache: 'no-store',
      headers: { 'x-publishable-api-key': PK },
    });
    if (!res.ok) return [];
    const { drops } = await res.json();
    // Live first, then scheduled, then the rest.
    const order = { live: 0, scheduled: 1, sold_out: 2, archived: 3 } as Record<string, number>;
    return (drops ?? []).sort((a: any, b: any) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  } catch {
    return [];
  }
}

export default async function DropsPage() {
  const drops = await fetchDrops();
  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <PageSignal type="page_view" context={{ page: 'drops' }} />
      <section className="px-6 pt-16 pb-6 text-center">
        <p className="text-micro uppercase text-neutral-600">The Broadcast</p>
        <h1 className="mt-2 font-serif text-5xl font-light tracking-[0.08em] text-foil">All Drops</h1>
      </section>
      {drops.length ? (
        <DropBoard drops={drops} />
      ) : (
        <p className="pb-24 text-center text-micro uppercase text-neutral-600">The board is quiet.</p>
      )}
    </main>
  );
}
