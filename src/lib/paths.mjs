import { join } from 'node:path';

/**
 * Central path resolver. Every store accepts a `paths` object so tests can point
 * at a temp directory and never touch the committed data/queue files.
 */
export function createPaths(root = process.cwd()) {
  const data = join(root, 'data');
  const queue = join(root, 'queue');
  const runtime = join(data, 'runtime');
  return {
    root,
    data,
    queue,
    runtime,
    events: join(data, 'events.ndjson'),
    catalog: join(data, 'catalog.json'),
    suppliers: join(data, 'suppliers.json'),
    collections: join(data, 'collections.json'),
    storefront: join(data, 'storefront.json'),
    ledger: join(data, 'progress.json'),
    orders: join(runtime, 'orders.json'),
    support: join(runtime, 'support.json'),
    restockSignals: join(runtime, 'restock-signals.json'),
    agentRuns: join(runtime, 'agent-runs.ndjson'),
    queueEvents: join(queue, 'candidates.ndjson'),
    queueIndex: join(queue, 'index.json'),
  };
}

export const defaultPaths = createPaths();
