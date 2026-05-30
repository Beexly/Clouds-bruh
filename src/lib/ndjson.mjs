import { appendFile, readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

/** Append one JSON record as a line to an NDJSON file (append-only truth). */
export async function appendNdjson(file, obj) {
  await ensureDir(file);
  await appendFile(file, JSON.stringify(obj) + '\n', 'utf8');
}

/** Read and parse every line of an NDJSON file. Missing file → []. */
export async function readNdjson(file) {
  if (!existsSync(file)) return [];
  const txt = await readFile(file, 'utf8');
  return txt
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

async function ensureDir(file) {
  const dir = dirname(file);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
}
