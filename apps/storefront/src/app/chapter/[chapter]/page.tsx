import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductRail } from '../../../components/ProductRail';
import { PageSignal } from '../../../components/PageSignal';
import { getRegionId, PRODUCT_FIELDS } from '../../../lib/catalog';
import { DEMO, demoProductsByChapter } from '../../../lib/demo';
import { breadcrumbList, jsonLdScript } from '../../../lib/jsonld';
import { SITE } from '../../../lib/site';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
type Chapter = (typeof CHAPTERS)[number];

const CHAPTER_LINE: Record<Chapter, string> = {
  stillness: 'Where the noise goes quiet.',
  armor: 'Built to take the world.',
  signal: 'Tuned to what comes next.',
  altar: 'Made to be kept.',
  relentless: "For the ones who don't stop.",
};

async function fetchChapterProducts(chapter: string) {
  if (DEMO) return demoProductsByChapter(chapter);
  try {
    const region = await getRegionId();
    const res = await fetch(
      `${API}/store/products?region_id=${region}&fields=${PRODUCT_FIELDS}&limit=100`,
      { cache: 'no-store', headers: { 'x-publishable-api-key': PK } }
    );
    if (!res.ok) return [];
    const { products } = await res.json();
    return (products ?? []).filter((p: any) => p.metadata?.chapter === chapter);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string }>;
}): Promise<Metadata> {
  const { chapter } = await params;
  const title = chapter.charAt(0).toUpperCase() + chapter.slice(1);
  return { title, description: `The ${title} chapter — ${CHAPTER_LINE[chapter as Chapter] ?? ''}` };
}

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  if (!CHAPTERS.includes(chapter as Chapter)) notFound();
  const products = await fetchChapterProducts(chapter);

  const breadcrumbs = breadcrumbList(SITE, [
    { name: 'Broadcast', url: '/' },
    { name: chapter, url: `/chapter/${chapter}` },
  ]);

  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbs) }} />
      <PageSignal type="chapter_enter" context={{ chapter }} />
      <section className="px-6 py-24 text-center">
        <p className="mb-3 text-micro uppercase text-neutral-600">Chapter</p>
        <h1 className="font-serif text-5xl font-light capitalize tracking-[0.1em] text-foil md:text-7xl">
          {chapter}
        </h1>
        <p className="mx-auto mt-5 max-w-md font-serif text-lg italic text-neutral-400">
          {CHAPTER_LINE[chapter as Chapter]}
        </p>
      </section>
      {products.length ? (
        <ProductRail blockName="trending_in_chapter" products={products} />
      ) : (
        <p className="pb-24 text-center text-micro uppercase text-neutral-600">
          This chapter goes live soon.
        </p>
      )}
    </main>
  );
}
