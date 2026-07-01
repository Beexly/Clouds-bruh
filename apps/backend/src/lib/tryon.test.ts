import { describe, it, expect, vi, afterEach } from 'vitest';
import { virtualTryOn, tryOnConfigured, tryOnProvider } from './tryon';

const IDM = { IDM_VTON_API_URL: 'https://idm.example/api', IDM_VTON_API_KEY: 'k1' } as any;
const KOLORS = { KOLORS_API_URL: 'https://kolors.example', KOLORS_API_KEY: 'k2' } as any;

afterEach(() => vi.unstubAllGlobals());

describe('tryOnProvider / tryOnConfigured', () => {
  it('is unconfigured with no env', () => {
    expect(tryOnConfigured({} as any)).toBe(false);
    expect(tryOnProvider({} as any)).toBeNull();
  });
  it('detects IDM-VTON and prefers it over Kolors', () => {
    expect(tryOnProvider(IDM)!.provider).toBe('idm-vton');
    expect(tryOnProvider({ ...IDM, ...KOLORS })!.provider).toBe('idm-vton');
    expect(tryOnProvider(KOLORS)!.provider).toBe('kolors');
  });
});

describe('virtualTryOn (gating + validation)', () => {
  const req = { personImageUrl: 'https://cdn/p.jpg', garmentImageUrl: 'https://cdn/g.jpg' };

  it('returns unconfigured (no fake inference) when no provider is set', async () => {
    const r = await virtualTryOn(req, {} as any);
    expect(r.status).toBe('unconfigured');
    expect(r.note).toMatch(/IDM_VTON_API_URL/);
  });

  it('errors on missing inputs', async () => {
    expect((await virtualTryOn({ personImageUrl: '', garmentImageUrl: 'x' }, IDM)).status).toBe('error');
  });

  it('rejects inline/oversized image inputs (must be uploaded URLs)', async () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(5000);
    const r = await virtualTryOn({ personImageUrl: huge, garmentImageUrl: 'https://cdn/g.jpg' }, IDM);
    expect(r.status).toBe('error');
    expect(r.note).toMatch(/uploaded URLs/);
  });
});

describe('virtualTryOn (configured path, mocked provider)', () => {
  const req = { personImageUrl: 'https://cdn/p.jpg', garmentImageUrl: 'https://cdn/g.jpg' };

  it('returns ok with the rendered image_url when the provider succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({ image_url: 'https://cdn/result.png' }),
      headers: { get: () => null },
    }));
    const r = await virtualTryOn(req, IDM);
    expect(r.status).toBe('ok');
    expect(r.provider).toBe('idm-vton');
    expect(r.imageUrl).toBe('https://cdn/result.png');
  });

  it('surfaces a provider error as status=error (does not throw)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 400,
      text: async () => JSON.stringify({ error: 'bad garment' }),
      headers: { get: () => null },
    }));
    const r = await virtualTryOn(req, IDM);
    expect(r.status).toBe('error');
    expect(r.note).toMatch(/400/);
  });
});
