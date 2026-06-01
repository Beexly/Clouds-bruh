import { describe, it, expect } from 'vitest';
import { CHAPTER_HINTS, CHAPTERS, queryVector } from './route';

/** Locks the chapter-affinity map — including the Lumera rebrand of the `altar` chapter. */
describe('search chapter affinity', () => {
  it('maps all five chapters with non-empty hints', () => {
    expect(CHAPTERS).toHaveLength(5);
    for (const c of CHAPTERS) {
      expect(CHAPTER_HINTS[c]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('altar reads as craft/keepsake, not faith (Lumera rebrand)', () => {
    const altar = CHAPTER_HINTS.altar;
    expect(altar).toEqual(expect.arrayContaining(['craft', 'keepsake', 'heirloom']));
    for (const faith of ['worship', 'holy', 'sanctuary', 'sacred']) {
      expect(altar).not.toContain(faith);
    }
  });

  it('biases a query toward the matching chapter', () => {
    const v = queryVector('a handmade heirloom keepsake');
    const altarIdx = CHAPTERS.indexOf('altar');
    expect(v[altarIdx]).toBe(Math.max(...v));
  });

  it('returns a neutral vector when nothing matches', () => {
    expect(queryVector('zzz nothing matches here')).toEqual([0.2, 0.2, 0.2, 0.2, 0.2]);
  });
});
