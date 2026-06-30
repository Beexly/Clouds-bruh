import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * ORACLE foundation — ensure the pgvector `product_embedding` table exists after `db:migrate`.
 *
 * Without it, a fresh deploy that runs migrations but forgets scripts/setup-embeddings.ts silently
 * collapses for_you / because_you_viewed / complete_the_set / graph_rec to trending/random (the
 * recommendation service degrades via try/catch on the missing table). Folding the schema into a
 * migration removes that deploy-ordering trap.
 *
 * SAFETY: the whole block is guarded on pgvector AVAILABILITY, so on a Postgres without the
 * extension this migration is a NO-OP rather than a failed deploy. The hnsw index is best-effort
 * (older pgvector lacks it; cosine still works via seq scan). Mirrors setup-embeddings.ts exactly
 * (5-dim chapter vectors); that script still seeds the rows. Fully idempotent.
 */
export class Migration20260630120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
          CREATE EXTENSION IF NOT EXISTS vector;
          CREATE TABLE IF NOT EXISTS product_embedding (
            product_id text PRIMARY KEY,
            chapter    text NOT NULL,
            embedding  vector(5) NOT NULL,
            updated_at timestamptz DEFAULT now()
          );
          CREATE INDEX IF NOT EXISTS idx_product_embedding_chapter ON product_embedding (chapter);
          BEGIN
            CREATE INDEX IF NOT EXISTS idx_product_embedding_vec
              ON product_embedding USING hnsw (embedding vector_cosine_ops);
          EXCEPTION WHEN OTHERS THEN
            -- older pgvector without hnsw: cosine ranking still works without the ANN index.
            NULL;
          END;
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS product_embedding;`);
  }
}
