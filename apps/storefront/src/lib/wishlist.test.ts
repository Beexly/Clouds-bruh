import { describe, it, expect } from 'vitest';
import { add, remove, has, toggle, parse, merge, type WishlistItem } from './wishlist';

const item = (id: string, over: Partial<WishlistItem> = {}): WishlistItem => ({
  id,
  handle: `h-${id}`,
  title: `T ${id}`,
  added_at: 1000,
  ...over,
});

describe('wishlist reducer', () => {
  it('has() reports membership and is null-safe', () => {
    const list = [item('a'), item('b')];
    expect(has(list, 'a')).toBe(true);
    expect(has(list, 'z')).toBe(false);
    expect(has(list, '')).toBe(false);
    expect(has([], 'a')).toBe(false);
  });

  it('add() prepends and stamps added_at when omitted', () => {
    const next = add([], { id: 'a', handle: 'h', title: 'T' });
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('a');
    expect(typeof next[0].added_at).toBe('number');
  });

  it('add() is idempotent and returns the same reference for a dupe', () => {
    const list = [item('a')];
    const next = add(list, { id: 'a', handle: 'h', title: 'T' });
    expect(next).toBe(list);
    expect(next).toHaveLength(1);
  });

  it('add() ignores an empty id', () => {
    const list = [item('a')];
    expect(add(list, { id: '', handle: 'h', title: 'T' })).toBe(list);
  });

  it('remove() drops an item and is a no-op for an absent id', () => {
    const list = [item('a'), item('b')];
    const next = remove(list, 'a');
    expect(next.map((i) => i.id)).toEqual(['b']);
    expect(remove(list, 'z')).toBe(list);
  });

  it('toggle() flips membership', () => {
    const empty: WishlistItem[] = [];
    const added = toggle(empty, { id: 'a', handle: 'h', title: 'T' });
    expect(has(added, 'a')).toBe(true);
    const removed = toggle(added, { id: 'a', handle: 'h', title: 'T' });
    expect(has(removed, 'a')).toBe(false);
  });
});

describe('wishlist parse', () => {
  it('parses a JSON string array', () => {
    const json = JSON.stringify([item('a'), item('b')]);
    expect(parse(json).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns [] for garbage / non-arrays', () => {
    expect(parse('not json')).toEqual([]);
    expect(parse('{"x":1}')).toEqual([]);
    expect(parse(null)).toEqual([]);
    expect(parse(42)).toEqual([]);
  });

  it('drops malformed entries and de-dupes by id', () => {
    const raw = [
      item('a'),
      { id: 'a', handle: 'dup', title: 'dup' }, // duplicate id
      { handle: 'no-id', title: 'x' }, // missing id
      null,
      'string',
      item('b'),
    ];
    expect(parse(raw).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('wishlist merge', () => {
  it('unions by id, keeps earliest added_at, prefers populated fields', () => {
    const local = [item('a', { added_at: 50, image: 'local.png' })];
    const remote = [item('a', { added_at: 20, image: undefined, title: 'remote' }), item('b', { added_at: 10 })];
    const merged = merge(local, remote);
    const a = merged.find((i) => i.id === 'a')!;
    expect(a.added_at).toBe(20); // earliest wins
    expect(a.image).toBe('local.png'); // populated field preserved over undefined
    // newest-first ordering (a@20 before b@10)
    expect(merged.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
