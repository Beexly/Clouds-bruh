import { describe, it, expect, afterEach } from 'vitest';
import {
  brandAudit,
  datasetQuery,
  contentDraft,
  schemaWrite,
  imageTemplates,
  imageWrite,
  productDraft,
} from './stubs';

/**
 * Integrity invariant: stub tools must be HONEST.
 *  - brand_audit must NEVER auto-pass (off-brand assets don't ship).
 *  - mock tools must carry a mock/unconfigured marker so callers can tell fake from real.
 */
describe('brand_audit — never auto-passes', () => {
  it('returns needs_human_review (passed=false) when no content supplied', async () => {
    const out = (await brandAudit.run({ entity_type: 'product', entity_id: 'p1' })) as any;
    expect(out.passed).toBe(false);
    expect(out.status).toBe('needs_human_review');
    expect(out.reason).toMatch(/not wired|review/i);
  });

  it('does not pass even when the heuristic finds nothing off-brand', async () => {
    const out = (await brandAudit.run({
      entity_type: 'product',
      entity_id: 'p1',
      content: { chapter: 'armor', title: 'Luminous editorial piece', description: 'Dark, sparse.' },
    })) as any;
    // Clean heuristic → still requires human sign-off, never an auto-pass.
    expect(out.passed).toBe(false);
    expect(out.heuristic_clean).toBe(true);
    expect(out.status).toBe('needs_human_review');
  });

  it('flags obvious off-brand language and refuses to pass', async () => {
    const out = (await brandAudit.run({
      entity_type: 'product',
      entity_id: 'p2',
      content: { chapter: 'armor', title: 'CHEAPEST discount clearance BUY NOW!!!' },
    })) as any;
    expect(out.passed).toBe(false);
    expect(out.status).toBe('flagged');
    expect(out.heuristic_clean).toBe(false);
    expect(Array.isArray(out.findings)).toBe(true);
    expect(out.findings.length).toBeGreaterThan(0);
  });

  it('flags missing/invalid chapter alignment', async () => {
    const out = (await brandAudit.run({
      entity_type: 'product',
      entity_id: 'p3',
      content: { title: 'Nice product', chapter: 'not_a_chapter' },
    })) as any;
    expect(out.passed).toBe(false);
    expect(out.heuristic_clean).toBe(false);
  });
});

describe('mock tools carry a mock/unconfigured marker', () => {
  it('dataset_query marks source=mock', async () => {
    const out = (await datasetQuery.run({ q: 'test' })) as any;
    expect(out.source).toBe('mock');
  });

  it('content_draft marks source=mock', async () => {
    const out = (await contentDraft.run({ entity_type: 'product', entity_id: 'p1' })) as any;
    expect(out.source).toBe('mock');
  });

  it('schema_write marks source=mock', async () => {
    const out = (await schemaWrite.run({ product_id: 'p1' })) as any;
    expect(out.source).toBe('mock');
  });

  it('image_templates marks source=mock', async () => {
    const out = (await imageTemplates.run({})) as any;
    expect(out.source).toBe('mock');
  });

  it('product_draft marks source=mock', async () => {
    const out = (await productDraft.run({ title: 'X', chapter: 'armor', price: 10 })) as any;
    expect(out.source).toBe('mock');
  });

  describe('image_write keyed on HIGGSFIELD_API_KEY', () => {
    const saved = process.env.HIGGSFIELD_API_KEY;
    afterEach(() => {
      if (saved === undefined) delete process.env.HIGGSFIELD_API_KEY;
      else process.env.HIGGSFIELD_API_KEY = saved;
    });

    it('marks source=mock when key absent', async () => {
      delete process.env.HIGGSFIELD_API_KEY;
      const out = (await imageWrite.run({ product_id: 'p1' })) as any;
      expect(out.source).toBe('mock');
      expect(out.status).toBe('mock');
    });

    it('marks source=live when key present', async () => {
      process.env.HIGGSFIELD_API_KEY = 'test-key';
      const out = (await imageWrite.run({ product_id: 'p1' })) as any;
      expect(out.source).toBe('live');
      expect(out.status).toBe('generated');
    });
  });
});
