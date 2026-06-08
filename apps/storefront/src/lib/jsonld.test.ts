import { describe, it, expect } from 'vitest';
import { absUrl, breadcrumbList, webSite, organization } from './jsonld';

const SITE = 'https://lumera.example';

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
