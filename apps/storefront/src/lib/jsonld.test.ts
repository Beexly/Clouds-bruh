import { describe, it, expect } from 'vitest';
import { absUrl, breadcrumbList, webSite, organization, faqPage, jsonLdScript } from './jsonld';

const SITE = 'https://lumera.example';

describe('jsonLdScript (XSS-safe serialization)', () => {
  it('escapes < so a malicious value cannot break out of the <script> tag', () => {
    const out = jsonLdScript({ name: 'Hoodie </script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c'); // < was escaped
    expect(() => JSON.parse(out.replace(/\\u003c/g, '<'))).not.toThrow(); // still valid JSON
  });
  it('escapes the U+2028/U+2029 line separators', () => {
    const out = jsonLdScript({ s: `a${String.fromCharCode(0x2028)}b${String.fromCharCode(0x2029)}c` });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
  });
});

describe('absUrl', () => {
  it('joins relative paths and collapses slashes', () => {
    expect(absUrl(SITE, '/p/foo')).toBe('https://lumera.example/p/foo');
    expect(absUrl(SITE + '/', 'p/foo')).toBe('https://lumera.example/p/foo');
  });
  it('passes absolute urls through untouched', () => {
    expect(absUrl(SITE, 'https://cdn.example/x.png')).toBe('https://cdn.example/x.png');
  });
});

describe('breadcrumbList', () => {
  it('builds a 1-based ItemList with absolute item urls', () => {
    const ld = breadcrumbList(SITE, [
      { name: 'Broadcast', url: '/' },
      { name: 'altar', url: '/chapter/altar' },
      { name: 'A Product', url: '/p/a-product' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0]).toMatchObject({ '@type': 'ListItem', position: 1, name: 'Broadcast' });
    expect(ld.itemListElement[2].position).toBe(3);
    expect(ld.itemListElement[2].item).toBe('https://lumera.example/p/a-product');
  });

  it('drops empty crumbs without leaving a hole in positions', () => {
    const ld = breadcrumbList(SITE, [
      { name: 'Broadcast', url: '/' },
      { name: '', url: '/chapter/' },
      { name: 'A Product', url: '/p/a-product' },
    ]);
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
    expect(ld.itemListElement.map((i) => i.name)).toEqual(['Broadcast', 'A Product']);
  });
});

describe('webSite', () => {
  it('emits a SearchAction with the required query-input placeholder', () => {
    const ld = webSite(SITE, 'Lumera', '/search', 'q');
    expect(ld['@type']).toBe('WebSite');
    expect(ld.url).toBe(SITE);
    expect(ld.potentialAction['@type']).toBe('SearchAction');
    expect(ld.potentialAction.target.urlTemplate).toBe(
      'https://lumera.example/search?q={search_term_string}',
    );
    expect(ld.potentialAction['query-input']).toBe('required name=search_term_string');
  });
});

describe('organization', () => {
  it('enriches with an absolute logo and filtered sameAs', () => {
    const ld = organization({
      name: 'Lumera',
      url: SITE,
      slogan: 'tagline',
      logo: '/icon.svg',
      sameAs: ['https://x.com/lumera', '', '  '],
    });
    expect(ld['@type']).toBe('Organization');
    expect(ld.logo).toBe('https://lumera.example/icon.svg');
    expect(ld.sameAs).toEqual(['https://x.com/lumera']);
    expect(ld.slogan).toBe('tagline');
  });

  it('omits logo / sameAs when not provided', () => {
    const ld = organization({ name: 'Lumera', url: SITE });
    expect('logo' in ld).toBe(false);
    expect('sameAs' in ld).toBe(false);
  });
});

describe('faqPage', () => {
  it('builds a FAQPage with Question/Answer pairs', () => {
    const ld = faqPage([
      { q: 'How long is shipping?', a: 'About 12 business days.' },
      { q: 'Returns?', a: '30 days, unused.' },
    ]);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      name: 'How long is shipping?',
      acceptedAnswer: { '@type': 'Answer', text: 'About 12 business days.' },
    });
  });

  it('drops empty or half-filled items', () => {
    const ld = faqPage([{ q: 'Only a question', a: '' }, { q: '', a: 'orphan answer' }, { q: 'ok', a: 'yes' }]);
    expect(ld.mainEntity).toHaveLength(1);
    expect(ld.mainEntity[0].name).toBe('ok');
  });
});
