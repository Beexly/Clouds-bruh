import { describe, it, expect } from 'vitest';
import { AGENTS } from '../agents';
import { TOOLS, toolsFor } from './index';

/**
 * Control-plane invariant (F01 lesson): every connector an agent declares MUST resolve in the
 * registry. A missing tool would silently fail mid-loop — this test fails the build instead.
 */
describe('tool/connector registry', () => {
  it('every agent-declared tool is registered', () => {
    const missing: string[] = [];
    for (const def of Object.values(AGENTS)) {
      for (const t of def.tools ?? []) {
        if (!TOOLS[t]) missing.push(`${def.name} → ${t}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every agent declares an escalation gate', () => {
    for (const def of Object.values(AGENTS)) {
      expect(def.escalation?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('every registered tool has a name, description, and run()', () => {
    for (const [key, tool] of Object.entries(TOOLS)) {
      expect(tool.name, key).toBeTruthy();
      expect(tool.description, key).toBeTruthy();
      expect(typeof tool.run, key).toBe('function');
    }
  });

  it('toolsFor resolves a subset and drops unknowns', () => {
    const resolved = toolsFor(['ledger', 'does_not_exist']);
    expect(resolved.length).toBe(1);
    expect(resolved[0].name).toBe('ledger');
  });
});
