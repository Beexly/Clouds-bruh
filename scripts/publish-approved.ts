const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const key = process.env.COCKPIT_KEY || '';

const headers = {
  'Content-Type': 'application/json',
  ...(key ? { 'x-cockpit-key': key } : {}),
};

async function main() {
  const boardRes = await fetch(`${base}/admin/lumera/curation-board`, { headers });
  const board = await boardRes.json().catch(() => ({}));
  if (!boardRes.ok) {
    console.error('[publish-approved] board failed:', boardRes.status, board);
    process.exit(1);
  }

  const candidates = (board.candidates ?? []).filter((c: any) =>
    ['ready_for_review', 'approved'].includes(c.status) && !(c.score?.blockers?.length)
  );
  if (!candidates.length) {
    console.log('[publish-approved] no unblocked approved/ready candidates.');
    return;
  }

  for (const c of candidates) {
    const res = await fetch(`${base}/admin/lumera/candidates/${encodeURIComponent(c.id)}/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ publish: true, reason: 'publish-approved script' }),
    });
    const body = await res.json().catch(() => ({}));
    console.log(`- ${c.title}: ${res.status} ${body.publish?.status ?? 'unknown'} ${body.publish?.message ?? ''}`);
  }
}

main().catch((e) => {
  console.error('[publish-approved] error:', e.message);
  process.exit(2);
});
