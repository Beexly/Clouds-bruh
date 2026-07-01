/**
 * Virtual (AR) try-on adapter. Provider-agnostic: wire IDM-VTON, Kolors, or any OpenAI-style
 * try-on HTTP endpoint via env. This is a REAL adapter (it makes a resilient request when keys are
 * present) but ships GATED — with no provider configured it returns `unconfigured` rather than
 * pretending, matching the intelligence-layer creative-tool pattern (see tools/higgsfield.ts).
 *
 * Field mapping (person_image/garment_image → result image_url) follows the common convention;
 * adjust per your provider's contract. No inference runs without TRYON/IDM_VTON/KOLORS credentials.
 */
import { retry, isTransient, TimeoutError } from '@lumera/shared';

export type TryOnProvider = 'idm-vton' | 'kolors' | 'generic';

export interface TryOnRequest {
  personImageUrl: string; // an UPLOADED image URL (upload first; do not inline base64 through the API)
  garmentImageUrl: string;
  category?: 'upper' | 'lower' | 'dress' | 'full';
}

export interface TryOnResult {
  status: 'ok' | 'unconfigured' | 'error';
  provider?: TryOnProvider;
  imageUrl?: string;
  jobId?: string;
  note?: string;
}

const TRYON_TIMEOUT_MS = Number(process.env.TRYON_TIMEOUT_MS) || 45_000;
const MAX_URL = 2048; // accept uploaded URLs, not multi-MB inline data URLs

/** Resolve the configured try-on provider (precedence: IDM-VTON → Kolors → generic), or null. */
export function tryOnProvider(
  env: NodeJS.ProcessEnv = process.env,
): { provider: TryOnProvider; baseUrl: string; key: string } | null {
  if (env.IDM_VTON_API_URL && env.IDM_VTON_API_KEY)
    return { provider: 'idm-vton', baseUrl: env.IDM_VTON_API_URL, key: env.IDM_VTON_API_KEY };
  if (env.KOLORS_API_URL && env.KOLORS_API_KEY)
    return { provider: 'kolors', baseUrl: env.KOLORS_API_URL, key: env.KOLORS_API_KEY };
  if (env.TRYON_API_URL && env.TRYON_API_KEY)
    return { provider: 'generic', baseUrl: env.TRYON_API_URL, key: env.TRYON_API_KEY };
  return null;
}

export function tryOnConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return tryOnProvider(env) != null;
}

export async function virtualTryOn(req: TryOnRequest, env: NodeJS.ProcessEnv = process.env): Promise<TryOnResult> {
  const person = (req?.personImageUrl ?? '').trim();
  const garment = (req?.garmentImageUrl ?? '').trim();
  if (!person || !garment) return { status: 'error', note: 'personImageUrl and garmentImageUrl are required.' };
  if (person.length > MAX_URL || garment.length > MAX_URL) {
    return { status: 'error', note: 'Image inputs must be uploaded URLs, not inline data — upload first, then pass the URL.' };
  }
  const cfg = tryOnProvider(env);
  if (!cfg) {
    return {
      status: 'unconfigured',
      note: 'AR try-on is not configured. Set IDM_VTON_API_URL+IDM_VTON_API_KEY (or KOLORS_* / TRYON_*) to enable it.',
    };
  }
  try {
    const body = await retry(
      async () => {
        const ac = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          ac.abort();
        }, TRYON_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/tryon`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', authorization: `Bearer ${cfg.key}` },
            body: JSON.stringify({ person_image: person, garment_image: garment, category: req.category ?? 'upper' }),
            signal: ac.signal,
          });
        } catch (err) {
          if (timedOut) throw new TimeoutError(`try-on timed out after ${TRYON_TIMEOUT_MS}ms`);
          throw err;
        } finally {
          clearTimeout(timer);
        }
        const text = await res.text();
        let json: any = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { raw: text };
        }
        if (!res.ok) {
          const e = new Error(`try-on ${res.status}: ${JSON.stringify(json).slice(0, 200)}`) as Error & { status?: number };
          e.status = res.status;
          throw e;
        }
        return json;
      },
      {
        attempts: 2,
        baseMs: 500,
        retryable: (err) => {
          const s = (err as { status?: number })?.status;
          return typeof s === 'number' ? s === 429 || s >= 500 : isTransient(err);
        },
      },
    );
    const imageUrl = (body as any).image_url ?? (body as any).output ?? undefined;
    const jobId = (body as any).id ?? (body as any).job_id ?? undefined;
    return {
      status: 'ok',
      provider: cfg.provider,
      imageUrl,
      jobId,
      note: imageUrl ? undefined : 'Provider accepted the job; poll for the rendered result.',
    };
  } catch (err) {
    return { status: 'error', provider: cfg.provider, note: err instanceof Error ? err.message : String(err) };
  }
}
