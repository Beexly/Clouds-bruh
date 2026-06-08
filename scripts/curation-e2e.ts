import { buildProductPayload } from '../apps/backend/src/lib/lumera-publish';
import { fixtureCandidates } from '../packages/shared/src/curation-fixtures';
import { candidateToProductTruth, type ProductCandidate } from '../packages/shared/src/curation';

const base = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const key = process.env.COCKPIT_KEY || '';

async function main() {
  console.log('\nLUMERA CURATION E2E');
  console.log('='.repeat(32));

  const remote = await remoteBoardCandidates();
  const candidates = remote.length ? remote : fixtureCandidates('printify');
  const source = remote.length ? 'medusa_admin_board' : 'deterministic_fixture_contract';
  console.log(`source=${source}`);
  console.log(`candidates=${candidates.length}`);

  assert(candidates.length >= 3, 'expected at least three curation candidates');
  for (const candidate of candidates) {
    assert(candidate.id, 'candidate missing id');
    assert(candidate.title, `candidate ${candidate.id} missing title`);
    assert(candidate.supplier_sku, `candidate ${candidate.id} missing supplier_sku`);
    assert(candidate.cost_cents > 0, `candidate ${candidate.id} missing supplier cost`);
    assert(candidate.retail_cents > 0, `candidate ${candidate.id} missing retail price`);
    assert(candidate.variants.length > 0, `candidate ${candidate.id} missing variants`);
    assert(candidate.score, `candidate ${candidate.id} missing score`);
    assert(candidate.compliance, `candidate ${candidate.id} missing compliance review`);
  }

  const ready = candidates.filter((candidate) => candidate.status === 'ready_for_review' && !(candidate.score?.blockers?.length));
  const blocked = candidates.filter((candidate) => candidate.status.endsWith('_blocked') || Boolean(candidate.score?.blockers?.length));
  assert(ready.length > 0, 'expected at least one unblocked ready candidate');
  assert(blocked.length > 0, 'expected at least one blocked candidate for gate proof');

  const approved = ready[0];
  const payload = buildProductPayload(approved, false);
  const metadata = payload.metadata as Record<string, any>;
  const truth = candidateToProductTruth(approved);

  assert(payload.status === 'draft', 'approve-draft payload should remain draft in curation:e2e');
  assert(metadata.lumera_candidate_id === approved.id, 'product payload missing lumera_candidate_id');
  assert(metadata.supplier_sku === approved.supplier_sku, 'product payload missing supplier_sku');
  assert(metadata.fulfillment_provider === approved.vendor, 'product payload missing fulfillment provider');
  assert(Array.isArray(payload.variants) && payload.variants.length === approved.variants.length, 'variant mapping mismatch');
  assert(truth.verified_reviews_count === 0, 'Product Truth must not invent reviews');

  console.log(`ready_candidates=${ready.length}`);
  console.log(`blocked_candidates=${blocked.length}`);
  console.log(`approval_candidate=${approved.id}`);
  console.log(`approval_status=draft_payload_ready`);
  console.log(`truth_panel=${truth.supplier_name} / ${truth.estimated_ship_days} days / ${truth.return_window_days} day returns`);
  console.log('\nVERDICT: curation candidate -> approval payload path is executable.');
}

async function remoteBoardCandidates(): Promise<ProductCandidate[]> {
  try {
    const res = await fetch(`${base}/admin/lumera/curation-board`, {
      headers: { ...(key ? { 'x-cockpit-key': key } : {}) },
    });
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    return Array.isArray(body.candidates) ? body.candidates : [];
  } catch {
    return [];
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((e) => {
  console.error('[curation:e2e] error:', e.message);
  process.exit(1);
});
