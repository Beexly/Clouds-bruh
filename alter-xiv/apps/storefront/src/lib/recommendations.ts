const API = process.env.NEXT_PUBLIC_MEDUSA_URL || 'http://localhost:9000';

export async function getBroadcast(visitorId: string) {
  const r = await fetch(`${API}/store/broadcast?visitor_id=${visitorId}`, { cache: 'no-store' });
  return r.json() as Promise<{ drops: any[]; block_order: string[] }>;
}
export async function getRecs(visitorId: string, strategy = 'for_you', limit = 12) {
  const r = await fetch(`${API}/store/recommendations?visitor_id=${visitorId}&strategy=${strategy}&limit=${limit}`, { cache: 'no-store' });
  return r.json() as Promise<{ strategy: string; product_ids: string[] }>;
}
