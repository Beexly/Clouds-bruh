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
};

export default nextConfig;
