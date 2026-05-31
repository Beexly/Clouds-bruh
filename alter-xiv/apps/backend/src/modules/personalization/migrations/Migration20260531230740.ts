import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531230740 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "visitor_profile" add column if not exists "preferences" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "visitor_profile" drop column if exists "preferences";`);
  }

}
