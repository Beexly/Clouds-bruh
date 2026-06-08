import { ModuleProvider, Modules } from '@medusajs/framework/utils';
import { LumeraPayPalProviderService } from './service';

export default ModuleProvider(Modules.PAYMENT, {
  services: [LumeraPayPalProviderService],
});
