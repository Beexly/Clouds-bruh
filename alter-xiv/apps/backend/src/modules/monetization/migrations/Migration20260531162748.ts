import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531162748 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "membership_tier" drop constraint if exists "membership_tier_key_unique";`);
    this.addSql(`alter table if exists "gift_card" drop constraint if exists "gift_card_code_unique";`);
    this.addSql(`alter table if exists "credit_wallet" drop constraint if exists "credit_wallet_customer_id_unique";`);
    this.addSql(`create table if not exists "credit_transaction" ("id" text not null, "customer_id" text not null, "kind" text check ("kind" in ('grant', 'purchase', 'debit', 'credit_note')) not null, "amount" integer not null, "balance_after" integer not null, "reason" text null, "ref" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "credit_transaction_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_transaction_deleted_at" ON "credit_transaction" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "credit_wallet" ("id" text not null, "customer_id" text not null, "balance" integer not null default 0, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "credit_wallet_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_credit_wallet_customer_id_unique" ON "credit_wallet" ("customer_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_credit_wallet_deleted_at" ON "credit_wallet" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "gift_card" ("id" text not null, "code" text not null, "initial_balance" integer not null, "balance" integer not null, "status" text check ("status" in ('active', 'redeemed', 'void')) not null default 'active', "purchaser_id" text null, "message" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gift_card_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gift_card_code_unique" ON "gift_card" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gift_card_deleted_at" ON "gift_card" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "membership" ("id" text not null, "customer_id" text not null, "tier_key" text not null, "status" text check ("status" in ('active', 'past_due', 'canceled')) not null default 'active', "stripe_subscription_id" text null, "current_period_end" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "membership_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_membership_deleted_at" ON "membership" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "membership_tier" ("id" text not null, "key" text not null, "name" text not null, "description" text null, "price_cents" integer not null, "interval" text check ("interval" in ('month', 'year')) not null default 'month', "entitlements" jsonb not null, "stripe_price_id" text null, "active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "membership_tier_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_membership_tier_key_unique" ON "membership_tier" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_membership_tier_deleted_at" ON "membership_tier" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "credit_transaction" cascade;`);

    this.addSql(`drop table if exists "credit_wallet" cascade;`);

    this.addSql(`drop table if exists "gift_card" cascade;`);

    this.addSql(`drop table if exists "membership" cascade;`);

    this.addSql(`drop table if exists "membership_tier" cascade;`);
  }

}
