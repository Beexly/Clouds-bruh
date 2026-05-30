import { MedusaService } from '@medusajs/framework/utils';
import { Drop } from './models/drop';

class DropsService extends MedusaService({ Drop }) {
  /** Drops that are live right now — drives The Broadcast departure board. */
  async listLive() {
    const now = new Date();
    return this.listDrops({ status: 'live' /* and starts_at <= now <= ends_at */ });
  }
  /** Decrement remaining units atomically on purchase; flip to sold_out at zero. */
  async consumeUnits(dropId: string, qty: number) {
    // TODO: atomic decrement (DB-level) + transition status when units_remaining hits 0.
  }
}
export default DropsService;
