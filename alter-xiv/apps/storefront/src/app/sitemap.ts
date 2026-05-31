import type { MetadataRoute } from 'next';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://alterxiv.com';

const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...CHAPTERS.map((c) => ({
      url: `${SITE}/chapter/${c}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];

  const headers = { 'x-publishable-api-key': PK };
  try {
    const [pRes, dRes] = await Promise.all([
      fetch(`${API}/store/products?fields=handle,updated_at&limit=100`, { headers }),
      fetch(`${API}/store/drops`, { headers }).catch(() => null),
    ]);
    const products = pRes.ok ? (await pRes.json()).products ?? [] : [];
    const drops = dRes?.ok ? (await dRes.json()).drops ?? [] : [];

    const productUrls: MetadataRoute.Sitemap = products.map((p: any) => ({
      url: `${SITE}/p/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    const dropUrls: MetadataRoute.Sitemap = drops
      .filter((d: any) => d.status !== 'archived')
      .map((d: any) => ({
        url: `${SITE}/drop/${d.id}`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 0.9,
      }));
    return [...base, ...dropUrls, ...productUrls];
  } catch {
    return base;
  }
}
