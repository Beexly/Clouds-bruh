import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductRail } from '../../../components/ProductRail';
import { PageSignal } from '../../../components/PageSignal';
import { Countdown } from '../../../components/Countdown';
import { getRegionId, PRODUCT_FIELDS } from '../../../lib/catalog';
import { chapterLabel } from '../../../lib/chapters';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const headers = { 'x-publishable-api-key': PK };

async function fetchDrop(id: string) {
  try {
    const res = await fetch(`${API}/store/drops`, { cache: 'no-store', headers });
    if (!res.ok) return null;
    const { drops } = await res.json();
    return (drops ?? []).find((d: any) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

async function fetchProducts(ids: string[]) {
  if (!ids?.length) return [];
  try {
    const region = await getRegionId();
    const params = ids.map((id) => `id[]=${id}`).join('&');
    const res = await fetch(`${API}/store/products?${params}&region_id=${region}&fields=${PRODUCT_FIELDS}&limit=50`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return [];
    const { products } = await res.json();
    return products ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const drop = await fetchDrop(id);
  if (!drop) return { title: 'Drop' };
  return { title: drop.name, description: `${chapterLabel(drop.chapter)} · ${drop.units_remaining}/${drop.units_total} remaining` };
}

export default async function DropPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drop = await fetchDrop(id);
  if (!drop) notFound();
  const products = await fetchProducts(drop.product_ids ?? []);

  const total = drop.units_total || 1;
  const sold = Math.max(0, total - (drop.units_remaining ?? total));
  const pctSold = Math.min(100, Math.round((sold / total) * 100));
  const live = drop.status === 'live';

  return (
    <main className="min-h-screen bg-sacred-grain">
      <PageSignal type="drop_view" context={{ chapter: drop.chapter }} entityId={drop.id} />

      <section className="px-6 pt-16 pb-8 text-center">
        <Link href={`/chapter/${drop.chapter}`} className="text-micro uppercase text-altar-goldlight/70 hover:text-altar-goldlight">
          {chapterLabel(drop.chapter)}
        </Link>
        <h1 className="mt-3 font-serif text-5xl font-light tracking-[0.06em] text-foil md:text-6xl">{drop.name}</h1>
        <p className="mt-2 text-micro uppercase text-neutral-600">{drop.series}</p>

        <div className="mx-auto mt-8 flex max-w-md flex-col items-center gap-3">
          <span className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'animate-pulse-scarce bg-altar-gold' : 'bg-neutral-700'}`} />
            <span className="text-micro uppercase text-neutral-400">
              {live ? <Countdown to={drop.ends_at} label="closes in" /> : <Countdown to={drop.starts_at} label="opens in" />}
            </span>
          </span>
          <span className="h-px w-full max-w-xs overflow-hidden bg-white/10">
            <span className="block h-full bg-altar-gold/70" style={{ width: `${pctSold}%` }} />
          </span>
          <span className="text-micro uppercase tabular-nums text-neutral-500">
            {drop.units_remaining}/{drop.units_total} remaining · {pctSold}% claimed
          </span>
        </div>
      </section>

      {products.length > 0 ? (
        <ProductRail blockName="the_drop" products={products} />
      ) : (
        <p className="pb-24 text-center text-micro uppercase text-neutral-600">The pieces are being prepared.</p>
      )}
    </main>
  );
}
