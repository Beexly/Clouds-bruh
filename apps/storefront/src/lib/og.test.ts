import { describe, it, expect } from 'vitest';
import { renderOgImage, OG_SIZE } from './og';

/** Proves the share card actually renders to a PNG (no network font) — so the OG route can't ship blind. */
describe('OG share image', () => {
  it('renders a non-trivial valid PNG', async () => {
    const res = renderOgImage();
    const buf = Buffer.from(await res.arrayBuffer());
    // PNG magic number
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buf.length).toBeGreaterThan(2000);
  });

  it('is sized 1200×630 for social cards', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
  });
});
