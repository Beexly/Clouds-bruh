import { Currency, values } from './enums.mjs';
import { supplierId } from './ids.mjs';
import { assertValid } from './validate.mjs';
import { now } from '../lib/clock.mjs';
import { int, clamp } from '../lib/num.mjs';

const supplierStatus = ['candidate', 'active', 'suspended'];

const schema = {
  name: { required: true, type: 'string' },
  country: { required: true, type: 'string' },
  status: { required: true, enum: supplierStatus },
  currency: { required: true, enum: values(Currency) },
};

export function createSupplier(input = {}) {
  const name = input.name || 'Unknown Supplier';
  const supplier = {
    id: input.id || supplierId([name, input.country || '']),
    name,
    country: input.country || 'Unknown',
    capabilities: input.capabilities || [],
    leadTimeDays: int(input.leadTimeDays, 14),
    minOrderQty: int(input.minOrderQty, 1),
    unitCostMinor: int(input.unitCostMinor, 0),
    currency: input.currency || Currency.USD,
    reliability: clamp(int(input.reliability, 70), 0, 100),
    score: clamp(int(input.score, 0), 0, 100),
    contact: input.contact || {},
    status: input.status || 'candidate',
    createdAt: input.createdAt || now(),
  };
  assertValid(supplier, schema, 'supplier');
  return supplier;
}

export { supplierStatus };
