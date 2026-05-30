import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530203851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "drop" ("id" text not null, "name" text not null, "series" text not null, "chapter" text check ("chapter" in ('stillness', 'armor', 'signal', 'altar', 'relentless')) not null, "status" text check ("status" in ('scheduled', 'live', 'sold_out', 'archived')) not null default 'scheduled', "starts_at" timestamptz not null, "ends_at" timestamptz not null, "units_total" integer not null, "units_remaining" integer not null, "product_ids" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "drop_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_drop_deleted_at" ON "drop" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "drop" cascade;`);
  }

}
