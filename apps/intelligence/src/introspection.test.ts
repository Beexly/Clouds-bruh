import { describe, it, expect } from 'vitest';
import { vendorHealthAudits } from './introspection';
import type { VendorConnection } from '@lumera/shared';

const conn = (over: Partial<VendorConnection> & { id: VendorConnection['id'] }): VendorConnection => ({
  label: String(over.id),
  mode: 'missing_credentials',
  connected: false,
  can_publish: false,
  can_submit_orders: false,
  last_checked_at: new Date().toISOString(),
  missing_env: ['SOME_KEY'],
  message: '',
  ...over,
});

describe('vendorHealthAudits (supplier-health self-audit)', () => {
  it('emits no findings when live mode is off', () => {
    expect(vendorHealthAudits([conn({ id: 'printify' })], false)).toEqual([]);
  });

  it('flags an error when a vendor is live but uncredentialed', () => {
    const out = vendorHealthAudits([conn({ id: 'printify', connected: false })], true);
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('error');
    expect(out[0].finding).toMatch(/no credentials/i);
  });

  it('warns when a connected vendor is still submission-gated', () => {
    const out = vendorHealthAudits(
      [conn({ id: 'cj', connected: true, mode: 'sandbox', can_submit_orders: false, missing_env: [] })],
      true
    );
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('warn');
    expect(out[0].finding).toMatch(/gated/i);
  });

  it('is silent for a fully live, submit-ready vendor', () => {
    const out = vendorHealthAudits(
      [conn({ id: 'cj', connected: true, mode: 'live', can_submit_orders: true, missing_env: [] })],
      true
    );
    expect(out).toEqual([]);
  });

  it('ignores the radar (discovery-only) connection', () => {
    expect(vendorHealthAudits([conn({ id: 'radar', connected: false })], true)).toEqual([]);
  });
});
