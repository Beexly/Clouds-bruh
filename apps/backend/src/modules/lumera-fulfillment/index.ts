import { ModuleProvider, Modules } from '@medusajs/framework/utils';
import { LumeraDropshipFulfillmentService } from './service';

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [LumeraDropshipFulfillmentService],
});
