import { describe, it, expect } from 'vitest';
import { inferBlock } from './loop';
import type { SignalEvent } from '@alterxiv/shared';

function makeEvent(type: SignalEvent['type']): SignalEvent {
  return {
    id: 'test-' + type,
    visitor_id: 'v1',
    session_id: 's1',
    type,
    context: {},
    ts: new Date().toISOString(),
  };
}

describe('inferBlock', () => {
  it('purchase maps to for_you', () => {
    expect(inferBlock(makeEvent('purchase'))).toBe('for_you');
  });

  it('add_to_cart maps to for_you', () => {
    expect(inferBlock(makeEvent('add_to_cart'))).toBe('for_you');
  });

  it('product_view maps to trending_in_chapter', () => {
    expect(inferBlock(makeEvent('product_view'))).toBe('trending_in_chapter');
  });

  it('drop_view maps to live_drops', () => {
    expect(inferBlock(makeEvent('drop_view'))).toBe('live_drops');
  });

  it('page_view returns null (no block reward)', () => {
    expect(inferBlock(makeEvent('page_view'))).toBeNull();
  });

  it('recommendation_click returns null', () => {
    expect(inferBlock(makeEvent('recommendation_click'))).toBeNull();
  });
});
