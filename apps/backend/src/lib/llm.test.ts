import { describe, it, expect, afterEach } from 'vitest';
import { selectLlmProvider, llmChat } from './llm';

/**
 * llm provider selection + safe-fallback behavior.
 *
 * selectLlmProvider is pure: it reads only the env object passed to it (default process.env),
 * so we test it with explicit env objects — no global mutation, no network.
 *
 * llmChat must NEVER throw and must return { live: false } when nothing is configured. We assert
 * this without hitting the network by clearing every provider env var first (provider === 'none'
 * short-circuits before any fetch).
 */

describe('selectLlmProvider', () => {
  it("returns 'openai_compat' when LLM_BASE_URL and LLM_API_KEY are both set", () => {
    expect(
      selectLlmProvider({ LLM_BASE_URL: 'https://x/v1', LLM_API_KEY: 'k' } as NodeJS.ProcessEnv)
    ).toBe('openai_compat');
  });

  it("openai_compat wins over anthropic when both are configured", () => {
    expect(
      selectLlmProvider({
        LLM_BASE_URL: 'https://x/v1',
        LLM_API_KEY: 'k',
        ANTHROPIC_API_KEY: 'sk-ant-real-key',
      } as NodeJS.ProcessEnv)
    ).toBe('openai_compat');
  });

  it("requires BOTH LLM_BASE_URL and LLM_API_KEY for openai_compat (base only → not openai_compat)", () => {
    expect(
      selectLlmProvider({
        LLM_BASE_URL: 'https://x/v1',
        ANTHROPIC_API_KEY: 'sk-ant-real-key',
      } as NodeJS.ProcessEnv)
    ).toBe('anthropic');
    expect(selectLlmProvider({ LLM_BASE_URL: 'https://x/v1' } as NodeJS.ProcessEnv)).toBe('none');
    expect(selectLlmProvider({ LLM_API_KEY: 'k' } as NodeJS.ProcessEnv)).toBe('none');
  });

  it("returns 'anthropic' when only a real ANTHROPIC_API_KEY is set", () => {
    expect(
      selectLlmProvider({ ANTHROPIC_API_KEY: 'sk-ant-real-key' } as NodeJS.ProcessEnv)
    ).toBe('anthropic');
  });

  it("treats the 'sk-ant-...' placeholder as unset → 'none'", () => {
    expect(selectLlmProvider({ ANTHROPIC_API_KEY: 'sk-ant-...' } as NodeJS.ProcessEnv)).toBe('none');
  });

  it("returns 'none' when nothing is configured", () => {
    expect(selectLlmProvider({} as NodeJS.ProcessEnv)).toBe('none');
  });
});

describe('llmChat — safe fallback', () => {
  const saved = {
    LLM_BASE_URL: process.env.LLM_BASE_URL,
    LLM_API_KEY: process.env.LLM_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("returns { live:false, provider:'none' } without throwing when nothing is configured", async () => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const result = await llmChat({ messages: [{ role: 'user', content: 'hello' }] });
    expect(result.live).toBe(false);
    expect(result.provider).toBe('none');
    expect(result.text).toBe('');
  });

  it("treats the placeholder anthropic key as unconfigured (no network)", async () => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-...';

    const result = await llmChat({ messages: [{ role: 'user', content: 'hello' }] });
    expect(result.live).toBe(false);
    expect(result.provider).toBe('none');
  });
});
