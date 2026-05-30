import { DropBoard } from '../components/DropBoard';
import { ProductRail } from '../components/ProductRail';
import { PageSignal } from '../components/PageSignal';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

async function fetchBroadcast() {
  try {
    const res = await fetch(`${API}/store/broadcast?visitor_id=ssr`, {
      cache: 'no-store',
      headers: { 'x-publishable-api-key': PK },
    });
    if (!res.ok) return defaultBroadcast();
    return res.json();
  } catch { return defaultBroadcast(); }
}

function defaultBroadcast() {
  return { block_order: ['live_drops'], blocks: { live_drops: [] }, visitor_id: 'ssr' };
}

async function fetchProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  try {
    const params = ids.map((id) => `id[]=${id}`).join('&');
    const res = await fetch(`${API}/store/products?${params}&fields=id,title,handle,thumbnail,metadata,variants,images&limit=20`, {
      cache: 'no-store',
      headers: { 'x-publishable-api-key': PK },
    });
    if (!res.ok) return [];
    const { products } = await res.json();
    // Re-sort to match the rec order
    const map = Object.fromEntries((products ?? []).map((p: any) => [p.id, p]));
    return ids.map((id) => map[id]).filter(Boolean);
  } catch { return []; }
}

export default async function Home() {
  const broadcast = await fetchBroadcast();
  const { block_order = [], blocks = {} } = broadcast;

  // Fetch products for non-drop blocks in parallel
  const railBlocks = block_order.filter((b: string) => b !== 'live_drops');
  const railProducts: Record<string, any[]> = {};
  await Promise.all(
    railBlocks.map(async (block: string) => {
      const ids: string[] = (blocks as any)[block] ?? [];
      if (ids.length) {
        railProducts[block] = await fetchProductsByIds(ids);
      }
    })
  );

  return (
    <main className="min-h-screen bg-black">
      <PageSignal type="page_view" context={{ page: 'home' }} />

      {/* Hero */}
      <section className="px-6 py-20 text-center">
        <p className="mb-2 text-[9px] uppercase tracking-[0.5em] text-neutral-600">Season Zero</p>
        <h1 className="font-serif text-5xl tracking-tight text-neutral-100 md:text-7xl">ALTER XIV</h1>
        <p className="mx-auto mt-4 max-w-md text-xs uppercase tracking-[0.25em] text-neutral-500">
          The Lord will fight for you · you need only be still
        </p>
        <p className="mt-2 text-[9px] tracking-widest text-neutral-700">Exodus 14:14</p>
      </section>

      {/* Blocks in bandit-ordered sequence */}
      {block_order.map((block: string) => {
        if (block === 'live_drops') {
          return <DropBoard key={block} drops={(blocks as any).live_drops ?? []} />;
        }
        const products = railProducts[block] ?? [];
        return <ProductRail key={block} blockName={block} products={products} />;
      })}
    </main>
  );
}
