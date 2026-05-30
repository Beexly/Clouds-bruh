import { MACROS } from '../support/macros.mjs';
import { draftReplies, loadInbox } from '../support/inbox.mjs';

export const meta = { role: 'support' };

/**
 * Support agent: drafts replies for all `new` inbox messages from the macro
 * library + order context. Sending stays human-gated.
 */
export async function run(paths, ctx, opts = {}) {
  const drafted = await draftReplies(paths);
  const inbox = await loadInbox(paths);
  const pending = inbox.filter((m) => m.status === 'drafted').length;
  return {
    producedCandidateIds: [],
    notes: `${MACROS.length} macros; drafted ${drafted}; ${pending} awaiting human send`,
  };
}
