/** Support macro library — profanity-free, brand-voiced reply templates. */
export const MACROS = Object.freeze([
  { intent: 'where_is_my_order', title: 'Order status', body: 'Your order {{number}} is {{status}}. Tracking: {{tracking}}.' },
  { intent: 'return_request', title: 'Returns', body: 'We accept returns within 30 days. If it is a quality issue, we fix it; if you changed your mind, exchanges only.' },
  { intent: 'sizing', title: 'Sizing', body: 'We size for real bodies — check the measurements on the product page, not just the label.' },
  { intent: 'restock', title: 'Restock', body: 'This colorway is on the restock list. Join the waitlist and you will be first to know.' },
  { intent: 'materials', title: 'Materials', body: 'Full GSM, fiber content, and construction are listed on every product page.' },
]);

export function findMacro(intent) {
  return MACROS.find((m) => m.intent === intent) || null;
}
