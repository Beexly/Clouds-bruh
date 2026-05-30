import { DropBoard } from '../components/DropBoard';

/**
 * THE BROADCAST — personalized, dynamically-ordered home.
 * Fetches /store/broadcast (bandit-ranked block order per visitor) and renders blocks in that order.
 * Client islands hydrate countdowns + fire SIGNAL events. SSR shell for speed + SEO.
 */
async function fetchBroadcast() {
  const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
  try {
    const r = await fetch(`${API}/store/broadcast`, { cache: 'no-store' });
    return r.json();
  } catch { return { drops: [], block_order: ['live_drops'] }; }
}

export default async function Home() {
  const { drops, block_order } = await fetchBroadcast();
  return (
    <main className="min-h-screen bg-black text-neutral-100">
      <header className="px-6 py-10 text-center">
        <h1 className="font-serif text-3xl tracking-wide">ALTER XIV</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.35em] text-neutral-500">The Lord will fight for you · you need only be still</p>
      </header>
      {block_order.map((block: string) => {
        if (block === 'live_drops') return <DropBoard key={block} drops={drops} />;
        // TODO: render for_you / trending_armor / complete_the_set / new_in_signal rails
        // (each fetches its products + fires recommendation_impression on view)
        return <section key={block} data-block={block} className="px-6 py-12" />;
      })}
    </main>
  );
}
