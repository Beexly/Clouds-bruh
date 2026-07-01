/**
 * Canonical site origin — single source of truth. Anything that builds an absolute URL
 * (metadata base, sitemap, JSON-LD, OG) imports SITE from here, so a domain change is one line.
 * Production sets NEXT_PUBLIC_SITE_URL; the fallback is the canonical brand domain — never a
 * `.example` placeholder (site.test.ts fails CI if one ever leaks back in).
 */
export const CANONICAL_SITE = 'https://lumeralabel.com';

/**
 * Resolve the site origin. Priority: explicit NEXT_PUBLIC_SITE_URL → the current Vercel deployment
 * host (so a zero-config demo deploy gets correct OG/canonical/sitemap URLs automatically) → the
 * canonical brand domain. Pure; trims slashes. The optional 2nd arg keeps the 1-arg signature that
 * site.test.ts relies on.
 */
export function resolveSite(raw?: string | null, vercelHost?: string | null): string {
  const v = (raw ?? '').trim();
  if (v) return v.replace(/\/+$/, '');
  const host = (vercelHost ?? '').trim();
  if (host) return `https://${host.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return CANONICAL_SITE;
}

export const SITE = resolveSite(
  process.env.NEXT_PUBLIC_SITE_URL,
  process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL,
);
