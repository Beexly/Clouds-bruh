import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import { DROPS_MODULE } from '../../../modules/drops';

/**
 * SHEPHERD (displayed as "Polaris") — the conversational guide. Advisory only: it guides, recommends, and answers in
 * the house voice; it never places orders, moves money, or publishes (those are escalations).
 * Live Claude when ANTHROPIC_API_KEY is set; otherwise a graceful, on-brand scripted reply so
 * the storefront is always usable. Grounded in live drops so it never invents inventory.
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
  const messages: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
  const userText = body.message ?? messages.filter((m) => m.role === 'user').slice(-1)[0]?.content ?? '';
  if (!userText) return res.status(400).json({ error: 'message (or messages[]) required' });

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

  const key = process.env.ANTHROPIC_API_KEY;
  const live = key && key !== 'sk-ant-...';

  if (!live) {
    return res.json({ reply: mockReply(userText), grounded: !!dropContext, live: false });
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key as string,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || 'claude-opus-4-8',
        max_tokens: 400,
        system: SYSTEM + dropContext,
        messages: [...messages, { role: 'user', content: userText }].slice(-10),
      }),
    });
    const data: any = await r.json();
    const reply = data?.content?.[0]?.text ?? mockReply(userText);
    res.json({ reply, grounded: !!dropContext, live: true });
  } catch (e: any) {
    res.json({ reply: mockReply(userText), grounded: !!dropContext, live: false, note: e.message?.slice(0, 80) });
  }
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
