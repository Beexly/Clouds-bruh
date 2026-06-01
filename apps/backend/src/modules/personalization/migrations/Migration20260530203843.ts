import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530203843 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "visitor_profile" drop constraint if exists "visitor_profile_visitor_id_unique";`);
    this.addSql(`create table if not exists "visitor_profile" ("id" text not null, "visitor_id" text not null, "customer_id" text null, "segment" text check ("segment" in ('new_seeker', 'armor_devotee', 'high_intent', 'lapsed', 'patron')) not null default 'new_seeker', "embedding" jsonb null, "affinity" jsonb not null, "last_seen" timestamptz not null, "ltv_estimate" integer null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "visitor_profile_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_visitor_profile_visitor_id_unique" ON "visitor_profile" ("visitor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_visitor_profile_deleted_at" ON "visitor_profile" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "visitor_profile" cascade;`);
  }

}
