/**
 * Canonical site origin — single source of truth. Anything that builds an absolute URL
 * (metadata base, sitemap, JSON-LD, OG) imports SITE from here, so a domain change is one line.
 * Production sets NEXT_PUBLIC_SITE_URL; the fallback is the canonical brand domain — never a
 * `.example` placeholder (site.test.ts fails CI if one ever leaks back in).
 */
export const CANONICAL_SITE = 'https://lumeralabel.com';

/** Resolve the site origin from an env value: trims trailing slashes, falls back to canonical. Pure. */
export function resolveSite(raw?: string | null): string {
  const v = (raw ?? '').trim();
  return (v || CANONICAL_SITE).replace(/\/+$/, '');
}

export const SITE = resolveSite(process.env.NEXT_PUBLIC_SITE_URL);
