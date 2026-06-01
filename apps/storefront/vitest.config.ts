import { defineConfig } from 'vitest/config';

/**
 * Use the automatic JSX runtime (same as Next) so JSX modules — e.g. the next/og share card in
 * src/lib/og.tsx — transform without an explicit React import under vitest.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
});
