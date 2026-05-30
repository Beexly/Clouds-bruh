/** Choose a fulfillment route for an order item. Mock: cheapest active supplier. */
export function routeOrderItem(item, suppliers = []) {
  const active = suppliers.filter((s) => s.status === 'active');
  const pool = active.length ? active : suppliers;
  const chosen = [...pool].sort((a, b) => (a.unitCostMinor || 0) - (b.unitCostMinor || 0))[0] || null;
  return { supplierId: chosen?.id || null, supplier: chosen || null };
}
