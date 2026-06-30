#!/usr/bin/env node
/**
 * Generate LUMERA_FULL_SOURCE.md — a single Markdown file containing the complete source of the
 * platform (every source/config/doc file, grouped by area, each with path + full contents).
 * Companion to docs/LUMERA_PLATFORM_REVIEW.md; intended for whole-platform external review.
 *
 *   node scripts/gen-source-appendix.mjs [outPath]   # default: ./LUMERA_FULL_SOURCE.md
 *
 * Excludes: node_modules, build outputs (.next/.medusa/dist/.turbo), .git, the pnpm lockfile,
 * the generated bootstrap bundle, binary fonts/images, generated ORM .snapshot files, and secret
 * .env/.env.local files. Handles nested code fences by widening the fence per file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXCLUDE_DIRS = new Set(['node_modules', '.next', '.medusa', 'dist', '.git', '.turbo', 'coverage', '.vercel']);
const EXCLUDE_FILES = new Set(['pnpm-lock.yaml', 'bootstrap-alter-xiv.sh']);
const INCLUDE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.yaml', '.yml', '.sql', '.sh']);
const LANG = { '.ts': 'ts', '.tsx': 'tsx', '.js': 'js', '.jsx': 'jsx', '.mjs': 'js', '.cjs': 'js', '.json': 'json', '.md': 'markdown', '.css': 'css', '.yaml': 'yaml', '.yml': 'yaml', '.sql': 'sql', '.sh': 'bash' };

const includeFile = (f) => {
  const base = path.basename(f);
  if (EXCLUDE_FILES.has(base)) return false;
  if (/\.(woff2?|ttf|png|jpe?g|ico|webp)$/i.test(base)) return false;
  if (base.startsWith('.snapshot') || base.includes('.snapshot-')) return false;
  if (base === '.env' || (base.startsWith('.env.local') && !base.endsWith('.example'))) return false;
  if (['Dockerfile', '.dockerignore', '.npmrc', '.gitignore', '.env.example'].includes(base)) return true;
  return INCLUDE_EXT.has(path.extname(f));
};

function walk(dir, acc) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walk(full, acc); }
    else if (includeFile(full)) acc.push(full);
  }
}
function fenceFor(content) {
  let max = 2;
  for (const m of content.matchAll(/`+/g)) max = Math.max(max, m[0].length);
  return '`'.repeat(Math.max(3, max + 1));
}
function emitFile(rel, abs) {
  let content; try { content = fs.readFileSync(abs, 'utf8'); } catch { return ''; }
  const fence = fenceFor(content);
  return `\n### \`${rel}\`  _(${content.split('\n').length} lines)_\n\n${fence}${LANG[path.extname(abs)] || ''}\n${content}\n${fence}\n`;
}

const AREAS = [
  { title: 'A. Root Configuration', files: () => ['package.json', 'turbo.json', 'pnpm-workspace.yaml', 'tsconfig.json', 'docker-compose.yml', '.dockerignore', '.env.example', '.npmrc', '.gitignore'].map(f => path.join(ROOT, f)).filter(fs.existsSync) },
  { title: 'B. packages/shared', dir: 'packages/shared' },
  { title: 'C. packages/data', dir: 'packages/data' },
  { title: 'D. apps/backend', dir: 'apps/backend' },
  { title: 'E. apps/storefront', dir: 'apps/storefront' },
  { title: 'F. apps/intelligence', dir: 'apps/intelligence' },
  { title: 'G. scripts', dir: 'scripts' },
  { title: 'H. CI / .github', dir: '.github' },
  { title: 'I. Documentation', files: () => { const a = []; walk(path.join(ROOT, 'docs'), a); walk(path.join(ROOT, 'conversion'), a); for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.md')) a.push(path.join(ROOT, f)); return a; } },
];

let toc = '# LUMERA — Complete Source Appendix\n\nEvery source/config/doc file (see scripts/gen-source-appendix.mjs for exclusions). Companion to docs/LUMERA_PLATFORM_REVIEW.md.\n\n## Contents\n';
let body = '', totalFiles = 0, totalLines = 0;
for (const area of AREAS) {
  let files;
  if (area.dir) { files = []; walk(path.join(ROOT, area.dir), files); }
  else files = area.files();
  files = [...new Set(files)].filter(f => fs.existsSync(f) && fs.statSync(f).isFile());
  if (!files.length) continue;
  toc += `- ${area.title} (${files.length} files)\n`;
  body += `\n\n---\n\n## ${area.title}\n`;
  for (const abs of files) { body += emitFile(path.relative(ROOT, abs), abs); totalFiles++; totalLines += fs.readFileSync(abs, 'utf8').split('\n').length; }
}
toc += `\n**Total: ${totalFiles} files, ${totalLines.toLocaleString()} lines.**\n`;
const outPath = process.argv[2] || path.join(ROOT, 'LUMERA_FULL_SOURCE.md');
fs.writeFileSync(outPath, toc + body);
console.log(`Wrote ${outPath}: ${totalFiles} files, ${totalLines} lines, ${(fs.statSync(outPath).size / 1048576).toFixed(2)} MB`);
