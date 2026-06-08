import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@alterxiv/shared'],
  reactStrictMode: true,
  // Silence the multi-lockfile workspace-root inference warning (monorepo).
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
  // React Compiler: automatic memoization for the whole Broadcast (NextFaster recipe).
  // NOTE: full PPR (experimental.ppr) requires the Next canary channel; on stable we get the
  // same sub-second-perceived Broadcast via a static shell + Suspense-streamed rails.
  // Canary-PPR upgrade is logged in CODEX_HANDOFF.md as an optional founder-gated step.
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Security headers (defensive hardening). Hard headers are safe; CSP is Report-Only so it can
  // never break the app — review reports, then promote to enforcing Content-Security-Policy later.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://*.posthog.com https://*.sentry.io https://browser.sentry-cdn.com https://js.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
