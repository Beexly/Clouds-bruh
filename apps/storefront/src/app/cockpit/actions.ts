'use server';

import { revalidatePath } from 'next/cache';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const COCKPIT_KEY = process.env.COCKPIT_KEY || '';
const PK = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

async function post(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(COCKPIT_KEY ? { 'x-cockpit-key': COCKPIT_KEY } : {}),
      ...(PK ? { 'x-publishable-api-key': PK } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  revalidatePath('/cockpit');
  return { ok: res.ok, status: res.status, payload };
}

/** Founder resolves an escalated agent action — approve executes it (via the job stream), reject parks it. */
export async function approveEscalation(formData: FormData) {
  const run_id = String(formData.get('run_id') ?? '');
  const agent = String(formData.get('agent') ?? '');
  const tool = String(formData.get('tool') ?? '');
  if (!run_id || !agent || !tool) return;
  let input: unknown = {};
  try { input = JSON.parse(String(formData.get('input') ?? '{}')); } catch { /* keep {} */ }
  await post('/store/cockpit/approvals', { run_id, agent, tool, input, decision: 'approve' });
}

export async function rejectEscalation(formData: FormData) {
  const run_id = String(formData.get('run_id') ?? '');
  const agent = String(formData.get('agent') ?? '');
  if (!run_id || !agent) return;
  await post('/store/cockpit/approvals', { run_id, agent, decision: 'reject' });
}

export async function runCuration() {
  await post('/admin/lumera/curation/run', { force: true });
}

export async function approveCandidate(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await post(`/admin/lumera/candidates/${encodeURIComponent(id)}/approve`, {
    publish: true,
    reason: 'Founder approved from Cockpit.',
  });
}

export async function approveDraftCandidate(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await post(`/admin/lumera/candidates/${encodeURIComponent(id)}/approve`, {
    publish: false,
    reason: 'Founder approved as draft from Cockpit.',
  });
}

export async function rejectCandidate(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await post(`/admin/lumera/candidates/${encodeURIComponent(id)}/reject`, {
    reason: 'Founder rejected from Cockpit.',
  });
}

export async function requestSample(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await post(`/admin/lumera/candidates/${encodeURIComponent(id)}/request-sample`, {
    reason: 'Founder requested sample from Cockpit.',
  });
}

export async function designVariant(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await post(`/admin/lumera/candidates/${encodeURIComponent(id)}/design-variant`, {});
}
