/**
 * Lumera radar preview — discover + score marketplace candidates (AliExpress/Alibaba/Shein)
 * WITHOUT writing to the board. A safe, standalone proof of the sourcing lane.
 *
 *   pnpm radar -- "oversized hoodie" --source aliexpress --limit 8
 *
 * Gated + honest: prints an empty result with guidance when OXYLABS/APIFY creds are absent,
 * so it never fabricates discovery data.
 */
import { radarDiscover, radarConfigured, type RadarSource } from '@alterxiv/shared';

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const query = arg('--query') ?? positional[0] ?? 'oversized hoodie';
  const source = (arg('--source') ?? process.env.LUMERA_RADAR_SOURCE ?? 'aliexpress') as RadarSource;
  const limit = Number(arg('--limit') ?? process.env.LUMERA_RADAR_LIMIT ?? 8);

  console.log('\n  LUMERA RADAR PREVIEW');
  console.log('  ' + '─'.repeat(54));
  console.log(`  source=${source} query="${query}" limit=${limit}`);
  console.log(`  configured=${radarConfigured()} (OXYLABS_USER / APIFY_TOKEN)`);

  const candidates = await radarDiscover({ query, source, limit }).catch((e) => {
    console.error('  discovery error:', (e as Error).message);
    return [];
  });

  if (candidates.length === 0) {
    console.log('\n  No live discovery results.');
    console.log('  → Set OXYLABS_USER/OXYLABS_PASS or APIFY_TOKEN (and an Apify Actor for the source) to enable.');
    console.log('');
    return;
  }

  for (const c of candidates) {
    const margin = Math.round((c.score?.gross_margin ?? 0) * 100);
    console.log(`\n  • ${c.status.toUpperCase()}  score=${c.score?.total ?? 0}/100  margin=${margin}%`);
    console.log(`    ${c.title}`);
    console.log(`    cost=$${(c.cost_cents / 100).toFixed(2)} retail=$${(c.retail_cents / 100).toFixed(2)} lead=${c.lead_time_days}d stock=${c.stock}`);
    if (c.score?.blockers.length) console.log(`    blockers: ${c.score.blockers.join(', ')}`);
  }
  console.log(`\n  ${candidates.length} candidates discovered + scored. Assign a fulfilment route + re-shoot media before publish.\n`);
}

main().catch((e) => {
  console.error('[radar] error:', e.message);
  process.exit(1);
});
