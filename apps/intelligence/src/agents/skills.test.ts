import { describe, it, expect } from 'vitest';
import { AGENTS } from './index';
import { buildSystemPrompt } from '../orchestrator/run-agent';

/**
 * SKILLS.md, made real. Each agent loads named e-commerce playbooks (skills) and the
 * orchestrator must surface them to the model. These invariants keep the wiring honest:
 * a skill that's declared but never shown to Claude is a skill that doesn't exist.
 */
describe('agent skills', () => {
  it('every agent declares at least one skill', () => {
    const missing: string[] = [];
    for (const def of Object.values(AGENTS)) {
      if (!(def.skills?.length ?? 0)) missing.push(def.name);
    }
    expect(missing).toEqual([]);
  });

  it('skills are non-empty, trimmed, unique strings', () => {
    for (const def of Object.values(AGENTS)) {
      const skills = def.skills ?? [];
      for (const s of skills) {
        expect(typeof s, `${def.name} skill type`).toBe('string');
        expect(s.length, `${def.name} non-empty skill`).toBeGreaterThan(0);
        expect(s.trim(), `${def.name} trimmed skill`).toBe(s);
      }
      expect(new Set(skills).size, `${def.name} unique skills`).toBe(skills.length);
    }
  });

  it('buildSystemPrompt surfaces the agent skills as a "Playbooks you apply" line', () => {
    for (const def of Object.values(AGENTS)) {
      const prompt = buildSystemPrompt(def);
      expect(prompt).toContain('Playbooks you apply:');
      for (const s of def.skills ?? []) {
        expect(prompt, `${def.name} prompt includes ${s}`).toContain(s);
      }
      // self-audit is still appended (verified, not assumed)
      expect(prompt).toContain('SELF-AUDIT before finishing:');
    }
  });

  it('buildSystemPrompt omits the playbooks line when an agent has no skills', () => {
    const prompt = buildSystemPrompt({
      name: 'test',
      department: 'test',
      mission: 'test',
      model: 'test',
      tools: [],
      escalation: ['x'],
      selfAudit: 'check',
      systemPrompt: 'You are a test agent.',
    });
    expect(prompt).not.toContain('Playbooks you apply:');
    expect(prompt).toContain('SELF-AUDIT before finishing: check');
  });
});
