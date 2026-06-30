import { Migration } from "@medusajs/framework/mikro-orm/migrations";

/**
 * ORACLE foundation — ensure the pgvector `product_embedding` table exists after `db:migrate`.
 *
 * Without it, a fresh deploy that runs migrations but forgets scripts/setup-embeddings.ts silently
 * collapses for_you / because_you_viewed / complete_the_set / graph_rec to trending/random (the
 * recommendation service degrades via try/catch on the missing table). Folding the schema into a
 * migration removes that deploy-ordering trap.
 *
 * SAFETY: the entire extension+table+index block is wrapped in its OWN subtransaction with
 * `EXCEPTION WHEN OTHERS`, so ANY failure degrades to a no-op that does NOT abort `db:migrate`.
 * This matters because `pg_available_extensions` only proves the extension is AVAILABLE on disk, not
 * that the connecting role has PRIVILEGE to `CREATE EXTENSION` — on managed Postgres (e.g. RDS
 * rds_superuser, some Cloud SQL/Azure roles) that raises `permission denied` (42501), which without
 * this guard would hard-fail the deploy. When creation is skipped, the recommendation service still
 * degrades gracefully (trending/random) and scripts/setup-embeddings.ts can create the table later.
 * The hnsw index is separately best-effort (older pgvector lacks it; cosine still works via seq
 * scan). Mirrors setup-embeddings.ts (5-dim chapter vectors); that script seeds the rows. Idempotent.
 */
export class Migration20260630120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
          BEGIN
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
          EXCEPTION WHEN OTHERS THEN
            -- pgvector present but not creatable here (insufficient privilege, etc.) — degrade to a
            -- no-op so the migration never aborts the deploy. setup-embeddings.ts can create it later.
            RAISE NOTICE 'product_embedding setup skipped: %', SQLERRM;
          END;
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS product_embedding;`);
  }
}
