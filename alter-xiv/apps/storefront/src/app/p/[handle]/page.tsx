import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AddToCartButton } from '../../../components/AddToCartButton';
import { PageSignal } from '../../../components/PageSignal';
import { ProductRail } from '../../../components/ProductRail';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

async function fetchProduct(handle: string) {
  try {
    const res = await fetch(
      `${API}/store/products?handle=${encodeURIComponent(handle)}&fields=id,title,handle,description,thumbnail,metadata,variants,images`,
      { cache: 'no-store', headers: { 'x-publishable-api-key': PK } }
    );
    if (!res.ok) return null;
    const { products } = await res.json();
    return products?.[0] ?? null;
  } catch { return null; }
}

async function fetchRecs(productId: string) {
  try {
    const res = await fetch(
      `${API}/store/recommendations?visitor_id=ssr&strategy=complete_the_set&limit=6`,
      { cache: 'no-store', headers: { 'x-publishable-api-key': PK } }
    );
    if (!res.ok) return [];
    const { product_ids } = await res.json();
    if (!product_ids?.length) return [];
    const params = product_ids.map((id: string) => `id[]=${id}`).join('&');
    const res2 = await fetch(`${API}/store/products?${params}&fields=id,title,handle,thumbnail,metadata,variants&limit=6`, {
      cache: 'no-store', headers: { 'x-publishable-api-key': PK },
    });
    if (!res2.ok) return [];
    const { products } = await res2.json();
    return (products ?? []).filter((p: any) => p.id !== productId);
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchProduct(handle);
  if (!product) return { title: 'Product Not Found — ALTER XIV' };
  const chapter = product.metadata?.chapter ?? '';
  const price = product.variants?.[0]?.prices?.[0]?.amount;
  const priceStr = price != null ? `$${(price / 100).toFixed(2)}` : '';
  const desc = [product.description?.slice(0, 120), chapter, priceStr].filter(Boolean).join(' · ');
  return {
    title: `${product.title} — ALTER XIV`,
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
  const [product, recs] = await Promise.all([fetchProduct(handle), fetchRecs('')]);
  if (!product) notFound();

  const chapter = product.metadata?.chapter ?? '';
  const mainImg = product.thumbnail || product.images?.[0]?.url || product.metadata?.main_image || '';
  const price = product.variants?.[0]?.prices?.[0]?.amount;
  const priceStr = price != null ? `$${(price / 100).toFixed(2)}` : 'Price on request';
  const variantId = product.variants?.[0]?.id;
  const scripture = product.metadata?.scripture_ref;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: mainImg || undefined,
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
    <main className="min-h-screen bg-black">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageSignal type="product_view" context={{ chapter, entity_id: product.id }} />

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Image */}
          <div className="aspect-[3/4] overflow-hidden bg-neutral-950">
            {mainImg ? (
              <img src={mainImg} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-neutral-900" />
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col py-4">
            {chapter && (
              <p className="mb-2 text-[9px] uppercase tracking-[0.4em] text-neutral-600">{chapter}</p>
            )}
            <h1 className="font-serif text-3xl text-neutral-100">{product.title}</h1>
            <p className="mt-4 text-2xl text-neutral-300">{priceStr}</p>
            {product.metadata?.rating && (
              <p className="mt-2 text-xs text-neutral-600">
                ★ {product.metadata.rating} · {product.metadata.reviews_count?.toLocaleString()} reviews
              </p>
            )}
            {product.description && (
              <p className="mt-6 text-sm leading-relaxed text-neutral-400">{product.description}</p>
            )}
            {scripture && (
              <p className="mt-4 text-[10px] italic tracking-wider text-neutral-700">{scripture}</p>
            )}
            <div className="mt-8">
              {variantId ? (
                <AddToCartButton
                  variantId={variantId}
                  productId={product.id}
                  chapter={chapter}
                />
              ) : (
                <p className="text-xs text-neutral-600">Out of stock</p>
              )}
            </div>
          </div>
        </div>

        {/* Complete the Set rail */}
        {recs.length > 0 && (
          <div className="mt-20 border-t border-neutral-900 pt-12">
            <ProductRail blockName="complete_the_set" products={recs} />
          </div>
        )}
      </div>
    </main>
  );
}
