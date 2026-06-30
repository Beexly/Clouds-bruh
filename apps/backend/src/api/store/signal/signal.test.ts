import { describe, it, expect } from 'vitest';
import { validateSignal } from './route';

/**
 * The /store/signal POST is unauthenticated and fired on every storefront interaction, so its
 * validator is the only thing standing between arbitrary client input and the signal store +
 * real-time personalization. These tests pin the accept/reject + normalization contract.
 */
describe('validateSignal', () => {
  const valid = {
    id: 'evt-1',
    visitor_id: 'vis-1',
    session_id: 'sess-1',
    type: 'product_view',
    entity_id: 'prod_123',
    value: null,
    context: { channel: 'web', chapter: 'armor' },
    ts: '2026-06-30T00:00:00.000Z',
  };

  it('accepts a well-formed event exactly as the storefront emits it', () => {
    const r = validateSignal(valid);
    expect('event' in r).toBe(true);
    if ('event' in r) {
      expect(r.event.type).toBe('product_view');
      expect(r.event.visitor_id).toBe('vis-1');
      expect(r.event.entity_id).toBe('prod_123');
      expect(r.event.context).toMatchObject({ channel: 'web', chapter: 'armor' });
    }
  });

  it('rejects a non-object body', () => {
    expect(validateSignal(null)).toHaveProperty('error');
    expect(validateSignal('nope')).toHaveProperty('error');
    expect(validateSignal([1, 2, 3])).toHaveProperty('error');
  });

  it('rejects an unknown event type (no arbitrary types into MIND/ORACLE)', () => {
    expect(validateSignal({ ...valid, type: 'drop_table' })).toHaveProperty('error');
  });

  it('requires a visitor_id', () => {
    expect(validateSignal({ ...valid, visitor_id: '' })).toHaveProperty('error');
    expect(validateSignal({ ...valid, visitor_id: 123 })).toHaveProperty('error');
  });

  it('caps oversized string fields instead of trusting client length', () => {
    const big = 'x'.repeat(5000);
    const r = validateSignal({ ...valid, entity_id: big, visitor_id: 'vis-1' });
    expect('event' in r).toBe(true);
    if ('event' in r) expect((r.event.entity_id ?? '').length).toBeLessThanOrEqual(256);
  });

  it('drops a non-object context to an empty object (never throws)', () => {
    const r = validateSignal({ ...valid, context: 'not-an-object' });
    expect('event' in r).toBe(true);
    if ('event' in r) expect(r.event.context).toEqual({});
  });

  it('preserves a numeric value (e.g. dwell ms / scroll depth)', () => {
    const r = validateSignal({ ...valid, type: 'dwell', value: 1234 });
    expect('event' in r).toBe(true);
    if ('event' in r) expect(r.event.value).toBe(1234);
  });
});
