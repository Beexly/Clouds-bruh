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
    const [drop] = await this.listDrops({ id: dropId });
    if (!drop) throw new Error(`Drop ${dropId} not found`);
    const remaining = Math.max(0, (drop.units_remaining ?? 0) - qty);
    const status = remaining === 0 ? 'sold_out' : drop.status;
    await this.updateDrops([{
      selector: { id: dropId },
      data: { units_remaining: remaining, status } as any,
    }]);
  }
}
export default DropsService;
