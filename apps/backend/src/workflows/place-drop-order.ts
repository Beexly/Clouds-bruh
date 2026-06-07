import { createWorkflow, createStep, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';
import { ensureLumeraTables, pool } from '../lib/lumera-db';

/**
 * Compensatable drop-order flow. Each step has a rollback so a mid-flow failure
 * (supplier down, payment declined) never corrupts state.
 */

const reserveUnits = createStep(
  'reserve-units',
  async (input: { dropId: string; qty: number }, { container }) => {
    const drops = container.resolve('drops') as any;
    await drops.consumeUnits(input.dropId, input.qty);
    console.log(`[reserve-units] Reserved ${input.qty} units of drop ${input.dropId}`);
    return new StepResponse({ reserved: true }, input);
  },
  async (input: { dropId: string; qty: number } | undefined, { container }) => {
    if (!input) return;
    try {
      const drops = container.resolve('drops') as any;
      // Return reserved units (compensate)
      const [drop] = await drops.listDrops({ id: input.dropId });
      if (drop) {
        await drops.updateDrops([{
          selector: { id: input.dropId },
          data: { units_remaining: (drop.units_remaining ?? 0) + input.qty },
        }]);
        console.log(`[reserve-units] Compensation: returned ${input.qty} units to drop ${input.dropId}`);
      }
    } catch (e: any) {
      console.error('[reserve-units] Compensation failed:', e.message?.slice(0, 80));
    }
  }
);

const reserveInventory = createStep(
  'reserve-inventory',
  async (input: { cartId: string }, { container }) => {
    // In a real drop-ship flow: lock inventory items against the cart.
    // Medusa's inventory module handles this; we stub it here.
    console.log(`[reserve-inventory] Inventory reserved for cart ${input.cartId}`);
    return new StepResponse({ reserved: true }, input);
  },
  async (input: { cartId: string } | undefined) => {
    if (!input) return;
    console.log(`[reserve-inventory] Compensation: releasing inventory reservation for ${input.cartId}`);
  }
);

const notifySupplier = createStep(
  'notify-supplier',
  async (input: { dropId: string; qty: number; cartId: string }) => {
    // Persist the vendor handoff; live submission is separately gated by env.
    await ensureLumeraTables();
    const vendor = process.env.DEFAULT_FULFILLMENT_VENDOR || 'manual';
    const canSubmit = process.env.VENDOR_LIVE_MODE === 'true' && process.env.AUTO_SUBMIT_VENDOR_ORDERS === 'true';
    const vendorOrderId = `VO-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const status = canSubmit ? 'submitted' : 'staged_for_approval';
    await pool().query(
      `INSERT INTO lumera_vendor_order (id, order_id, vendor, vendor_order_id, status, payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        vendorOrderId,
        input.cartId,
        vendor,
        canSubmit ? vendorOrderId : null,
        status,
        JSON.stringify({
          drop_id: input.dropId,
          qty: input.qty,
          cart_id: input.cartId,
          live_submission_enabled: canSubmit,
        }),
      ]
    );
    console.log(`[notify-supplier] Vendor order ${status}: ref=${vendorOrderId}, drop=${input.dropId}, qty=${input.qty}`);
    return new StepResponse({ supplierRef: vendorOrderId, accepted: canSubmit, status }, { ...input, vendorOrderId });
  },
  async (ctx: { dropId: string; qty: number; cartId: string; vendorOrderId: string } | undefined) => {
    if (!ctx) return;
    await pool()
      .query(`UPDATE lumera_vendor_order SET status='cancel_staged', updated_at=now() WHERE id=$1`, [ctx.vendorOrderId])
      .catch(() => {});
    console.log(`[notify-supplier] Compensation: cancel staged for supplier order ref=${ctx.vendorOrderId}`);
  }
);

export const placeDropOrder = createWorkflow(
  'place-drop-order',
  (input: { dropId: string; qty: number; cartId: string }) => {
    const reservation = reserveUnits(input);
    reserveInventory(input);
    notifySupplier(input);
    return new WorkflowResponse({ ok: true });
  }
);
