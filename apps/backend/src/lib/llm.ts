/**
 * llm.ts — a tiny provider-flexible chat helper for Lumera's concierge (Polaris/Shepherd).
 *
 * The agents (CONGREGATION) always run on Anthropic via ANTHROPIC_API_KEY/CLAUDE_MODEL. The
 * conversational concierge is the one AI cost that scales with traffic, so this helper lets it
 * optionally run on a FREE or cheap OpenAI-compatible endpoint (OpenRouter, Groq, Together,
 * Cerebras, Google Gemini OpenAI-compat, local Ollama, etc.) WITHOUT losing the Anthropic default.
 *
 * Gating is backward-compatible: with no new env, selectLlmProvider() behaves exactly as before
 * (Anthropic when ANTHROPIC_API_KEY is set and real, else 'none' → mock reply in the caller).
 *
 * Everything goes through the global `fetch` — no SDK, no new deps.
 */

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type LlmProvider = 'openai_compat' | 'anthropic' | 'none';

/**
 * Decide which provider to use, in priority order. PURE (no I/O) and exported for tests.
 *  - 'openai_compat' when LLM_BASE_URL AND LLM_API_KEY are both set (any OpenAI-compatible endpoint);
 *  - else 'anthropic' when ANTHROPIC_API_KEY is set and is not the 'sk-ant-...' placeholder;
 *  - else 'none'.
 */
export function selectLlmProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  if (env.LLM_BASE_URL && env.LLM_API_KEY) return 'openai_compat';
  const key = env.ANTHROPIC_API_KEY;
  if (key && key !== 'sk-ant-...') return 'anthropic';
  return 'none';
}

const TIMEOUT_MS = 15_000;
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-4-8';

export interface LlmChatOptions {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  /** Explicit model override; otherwise resolved per-provider from env. */
  model?: string;
}

export interface LlmChatResult {
  text: string;
  provider: string;
  /** True only when a live provider returned non-empty text. */
  live: boolean;
}

/**
 * Send a chat completion to whichever provider selectLlmProvider() picks. NEVER throws —
 * network/parse failures and the 'none' case all resolve to { text: '', live: false }.
 *
 * SHEPHERD_MODEL is read as an optional concierge-specific model override (so Polaris can use a
 * cheaper model than the agents) when no explicit opts.model is passed.
 */
export async function llmChat(opts: LlmChatOptions): Promise<LlmChatResult> {
  const env = process.env;
  const provider = selectLlmProvider(env);
  const maxTokens = opts.maxTokens ?? 400;
  // SHEPHERD_MODEL lets the concierge pin a cheaper model than CLAUDE_MODEL without affecting agents.
  const shepherdModel = env.SHEPHERD_MODEL;

  if (provider === 'none') {
    return { text: '', provider: 'none', live: false };
  }

  if (provider === 'openai_compat') {
    const base = (env.LLM_BASE_URL as string).replace(/\/$/, '');
    const model = opts.model ?? shepherdModel ?? env.LLM_MODEL ?? DEFAULT_OPENAI_MODEL;
    const messages: LlmMessage[] = opts.system
      ? [{ role: 'system', content: opts.system }, ...opts.messages]
      : opts.messages;
    try {
      const r = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${env.LLM_API_KEY}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      });
      const data: any = await r.json();
      const text: string = data?.choices?.[0]?.message?.content ?? '';
      return { text, provider: 'openai_compat', live: !!text };
    } catch {
      return { text: '', provider: 'openai_compat', live: false };
    }
  }

  // provider === 'anthropic'
  const model = opts.model ?? shepherdModel ?? env.CLAUDE_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(opts.system ? { system: opts.system } : {}),
        messages: opts.messages,
      }),
    });
    const data: any = await r.json();
    const text: string = data?.content?.[0]?.text ?? '';
    return { text, provider: 'anthropic', live: !!text };
  } catch {
    return { text: '', provider: 'anthropic', live: false };
  }
}
