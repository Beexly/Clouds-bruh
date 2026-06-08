import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { DROPS_MODULE } from '../../../modules/drops';
import { llmChat, type LlmMessage } from '../../../lib/llm';

/**
 * SHEPHERD (displayed as "Polaris") — the conversational guide. Advisory only: it guides, recommends, and answers in
 * the house voice; it never places orders, moves money, or publishes (those are escalations).
 * Runs through the provider-flexible llmChat helper: a free/cheap OpenAI-compatible endpoint when
 * LLM_BASE_URL+LLM_API_KEY are set, otherwise live Claude when ANTHROPIC_API_KEY is set; if neither
 * is live it falls back to a graceful, on-brand scripted reply so the storefront is always usable.
 * Grounded in live drops so it never invents inventory.
 */

const SYSTEM = `You are Polaris — the guide for Lumera, a living marketplace for everything worth having,
presented as "The Broadcast": a real-time, curated stream of drops across every category.
Voice: dark, editorial, spare, premium. Confident and warm, never pushy, never cringe.
You guide visitors through the Broadcast and its five chapters — Stillness, Armor, Signal, Altar,
Relentless — curated collections that span categories. Recommend, explain materials/fit/use/meaning,
and build genuine anticipation.
RULES: you advise only. You never take payment, place an order, change a price, or promise delivery
dates. If asked to do those, gently hand off ("I'll line it up; checkout is yours to complete").
Keep replies to 2-4 sentences unless asked for more.`;

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = (req.body as any) ?? {};
  // Input validation (DoS / token-cost / prompt-abuse control on the LLM endpoint).
  const MAX_MESSAGES = 20;
  const MAX_TEXT = 4000;
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  if (rawMessages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: `too many messages (max ${MAX_MESSAGES})` });
  }
  const messages: { role: 'user' | 'assistant'; content: string }[] = rawMessages.filter(
    (m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length <= MAX_TEXT
  );
  const rawUserText = body.message ?? messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? '';
  if (typeof rawUserText !== 'string' || !rawUserText.trim()) {
    return res.status(400).json({ error: 'message (or messages[]) required' });
  }
  if (rawUserText.length > MAX_TEXT) {
    return res.status(400).json({ error: `message too long (max ${MAX_TEXT} chars)` });
  }
  const userText = rawUserText;

  // Ground Polaris in live drops.
  let dropContext = '';
  try {
    const drops: any = req.scope.resolve(DROPS_MODULE);
    const live = await drops.listLive();
    if (live?.length) {
      dropContext =
        '\n\nLIVE DROPS RIGHT NOW:\n' +
        live
          .map((d: any) => `- ${d.name} (${d.chapter}) — ${d.units_remaining}/${d.units_total} left`)
          .join('\n');
    }
  } catch {
    /* non-fatal */
  }

  // Cap the conversation we send (most-recent 10 turns) to bound token cost.
  const chatMessages: LlmMessage[] = [
    ...messages,
    { role: 'user' as const, content: userText },
  ].slice(-10);

  // llmChat picks the provider (openai_compat → anthropic → none), never throws, and returns
  // { live:false } on the 'none' case or any network/parse failure — so the mock fallback below
  // covers every path. Behavior with only ANTHROPIC_API_KEY set is unchanged.
  const result = await llmChat({
    system: SYSTEM + dropContext,
    messages: chatMessages,
    maxTokens: 400,
  });

  if (!result.live || !result.text) {
    return res.json({ reply: mockReply(userText), grounded: !!dropContext, live: false });
  }

  res.json({ reply: result.text, grounded: !!dropContext, live: true });
};

function mockReply(userText: string): string {
  const t = userText.toLowerCase();
  if (t.includes('drop') || t.includes('live') || t.includes('available'))
    return 'The Broadcast is live now — the Armor chapter leads this season. Watch the board: when the lamp burns gold, the drop is open. What are you drawn to?';
  if (t.includes('size') || t.includes('fit'))
    return 'Happy to help you get it right — tell me the piece and your usual size, and I will guide you.';
  if (t.includes('chapter') || t.includes('mean') || t.includes('stillness') || t.includes('armor'))
    return 'Five chapters curate the Broadcast — Stillness, Armor, Signal, Altar, Relentless — each spanning categories. Which one fits where you are right now?';
  return 'I am here to guide you through the Broadcast — ask me about a chapter, a drop, or what you are looking for, and I will point the way.';
}
