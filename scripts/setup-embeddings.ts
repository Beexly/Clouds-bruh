import { Pool } from 'pg';

/**
 * ORACLE foundation: create + seed the product_embedding table (a raw pgvector table outside
 * Medusa's migrations). Without this, for_you / graph_rec / because_you_viewed have nothing to
 * rank on a fresh install. Embeddings are 5-dim chapter one-hots (matching the recommendation
 * service's CHAPTER_VEC); the Learning Loop sharpens them over time. Idempotent.
 *
 *   npx tsx scripts/setup-embeddings.ts
 */
const CHAPTER_VEC: Record<string, number[]> = {
  stillness: [0.95, 0.05, 0.05, 0.05, 0.05],
  armor: [0.05, 0.95, 0.05, 0.05, 0.05],
  signal: [0.05, 0.05, 0.95, 0.05, 0.05],
  altar: [0.05, 0.05, 0.05, 0.95, 0.05],
  relentless: [0.05, 0.05, 0.05, 0.05, 0.95],
};
const DEFAULT_VEC = [0.2, 0.2, 0.2, 0.2, 0.2];

async function main() {
  // Run via `pnpm setup:embeddings` (plain tsx — does NOT auto-load Medusa env files). Refuse the
  // localhost fallback in production so we never create the table in the wrong database silently.
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('[setup-embeddings] DATABASE_URL must be set in production (refusing localhost fallback).');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://alterxiv:alterxiv@localhost:5432/alterxiv' });
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_embedding (
        product_id text PRIMARY KEY,
        chapter    text NOT NULL,
        embedding  vector(5) NOT NULL,
        updated_at timestamptz DEFAULT now()
      )`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_embedding_chapter ON product_embedding (chapter)`);
    await pool
      .query(`CREATE INDEX IF NOT EXISTS idx_product_embedding_vec ON product_embedding USING hnsw (embedding vector_cosine_ops)`)
      .catch(() => {});

    const { rows } = await pool.query<{ id: string; chapter: string }>(
      `SELECT id, COALESCE(metadata->>'chapter','relentless') AS chapter FROM product WHERE deleted_at IS NULL`
    );
    let n = 0;
    for (const p of rows) {
      const vec = CHAPTER_VEC[p.chapter] ?? DEFAULT_VEC;
      await pool.query(
        `INSERT INTO product_embedding (product_id, chapter, embedding)
         VALUES ($1,$2,$3::vector)
         ON CONFLICT (product_id) DO UPDATE SET chapter=EXCLUDED.chapter, embedding=EXCLUDED.embedding, updated_at=now()`,
        [p.id, p.chapter, `[${vec.join(',')}]`]
      );
      n++;
    }
    console.log(`[setup-embeddings] seeded ${n} product embeddings (5-dim chapter vectors).`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[setup-embeddings] error:', e.message);
  process.exit(1);
});
