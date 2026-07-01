import type { Metadata } from 'next';
import Link from 'next/link';
import { PageSignal } from '../../components/PageSignal';
import { ProductImage } from '../../components/ProductImage';
import { getRegionId, PRODUCT_FIELDS, priceStr } from '../../lib/catalog';
import { DEMO, demoSearch, demoProductsByIds } from '../../lib/demo';

/**
 * /search — the storefront face of the hybrid (keyword + pgvector) search API (/store/search).
 * Server-rendered so it's the valid target for the WebSite SearchAction (Google sitelinks box) and
 * fully shareable/deep-linkable (?q=). Results keep the backend's vector-rank order; facet chips
 * route into chapters; each card carries the backend's "why it matched" reason. Query result pages
 * are noindex (the action target is still discoverable) — standard SEO posture for search.
 */
export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } };

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const headers = { 'x-publishable-api-key': PK };

interface SearchHit { id: string; reason?: string }

async function runSearch(q: string): Promise<{ results: SearchHit[]; facets: Record<string, number> }> {
  if (DEMO) {
    const hits = demoSearch(q);
    const facets: Record<string, number> = {};
    for (const h of hits) {
      const c = (h.metadata?.chapter as string) ?? 'other';
      facets[c] = (facets[c] ?? 0) + 1;
    }
    return { results: hits.map((h: any) => ({ id: h.id, reason: h.reason })), facets };
  }
  try {
    const res = await fetch(`${API}/store/search?q=${encodeURIComponent(q)}&limit=24`, { cache: 'no-store', headers });
    if (!res.ok) return { results: [], facets: {} };
    const data = await res.json();
    return { results: (data.results ?? []) as SearchHit[], facets: (data.facets ?? {}) as Record<string, number> };
  } catch {
    return { results: [], facets: {} };
  }
}

async function productsByIds(ids: string[]): Promise<any[]> {
  if (!ids.length) return [];
  if (DEMO) return demoProductsByIds(ids);
  try {
    const region = await getRegionId();
    const params = ids.map((id) => `id[]=${encodeURIComponent(id)}`).join('&');
    const res = await fetch(`${API}/store/products?${params}&region_id=${region}&fields=${PRODUCT_FIELDS}&limit=24`, {
      cache: 'no-store',
      headers,
    });
    if (!res.ok) return [];
    const { products } = await res.json();
    // Preserve the search engine's rank order (the products endpoint doesn't guarantee it).
    const order = new Map(ids.map((id, i) => [id, i]));
    return (products ?? []).slice().sort((a: any, b: any) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  } catch {
    return [];
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 80);

  const { results, facets } = query ? await runSearch(query) : { results: [], facets: {} };
  const reasonById = new Map(results.map((r) => [r.id, r.reason]));
  const products = await productsByIds(results.map((r) => r.id));
  const facetEntries = Object.entries(facets).sort((a, b) => b[1] - a[1]);

  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <PageSignal type="page_view" context={{ page: 'search', q: query, results: products.length }} />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <p className="text-micro uppercase text-neutral-600">Search</p>
        <h1 className="mt-2 font-serif text-3xl font-light text-neutral-100">
          {query ? (
            <>
              Results for <span className="text-altar-goldlight">&ldquo;{query}&rdquo;</span>
            </>
          ) : (
            'Search the Broadcast'
          )}
        </h1>

        {facetEntries.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {facetEntries.map(([chapter, count]) => (
              <Link
                key={chapter}
                href={`/chapter/${chapter}`}
                className="rounded-full border border-white/10 px-3 py-1 text-micro uppercase text-neutral-400 transition-colors hover:border-altar-gold/40 hover:text-altar-goldlight"
              >
                {chapter} · {count}
              </Link>
            ))}
          </div>
        )}

        {!query ? (
          <p className="mt-10 max-w-md text-sm leading-relaxed text-neutral-500">
            Name a mood, a material, a chapter &mdash; the Broadcast reads your words against the whole
            catalog and answers with what resonates.
          </p>
        ) : products.length === 0 ? (
          <div className="mt-16 text-center">
            <p className="text-sm text-neutral-500">Nothing matched &ldquo;{query}&rdquo;.</p>
            <Link
              href="/drops"
              className="mt-5 inline-block text-micro uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-altar-goldlight"
            >
              Browse the latest drops &rarr;
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p: any) => {
              const img = p.thumbnail || p.images?.[0]?.url || p.metadata?.main_image || '';
              const chapter = p.metadata?.chapter ?? '';
              const reason = reasonById.get(p.id);
              return (
                <Link key={p.id} href={`/p/${p.handle}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-obsidian">
                    <ProductImage
                      src={img}
                      alt={p.title}
                      chapter={chapter}
                      imgClassName="h-full w-full object-cover transition-transform duration-700 ease-sacred group-hover:scale-[1.05]"
                      loading="lazy"
                    />
                    <span className="pointer-events-none absolute inset-0 bg-altar-veil opacity-60" />
                    {chapter && (
                      <span className="absolute left-3 top-3 text-micro uppercase text-altar-goldlight/80">{chapter}</span>
                    )}
                  </div>
                  <div className="mt-3 px-0.5">
                    <h3 className="line-clamp-1 font-serif text-base text-neutral-100">{p.title}</h3>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm tabular-nums text-neutral-300">{priceStr(p)}</p>
                      {reason && <p className="truncate text-micro text-neutral-600">{reason}</p>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
