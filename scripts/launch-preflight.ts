import { spawnSync } from 'node:child_process';

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const steps = [
  ['test', ['test']],
  ['build', ['build']],
  ['commerce preflight', ['preflight']],
  ['vendor preflight', ['vendor:preflight']],
  ['launch proof', ['launch:proof']],
] as const;

for (const [label, args] of steps) {
  console.log(`\n[launch-preflight] ${label}`);
  const result = spawnSync(`${pnpm} ${args.join(' ')}`, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`[launch-preflight] failed at ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[launch-preflight] all local launch gates passed.');
