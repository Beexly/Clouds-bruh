import type { MetadataRoute } from 'next';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://alterxiv.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
  ];

  try {
    const res = await fetch(`${API}/store/products?fields=handle,updated_at&limit=100`, {
      headers: { 'x-publishable-api-key': PK },
    });
    if (!res.ok) return base;
    const { products } = await res.json();
    const productUrls: MetadataRoute.Sitemap = (products ?? []).map((p: any) => ({
      url: `${SITE}/p/${p.handle}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...base, ...productUrls];
  } catch {
    return base;
  }
}
