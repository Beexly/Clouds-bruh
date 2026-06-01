import type { MedusaRequest, MedusaResponse } from '@medusajs/framework';
import pg from 'pg';

/**
 * G01 — SearchProvider contract (hybrid search), pgvector-native (no new infra).
 * Blends a KEYWORD lane (title match) with a VECTOR lane (cosine over product_embedding in the
 * 5-dim chapter space) and returns facets + reason labels. This is the seam Codex's V7 plan
 * specified; the vector lane upgrades transparently when richer text embeddings land.
 *
 *   GET /store/search?q=...&limit=8
 *   → { query, results:[{id,title,handle,chapter,keyword_score,vector_score,score,reason}], facets, source_freshness }
 */
let _pool: pg.Pool | null = null;
function pool() {
  if (_pool) return _pool;
  _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  return _pool;
}

// Keyword → chapter affinity, to turn free text into a query vector in the chapter space.
const CHAPTER_HINTS: Record<string, string[]> = {
  stillness: ['still', 'calm', 'rest', 'peace', 'quiet', 'linen', 'soft', 'meditat', 'slow'],
  armor: ['armor', 'armour', 'strength', 'strong', 'iron', 'guard', 'protect', 'tactical', 'jacket', 'heavy', 'shield'],
  signal: ['signal', 'voice', 'bold', 'bright', 'statement', 'loud', 'neon', 'speak'],
  altar: ['altar', 'craft', 'crafted', 'handmade', 'heirloom', 'keepsake', 'gold', 'ceremony', 'ritual', 'artisan', 'fine'],
  relentless: ['relentless', 'drive', 'push', 'endure', 'run', 'train', 'performance', 'grind', 'sport'],
};
const CHAPTERS = ['stillness', 'armor', 'signal', 'altar', 'relentless'];

function queryVector(q: string): number[] {
  const lower = q.toLowerCase();
  const scores = CHAPTERS.map((c) => CHAPTER_HINTS[c].reduce((s, kw) => s + (lower.includes(kw) ? 1 : 0), 0));
  const total = scores.reduce((s, v) => s + v, 0);
  if (total === 0) return [0.2, 0.2, 0.2, 0.2, 0.2]; // neutral
  return scores.map((v) => 0.05 + (0.95 * v) / total);
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = (req.query.q as string)?.trim() ?? '';
  const limit = Math.min(24, Number(req.query.limit) || 8);
  if (!q) return res.json({ query: '', results: [], facets: {}, source_freshness: 'live' });

  try {
    const vec = `[${queryVector(q).join(',')}]`;
    const kw = `%${q}%`;
    const { rows } = await pool().query(
      `SELECT p.id, p.title, p.handle, p.thumbnail,
              p.metadata->>'chapter' AS chapter,
              (CASE WHEN p.title ILIKE $1 THEN 1.0 ELSE 0.0 END) AS keyword_score,
              COALESCE(1 - (pe.embedding <=> $2::vector), 0)::float AS vector_score
         FROM product p
         LEFT JOIN product_embedding pe ON pe.product_id = p.id
        WHERE p.deleted_at IS NULL
        ORDER BY (0.6 * (CASE WHEN p.title ILIKE $1 THEN 1.0 ELSE 0.0 END)
                + 0.4 * COALESCE(1 - (pe.embedding <=> $2::vector), 0)) DESC
        LIMIT $3`,
      [kw, vec, limit]
    );

    const results = rows.map((r: any) => {
      const keyword_score = Number(r.keyword_score);
      const vector_score = +Number(r.vector_score).toFixed(3);
      const score = +(0.6 * keyword_score + 0.4 * vector_score).toFixed(3);
      const reason =
        keyword_score > 0 ? `matches “${q}”` : vector_score > 0.5 ? `resonates with the ${r.chapter} chapter` : 'related';
      return { id: r.id, title: r.title, handle: r.handle, thumbnail: r.thumbnail, chapter: r.chapter, keyword_score, vector_score, score, reason };
    });

    const facets: Record<string, number> = {};
    for (const r of results) if (r.chapter) facets[r.chapter] = (facets[r.chapter] ?? 0) + 1;

    res.json({ query: q, results, facets, source_freshness: 'live' });
  } catch (e: any) {
    res.status(500).json({ error: e.message?.slice(0, 200) });
  }
};
