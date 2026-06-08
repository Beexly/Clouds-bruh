import { describe, it, expect } from 'vitest';
import {
  replyDraft,
  calendarWrite,
  invoiceGenerate,
  pdfRender,
  recommendationAdmin,
  experimentAdmin,
} from './connectors';

/**
 * Non-negotiable (Layer 1 of "no autonomous money movement / publish"): the write/act connectors
 * must STAGE for founder approval — they may never report a sent/published/executed/live status on
 * their own. The escalation gate (run-agent.ts) and backend env flags are the other layers; this
 * locks the construction-level guarantee so a future edit can't quietly turn a draft into a live action.
 */
const STAGED = /(stage|staged|draft|approval)/i;
const FORBIDDEN = /\b(sent|published|posted|executed|live|submitted|charged|paid|completed)\b/i;

describe('act connectors stage, never execute', () => {
  it('reply_draft stages a support reply, never sends', async () => {
    const r: any = await replyDraft.run({ question: 'Where is my order?' });
    expect(String(r.status)).toMatch(STAGED);
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });

  it('calendar_write stages a slot, never publishes', async () => {
    const r: any = await calendarWrite.run({ title: 'Drop teaser', when: '2026-07-01' });
    expect(String(r.status)).toMatch(STAGED);
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });

  it('invoice_generate produces a draft (correct total), never sends', async () => {
    const r: any = await invoiceGenerate.run({ to: 'wholesale@buyer.test', line_items: [{ amount: 100, qty: 2 }] });
    expect(String(r.status)).toMatch(STAGED);
    expect(r.total).toBe(200);
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });

  it('pdf_render stages an artifact', async () => {
    const r: any = await pdfRender.run({ kind: 'invoice', ref: 'INV-1' });
    expect(String(r.status)).toMatch(STAGED);
  });

  it('recommendation_admin stages a tuning proposal, never applies it', async () => {
    const r: any = await recommendationAdmin.run({ proposal: 'raise graph_rec weight' });
    expect(String(r.status)).toMatch(STAGED);
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });

  it('experiment_admin drafts an experiment, never launches it', async () => {
    const r: any = await experimentAdmin.run({ hypothesis: 'bundles lift AOV' });
    expect(String(r.status)).toMatch(STAGED);
    expect(JSON.stringify(r)).not.toMatch(FORBIDDEN);
  });
});
