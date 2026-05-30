import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530203827 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "signal_event" ("id" text not null, "visitor_id" text not null, "session_id" text not null, "type" text not null, "entity_id" text null, "value" text null, "context" jsonb not null, "ts" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "signal_event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_signal_event_visitor_id" ON "signal_event" ("visitor_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_signal_event_type" ON "signal_event" ("type") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_signal_event_deleted_at" ON "signal_event" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "signal_event" cascade;`);
  }

}
