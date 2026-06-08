const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const key = process.env.COCKPIT_KEY || '';

async function main() {
  const res = await fetch(`${base}/admin/lumera/curation/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'x-cockpit-key': key } : {}),
    },
    body: JSON.stringify({ force: process.argv.includes('--force') }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[curate] failed:', res.status, body);
    process.exit(1);
  }
  console.log(`[curate] source=${body.source}`);
  console.log(`[curate] candidates=${body.candidates?.length ?? 0}`);
  for (const c of body.candidates ?? []) {
    console.log(`- ${c.status} ${c.score?.total ?? 0}/100 ${c.title}`);
  }
}

main().catch((e) => {
  console.error('[curate] error:', e.message);
  process.exit(2);
});
