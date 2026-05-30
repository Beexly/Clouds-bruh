import { createWorkflow, createStep, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

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
    // Mock supplier API — in production this calls the actual supplier endpoint.
    const mockRef = `SUP-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    console.log(`[notify-supplier] Drop order placed: ref=${mockRef}, drop=${input.dropId}, qty=${input.qty}`);
    return new StepResponse({ supplierRef: mockRef, accepted: true }, { ...input, mockRef });
  },
  async (ctx: { dropId: string; qty: number; cartId: string; mockRef: string } | undefined) => {
    if (!ctx) return;
    // Cancel the supplier order
    console.log(`[notify-supplier] Compensation: cancelling supplier order ref=${ctx.mockRef}`);
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
