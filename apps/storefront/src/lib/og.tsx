import { ImageResponse } from 'next/og';
import { BRAND, EXPERIENCE, TAGLINE } from './brand';

/**
 * Lumera social share card — the corona-ring mark + wordmark on Eclipse (BRAND_GUIDELINES §10:
 * "First Light wordmark on Eclipse banner"). Rendered with next/og's bundled Noto font, so there is
 * no network font fetch at build or runtime. Used by opengraph-image.tsx + twitter-image.tsx, and
 * verified by og.test.ts (asserts valid PNG bytes).
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_ALT = `${BRAND} — ${EXPERIENCE}`;
export const OG_CONTENT_TYPE = 'image/png';

export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0B0B0D',
        }}
      >
        {/* corona ring + first-light point */}
        <div style={{ position: 'relative', display: 'flex', width: 132, height: 132, marginBottom: 54 }}>
          <div style={{ width: 132, height: 132, borderRadius: 132, border: '7px solid #E9D8A6', display: 'flex' }} />
          <div
            style={{
              position: 'absolute',
              top: -7,
              left: 55,
              width: 22,
              height: 22,
              borderRadius: 22,
              backgroundColor: '#F4EEDD',
              display: 'flex',
            }}
          />
        </div>
        <div style={{ display: 'flex', fontSize: 108, letterSpacing: 12, color: '#E9D8A6' }}>
          {BRAND.toLowerCase()}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 30,
            color: '#9A9AA0',
            marginTop: 30,
            maxWidth: 840,
            textAlign: 'center',
          }}
        >
          {TAGLINE}
        </div>
        <div style={{ display: 'flex', fontSize: 20, letterSpacing: 8, color: '#54545A', marginTop: 42 }}>
          {EXPERIENCE.toUpperCase()}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
