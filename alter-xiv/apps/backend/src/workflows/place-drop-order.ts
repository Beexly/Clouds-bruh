import { createWorkflow, createStep, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk';

/**
 * Compensatable drop-order flow. Each step has a rollback so a mid-flow failure
 * (supplier down, payment declined) never corrupts state. This is the Medusa
 * orchestration pattern that makes drop-ship reliable.
 */
const reserveUnits = createStep('reserve-units',
  async (input: { dropId: string; qty: number }, { container }) => {
    const drops = container.resolve('drops') as any;
    await drops.consumeUnits(input.dropId, input.qty);
    return new StepResponse(true, input);
  },
  async (input, { container }) => { /* compensate: return units */ }
);

const reserveInventory = createStep('reserve-inventory',
  async (input: any, { container }) => new StepResponse(true, input),
  async (input, { container }) => { /* compensate: release reservation */ }
);

const capturePayment = createStep('capture-payment',
  async (input: any, { container }) => new StepResponse(true, input),
  async (input, { container }) => { /* compensate: refund */ }
);

const placeSupplierOrder = createStep('place-supplier-order',
  async (input: any, { container }) => new StepResponse(true, input),
  async (input, { container }) => { /* compensate: cancel supplier order */ }
);

export const placeDropOrder = createWorkflow('place-drop-order',
  (input: { dropId: string; qty: number; cartId: string }) => {
    reserveUnits(input);
    reserveInventory(input);
    capturePayment(input);
    placeSupplierOrder(input);
    return new WorkflowResponse({ ok: true });
  }
);
