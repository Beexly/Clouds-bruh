import { createPaths } from '../lib/paths.mjs';
import { loadOrders } from '../orders/store.mjs';
import { retentionSummary, customersFrom, rfm, lapseState, predictedLtvMinor } from '../retention/engine.mjs';
import { evaluateFlows, proposeFlows } from '../retention/lifecycle.mjs';

const paths = createPaths(process.cwd());
const cmd = process.argv[2] || 'summary';
const money = (m) => '$' + ((m || 0) / 100).toFixed(2);

(async () => {
  if (cmd === 'summary') {
    const s = retentionSummary(await loadOrders(paths));
    console.log(`Customers: ${s.customers} | repeat ${s.repeatRatePct}% | avg predicted LTV ${money(s.avgPredictedLtvMinor)}`);
    console.log('Segments:', JSON.stringify(s.segments));
    console.log('Lapse states:', JSON.stringify(s.lapses));
    if (s.cohorts.length) console.log('Cohorts:', s.cohorts.map((c) => `${c.cohort}:${c.size}(${c.repeatRate}% repeat)`).join('  '));
  } else if (cmd === 'customers') {
    const customers = customersFrom(await loadOrders(paths));
    for (const c of customers) {
      const r = rfm(c);
      console.log(`${c.email}  ${r.segment.padEnd(12)} orders ${c.count}  ${money(c.monetaryMinor)}  lapse:${lapseState(c)}  pLTV ${money(predictedLtvMinor(c))}`);
    }
  } else if (cmd === 'flows') {
    const proposals = await evaluateFlows(paths);
    console.log(`${proposals.length} lifecycle proposal(s):`);
    for (const p of proposals) console.log(`  [${p.flow}] ${p.email} (${p.segment}/${p.lapse})`);
  } else if (cmd === 'propose') {
    const { proposed, total } = await proposeFlows(paths);
    console.log(`Proposed ${proposed} of ${total} eligible lifecycle draft(s) into the support inbox (awaiting human send).`);
  } else {
    console.log('Usage: npm run retention [summary | customers | flows | propose]');
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
