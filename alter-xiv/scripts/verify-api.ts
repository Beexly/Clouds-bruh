/**
 * Cross-platform verify:api runner.
 *
 * Runs the operational gate:
 * migrate -> seed/setup -> boot backend -> API regression -> cleanup.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import net from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Client } from 'pg';

const ROOT = process.cwd();
const BACKEND = join(ROOT, 'apps', 'backend');
const PORT = process.env.PORT || '9000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv';
const DEFAULT_PK = 'pk_3597340b67d6e63689846700f8264afde0105aed898356d6d630df566afd3050';

const rawEnv: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL,
  PUBLISHABLE_KEY: process.env.PUBLISHABLE_KEY || DEFAULT_PK,
  MEDUSA_ADMIN_DISABLED: process.env.MEDUSA_ADMIN_DISABLED || 'true',
  STORE_CORS: process.env.STORE_CORS || 'http://localhost:3000',
  ADMIN_CORS: process.env.ADMIN_CORS || 'http://localhost:9000',
  MEDUSA_BACKEND_URL: `http://localhost:${PORT}`,
  JWT_SECRET: process.env.JWT_SECRET || 'verify_api_jwt_secret',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'verify_api_cookie_secret',
};

if (!process.env.REDIS_URL) delete rawEnv.REDIS_URL;

const env = Object.fromEntries(
  Object.entries(rawEnv).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
);

function bin(name: string) {
  return join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.CMD` : name);
}

function say(message: string) {
  console.log(`\n> ${message}`);
}

function ok(message: string) {
  console.log(`OK ${message}`);
}

function parseDbHost() {
  const url = new URL(DATABASE_URL);
  return {
    host: url.hostname || 'localhost',
    port: Number(url.port || 5432),
  };
}

function portUp(host: string, port: number, timeoutMs = 1200) {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (result: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function run(
  label: string,
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number; capture?: boolean } = {}
) {
  say(label);
  const child = spawn(command, args, {
    cwd: options.cwd || ROOT,
    env,
    shell: process.platform === 'win32',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString();
    process.stdout.write(chunk);
  });
  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString();
    process.stderr.write(chunk);
  });

  const timeout = options.timeoutMs
    ? setTimeout(() => child.kill('SIGTERM'), options.timeoutMs)
    : undefined;
  const code = await new Promise<number | null>((resolve) => child.on('exit', resolve));

  if (timeout) clearTimeout(timeout);
  if (code !== 0) {
    throw new Error(`${label} failed with exit code ${code}${stderr ? `\n${stderr}` : ''}`);
  }
  ok(label);
  return stdout;
}

async function countProducts() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query('SELECT count(*)::int AS count FROM product WHERE deleted_at IS NULL');
    return Number(result.rows[0]?.count || 0);
  } catch {
    return 0;
  } finally {
    await client.end();
  }
}

async function waitForHealth(child: ChildProcessWithoutNullStreams) {
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error(`Backend exited early with code ${child.exitCode}`);
    try {
      const res = await fetch(`http://localhost:${PORT}/health`);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
    await delay(1000);
  }
  throw new Error('Backend did not become healthy in 90s');
}

function stopProcessTree(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || !child.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

async function main() {
  const db = parseDbHost();
  say('Checking infrastructure');
  if (!(await portUp(db.host, db.port))) {
    throw new Error(`Postgres is not reachable at ${db.host}:${db.port}. Start Postgres or pass DATABASE_URL.`);
  }
  ok(`Postgres reachable at ${db.host}:${db.port}`);

  await run('Running migrations', bin('medusa'), ['db:migrate'], { cwd: BACKEND, timeoutMs: 180000 });

  const products = await countProducts();
  if (products < 1) {
    await run('Seeding catalog', bin('medusa'), ['exec', '../../scripts/seed.ts'], { cwd: BACKEND, timeoutMs: 300000 });
    await run('Setting up commerce', bin('medusa'), ['exec', '../../scripts/setup-commerce.ts'], { cwd: BACKEND, timeoutMs: 180000 });
    await run('Setting up prices', bin('medusa'), ['exec', '../../scripts/setup-prices.ts'], { cwd: BACKEND, timeoutMs: 180000 });
    await run('Setting up inventory', bin('medusa'), ['exec', '../../scripts/setup-inventory.ts'], { cwd: BACKEND, timeoutMs: 180000 });
    await run('Setting up embeddings', bin('tsx'), ['scripts/setup-embeddings.ts'], { timeoutMs: 120000 });
  } else {
    ok(`Catalog already present (${products} products)`);
    await run('Refreshing embeddings', bin('tsx'), ['scripts/setup-embeddings.ts'], { timeoutMs: 120000 });
  }

  await run('Seeding monetization', bin('medusa'), ['exec', '../../scripts/seed-monetization.ts'], { cwd: BACKEND, timeoutMs: 120000 });
  const pkOutput = await run('Ensuring publishable key', bin('medusa'), ['exec', '../../scripts/ensure-publishable-key.ts'], {
    cwd: BACKEND,
    timeoutMs: 120000,
    capture: true,
  });
  const capturedPk = pkOutput.match(/PUBLISHABLE_KEY=(pk_[A-Za-z0-9]+)/)?.[1];
  if (capturedPk) env.PUBLISHABLE_KEY = capturedPk;

  await run('Building backend', bin('medusa'), ['build'], { cwd: BACKEND, timeoutMs: 300000 });

  say(`Booting backend on :${PORT}`);
  const server = spawn(bin('medusa'), ['start', '--port', PORT], {
    cwd: BACKEND,
    env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  }) as ChildProcessWithoutNullStreams;
  server.stdout.on('data', (chunk) => process.stdout.write(chunk));
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));

  try {
    await waitForHealth(server);
    ok('Backend healthy');
    await run('Running API regression suite', bin('tsx'), ['scripts/api-regression.ts'], { timeoutMs: 180000 });
    ok('verify:api PASSED');
  } finally {
    stopProcessTree(server);
  }
}

main().catch((error) => {
  console.error(`\nFAIL verify:api: ${error.message}`);
  process.exit(1);
});
