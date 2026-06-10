/**
 * Approval execution helpers.
 *
 * The cockpit approval endpoint must execute the action the AGENT escalated — read from the
 * `agent_run.pending_actions` it stored when it hit its escalation gate — and NEVER a tool/input
 * supplied by the HTTP client. Otherwise "approve" becomes an arbitrary-tool execution API behind a
 * single shared key. These helpers are pure so the selection logic is unit-tested without a DB.
 */

export interface PendingAction {
  tool: string;
  input: unknown;
}

/**
 * Pick the stored escalated action to run on approval. Returns null when there is nothing valid to
 * approve — callers MUST refuse in that case rather than fall back to client-supplied input.
 */
export function selectPendingAction(pendingActions: unknown, index = 0): PendingAction | null {
  if (!Array.isArray(pendingActions)) return null;
  const i = Number.isInteger(index) && index >= 0 ? index : 0;
  const a = pendingActions[i];
  if (!a || typeof a !== 'object') return null;
  const tool = typeof (a as { tool?: unknown }).tool === 'string' ? (a as { tool: string }).tool.trim() : '';
  if (!tool) return null;
  return { tool, input: (a as { input?: unknown }).input ?? {} };
}
