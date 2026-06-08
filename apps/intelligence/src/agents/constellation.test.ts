import { describe, it, expect } from 'vitest';
import { AGENTS } from './index';
import { CONSTELLATION, CONSTELLATION_BY_KEY } from '@alterxiv/shared';

/**
 * The Founder's Cockpit renders the workforce from the shared CONSTELLATION manifest. If that drifts
 * from the real agent registry, the founder sees a phantom worker or misses a real one. These
 * invariants keep the dash honest: the roster and the registry are the same set, both directions.
 */
describe('constellation manifest <-> agent registry', () => {
  it('every registered agent appears in the public Constellation roster', () => {
    const missing = Object.keys(AGENTS).filter((k) => !CONSTELLATION_BY_KEY[k]);
    expect(missing).toEqual([]);
  });

  it('every Constellation member maps to a real agent (no phantom workers)', () => {
    const phantom = CONSTELLATION.map((m) => m.key).filter((k) => !AGENTS[k]);
    expect(phantom).toEqual([]);
  });

  it('roster entries are complete and well-formed', () => {
    const keys = new Set<string>();
    for (const m of CONSTELLATION) {
      for (const field of ['key', 'name', 'department', 'role', 'cadence'] as const) {
        expect(m[field]?.trim().length, `${m.key}.${field}`).toBeGreaterThan(0);
      }
      expect(keys.has(m.key), `duplicate roster key ${m.key}`).toBe(false);
      keys.add(m.key);
    }
  });

  it("each member's gated actions equal the agent's real escalation gate (dash guardrails cannot lie)", () => {
    for (const m of CONSTELLATION) {
      const real = [...(AGENTS[m.key]?.escalation ?? [])].sort();
      const shown = [...m.gated].sort();
      expect(shown, `${m.key} gated actions must match its escalation gate`).toEqual(real);
    }
  });
});
