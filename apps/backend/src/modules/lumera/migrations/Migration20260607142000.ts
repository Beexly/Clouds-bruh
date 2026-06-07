import { Migration } from '@medusajs/framework/mikro-orm/migrations';

export class Migration20260607142000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table if not exists "lumera_vendor_connection" ("id" text not null, "label" text not null, "mode" text check ("mode" in ('live', 'sandbox', 'fixture', 'missing_credentials', 'blocked')) not null default 'missing_credentials', "connected" boolean not null default false, "can_publish" boolean not null default false, "can_submit_orders" boolean not null default false, "last_checked_at" timestamptz not null default now(), "missing_env" jsonb not null default '[]'::jsonb, "message" text not null default '', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_vendor_connection_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_product_candidate" ("id" text not null, "vendor" text not null, "supplier_id" text not null, "supplier_name" text not null, "title" text not null, "handle" text not null unique, "status" text not null, "score" integer not null default 0, "gross_margin" numeric(8,4) not null default 0, "lead_time_days" integer not null default 0, "stock" integer not null default 0, "payload" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_product_candidate_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_approval_request" ("id" text not null, "candidate_id" text not null, "action" text not null, "status" text not null, "reason" text null, "payload" jsonb not null default '{}'::jsonb, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_approval_request_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_vendor_order" ("id" text not null, "order_id" text null, "vendor" text not null, "vendor_order_id" text null, "status" text not null, "payload" jsonb not null default '{}'::jsonb, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_vendor_order_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_vendor_webhook_event" ("id" text not null, "vendor" text not null, "event_type" text not null, "payload" jsonb not null, "received_at" timestamptz not null default now(), "processed_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_vendor_webhook_event_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_return_case" ("id" text not null, "order_id" text null, "email" text null, "status" text not null default 'submitted', "reason" text null, "payload" jsonb not null default '{}'::jsonb, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_return_case_pkey" primary key ("id"));`);
    this.addSql(`create table if not exists "lumera_product_design" ("id" text not null, "title" text not null, "status" text not null default 'draft', "payload" jsonb not null default '{}'::jsonb, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "lumera_product_design_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lumera_product_candidate_status" ON "lumera_product_candidate" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_lumera_vendor_order_status" ON "lumera_vendor_order" ("status") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "lumera_product_design" cascade;`);
    this.addSql(`drop table if exists "lumera_return_case" cascade;`);
    this.addSql(`drop table if exists "lumera_vendor_webhook_event" cascade;`);
    this.addSql(`drop table if exists "lumera_vendor_order" cascade;`);
    this.addSql(`drop table if exists "lumera_approval_request" cascade;`);
    this.addSql(`drop table if exists "lumera_product_candidate" cascade;`);
    this.addSql(`drop table if exists "lumera_vendor_connection" cascade;`);
  }
}
