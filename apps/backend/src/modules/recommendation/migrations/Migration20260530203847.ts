import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530203847 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "recommendation" ("id" text not null, "visitor_id" text not null, "strategy" text check ("strategy" in ('for_you', 'because_you_viewed', 'complete_the_set', 'trending_in_chapter')) not null, "product_ids" jsonb not null, "score" integer not null, "served_at" timestamptz not null, "clicked" boolean not null default false, "converted" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "recommendation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_recommendation_visitor_id" ON "recommendation" ("visitor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_recommendation_deleted_at" ON "recommendation" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "recommendation" cascade;`);
  }

}
