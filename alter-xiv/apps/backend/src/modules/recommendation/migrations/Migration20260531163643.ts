import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260531163643 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "recommendation" drop constraint if exists "recommendation_strategy_check";`);

    this.addSql(`alter table if exists "recommendation" add constraint "recommendation_strategy_check" check("strategy" in ('for_you', 'because_you_viewed', 'complete_the_set', 'trending_in_chapter', 'graph_rec'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "recommendation" drop constraint if exists "recommendation_strategy_check";`);

    this.addSql(`alter table if exists "recommendation" add constraint "recommendation_strategy_check" check("strategy" in ('for_you', 'because_you_viewed', 'complete_the_set', 'trending_in_chapter'));`);
  }

}
