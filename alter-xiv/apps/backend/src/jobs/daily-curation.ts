import type { MedusaContainer } from '@medusajs/framework';

/**
 * Scheduled trigger for the Curator agent (runs in the intelligence app).
 * Backend just enqueues the run; the agent does the work and writes drafts for approval.
 */
export default async function dailyCuration(container: MedusaContainer) {
  // TODO: enqueue intelligence job `agent:curator` (e.g. via redis queue the orchestrator consumes).
}
export const config = { name: 'daily-curation', schedule: '0 6 * * *' }; // 6am daily
