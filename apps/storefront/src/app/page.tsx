import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { DropBoard } from '../components/DropBoard';
import { ProductRail } from '../components/ProductRail';
import { PageSignal } from '../components/PageSignal';
import { Hero } from '../components/Hero';
import { TuneBroadcast } from '../components/TuneBroadcast';
import { DropBoardSkeleton, RailSkeleton } from '../components/Skeletons';
import { getRegionId, PRODUCT_FIELDS } from '../lib/catalog';
import { DEMO, demoBroadcast, demoProductsByIds } from '../lib/demo';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

async function fetchBroadcast(visitorId: string) {
  if (DEMO) return demoBroadcast();
  try {
    const res = await fetch(`${API}/store/broadcast?visitor_id=${encodeURIComponent(visitorId)}`, {
      cache: 'no-store',
      headers: { 'x-publishable-api-key': PK },
    });
    if (!res.ok) return defaultBroadcast();
    return res.json();
  } catch {
    return defaultBroadcast();
  }
}

function defaultBroadcast() {
  return { block_order: ['live_drops'], blocks: { live_drops: [] }, visitor_id: 'ssr' };
}

async function fetchProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  if (DEMO) return demoProductsByIds(ids);
  try {
    const region = await getRegionId();
    const params = ids.map((id) => `id[]=${id}`).join('&');
    const res = await fetch(
      `${API}/store/products?${params}&region_id=${region}&fields=${PRODUCT_FIELDS}&limit=20`,
      { cache: 'no-store', headers: { 'x-publishable-api-key': PK } }
    );
    if (!res.ok) return [];
    const { products } = await res.json();
    const map = Object.fromEntries((products ?? []).map((p: any) => [p.id, p]));
    return ids.map((id) => map[id]).filter(Boolean);
  } catch {
    return [];
  }
}

/** The personalized Broadcast — streamed under Suspense so the hero shell paints instantly. */
async function Broadcast({ visitorId }: { visitorId: string }) {
  const broadcast = await fetchBroadcast(visitorId);
  const { block_order = [], blocks = {} } = broadcast;

  const railBlocks = block_order.filter((b: string) => b !== 'live_drops');
  const railProducts: Record<string, any[]> = {};
  await Promise.all(
    railBlocks.map(async (block: string) => {
      const ids: string[] = (blocks as any)[block] ?? [];
      if (ids.length) railProducts[block] = await fetchProductsByIds(ids);
    })
  );

  return (
    <>
      {block_order.map((block: string) => {
        if (block === 'live_drops') {
          return <DropBoard key={block} drops={(blocks as any).live_drops ?? []} />;
        }
        return <ProductRail key={block} blockName={block} products={railProducts[block] ?? []} />;
      })}
    </>
  );
}

export default async function Home() {
  // Read the visitor identity established by middleware → personalize on first paint.
  const visitorId = (await cookies()).get('axiv_vid')?.value ?? 'ssr';

  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <PageSignal type="page_view" context={{ page: 'home' }} />
      <Hero />
      <TuneBroadcast />
      <Suspense
        fallback={
          <>
            <DropBoardSkeleton />
            <RailSkeleton />
            <RailSkeleton />
          </>
        }
      >
        <Broadcast visitorId={visitorId} />
      </Suspense>
    </main>
  );
}
