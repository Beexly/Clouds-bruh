import type { MedusaContainer } from '@medusajs/framework';
import { planDropActions } from '@lumera/shared';
import { readLiveDrops, openProposalDropIds, buildProposalRun, insertProposalRun } from '../lib/drop-grader';

/**
 * Drop grader — daily scheduled job. The deterministic last mile of the LATR loop: grade live drops
 * and file restock/kill proposals into the founder approval inbox (awaiting_approval agent_run rows
 * the cockpit + Approval Loop consume). Runs WITHOUT an Anthropic key — the merchandising engine
 * works with the agents asleep; the founder approves each with one tap.
 *
 * Safety: gated behind DROP_GRADER_ENABLED=true (default OFF); no-ops without DATABASE_URL; deduped
 * so a drop only sits in the inbox once; every DB step best-effort (never throws out of the job).
 */
export default async function dropGrader(_container: MedusaContainer) {
  if (process.env.DROP_GRADER_ENABLED !== 'true') {
    console.log('[drop-grader] disabled (set DROP_GRADER_ENABLED=true to enable); skipping.');
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.warn('[drop-grader] DATABASE_URL not set; skipping.');
    return;
  }

  const now = new Date();
  try {
    const drops = await readLiveDrops();
    const proposals = planDropActions(drops);
    if (!proposals.length) {
      console.log(`[drop-grader] ${drops.length} live drops graded — none crossed a scale/kill threshold.`);
      return;
    }
    const open = await openProposalDropIds();
    let created = 0;
    for (const p of proposals) {
      if (open.has(p.drop_id)) continue; // already awaiting approval — don't duplicate
      if (await insertProposalRun(buildProposalRun(p, now))) created++;
    }
    console.log(`[drop-grader] ${proposals.length} proposals, ${created} new in the approval inbox.`);
  } catch (e: any) {
    console.warn('[drop-grader] run failed:', e?.message?.slice(0, 80));
  }
}

// Daily at 11:00 — after the prior day's deliveries/sell-through settle.
export const config = { name: 'drop-grader', schedule: '0 11 * * *' };
