/**
 * Structured-data (schema.org JSON-LD) builders. Pure + dependency-free so each emitted object can
 * be unit-tested for shape/validity and reused across server components. Every builder returns a
 * plain object the caller serialises into a single <script type="application/ld+json">.
 *
 * Why pure: SEO regressions are silent — a malformed BreadcrumbList just stops showing rich results.
 * Extracting the builders lets us assert the contract (correct @type, absolute URLs, 1-based
 * positions) in CI instead of eyeballing rendered HTML.
 */

const SCHEMA = 'https://schema.org';

/**
 * Serialize a JSON-LD object for SAFE injection into <script type="application/ld+json"> via
 * dangerouslySetInnerHTML. JSON.stringify does NOT escape `<`, so a value containing `</script>`
 * (e.g. a scraped supplier title) could break out of the tag and execute. Escape `<` and the two
 * JSON-invalid line separators (U+2028/U+2029). Always use this instead of bare JSON.stringify for
 * JSON-LD blocks.
 */
export function jsonLdScript(data: unknown): string {
  // Escape `<` (prevents a value like `</script>` breaking out of the tag) and U+2028/U+2029
  // (valid in JSON strings but invalid inside a <script> block).
  return JSON.stringify(data).replace(/[<\u2028\u2029]/g, (c) =>
    c === '<' ? '\\u003c' : c === '\u2028' ? '\\u2028' : '\\u2029'
  );
}

export interface Crumb {
  name: string;
  /** Absolute or root-relative URL; joined to `siteUrl` when relative. */
  url: string;
}

/** Join a (possibly relative) path to the site origin, collapsing duplicate slashes. Pure. */
export function absUrl(siteUrl: string, path: string): string {
  if (!path) return siteUrl;
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteUrl.replace(/\/+$/, '');
  const rel = path.replace(/^\/+/, '');
  return `${base}/${rel}`;
}

/**
 * BreadcrumbList — ordered trail for PDP + chapter pages. Positions are 1-based per the spec; empty
 * crumbs are dropped so a missing chapter never produces a hole in the list.
 */
export function breadcrumbList(siteUrl: string, crumbs: Crumb[]) {
  const items = crumbs
    .filter((c) => c && c.name && c.url)
    .map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absUrl(siteUrl, c.url),
    }));
  return {
    '@context': SCHEMA,
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

/**
 * WebSite + SearchAction — drives the Google sitelinks search box. The `{search_term_string}`
 * placeholder is required verbatim by the spec; we point it at the storefront's existing /search.
 */
export function webSite(siteUrl: string, name: string, searchPath = '/search', queryParam = 'q') {
  const base = siteUrl.replace(/\/+$/, '');
  const target = `${absUrl(base, searchPath)}?${queryParam}={search_term_string}`;
  return {
    '@context': SCHEMA,
    '@type': 'WebSite',
    name,
    url: base,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: target,
      },
      // schema.org requires query-input to name the placeholder used above.
      'query-input': `required name=${queryParam === 'q' ? 'search_term_string' : queryParam}`,
    },
  };
}

export interface OrgInput {
  name: string;
  url: string;
  slogan?: string;
  /** Logo path (relative ok) — enriches the Organization knowledge panel. */
  logo?: string;
  /** Social / authoritative profile URLs for sameAs. Empties are dropped. */
  sameAs?: string[];
}

/** Organization — enriched with an absolute logo URL + sameAs profile links. */
export function organization(input: OrgInput) {
  const sameAs = (input.sameAs ?? []).filter((u) => typeof u === 'string' && u.trim().length > 0);
  return {
    '@context': SCHEMA,
    '@type': 'Organization',
    name: input.name,
    url: input.url,
    ...(input.slogan ? { slogan: input.slogan } : {}),
    ...(input.logo ? { logo: absUrl(input.url, input.logo) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

/** FAQPage — drives FAQ rich results. Empty/half-filled items are dropped so nothing malformed ships. */
export function faqPage(items: FaqItem[]) {
  return {
    '@context': SCHEMA,
    '@type': 'FAQPage',
    mainEntity: items
      .filter((i) => i && i.q?.trim() && i.a?.trim())
      .map((i) => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.a },
      })),
  };
}
