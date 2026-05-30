import { MACROS, findMacro } from '../support/macros.mjs';

export const meta = { role: 'support' };

/** Support agent: drafts replies from the macro library. Sending is gated. */
export async function run(paths, ctx, opts = {}) {
  // v1 has no live inbox; report readiness. A real run drafts replies for inbound messages.
  if (opts.intent) {
    const macro = findMacro(opts.intent);
    return { producedCandidateIds: [], notes: macro ? `draft ready: ${macro.title}` : `no macro for intent ${opts.intent}` };
  }
  return { producedCandidateIds: [], notes: `support ready — ${MACROS.length} macros loaded` };
}
