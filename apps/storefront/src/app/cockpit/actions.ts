'use server';

import { revalidatePath } from 'next/cache';

const API = process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000';
const COCKPIT_KEY = process.env.COCKPIT_KEY || '';

async function post(path: string, body: Record<string, unknown> = {}) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(COCKPIT_KEY ? { 'x-cockpit-key': COCKPIT_KEY } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  revalidatePath('/cockpit');
  return { ok: res.ok, status: res.status, payload };
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
