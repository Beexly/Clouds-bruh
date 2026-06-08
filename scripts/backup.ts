/**
 * Lumera — database backup.
 *
 *   pnpm backup
 *
 * A defensive `pg_dump` wrapper. It dumps the database pointed to by `DATABASE_URL`
 * into a timestamped, gzip-compressed SQL file under `BACKUP_DIR` (default `./backups`).
 *
 * Design goals (so this is safe to run anywhere, incl. a clean checkout / CI):
 *   - Never throws. On any missing prerequisite it prints clear guidance and exits 0 (no-op).
 *   - No new dependencies — uses only Node's stdlib + the system `pg_dump`.
 *   - If `DATABASE_URL` or `pg_dump` is absent, it does nothing but explain how to enable it.
 *   - Optional, opt-in note about S3 upload (we do NOT shell out to the AWS CLI by default).
 *
 * Restore a dump with:   gunzip -c backups/<file>.sql.gz | psql "$DATABASE_URL"
 * See docs/DR_RUNBOOK.md for cadence, RPO/RTO targets, and the restore drill.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createGzip } from 'node:zlib';
import { createWriteStream, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

function log(msg: string) {
  console.log(`[backup] ${msg}`);
}

/** Redact credentials from a Postgres URL before logging it. */
function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    if (u.username) u.username = u.username ? '***' : '';
    return u.toString();
  } catch {
    return '(unparseable DATABASE_URL)';
  }
}

/** True if `pg_dump` is on PATH. */
function hasPgDump(): boolean {
  try {
    const probe = spawnSync('pg_dump', ['--version'], { stdio: 'ignore' });
    return probe.status === 0;
  } catch {
    return false;
  }
}

async function main(): Promise<number> {
  const databaseUrl = process.env.DATABASE_URL;
  const backupDir = resolve(process.cwd(), process.env.BACKUP_DIR || './backups');

  // ── Prerequisite 1: DATABASE_URL ──
  if (!databaseUrl) {
    log('No DATABASE_URL set — nothing to back up. (no-op)');
    log('To enable: export DATABASE_URL=postgres://user:pass@host:5432/db && pnpm backup');
    return 0;
  }

  // ── Prerequisite 2: pg_dump on PATH ──
  if (!hasPgDump()) {
    log('`pg_dump` not found on PATH — skipping backup. (no-op)');
    log('Install the Postgres client tools, e.g.:');
    log('  Debian/Ubuntu : sudo apt-get install -y postgresql-client');
    log('  macOS (brew)  : brew install libpq && brew link --force libpq');
    log('Then re-run: pnpm backup');
    return 0;
  }

  // ── Prepare destination ──
  try {
    mkdirSync(backupDir, { recursive: true });
  } catch (e) {
    log(`Could not create BACKUP_DIR (${backupDir}): ${(e as Error).message}. (no-op)`);
    return 0;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = resolve(backupDir, `lumera-${stamp}.sql.gz`);

  log(`Dumping ${safeUrl(databaseUrl)}`);
  log(`→ ${outFile}`);

  // pg_dump → gzip → file. Stream so we never buffer a large dump in memory.
  const exitCode: number = await new Promise<number>((resolveExit) => {
    const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', '--clean', '--if-exists', databaseUrl], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const gzip = createGzip();
    const out = createWriteStream(outFile);
    let stderr = '';
    let settled = false;

    const finish = (code: number) => {
      if (settled) return;
      settled = true;
      resolveExit(code);
    };

    dump.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    dump.on('error', (err) => {
      log(`pg_dump failed to start: ${err.message}. (no-op)`);
      finish(0); // never throw on a clean checkout / missing tooling
    });

    out.on('error', (err) => {
      log(`Could not write backup file: ${err.message}. (no-op)`);
      finish(0);
    });

    dump.on('close', (code) => {
      if (code !== 0) {
        if (stderr.trim()) log(`pg_dump stderr: ${stderr.trim().split('\n').slice(-3).join(' | ')}`);
        log(`pg_dump exited with code ${code}. Backup not written cleanly. (no-op)`);
        // Clean up a partial/empty file.
        try {
          unlinkSync(outFile);
        } catch {
          /* ignore */
        }
        finish(0);
      }
    });

    out.on('close', () => finish(0));

    dump.stdout.pipe(gzip).pipe(out);
  });

  // Report size if the file landed.
  try {
    const { size } = statSync(outFile);
    if (size > 0) {
      log(`Backup written (${(size / 1024).toFixed(1)} KiB).`);
      log(`Restore with: gunzip -c "${outFile}" | psql "$DATABASE_URL"`);

      // ── Optional S3 upload note (opt-in; we do not run the AWS CLI for you) ──
      const s3Bucket = process.env.BACKUP_S3_BUCKET;
      if (s3Bucket) {
        const prefix = process.env.BACKUP_S3_PREFIX || 'lumera/db';
        log(`S3 target configured (BACKUP_S3_BUCKET=${s3Bucket}). To upload off-host:`);
        log(`  aws s3 cp "${outFile}" "s3://${s3Bucket}/${prefix}/"`);
        log('(Wire this into your scheduled job / runner with credentials in the environment.)');
      } else {
        log('Tip: set BACKUP_S3_BUCKET to get an off-host upload command printed here.');
      }
    }
  } catch {
    /* file absent — already reported above */
  }

  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    // Belt-and-suspenders: this should never trigger, but never throw a stack at the user.
    log(`Unexpected error: ${(err as Error).message}. (no-op)`);
    process.exit(0);
  });
