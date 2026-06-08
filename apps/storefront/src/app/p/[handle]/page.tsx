import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { AddToCartButton } from '../../../components/AddToCartButton';
import { PageSignal } from '../../../components/PageSignal';
import { ProductRail } from '../../../components/ProductRail';
import { getRegionId, PRODUCT_FIELDS, priceCents, priceStr } from '../../../lib/catalog';
import type { ProductTruth } from '@alterxiv/shared';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const headers = { 'x-publishable-api-key': PK };

async function fetchProduct(handle: string) {
  try {
    const region = await getRegionId();
    const res = await fetch(
      `${API}/store/products?handle=${encodeURIComponent(handle)}&region_id=${region}&fields=${PRODUCT_FIELDS}`,
      { cache: 'no-store', headers }
    );
    if (!res.ok) return null;
    const { products } = await res.json();
    return products?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchRail(visitorId: string, strategy: string, excludeId: string) {
  try {
    const region = await getRegionId();
    const res = await fetch(
      `${API}/store/recommendations?visitor_id=${encodeURIComponent(visitorId)}&strategy=${strategy}&limit=6`,
      { cache: 'no-store', headers }
    );
    if (!res.ok) return [];
    const { product_ids } = await res.json();
    if (!product_ids?.length) return [];
    const params = product_ids.map((id: string) => `id[]=${id}`).join('&');
    const res2 = await fetch(`${API}/store/products?${params}&region_id=${region}&fields=${PRODUCT_FIELDS}&limit=6`, {
      cache: 'no-store',
      headers,
    });
    if (!res2.ok) return [];
    const { products } = await res2.json();
    return (products ?? []).filter((p: any) => p.id !== excludeId);
  } catch {
    return [];
  }
}

async function fetchDemand(productId: string) {
  try {
    const res = await fetch(`${API}/store/pricing?product_id=${productId}`, { cache: 'no-store', headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchTruth(handle: string): Promise<ProductTruth | null> {
  try {
    const res = await fetch(`${API}/store/product-truth/${encodeURIComponent(handle)}`, { cache: 'no-store', headers });
    if (!res.ok) return null;
    const { truth } = await res.json();
    return truth ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  if (!product) return { title: 'Product Not Found' };
  const chapter = product.metadata?.chapter ?? '';
  const pc = priceCents(product);
  const desc = [product.description?.slice(0, 120), chapter, pc != null ? `$${(pc / 100).toFixed(2)}` : '']
    .filter(Boolean)
    .join(' · ');
  return {
    title: product.title,
    description: desc,
    openGraph: {
      title: product.title,
      description: desc,
      images: product.thumbnail ? [{ url: product.thumbnail }] : [],
      type: 'website',
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  if (!product) notFound();

  const visitorId = (await cookies()).get('axiv_vid')?.value ?? 'ssr';
  const chapter = product.metadata?.chapter ?? '';
  const mainImg = product.thumbnail || product.images?.[0]?.url || product.metadata?.main_image || '';
  const price = priceCents(product);
  const priceLabel = priceStr(product);
  const variantId = product.variants?.[0]?.id;
  const earnUsd = price != null ? (price * 0.05) / 100 : 0;

  const [wornTogether, completeSet, demand, truth] = await Promise.all([
    fetchRail(visitorId, 'graph_rec', product.id),
    fetchRail(visitorId, 'complete_the_set', product.id),
    fetchDemand(product.id),
    fetchTruth(handle),
  ]);
  const inDemand = demand && (demand.demand_factor >= 0.5 || demand.scarcity_factor >= 0.5);
  const verifiedReviews = truth?.verified_reviews_count ?? Number(product.metadata?.verified_reviews_count ?? 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: mainImg || undefined,
    ...(verifiedReviews > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.metadata?.rating ?? 5,
        reviewCount: verifiedReviews,
      },
    }),
    ...(price != null && {
      offers: {
        '@type': 'Offer',
        price: (price / 100).toFixed(2),
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
  };

  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageSignal type="product_view" context={{ chapter }} entityId={product.id} />

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* breadcrumb */}
        <nav className="mb-8 text-micro uppercase text-neutral-600">
          <Link href="/" className="hover:text-neutral-400">Broadcast</Link>
          {chapter && (
            <>
              <span className="mx-2">·</span>
              <Link href={`/chapter/${chapter}`} className="hover:text-altar-goldlight">{chapter}</Link>
            </>
          )}
        </nav>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-obsidian">
            {mainImg ? (
              <img src={mainImg} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-neutral-900" />
            )}
            {inDemand && (
              <span className="absolute left-4 top-4 animate-pulse-scarce rounded-full bg-black/60 px-3 py-1 text-micro uppercase text-altar-goldlight backdrop-blur">
                Rising demand
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col py-2">
            {chapter && <p className="mb-3 text-micro uppercase text-altar-goldlight/70">{chapter}</p>}
            <h1 className="font-serif text-4xl font-light leading-tight text-neutral-100">{product.title}</h1>
            <p className="mt-5 font-serif text-3xl text-neutral-200">{priceLabel}</p>
            {verifiedReviews > 0 ? (
              <p className="mt-2 text-xs text-neutral-500">
                Verified by {verifiedReviews.toLocaleString()} customer{verifiedReviews === 1 ? '' : 's'}
              </p>
            ) : (
              <p className="mt-2 text-xs text-neutral-600">No verified reviews yet.</p>
            )}
            {earnUsd > 0 && (
              <p className="mt-4 text-xs text-altar-goldlight/80">
                Earn ${earnUsd.toFixed(2)} in Lumens with this offering.
              </p>
            )}
            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-neutral-400">{product.description}</p>
            )}

            <div className="mt-8">
              {variantId ? (
                <AddToCartButton variantId={variantId} productId={product.id} chapter={chapter} />
              ) : (
                <p className="text-xs text-neutral-600">Out of stock</p>
              )}
            </div>

            <div className="mt-8 border-t border-white/[0.06] pt-6">
              <p className="text-micro uppercase text-neutral-600">Product Truth</p>
              <div className="mt-3 grid gap-3 text-xs text-neutral-500 sm:grid-cols-2">
                <p>Supplier <span className="block text-neutral-300">{truth?.supplier_name ?? 'Verification pending'}</span></p>
                <p>Region <span className="block text-neutral-300">{truth?.supplier_region ?? 'Pending'}</span></p>
                <p>Ship estimate <span className="block text-neutral-300">{truth?.estimated_ship_days ?? 12} business days</span></p>
                <p>Returns <span className="block text-neutral-300">{truth?.return_window_days ?? 30} day window</span></p>
              </div>
              <div className="mt-4 space-y-2 text-xs text-neutral-600">
                {(truth?.quality_checks ?? ['Supplier proof pending', 'Stock freshness pending']).slice(0, 3).map((check) => (
                  <p key={check}>{check}</p>
                ))}
              </div>
              <p className="mt-4 text-xs text-neutral-500">{truth?.price_logic ?? 'Price verified against supplier cost before launch.'}</p>
            </div>
          </div>
        </div>

        {/* Worn Together (graph-rec) */}
        {wornTogether.length > 0 && (
          <div className="mt-20 border-t border-white/[0.06] pt-8">
            <ProductRail blockName="graph_rec" products={wornTogether} />
          </div>
        )}
        {/* Complete the Set */}
        {completeSet.length > 0 && (
          <div className="mt-8">
            <ProductRail blockName="complete_the_set" products={completeSet} />
          </div>
        )}
      </div>
    </main>
  );
}
