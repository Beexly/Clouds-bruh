import { MedusaService } from '@medusajs/framework/utils';
import { Drop } from './models/drop';
import { pool } from '../../lib/lumera-db';

class DropsService extends MedusaService({ Drop }) {
  /** Drops that are live right now — drives The Broadcast departure board. */
  async listLive() {
    const now = new Date();
    return this.listDrops({ status: 'live' /* and starts_at <= now <= ends_at */ });
  }

  /**
   * Decrement remaining units for a drop and flip it to sold_out at zero — ATOMICALLY.
   *
   * The previous implementation read units_remaining, computed the new value in JS, then wrote it
   * back: two concurrent purchases of a nearly-sold-out drop could both read "1 left" and both
   * succeed, overselling. This is a single guarded UPDATE so the database enforces the invariant.
   * Uses the shared pg pool (`$N` placeholders + rowCount) — the same proven pattern the rest of the
   * Lumera backend uses, including drop-grader reading this very `"drop"` table.
   *
   * - Strict (default — the reserve/order path): refuse and THROW when fewer than `qty` remain, so the
   *   workflow's compensation fires and we never sell stock we don't have.
   * - allowPartial (post-order accounting in the order.placed subscriber): take what's available,
   *   floor at zero, and don't throw on insufficiency (the order already exists; this is bookkeeping).
   */
  async consumeUnits(dropId: string, qty: number, opts: { allowPartial?: boolean } = {}): Promise<void> {
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n <= 0) return; // nothing to consume

    if (opts.allowPartial) {
      const res = await pool().query(
        `UPDATE "drop"
            SET units_remaining = GREATEST(0, units_remaining - $1),
                status = CASE WHEN units_remaining - $1 <= 0 THEN 'sold_out' ELSE status END,
                updated_at = now()
          WHERE id = $2 AND deleted_at IS NULL`,
        [n, dropId]
      );
      if (!res.rowCount) throw new Error(`drop_not_found:${dropId}`);
      return;
    }

    const res = await pool().query(
      `UPDATE "drop"
          SET units_remaining = units_remaining - $1,
              status = CASE WHEN units_remaining - $1 <= 0 THEN 'sold_out' ELSE status END,
              updated_at = now()
        WHERE id = $2 AND units_remaining >= $1 AND deleted_at IS NULL`,
      [n, dropId]
    );
    // 0 rows ⇒ the guard (units_remaining >= qty) failed or the drop is gone: refuse the oversell.
    if (!res.rowCount) throw new Error(`drop_oversold_or_missing:${dropId}`);
  }
}
export default DropsService;
