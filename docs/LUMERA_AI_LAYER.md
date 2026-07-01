# Lumera — AI Model & Try-On Layer (integration map)

Honest map of how the requested model/try-on swarm plugs into Lumera. **What runs today vs. what
needs credentials is called out explicitly — nothing here fakes live inference.**

## 1. Text / reasoning models (Qwen3-235B, Kimi-K2, GLM-5.x, …)

**Already supported — no code change.** These open-weight models are served behind
OpenAI-compatible `/chat/completions` endpoints (OpenRouter, Together, DeepInfra, Groq, Fireworks,
or a local vLLM/Ollama). The concierge (Polaris) LLM layer (`apps/backend/src/lib/llm.ts`,
`selectLlmProvider`) already routes to any such endpoint:

```
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-...
LLM_MODEL=qwen/qwen3-235b-a22b        # or moonshotai/kimi-k2, zhipuai/glm-4.6, etc.
```

- The **autonomous agents (CONGREGATION)** still run on Anthropic (`ANTHROPIC_API_KEY`/`CLAUDE_MODEL`)
  by design; `LLM_*` overrides the **concierge only** (the one AI cost that scales with traffic).
- To run a *swarm* (route different tasks to different models), give each caller an explicit
  `opts.model` — the plumbing already accepts a per-call model. A model-router table is a small,
  additive follow-up; today it's env-driven.

## 2. Imagery (Artisan)

`HIGGSFIELD_API_KEY` gates product imagery via the Artisan agent + `tools/higgsfield.ts`. Unconfigured →
honest `status: 'unconfigured'` (no silent failure). Swappable for any image provider by editing that tool.

## 3. AR virtual try-on (IDM-VTON / Kolors) — NEW this pass

Added a **real, gated** adapter and store endpoint:

- `apps/backend/src/lib/tryon.ts` — provider-agnostic (`IDM_VTON_*` → `KOLORS_*` → generic `TRYON_*`).
  When configured it POSTs `{ person_image, garment_image, category }` with retry + a hard timeout
  (via the shared resilience toolkit) and returns `{ imageUrl }` or a `{ jobId }` to poll. When
  **unconfigured it returns `status: 'unconfigured'`** — no fake render.
- `GET /store/tryon` → `{ configured: boolean }` so the storefront can hide the affordance cleanly.
- `POST /store/tryon` → `{ person_image_url, garment_image_url, category? }`.
- Inputs must be **uploaded URLs** (upload the customer photo first; the API rejects multi-MB inline
  data URLs). Tested: gating, validation, provider precedence, and the success/error paths (mocked).

**To go live:** set one provider pair, host the model (Replicate/HF Inference/self-hosted), and
confirm the request/response field mapping matches your deployment. No inference happens without keys.

## 4. What this pass did NOT do (and why)

- **No live model calls / no "live revenue."** Live inference and real payments need API keys and the
  founder credential gates in `docs/LUMERA_OWNER_ACTIONS.md`. The code is wired and waiting.
- The concurrency/resilience patterns requested (tenacity backoff+jitter, Go errgroup/context
  structured concurrency) are implemented as a real, tested TS toolkit — `packages/shared/src/resilience.ts`
  (`retry`, `withTimeout`, `mapConcurrent`) — and applied to the live vendor HTTP path.
