import { createPaths } from '../lib/paths.mjs';
import { analytics } from '../ops/analytics.mjs';

const paths = createPaths(process.cwd());
const money = (m) => '$' + ((m || 0) / 100).toFixed(2);

(async () => {
  const a = await analytics(paths);
  console.log('— Eclipse analytics —');
  console.log(`Catalog: ${a.catalog.total} products, ${a.catalog.published} published, ${a.catalog.live} live`);
  console.log(`Funnel:  sourced ${a.queue.funnel.sourced} → queued ${a.queue.funnel.queued} → approved ${a.queue.funnel.approved} → published ${a.queue.funnel.published} → live ${a.queue.funnel.live}`);
  console.log(`Queue:   ${a.queue.approvalRatePct}% approved, ${a.queue.rejectionRatePct}% rejected (of decided)`);
  console.log(`Orders:  ${a.orders.total} total, ${a.orders.realized} realized, revenue ${money(a.orders.revenueMinor)}, AOV ${money(a.orders.aovMinor)}, ${a.orders.unitsSold} units`);
  if (a.orders.topProducts.length) {
    console.log('Top sellers:');
    for (const t of a.orders.topProducts) console.log(`  ${t.units}×  ${t.title}`);
  }
  console.log(`Activity: ${a.activity.totalEvents} events`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
