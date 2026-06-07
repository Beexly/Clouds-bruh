import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const commandSteps = [
  ['vendor preflight', ['vendor:preflight']],
  ['vendor adapter test', ['vendor:test']],
  ['curation e2e', ['curation:e2e']],
  ['fulfillment sandbox', ['fulfillment:sandbox']],
] as const;

async function main() {
  for (const [label, args] of commandSteps) {
    console.log(`\n[launch-proof] ${label}`);
    const result = spawnSync(`${pnpm} ${args.join(' ')}`, { stdio: 'inherit', shell: true });
    if (result.status !== 0) {
      throw new Error(`failed at ${label}`);
    }
  }

  console.log('\n[launch-proof] legal placeholder proof');
  const legalFailures = await legalPlaceholderFailures();
  if (legalFailures.length) {
    console.log('\nBLOCKED');
    legalFailures.forEach((failure) => console.log(`- ${failure}`));
    throw new Error('legal placeholders detected');
  }

  console.log('\n[launch-proof] no fake review proof');
  const fakeReviewFailures = await fakeReviewFailures();
  if (fakeReviewFailures.length) {
    console.log('\nBLOCKED');
    fakeReviewFailures.forEach((failure) => console.log(`- ${failure}`));
    throw new Error('fake review risk detected');
  }

  console.log('\n[launch-proof] all launch proof gates passed.');
}

async function legalPlaceholderFailures() {
  const files = [
    'apps/storefront/src/app/legal/terms/page.tsx',
    'apps/storefront/src/app/legal/privacy/page.tsx',
    'apps/storefront/src/app/legal/returns/page.tsx',
  ];
  const patterns = [
    /\[[^\]]+\]/,
    /company legal name/i,
    /registered address/i,
    /lumera\.example/i,
    /jurisdiction/i,
    /venue/i,
    /tailor every figure/i,
  ];
  const failures: string[] = [];
  for (const file of files) {
    const text = await fs.readFile(path.resolve(file), 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (patterns.some((pattern) => pattern.test(line))) {
        failures.push(`${file}:${index + 1} contains launch placeholder text`);
      }
    });
  }
  return failures;
}

async function fakeReviewFailures() {
  const files = [
    'apps/storefront/src/app/p/[handle]/page.tsx',
    'packages/shared/src/curation.ts',
    'apps/backend/src/lib/lumera-publish.ts',
  ];
  const failures: string[] = [];
  for (const file of files) {
    const text = await fs.readFile(path.resolve(file), 'utf8');
    if (/fake review|generated review|placeholder review|5-star review/i.test(text)) {
      failures.push(`${file} contains review language that must be verified before launch`);
    }
  }
  return failures;
}

main().catch((e) => {
  console.error('[launch-proof] error:', e.message);
  process.exit(1);
});
