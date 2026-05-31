import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ProductRail } from '../../../components/ProductRail';
import { PageSignal } from '../../../components/PageSignal';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'] as const;
type Chapter = (typeof CHAPTERS)[number];

const VERSE: Record<Chapter, string> = {
  stillness: 'Be still, and know.',
  armor: 'Put on the whole armor.',
  signal: 'A voice in the wilderness.',
  altar: 'Build here an altar.',
  relentless: 'Press on toward the goal.',
};

async function fetchChapterProducts(chapter: string) {
  try {
    const res = await fetch(
      `${API}/store/products?fields=id,title,handle,thumbnail,metadata,variants,images&limit=100`,
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
  return { title, description: `The ${title} chapter — ${VERSE[chapter as Chapter] ?? ''}` };
}

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  if (!CHAPTERS.includes(chapter as Chapter)) notFound();
  const products = await fetchChapterProducts(chapter);

  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <PageSignal type="chapter_enter" context={{ chapter }} />
      <section className="px-6 py-24 text-center">
        <p className="mb-3 text-micro uppercase text-neutral-600">Chapter</p>
        <h1 className="font-serif text-5xl font-light capitalize tracking-[0.1em] text-foil md:text-7xl">
          {chapter}
        </h1>
        <p className="mx-auto mt-5 max-w-md font-serif text-lg italic text-neutral-400">
          {VERSE[chapter as Chapter]}
        </p>
      </section>
      {products.length ? (
        <ProductRail blockName="trending_in_chapter" products={products} />
      ) : (
        <p className="pb-24 text-center text-micro uppercase text-neutral-600">
          The altar is being prepared.
        </p>
      )}
    </main>
  );
}
