import { QueueStatus } from '../model/enums.mjs';

export const COLUMNS = [
  { key: QueueStatus.PROPOSED, label: 'Proposed' },
  { key: QueueStatus.QUEUED, label: 'Queued' },
  { key: QueueStatus.IN_REVIEW, label: 'In Review' },
  { key: QueueStatus.NEEDS_CHANGES, label: 'Needs Changes' },
  { key: QueueStatus.APPROVED, label: 'Approved' },
  { key: QueueStatus.PUBLISHED, label: 'Published' },
  { key: QueueStatus.REJECTED, label: 'Rejected' },
];

/** Group queue items into ordered board columns for the ops console. */
export function boardFrom(items = []) {
  const columns = COLUMNS.map((c) => ({
    ...c,
    items: items.filter((i) => i.status === c.key),
  }));
  return { columns, total: items.length };
}
